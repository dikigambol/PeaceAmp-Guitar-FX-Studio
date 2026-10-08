import type { CabinetModelId, MicModelId } from '../../types/cabinet';

interface CabinetAcousticProfile {
  name: string;
  resonanceFreq: number;    // Bass resonance center (Hz)
  resonanceGainDb: number;  // Low-end thump boost (dB)
  resonanceQ: number;
  lowCutFreq: number;       // Acoustic low-end cutoff (Hz)
  midScoopFreq: number;     // Enclosure phase dip (Hz)
  midScoopDb: number;       // Mid scoop depth (dB)
  speakerCutoff: number;    // High-frequency speaker ceiling (Hz)
  enclosureType: 'open' | 'closed';
  reflectionDelayMs: number;// Rear-wave reflection delay (ms) for open-back
  reflectionStrength: number;
}

const CABINET_PROFILES: Record<Exclude<CabinetModelId, 'custom'>, CabinetAcousticProfile> = {
  // 1x8 Small Vintage Combo (Fender Champ style)
  // Thin bass, boxy midrange focus, quick treble roll-off
  '1x8-open': {
    name: '1x8 Vintage Champ',
    resonanceFreq: 140,
    resonanceGainDb: 2.5,
    resonanceQ: 1.0,
    lowCutFreq: 130,
    midScoopFreq: 0,
    midScoopDb: 0,
    speakerCutoff: 4300,
    enclosureType: 'open',
    reflectionDelayMs: 3.5,
    reflectionStrength: 0.35,
  },

  // 1x10 Vintage Punchy Combo (Fender Princeton style)
  // Tight punchy bass, bell-like midrange, chimey highs
  '1x10-open': {
    name: '1x10 Princeton Chime',
    resonanceFreq: 112,
    resonanceGainDb: 3.5,
    resonanceQ: 1.1,
    lowCutFreq: 105,
    midScoopFreq: 520,
    midScoopDb: -2.5,
    speakerCutoff: 4900,
    enclosureType: 'open',
    reflectionDelayMs: 4.4,
    reflectionStrength: 0.32,
  },

  // 1x12 Open Back Classic Combo (Fender Deluxe Reverb style)
  // Warm woody dynamic bloom, airy highs, open back rear phase cancellation
  '1x12-open': {
    name: '1x12 Deluxe Reverb',
    resonanceFreq: 94,
    resonanceGainDb: 4.2,
    resonanceQ: 1.2,
    lowCutFreq: 88,
    midScoopFreq: 240,
    midScoopDb: -3.2,
    speakerCutoff: 5300,
    enclosureType: 'open',
    reflectionDelayMs: 5.2,
    reflectionStrength: 0.30,
  },

  // 1x12 Closed Ported Cab (Mesa Thiele EVM12L style)
  // Tight compact low-end punch, focused articulate midrange, no rear reflection
  '1x12-closed': {
    name: '1x12 Thiele Ported',
    resonanceFreq: 84,
    resonanceGainDb: 5.5,
    resonanceQ: 1.4,
    lowCutFreq: 78,
    midScoopFreq: 800,
    midScoopDb: -1.5,
    speakerCutoff: 4600,
    enclosureType: 'closed',
    reflectionDelayMs: 0,
    reflectionStrength: 0,
  },

  // 2x12 Open Back British/American Combo (Vox AC30 / Fender Twin style)
  // Wide 3D acoustic spread, signature chime in upper mids, open dispersion
  '2x12-open': {
    name: '2x12 AC30 / Twin Reverb',
    resonanceFreq: 86,
    resonanceGainDb: 4.8,
    resonanceQ: 1.2,
    lowCutFreq: 80,
    midScoopFreq: 380,
    midScoopDb: -3.5,
    speakerCutoff: 5500,
    enclosureType: 'open',
    reflectionDelayMs: 6.2,
    reflectionStrength: 0.28,
  },

  // 2x12 Closed Heavy Rock Cab (Orange / Rectifier 2x12 style)
  // Massive low-mid punch, thick rock crunch, tight bottom end
  '2x12-closed': {
    name: '2x12 Recto Vertical',
    resonanceFreq: 76,
    resonanceGainDb: 6.8,
    resonanceQ: 1.5,
    lowCutFreq: 70,
    midScoopFreq: 420,
    midScoopDb: -2.8,
    speakerCutoff: 4400,
    enclosureType: 'closed',
    reflectionDelayMs: 0,
    reflectionStrength: 0,
  },

  // 4x10 Closed Back Stack (Fender Super Reverb / Bassman 4x10 style)
  // Ultra-fast transient response, percussive punch, articulate cut
  '4x10-closed': {
    name: '4x10 Super Bassman',
    resonanceFreq: 74,
    resonanceGainDb: 5.8,
    resonanceQ: 1.3,
    lowCutFreq: 68,
    midScoopFreq: 480,
    midScoopDb: -3.0,
    speakerCutoff: 5000,
    enclosureType: 'closed',
    reflectionDelayMs: 0,
    reflectionStrength: 0,
  },

  // 4x12 Closed Back Stadium Stack (Marshall 1960A / Mesa Recto 4x12 V30 style)
  // Iconic "Wall of Sound" roar: massive 68 Hz low-end thump, multi-cone phase scoop at 450 Hz,
  // steep 4.1 kHz roll-off that tames harsh fizz into heavy rock authority.
  '4x12-closed': {
    name: '4x12 1960 V30 Stack',
    resonanceFreq: 68,
    resonanceGainDb: 8.5,
    resonanceQ: 1.6,
    lowCutFreq: 60,
    midScoopFreq: 450,
    midScoopDb: -4.5,
    speakerCutoff: 4200,
    enclosureType: 'closed',
    reflectionDelayMs: 0,
    reflectionStrength: 0,
  },
};

