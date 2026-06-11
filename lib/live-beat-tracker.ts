/**
 * Real-time beat tracker.
 *
 * Listens to the playing audio through an AnalyserNode and keeps a running
 * estimate of the tempo while the song advances:
 *
 * 1. Every animation frame the RMS energy of the signal is sampled into
 *    fixed-rate envelope bins (100 per second).
 * 2. Rising energy (onsets = drum/bass hits) is what carries the pulse.
 * 3. Once per second the last 12 seconds of onsets are autocorrelated and
 *    the tempo estimate is updated — smoothly, so the count never jumps.
 * 4. Strong isolated onsets are exposed as `lastPeakTime` so the caller can
 *    gently re-align the beat grid (phase) to the music.
 */

const BIN_RATE = 100; // envelope samples per second
const RING_SIZE = 4096; // ~41 s of envelope history
const WINDOW = 1200; // 12 s analysis window
const MIN_BPM = 120;
const MAX_BPM = 250;
const PEAK_REFRACTORY = 0.15; // s — ignore re-triggers inside this gap

export class LiveBeatTracker {
  /** Current tempo estimate, or null until the music gives a steady pulse. */
  bpm: number | null = null;
  /** AudioContext time of the latest strong onset. */
  lastPeakTime = 0;

  private readonly ctx: AudioContext;
  private readonly analyser: AnalyserNode;
  private readonly timeData: Float32Array<ArrayBuffer>;
  private readonly envelope = new Float32Array(RING_SIZE);
  private readonly startBin: number;
  private lastBin: number;
  private lastTempoBin: number;
  private onsetAverage = 0;
  private previousOnset = 0;

  constructor(ctx: AudioContext, source: AudioNode) {
    this.ctx = ctx;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.timeData = new Float32Array(this.analyser.fftSize);
    source.connect(this.analyser);
    this.startBin = Math.floor(ctx.currentTime * BIN_RATE);
    this.lastBin = this.startBin;
    this.lastTempoBin = this.startBin;
  }

  /** Use an offline estimate as starting point until the live one settles. */
  seed(bpm: number) {
    if (this.bpm === null) this.bpm = bpm;
  }

  /** Call once per animation frame while the song plays. */
  update() {
    this.analyser.getFloatTimeDomainData(this.timeData);
    let sum = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      const v = this.timeData[i];
      sum += v * v;
    }
    const rms = Math.sqrt(sum / this.timeData.length);

    const bin = Math.floor(this.ctx.currentTime * BIN_RATE);
    if (bin <= this.lastBin) {
      // still inside the same bin — keep the loudest reading
      const idx = bin % RING_SIZE;
      if (rms > this.envelope[idx]) this.envelope[idx] = rms;
      return;
    }

    // long gap (background tab): skip ahead instead of smearing
    const from = bin - this.lastBin > BIN_RATE ? bin - 1 : this.lastBin + 1;
    for (let b = from; b <= bin; b++) this.envelope[b % RING_SIZE] = rms;

    // onset detection on the just-completed bin
    const prev = this.envelope[(this.lastBin - 1 + RING_SIZE) % RING_SIZE];
    const curr = this.envelope[this.lastBin % RING_SIZE];
    const onset = Math.max(0, curr - prev);
    this.onsetAverage = this.onsetAverage * 0.995 + onset * 0.005;
    const peakTime = this.lastBin / BIN_RATE;
    if (
      onset > this.onsetAverage * 4 &&
      onset > this.previousOnset &&
      onset > 0.001 &&
      peakTime - this.lastPeakTime > PEAK_REFRACTORY
    ) {
      this.lastPeakTime = peakTime;
    }
    this.previousOnset = onset;
    this.lastBin = bin;

    if (bin - this.lastTempoBin >= BIN_RATE) {
      this.lastTempoBin = bin;
      this.estimateTempo(bin);
    }
  }

  private estimateTempo(bin: number) {
    if (bin - this.startBin < WINDOW + 2) return;

    const onset = new Float32Array(WINDOW);
    let total = 0;
    for (let i = 0; i < WINDOW; i++) {
      const b = bin - WINDOW + i;
      const curr = this.envelope[b % RING_SIZE];
      const prev = this.envelope[(b - 1 + RING_SIZE) % RING_SIZE];
      const v = Math.max(0, curr - prev);
      onset[i] = v;
      total += v;
    }
    if (total <= 0) return;

    const minLag = Math.floor((60 / MAX_BPM) * BIN_RATE);
    const maxLag = Math.ceil((60 / MIN_BPM) * BIN_RATE);
    const scores = new Float32Array(maxLag + 2);
    let best = minLag;
    let scoreSum = 0;
    let scoreCount = 0;
    for (let lag = minLag; lag <= maxLag + 1; lag++) {
      let s = 0;
      for (let i = 0; i + lag < WINDOW; i++) s += onset[i] * onset[i + lag];
      scores[lag] = s / (WINDOW - lag);
      if (lag <= maxLag) {
        scoreSum += scores[lag];
        scoreCount++;
        if (scores[lag] > scores[best]) best = lag;
      }
    }

    // weak or flat correlation = no reliable pulse right now: keep estimate
    const average = scoreSum / scoreCount;
    if (average <= 0 || scores[best] < average * 1.25) return;

    let lag = best;
    if (best > minLag) {
      const y1 = scores[best - 1];
      const y2 = scores[best];
      const y3 = scores[best + 1];
      const denom = y1 - 2 * y2 + y3;
      if (denom !== 0) lag += (0.5 * (y1 - y3)) / denom;
    }

    let estimate = (60 * BIN_RATE) / lag;
    if (!Number.isFinite(estimate) || estimate <= 0) return;
    while (estimate < 140) estimate *= 2;
    while (estimate >= 260) estimate /= 2;

    this.bpm = this.bpm === null ? estimate : this.bpm * 0.85 + estimate * 0.15;
  }
}
