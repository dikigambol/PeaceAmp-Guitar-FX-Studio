import type { CabinetModelId, MicModelId } from '../../types/cabinet';

interface CabinetAcousticProfile {
  resonanceFreq: number; // Hz
  enclosureType: 'open' | 'closed';
  baseCutoff: number;    // Hz - speaker high-frequency roll-off corner
  decaySpeed: number;    // 1/s (kept for profile documentation / tuning)
  coneQ: number;
  reflectionDelayMs: number; // For open back reflection
}

const CABINET_PROFILES: Record<Exclude<CabinetModelId, 'custom'>, CabinetAcousticProfile> = {
  '1x8-open': { resonanceFreq: 135, enclosureType: 'open', baseCutoff: 5200, decaySpeed: 65, coneQ: 0.35, reflectionDelayMs: 4.2 },
  '1x10-open': { resonanceFreq: 115, enclosureType: 'open', baseCutoff: 5600, decaySpeed: 55, coneQ: 0.40, reflectionDelayMs: 4.8 },
  '1x12-open': { resonanceFreq: 95, enclosureType: 'open', baseCutoff: 5400, decaySpeed: 48, coneQ: 0.45, reflectionDelayMs: 5.5 },
  '1x12-closed': { resonanceFreq: 90, enclosureType: 'closed', baseCutoff: 4700, decaySpeed: 52, coneQ: 0.50, reflectionDelayMs: 0 },
  '2x12-open': { resonanceFreq: 85, enclosureType: 'open', baseCutoff: 5800, decaySpeed: 42, coneQ: 0.45, reflectionDelayMs: 6.2 },
  '2x12-closed': { resonanceFreq: 80, enclosureType: 'closed', baseCutoff: 4900, decaySpeed: 46, coneQ: 0.55, reflectionDelayMs: 0 },
  '4x10-closed': { resonanceFreq: 75, enclosureType: 'closed', baseCutoff: 5100, decaySpeed: 44, coneQ: 0.52, reflectionDelayMs: 0 },
  '4x12-closed': { resonanceFreq: 70, enclosureType: 'closed', baseCutoff: 4800, decaySpeed: 38, coneQ: 0.58, reflectionDelayMs: 0 },
};

/** RBJ biquad coefficients (normalized by a0) */
interface Biquad { b0: number; b1: number; b2: number; a1: number; a2: number }

function biquad(
  type: 'lowpass' | 'highpass' | 'peaking' | 'highshelf',
  fs: number,
  f0: number,
  q: number,
  gainDb = 0
): Biquad {
  const w0 = (2 * Math.PI * Math.min(f0, fs * 0.45)) / fs;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * q);
  const A = Math.pow(10, gainDb / 40);
  let b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;

  switch (type) {
    case 'lowpass':
      b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2;
      a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
      break;
    case 'highpass':
      b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2;
      a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
      break;
    case 'peaking':
      b0 = 1 + alpha * A; b1 = -2 * cos; b2 = 1 - alpha * A;
      a0 = 1 + alpha / A; a1 = -2 * cos; a2 = 1 - alpha / A;
      break;
    case 'highshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * ((A + 1) + (A - 1) * cos + s);
      b1 = -2 * A * ((A - 1) + (A + 1) * cos);
      b2 = A * ((A + 1) + (A - 1) * cos - s);
      a0 = (A + 1) - (A - 1) * cos + s;
      a1 = 2 * ((A - 1) - (A + 1) * cos);
      a2 = (A + 1) - (A - 1) * cos - s;
      break;
    }
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

function applyBiquad(x: Float32Array, c: Biquad): void {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const x0 = x[i];
    const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    x[i] = y0;
  }
}

/**
 * Generates a guitar cabinet + microphone impulse response.
 *
 * The IR is built by running a unit impulse through a physically-motivated filter chain
 * (like a measured speaker): steep low-cut from the cabinet/cone resonance, a resonance bump,
 * the mic presence peak, a 4-pole speaker roll-off, and mic "air". Open-back models add the
 * delayed, polarity-inverted rear-wave reflection. The result is normalized to ~0 dB average
 * gain across the guitar band (150 Hz - 3.5 kHz), so engaging the cabinet changes tone, not loudness.
 *
 * @param position 0.0 (edge, warmer/darker) to 1.0 (center, direct bite)
 */