/** RBJ Biquad Filter Coefficients */
interface Biquad { b0: number; b1: number; b2: number; a1: number; a2: number }

function biquad(
  type: 'lowpass' | 'highpass' | 'peaking' | 'highshelf' | 'lowshelf',
  fs: number,
  f0: number,
  q: number,
  gainDb = 0
): Biquad {
  const w0 = (2 * Math.PI * Math.max(20, Math.min(f0, fs * 0.45))) / fs;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * Math.max(0.01, q));
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
    case 'lowshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * ((A + 1) - (A - 1) * cos + s);
      b1 = 2 * A * ((A - 1) - (A + 1) * cos);
      b2 = A * ((A + 1) - (A - 1) * cos - s);
      a0 = (A + 1) + (A - 1) * cos + s;
      a1 = -2 * ((A - 1) + (A + 1) * cos);
      a2 = (A + 1) + (A - 1) * cos - s;
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
 * Generates an authentic, highly distinct guitar cabinet + microphone impulse response (IR).
 *
 * Distinct acoustic characteristics are modeled for:
 * 1. Enclosure dimensions & low-end thump resonance (1x8 up to 4x12)
 * 2. Transducer sonic signature (SM57 biting punch vs MD421 girth vs Ribbon warmth vs Condenser air)
 * 3. Mic Placement Position (Edge = dark, warm, rolled-off vs Center = biting, bright, in-your-face)
 */
