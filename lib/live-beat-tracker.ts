/**
 * Real-time beat tracker afinado para salsa / timba.
 *
 * Por qué la salsa rompe a los beat-trackers genéricos:
 *
 * - El BAJO TUMBAO es anticipado: toca en el «y de 2» y en el 4, casi nunca
 *   en el 1. Un detector que escuche graves se engancha a destiempo por
 *   diseño del género. Por eso aquí la banda de análisis EXCLUYE el bajo
 *   (solo 180 Hz – 9 kHz: piano montuno, congas, campana, cáscara, clave).
 * - La síncopa hace que corregir la fase con picos sueltos sea frágil.
 *   Aquí la fase se calcula PLEGANDO (folding) la envolvente de onsets de
 *   los últimos segundos módulo el período: los golpes sincopados se
 *   promedian y el pulso constante se acumula en una sola fase.
 * - Los errores de octava (ir a 2× o ½ del tempo) se atacan con puntuación
 *   armónica (un tempo real también correlaciona al nivel del compás), un
 *   prior gaussiano centrado en la franja de la salsa (~185 BPM) y bloqueo
 *   de octava contra el tempo vigente.
 *
 * Flujo: cada frame se calcula el flujo espectral en dB (energía nueva en la
 * banda percusiva) → envolvente a 100 muestras/s → cada segundo: tempo por
 * autocorrelación armónica con prior + fase por plegado con confianza.
 */

const BIN_RATE = 100; // muestras de envolvente por segundo
const RING_SIZE = 4096; // ~41 s de historia
const TEMPO_WINDOW = 1200; // ventana de tempo (12 s)
const PHASE_WINDOW = 800; // ventana de fase (8 s)
const MIN_BPM = 120;
const MAX_BPM = 250;
const FOLD_LOW = 150; // octava objetivo de la salsa
const FOLD_HIGH = 250;
const PRIOR_CENTER = 185; // BPM típico de salsa/timba
const PRIOR_SIGMA_OCT = 0.4; // ancho del prior en octavas
const PEAK_REFRACTORY = 0.12; // s
const DB_FLOOR = -80;
const DB_CEIL = 0;

export type BeatPhase = {
  /** Período del beat en segundos (con el bpm del tracker). */
  periodSec: number;
  /** Fase: tiempo (mod período, en segundos del AudioContext) donde caen los beats. */
  offsetSec: number;
  /** Contraste del histograma plegado (≥ ~1.8 = fiable). */
  confidence: number;
  /** Aumenta en cada recálculo — para aplicar la corrección una sola vez. */
  version: number;
};

export class LiveBeatTracker {
  /** Tempo estimado, o null hasta que la música da un pulso estable. */
  bpm: number | null = null;
  /** Tiempo (AudioContext) del último golpe percusivo fuerte. */
  lastPeakTime = 0;
  /** Volumen suavizado 0..1 — intensidad para la UI. */
  level = 0;
  /** Última estimación de fase por plegado, o null si aún no hay. */
  phase: BeatPhase | null = null;

  private readonly ctx: AudioContext;
  private readonly analyser: AnalyserNode;
  private readonly timeData: Float32Array<ArrayBuffer>;
  private readonly freqData: Float32Array<ArrayBuffer>;
  private readonly prevDb: Float32Array;
  private readonly lowBinIdx: number;
  private readonly highBinIdx: number;
  private readonly envelope = new Float32Array(RING_SIZE);
  private readonly startBin: number;
  private lastBin: number;
  private lastTempoBin: number;
  private fluxAccum = 0;
  private onsetAverage = 0;
  private previousFlux = 0;
  private phaseVersion = 0;

  constructor(ctx: AudioContext, source: AudioNode) {
    this.ctx = ctx;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0;
    this.timeData = new Float32Array(this.analyser.fftSize);
    this.freqData = new Float32Array(this.analyser.frequencyBinCount);
    this.prevDb = new Float32Array(this.analyser.frequencyBinCount).fill(
      DB_FLOOR,
    );

    // Banda percusiva SIN bajo: 180 Hz – 9 kHz. El tumbao anticipado vive
    // por debajo de ~160 Hz y es el principal des-alineador de fase en salsa.
    const binHz = ctx.sampleRate / this.analyser.fftSize;
    this.lowBinIdx = Math.max(1, Math.floor(180 / binHz));
    this.highBinIdx = Math.min(
      this.analyser.frequencyBinCount - 1,
      Math.ceil(9000 / binHz),
    );

    source.connect(this.analyser);
    this.startBin = Math.floor(ctx.currentTime * BIN_RATE);
    this.lastBin = this.startBin;
    this.lastTempoBin = this.startBin;
  }

