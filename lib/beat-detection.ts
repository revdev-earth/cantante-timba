/**
 * Lightweight BPM detection for salsa/timba tracks.
 *
 * Strategy: build an onset-strength envelope from the RMS energy of short
 * hops, autocorrelate it over the lag range that maps to dance tempos, and
 * fold the winning tempo into the salsa-friendly octave (140–260 BPM, where
 * each count of the 1-8 cycle is one beat).
 */

const HOP_SIZE = 256;
const MIN_BPM = 120;
const MAX_BPM = 250;
const FALLBACK_BPM = 180;

export function detectBpm(buffer: AudioBuffer): number {
  const sampleRate = buffer.sampleRate;
  const samples = buffer.getChannelData(0);

  // Analyze up to two minutes, skipping the intro when the track is long
  // enough (intros often have rubato piano/voice with no steady pulse).
  const skip = Math.min(
    Math.floor(10 * sampleRate),
    Math.max(0, samples.length - 30 * sampleRate),
  );
  const end = Math.min(samples.length, skip + 120 * sampleRate);

  const frameCount = Math.floor((end - skip) / HOP_SIZE);
  const framesPerSecond = sampleRate / HOP_SIZE;
  if (frameCount < framesPerSecond * 10) return FALLBACK_BPM;

  // RMS energy envelope.
  const envelope = new Float32Array(frameCount);
  for (let i = 0; i < frameCount; i++) {
    let sum = 0;
    const offset = skip + i * HOP_SIZE;
    for (let j = 0; j < HOP_SIZE; j++) {
      const v = samples[offset + j];
      sum += v * v;
    }
    envelope[i] = Math.sqrt(sum / HOP_SIZE);
  }

  // Onset strength: only rising energy counts.
  const onset = new Float32Array(frameCount);
  for (let i = 1; i < frameCount; i++) {
    onset[i] = Math.max(0, envelope[i] - envelope[i - 1]);
  }

  // Autocorrelation over the candidate lag range.
  const minLag = Math.floor((60 / MAX_BPM) * framesPerSecond);
  const maxLag = Math.ceil((60 / MIN_BPM) * framesPerSecond);
  const scores = new Float32Array(maxLag + 2);
  let bestLag = minLag;
  for (let lag = minLag; lag <= maxLag + 1; lag++) {
    let score = 0;
    for (let i = 0; i + lag < frameCount; i++) {
      score += onset[i] * onset[i + lag];
    }
    scores[lag] = score / (frameCount - lag);
    if (lag <= maxLag && scores[lag] > scores[bestLag]) bestLag = lag;
  }

  // Parabolic interpolation for sub-lag precision.
  let lag = bestLag;
  if (bestLag > minLag) {
    const y1 = scores[bestLag - 1];
    const y2 = scores[bestLag];
    const y3 = scores[bestLag + 1];
    const denom = y1 - 2 * y2 + y3;
    if (denom !== 0) lag += (0.5 * (y1 - y3)) / denom;
  }

  let bpm = (60 * framesPerSecond) / lag;
  if (!Number.isFinite(bpm) || bpm <= 0) return FALLBACK_BPM;

  // Fold into the octave where salsa counts live.
  while (bpm < 140) bpm *= 2;
  while (bpm >= 260) bpm /= 2;

  return Math.round(bpm * 10) / 10;
}