export function generateCabinetImpulseResponse(
  ctx: AudioContext,
  cabinet: CabinetModelId,
  mic: MicModelId,
  position: number = 0.5
): AudioBuffer {
  const fs = ctx.sampleRate;
  // 60ms impulse length captures full speaker attack, low-end tail and enclosure reflection
  const length = Math.floor(fs * 0.06);
  const buffer = ctx.createBuffer(2, length, fs);

  const profile = CABINET_PROFILES[cabinet === 'custom' ? '4x12-closed' : cabinet] || CABINET_PROFILES['4x12-closed'];
  const posNorm = Math.max(0, Math.min(1, position)); // 0.0 = Edge, 1.0 = Center

  // -------------------------------------------------------------
  // 1. Microphone Placement (Edge vs Center) Dynamics
  // Center (1.0): Direct dustcap radiation -> full aggressive presence, extended highs
  // Edge (0.0): Cone surround -> heavy high roll-off (-9 dB), rich warm dark low-mids
  // -------------------------------------------------------------
  const posCutoffShift = (posNorm - 0.5) * 2200; // -1100 Hz at Edge to +1100 Hz at Center
  const effectiveCutoff = Math.max(2600, Math.min(6800, profile.speakerCutoff + posCutoffShift));

  // High-shelf presence shift depending on cone placement
  const posBrightnessDb = -7.0 + posNorm * 14.0; // -7 dB at Edge, +7 dB at Center!

  // -------------------------------------------------------------
  // 2. Microphone Acoustic Transducer Profile
  // -------------------------------------------------------------
  let micPresenceFreq = 4800;
  let micPresenceDb = 5.0;
  let micPresenceQ = 1.3;
  let micLowShelfDb = 0;
  let micAirDb = 0;

  switch (mic) {
    case 'sm57':
      // Shure SM57: Aggressive 4.5 - 5.5 kHz presence spike, sharp low-cut below 110 Hz
      micPresenceFreq = 4800;
      micPresenceDb = 6.5;
      micPresenceQ = 1.4;
      micLowShelfDb = -2.5; // Tighter bottom end, cuts through dense mixes
      micAirDb = -2.0;      // Natural dynamic roll-off above 7 kHz
      break;

    case 'md421':
      // Sennheiser MD421: Massive bottom end girth, slight 1 kHz scoop, crisp 3.8 kHz bite
      micPresenceFreq = 3800;
      micPresenceDb = 5.0;
      micPresenceQ = 1.2;
      micLowShelfDb = 4.0;  // Heavy, authoritative bass punch
      micAirDb = 1.0;
      break;

    case 'ribbon':
      // Royer R-121: Velvety smooth, ultra-warm, zero harshness, creamy rolled-off top
      micPresenceFreq = 2600;
      micPresenceDb = 2.0;
      micPresenceQ = 0.9;
      micLowShelfDb = 5.5;  // Massive body & proximity warmth
      micAirDb = -7.5;      // Smooth vintage high-end roll-off
      break;

    case 'condenser':
      // Studio Large Diaphragm Condenser (C414 / U87 style):
      // Full extended frequency bandwidth, airy hi-fi sparkle, flat accurate lows
      micPresenceFreq = 6500;
      micPresenceDb = 4.0;
      micPresenceQ = 1.0;
      micLowShelfDb = 1.0;
      micAirDb = 6.0;       // Extended 8-12 kHz sparkle and breath
      break;
  }

  // -------------------------------------------------------------
  // 3. Synthesize Raw Impulse Response
  // -------------------------------------------------------------
  const ir = new Float32Array(length);
  ir[0] = 1.0;

  // A. Cabinet Acoustic Low-Cut (enclosure air spring limit)
  applyBiquad(ir, biquad('highpass', fs, profile.lowCutFreq, 0.707));

  // B. Cabinet Low-End Resonant Thump (speaker cone + cabinet volume box resonance)
  applyBiquad(ir, biquad('peaking', fs, profile.resonanceFreq, profile.resonanceQ, profile.resonanceGainDb));

  // C. Microphone Low-End Characteristic (Proximity effect & bass voicing)
  if (micLowShelfDb !== 0) {
    applyBiquad(ir, biquad('lowshelf', fs, 180, 0.75, micLowShelfDb));
  }

  // D. Cabinet Enclosure Mid-Dip / Multi-cone Phase Cancellation
  if (profile.midScoopDb !== 0 && profile.midScoopFreq > 0) {
    applyBiquad(ir, biquad('peaking', fs, profile.midScoopFreq, 1.2, profile.midScoopDb));
  }

  // E. Dynamic Mic Placement Tone Shaper (Edge <-> Center)
  applyBiquad(ir, biquad('highshelf', fs, 3200, 0.707, posBrightnessDb));

  // F. Microphone Presence Peak
  applyBiquad(ir, biquad('peaking', fs, micPresenceFreq, micPresenceQ, micPresenceDb));

  // G. Speaker High-Frequency Ceiling (4-Pole Butterworth Acoustic Roll-off)
  // Real guitar speakers sharply roll off above 4 - 5 kHz, cutting all synthetic buzz
  applyBiquad(ir, biquad('lowpass', fs, effectiveCutoff, 0.5412));
  applyBiquad(ir, biquad('lowpass', fs, effectiveCutoff, 1.3066));

  // H. Top-End Air / Roll-off
  if (micAirDb !== 0) {
    applyBiquad(ir, biquad('highshelf', fs, 7800, 0.707, micAirDb));
  }

  // I. Open-Back Rear Reflection Phase Wave
  // Sound radiating from the rear of an open cabinet travels slightly longer, arriving
  // with inverted phase, creating the authentic airy 3D bloom of vintage combos.
  if (profile.enclosureType === 'open' && profile.reflectionDelayMs > 0) {
    const delaySamples = Math.floor((profile.reflectionDelayMs / 1000) * fs);
    const dry = Float32Array.from(ir);
    for (let i = delaySamples; i < length; i++) {
      ir[i] -= profile.reflectionStrength * dry[i - delaySamples];
    }
  }

  // J. Natural Smooth Window Fade-out to prevent boundary truncation clicks
  const fadeStart = Math.floor(length * 0.75);
  for (let i = fadeStart; i < length; i++) {
    const progress = (i - fadeStart) / (length - fadeStart);
    ir[i] *= 0.5 * (1 + Math.cos(Math.PI * progress));
  }

  // -------------------------------------------------------------
  // 4. Perceptual Loudness Calibration
  // Normalize based on core mid-band energy (500 Hz - 2.5 kHz) so overall loudness
  // stays stable while bass weight, mid-scoop, and presence bite remain 100% audible!
  // -------------------------------------------------------------
  const refFreqs = [500, 800, 1000, 1400, 2000, 2500];
  let refEnergy = 0;
  for (const f of refFreqs) {
    const w = (2 * Math.PI * f) / fs;
    let re = 0, im = 0;
    for (let n = 0; n < length; n++) {
      re += ir[n] * Math.cos(w * n);
      im -= ir[n] * Math.sin(w * n);
    }
    refEnergy += re * re + im * im;
  }
  const midBandRms = Math.sqrt(refEnergy / refFreqs.length) || 1.0;
  const calibrationGain = 1.0 / midBandRms;

  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  for (let i = 0; i < length; i++) {
    left[i] = ir[i] * calibrationGain;
  }

  // Subtle micro-decorrelation for realistic stereo room dispersion
  for (let i = 0; i < length; i++) {
    const offsetIdx = Math.min(i + 3, length - 1);
    right[i] = left[i] * 0.94 + left[offsetIdx] * 0.06;
  }

  return buffer;
}