  /** Usa una estimación offline como punto de partida. */
  seed(bpm: number) {
    if (this.bpm === null) this.bpm = bpm;
  }

  /** Llamar una vez por animation frame mientras suena la canción. */
  update() {
    // intensidad (energía total en el tiempo, banda completa)
    this.analyser.getFloatTimeDomainData(this.timeData);
    let sumSq = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      const v = this.timeData[i];
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / this.timeData.length);
    const scaled = Math.min(1, rms * 3.2);
    this.level =
      scaled > this.level ? scaled : this.level * 0.88 + scaled * 0.12;

    // flujo espectral en dB (log-flux): suma de subidas de magnitud en la
    // banda percusiva. El dominio logarítmico lo hace robusto a cambios de
    // volumen (mezcla, fades, compresión del master).
    this.analyser.getFloatFrequencyData(this.freqData);
    let flux = 0;
    for (let i = this.lowBinIdx; i <= this.highBinIdx; i++) {
      const db = Math.min(DB_CEIL, Math.max(DB_FLOOR, this.freqData[i]));
      const diff = db - this.prevDb[i];
      if (diff > 0) flux += diff;
      this.prevDb[i] = db;
    }
    flux /= this.highBinIdx - this.lowBinIdx + 1;
    if (flux > this.fluxAccum) this.fluxAccum = flux;

    const bin = Math.floor(this.ctx.currentTime * BIN_RATE);
    if (bin <= this.lastBin) return;

    // cerrar bins pendientes: el flujo medido pertenece al tramo completo
    // desde el último update (rAF ≈ 60 fps < 100 bins/s, hay huecos)
    const value = this.fluxAccum;
    this.fluxAccum = 0;
    if (bin - this.lastBin > BIN_RATE) {
      // pestaña en segundo plano: limpiar en vez de emborronar
      this.envelope.fill(0);
      this.lastBin = bin - 1;
    }
    for (let b = this.lastBin; b < bin; b++) {
      this.envelope[b % RING_SIZE] = value;
    }

    // pico para la corrección fina de fase (umbral adaptativo)
    this.onsetAverage = this.onsetAverage * 0.99 + value * 0.01;
    const peakTime = this.lastBin / BIN_RATE;
    if (
      value > this.onsetAverage * 3 &&
      value >= this.previousFlux &&
      value > 0.02 &&
      peakTime - this.lastPeakTime > PEAK_REFRACTORY
    ) {
      this.lastPeakTime = peakTime;
    }
    this.previousFlux = value;
    this.lastBin = bin;