export function generateCabinetImpulseResponse(
  ctx: AudioContext,
  cabinet: CabinetModelId,
  mic: MicModelId,
  position: number = 0.5
): AudioBuffer {
  const fs = ctx.sampleRate;
  const length = Math.floor(fs * 0.06);
  const buffer = ctx.createBuffer(2, length, fs);

  const profile = CABINET_PROFILES[cabinet === 'custom' ? '4x12-closed' : cabinet] || CABINET_PROFILES['4x12-closed'];

  const posFactor = Math.max(0, Math.min(1, position));
  const cutoff = Math.max(2800, profile.baseCutoff + (posFactor - 0.5) * 1600);

  let presenceFreq = 5000;
  let presenceDb = 3;
  let lowFactor = 1;
  let airDb = 0;

  switch (mic) {
    case 'sm57':
      presenceFreq = 4800; presenceDb = 5.5 * (0.6 + 0.4 * posFactor); lowFactor = 1.2; airDb = -1;
      break;
    case 'md421':
      presenceFreq = 3800; presenceDb = 4.5 * (0.6 + 0.4 * posFactor); lowFactor = 0.95; airDb = 0.5;
      break;
    case 'ribbon':
      presenceFreq = 2600; presenceDb = 2; lowFactor = 0.85; airDb = -4;
      break;
    case 'condenser':
      presenceFreq = 6500; presenceDb = 3.5; lowFactor = 0.8; airDb = 3.5;
      break;
  }

  const ir = new Float32Array(length);
  ir[0] = 1;

  // Low end: 2nd-order high-pass near the cabinet resonance
  applyBiquad(ir, biquad('highpass', fs, profile.resonanceFreq * 0.8 * lowFactor, 0.75));
  // Cone / cabinet resonance bump
  applyBiquad(ir, biquad('peaking', fs, profile.resonanceFreq * 1.25, 1.1, 2 + profile.coneQ * 5));
  // Mic presence peak
  applyBiquad(ir, biquad('peaking', fs, presenceFreq, 1.4, presenceDb));
  // Speaker high-frequency roll-off: 4-pole Butterworth
  applyBiquad(ir, biquad('lowpass', fs, cutoff, 0.5412));
  applyBiquad(ir, biquad('lowpass', fs, cutoff, 1.3066));
  // Mic top-end character
  if (airDb !== 0) applyBiquad(ir, biquad('highshelf', fs, 7500, 0.7, airDb));

  // Open back: rear wave arrives later with inverted polarity, thinning the lows slightly
  if (profile.enclosureType === 'open' && profile.reflectionDelayMs > 0) {
    const d = Math.floor((profile.reflectionDelayMs / 1000) * fs);
    const dry = Float32Array.from(ir);
    for (let i = d; i < length; i++) ir[i] -= 0.28 * dry[i - d];
  }

  // Short natural fade-out so the tail does not click
  const fadeStart = Math.floor(length * 0.7);
  for (let i = fadeStart; i < length; i++) {
    const t = (i - fadeStart) / (length - fadeStart);
    ir[i] *= 0.5 * (1 + Math.cos(Math.PI * t));
  }

  // Normalize: RMS magnitude over the guitar band = 1 (0 dB)
  const bandFreqs: number[] = [];
  for (let k = 0; k < 24; k++) bandFreqs.push(150 * Math.pow(3500 / 150, k / 23));
  let sumSq = 0;
  for (const f of bandFreqs) {
    const w = (2 * Math.PI * f) / fs;
    let re = 0, im = 0;
    for (let n = 0; n < length; n++) {
      re += ir[n] * Math.cos(w * n);
      im -= ir[n] * Math.sin(w * n);
    }
    sumSq += re * re + im * im;
  }
  const rms = Math.sqrt(sumSq / bandFreqs.length) || 1;
  const norm = 1 / rms;

  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  for (let i = 0; i < length; i++) left[i] = ir[i] * norm;
  // Slight micro-delay blend on the right channel for subtle width
  for (let i = 0; i < length; i++) {
    const off = Math.min(i + 4, length - 1);
    right[i] = left[i] * 0.95 + left[off] * 0.05;
  }

  return buffer;
}