    if (bin - this.lastTempoBin >= BIN_RATE) {
      this.lastTempoBin = bin;
      this.estimateTempo(bin);
      this.estimatePhase(bin);
    }
  }

  // ── tempo ──────────────────────────────────────────────

  private estimateTempo(bin: number) {
    if (bin - this.startBin < TEMPO_WINDOW + 2) return;

    const env = new Float32Array(TEMPO_WINDOW);
    let total = 0;
    for (let i = 0; i < TEMPO_WINDOW; i++) {
      const v = this.envelope[(bin - TEMPO_WINDOW + i) % RING_SIZE];
      env[i] = v;
      total += v;
    }
    if (total <= 0) return;

    // quitar la media para que la ACF mida estructura, no nivel
    const mean = total / TEMPO_WINDOW;
    for (let i = 0; i < TEMPO_WINDOW; i++) env[i] -= mean;

    const minLag = Math.floor((60 / MAX_BPM) * BIN_RATE);
    const maxLag = Math.ceil((60 / MIN_BPM) * BIN_RATE);

    // ACF cruda hasta 2×maxLag para poder consultar armónicos
    const acfMax = Math.min(maxLag * 2 + 2, TEMPO_WINDOW - 1);
    const acf = new Float32Array(acfMax + 1);
    for (let lag = minLag >> 1; lag <= acfMax; lag++) {
      let s = 0;
      for (let i = 0; i + lag < TEMPO_WINDOW; i++) s += env[i] * env[i + lag];
      acf[lag] = Math.max(0, s / (TEMPO_WINDOW - lag));
    }
    const acfAt = (x: number) => {
      const i0 = Math.floor(x);
      if (i0 < 0 || i0 + 1 > acfMax) return 0;
      const fr = x - i0;
      return acf[i0] * (1 - fr) + acf[i0 + 1] * fr;
    };

    // puntuación armónica + prior de salsa:
    // un tempo real también correlaciona a 2×lag (compás) y ½lag (corcheas)
    const scores = new Float32Array(maxLag + 2);
    let best = minLag;
    let scoreSum = 0;
    let scoreCount = 0;
    for (let lag = minLag; lag <= maxLag + 1; lag++) {
      const bpm = (60 * BIN_RATE) / lag;
      const oct = Math.log2(bpm / PRIOR_CENTER);
      const prior = Math.exp(-0.5 * (oct / PRIOR_SIGMA_OCT) ** 2);
      scores[lag] =
        prior * (acf[lag] + 0.5 * acfAt(lag * 2) + 0.4 * acfAt(lag / 2));
      if (lag <= maxLag) {
        scoreSum += scores[lag];
        scoreCount++;
        if (scores[lag] > scores[best]) best = lag;
      }
    }

    const average = scoreSum / scoreCount;
    if (average <= 0 || scores[best] < average * 1.25) return;

    // interpolación parabólica para precisión sub-lag
    let lag = best;
    if (best > minLag && best < maxLag + 1) {
      const y1 = scores[best - 1];
      const y2 = scores[best];
      const y3 = scores[best + 1];
      const denom = y1 - 2 * y2 + y3;
      if (denom !== 0) lag += (0.5 * (y1 - y3)) / denom;
    }

    let estimate = (60 * BIN_RATE) / lag;
    if (!Number.isFinite(estimate) || estimate <= 0) return;
    while (estimate < FOLD_LOW) estimate *= 2;
    while (estimate >= FOLD_HIGH) estimate /= 2;

    if (this.bpm === null) {
      this.bpm = estimate;
      return;
    }

    // bloqueo de octava contra el tempo vigente
    const candidates = [estimate, estimate * 2, estimate / 2];
    let chosen = estimate;
    let bestDist = Infinity;
    for (const c of candidates) {
      if (c < MIN_BPM || c > MAX_BPM) continue;
      const dist = Math.abs(c - this.bpm);
      if (dist < bestDist) {
        bestDist = dist;
        chosen = c;
      }
    }

    this.bpm = this.bpm * 0.9 + chosen * 0.1;
  }

  // ── fase por plegado ───────────────────────────────────

  /**
   * Pliega la envolvente de los últimos PHASE_WINDOW bins módulo el período:
   * cada bin suma su flujo en la ranura de fase que le toca. Los golpes
   * sincopados caen en ranuras distintas y se diluyen; el pulso constante se
   * acumula en una sola. El máximo del histograma ES la fase del beat.
   */
  private estimatePhase(bin: number) {
    if (this.bpm === null) return;
    if (bin - this.startBin < PHASE_WINDOW + 2) return;

    const period = (60 / this.bpm) * BIN_RATE; // bins por beat (float)
    if (period < 4) return;
    const slots = Math.max(8, Math.round(period));
    const hist = new Float32Array(slots);

    for (let i = 0; i < PHASE_WINDOW; i++) {
      const abs = bin - PHASE_WINDOW + i;
      const v = this.envelope[abs % RING_SIZE];
      if (v <= 0) continue;
      const pos = (abs % period) / period; // 0..1 dentro del beat
      const x = pos * slots;
      const s0 = Math.floor(x) % slots;
      const s1 = (s0 + 1) % slots;
      const fr = x - Math.floor(x);
      hist[s0] += v * (1 - fr);
      hist[s1] += v * fr;
    }

    let max = 0;
    let maxIdx = 0;
    let sum = 0;
    for (let s = 0; s < slots; s++) {
      sum += hist[s];
      if (hist[s] > max) {
        max = hist[s];
        maxIdx = s;
      }
    }
    if (sum <= 0) return;
    const mean = sum / slots;
    const confidence = mean > 0 ? max / mean : 0;

    // afinar el pico con interpolación parabólica circular
    const y1 = hist[(maxIdx - 1 + slots) % slots];
    const y2 = hist[maxIdx];
    const y3 = hist[(maxIdx + 1) % slots];
    let peak = maxIdx;
    const denom = y1 - 2 * y2 + y3;
    if (denom !== 0) peak += (0.5 * (y1 - y3)) / denom;

    // ranura → fase absoluta en segundos (mod período)
    const phaseBins = ((peak / slots) * period + period) % period;
    this.phaseVersion++;
    this.phase = {
      periodSec: period / BIN_RATE,
      offsetSec: phaseBins / BIN_RATE,
      confidence,
      version: this.phaseVersion,
    };
  }
}
