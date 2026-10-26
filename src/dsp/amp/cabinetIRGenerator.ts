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

  // 2x12 Fender Twin Reverb style (Huge pristine clean headroom)
  '2x12-fender': {
    name: '2x12 Twin Reverb',
    resonanceFreq: 82,
    resonanceGainDb: 4.8,
    resonanceQ: 1.25,
    lowCutFreq: 76,
    midScoopFreq: 320,
    midScoopDb: -3.5,
    speakerCutoff: 5600,
    enclosureType: 'open',
    reflectionDelayMs: 6.0,
    reflectionStrength: 0.28,
  },

  // 4x10 Open Back Tweed (Fender '59 Bassman 4x10 style)
  '4x10-open': {
    name: '4x10 Bassman Tweed',
    resonanceFreq: 72,
    resonanceGainDb: 5.6,
    resonanceQ: 1.3,
    lowCutFreq: 65,
    midScoopFreq: 460,
    midScoopDb: -3.0,
    speakerCutoff: 5200,
    enclosureType: 'open',
    reflectionDelayMs: 4.8,
    reflectionStrength: 0.26,
  },

  // 4x10 Closed Back Stack
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

  // 2x12 Open Back British Combo (Vox AC30 Top Boost style)
  '2x12-open': {
    name: '2x12 AC30 Top Boost',
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

  // 4x12 Marshall Greenback Stack (Celestion G12M-25, woody classic rock crunch)
  '4x12-greenback': {
    name: '4x12 1960AX Greenback',
    resonanceFreq: 72,
    resonanceGainDb: 7.4,
    resonanceQ: 1.45,
    lowCutFreq: 65,
    midScoopFreq: 500,
    midScoopDb: -3.6,
    speakerCutoff: 4600,
    enclosureType: 'closed',
    reflectionDelayMs: 0,
    reflectionStrength: 0,
  },

  // 4x12 Marshall 1960A Vintage 30 Stack
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

  // 1x12 Closed Ported Cab (Mesa Thiele EVM12L style)
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

  // 2x12 Closed Heavy Rock Cab (Mesa Rectifier Vertical 2x12)
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

  // 4x12 Mesa Oversized Rectifier Standard (Massive sub-bass resonance)
  '4x12-recto-os': {
    name: '4x12 Rectifier Oversized',
    resonanceFreq: 55,
    resonanceGainDb: 9.8,
    resonanceQ: 1.7,
    lowCutFreq: 48,
    midScoopFreq: 400,
    midScoopDb: -5.0,
    speakerCutoff: 4100,
    enclosureType: 'closed',
    reflectionDelayMs: 0,
    reflectionStrength: 0,
  },

  // 4x12 Orange PPC412 (18mm Baltic Birch, dense dark midrange roar)
  '4x12-orange': {
    name: '4x12 Orange PPC412',
    resonanceFreq: 64,
    resonanceGainDb: 8.2,
    resonanceQ: 1.55,
    lowCutFreq: 58,
    midScoopFreq: 360,
    midScoopDb: -2.2,
    speakerCutoff: 3950,
    enclosureType: 'closed',
    reflectionDelayMs: 0,
    reflectionStrength: 0,
  },

  // 1x12 Dumble Style Oval Ported (EVM-12L / G12-65 boutique touch bloom)
  '1x12-dumble': {
    name: '1x12 Dumble Oval Ported',
    resonanceFreq: 88,
    resonanceGainDb: 4.6,
    resonanceQ: 1.3,
    lowCutFreq: 82,
    midScoopFreq: 280,
    midScoopDb: -2.0,
    speakerCutoff: 5100,
    enclosureType: 'open',
    reflectionDelayMs: 4.2,
    reflectionStrength: 0.22,
  },

  // 2x12 Roland JC-120 Stereo Flat (Pure uncolored pedal platform)
  '2x12-jc120': {
    name: '2x12 JC-120 Stereo Flat',
    resonanceFreq: 70,
    resonanceGainDb: 2.2,
    resonanceQ: 0.9,
    lowCutFreq: 55,
    midScoopFreq: 0,
    midScoopDb: 0,
    speakerCutoff: 6500,
    enclosureType: 'open',
    reflectionDelayMs: 5.5,
    reflectionStrength: 0.20,
  },

  // 4x12 EVH 5150 III (Celestion G12-EVH modern high-gain speed)
  '4x12-5150': {
    name: '4x12 5150 III Stealth',
    resonanceFreq: 66,
    resonanceGainDb: 8.4,
    resonanceQ: 1.65,
    lowCutFreq: 62,
    midScoopFreq: 460,
    midScoopDb: -4.2,
    speakerCutoff: 4350,
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
      const shelfQ = Math.max(0.1, q);
      const s = sin * Math.sqrt(Math.max(0.001, (A + 1 / A) * (1 / shelfQ - 1) + 2));
      b0 = A * ((A + 1) + (A - 1) * cos + s);
      b1 = -2 * A * ((A - 1) + (A + 1) * cos);
      b2 = A * ((A + 1) + (A - 1) * cos - s);
      a0 = (A + 1) - (A - 1) * cos + s;
      a1 = 2 * ((A - 1) - (A + 1) * cos);
      a2 = (A + 1) - (A - 1) * cos - s;
      break;
    }
    case 'lowshelf': {
      const shelfQ = Math.max(0.1, q);
      const s = sin * Math.sqrt(Math.max(0.001, (A + 1 / A) * (1 / shelfQ - 1) + 2));
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

/** Adds one exponentially damped sine (a cabinet/speaker resonance mode). */
function addResonantMode(
  ir: Float32Array,
  fs: number,
  freq: number,
  amp: number,
  decayMs: number
): void {
  const w0 = (2 * Math.PI * freq) / fs;
  const decay = 1000 / Math.max(5, decayMs); // amplitude decay per second
  for (let i = 0; i < ir.length; i++) {
    ir[i] += amp * Math.sin(w0 * i) * Math.exp(-(i / fs) * decay);
  }
}

/**
 * Adds a short diffuse tail built from seeded noise, low-passed to the speaker
 * band. Real cabinet IRs are broadband decaying noise after the initial
 * transient; this keeps the convolution from sounding like a single click.
 */
function addDiffuseTail(ir: Float32Array, fs: number, seedBase: number, distNorm: number): void {
  let seed = (0x9e3779b9 ^ Math.round(seedBase * 1000)) >>> 0;
  const rnd = (): number => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    seed >>>= 0;
    return (seed / 0xffffffff) * 2 - 1;
  };

  let lp = 0;
  const lpCoef = 0.5; // ~4.8 kHz one-pole
  const tau = 0.028 + distNorm * 0.035;
  for (let i = 0; i < ir.length; i++) {
    lp += lpCoef * (rnd() - lp);
    const t = i / fs;
    const attack = 1 - Math.exp(-t / 0.0012);
    ir[i] += lp * attack * Math.exp(-t / tau) * 0.10;
  }
}

/**
 * Procedurally generates a guitar cabinet + microphone impulse response.
 *
 * This is a synthetic model (filtered transient + modal/noise decay), not a
 * measured capture of the real cabinets it is named after.
 *
 * Distinct acoustic characteristics are modeled for:
 * 1. Enclosure dimensions & low-end thump resonance (1x8 up to 4x12 Oversized)
 * 2. Transducer sonic signature (SM57, SM7B, MD421, R-121, M160, C414)
 * 3. Mic Placement Position (Edge = dark, warm vs Center = biting, bright)
 * 4. Mic Distance (Close = proximity punch vs Far = open studio room air)
 */
export function generateCabinetImpulseResponse(
  ctx: AudioContext,
  cabinet: CabinetModelId,
  mic: MicModelId,
  position: number = 0.5,
  distance: number = 0.15
): AudioBuffer {
  const fs = ctx.sampleRate;
  // 180ms: long enough to carry the low resonance / cone-mode decay of a real cabinet.
  // The previous 60ms window cut the tail off after a few cycles, so convolution
  // behaved like a static EQ spike instead of a resonant cabinet.
  const length = Math.floor(fs * 0.18);
  const buffer = ctx.createBuffer(2, length, fs);

  const profile = CABINET_PROFILES[cabinet === 'custom' ? '4x12-closed' : cabinet] || CABINET_PROFILES['4x12-closed'];
  const posNorm = Math.max(0, Math.min(1, position)); // 0.0 = Edge, 1.0 = Center
  const distNorm = Math.max(0, Math.min(1, distance)); // 0.0 = Close (0.5"), 1.0 = Far (6")

  // -------------------------------------------------------------
  // 1. Microphone Placement (Edge vs Center) Dynamics
  // Center (1.0): Direct dustcap radiation -> full aggressive presence, extended highs
  // Edge (0.0): Cone surround -> heavy high roll-off (-7 dB), rich warm dark low-mids
  // -------------------------------------------------------------
  const posCutoffShift = (posNorm - 0.5) * 2200; // -1100 Hz at Edge to +1100 Hz at Center
  const effectiveCutoff = Math.max(2600, Math.min(6800, profile.speakerCutoff + posCutoffShift));
  const posBrightnessDb = -7.0 + posNorm * 14.0; // -7 dB at Edge, +7 dB at Center

  // -------------------------------------------------------------
  // 2. Microphone Distance & Proximity Effect Dynamics
  // Close (0.0): Strong proximity effect (+3.5 dB around 130 Hz), punchy direct transients
  // Far (1.0): Proximity effect recedes (-3 dB), slight room air dissipation
  // -------------------------------------------------------------
  const proximityDb = 3.5 - distNorm * 7.0; // +3.5 dB (close) down to -3.5 dB (far)
  const roomAirDampeningDb = -distNorm * 2.5; // Natural high air damping at distance

  // -------------------------------------------------------------
  // 3. Microphone Acoustic Transducer Profile
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

    case 'sm7b':
      // Shure SM7B: Muscular, thick midrange body, smooth rolled-off top end (tames high-gain fizz)
      micPresenceFreq = 3600;
      micPresenceDb = 3.8;
      micPresenceQ = 1.1;
      micLowShelfDb = 1.5;  // Warm punchy body
      micAirDb = -4.0;      // Silky soft high-end roll-off
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

    case 'm160':
      // Beyerdynamic M160: Dual-ribbon classic rock authority, focused hypercardioid mids
      micPresenceFreq = 3200;
      micPresenceDb = 3.6;
      micPresenceQ = 1.05;
      micLowShelfDb = 3.2;
      micAirDb = -4.5;
      break;

    case 'condenser':
      // Studio Large Diaphragm Condenser (C414 style):
      // Full extended frequency bandwidth, airy hi-fi sparkle, flat accurate lows
      micPresenceFreq = 6500;
      micPresenceDb = 4.0;
      micPresenceQ = 1.0;
      micLowShelfDb = 1.0;
      micAirDb = 6.0;       // Extended 8-12 kHz sparkle and breath
      break;
  }

  // -------------------------------------------------------------
  // 4. Synthesize Raw Impulse Response
  // -------------------------------------------------------------
  const ir = new Float32Array(length);
  // The direct mic transient dominates the attack. Its level relative to the
  // modal/noise tail is set so that, after midband calibration, the attack is
  // still clearly louder than the decay (as in a real close-mic IR).
  ir[0] = 5.0;

  // 4a. Modal cabinet response. The delta above only carries the direct mic
  // transient; a real speaker/cabinet keeps ringing at its cone modes for a few
  // ms. The low-end resonance/thump is already produced by the peaking filter
  // below, so only the short cone modes are added explicitly here (adding a
  // second low-frequency resonator made the bass level unpredictable/inverted
  // depending on phase).
  addResonantMode(ir, fs, 1450, 0.014, 18);
  addResonantMode(ir, fs, 2300, 0.010, 12);
  addResonantMode(ir, fs, 3400, 0.007, 8);

  // 4b. Diffuse cone/air tail (deterministic filtered noise), stronger with mic distance.
  addDiffuseTail(ir, fs, profile.resonanceFreq, distNorm);

  // A. Cabinet Acoustic Low-Cut (enclosure air spring limit)
  applyBiquad(ir, biquad('highpass', fs, profile.lowCutFreq, 0.707));

  // B. Cabinet Low-End Resonant Thump (speaker cone + cabinet volume box resonance)
  applyBiquad(ir, biquad('peaking', fs, profile.resonanceFreq, profile.resonanceQ, profile.resonanceGainDb));

  // C. Proximity & Mic Low-End Characteristic
  const combinedLowDb = micLowShelfDb + proximityDb;
  if (combinedLowDb !== 0) {
    applyBiquad(ir, biquad('lowshelf', fs, 150, 0.75, combinedLowDb));
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
  applyBiquad(ir, biquad('lowpass', fs, effectiveCutoff, 0.5412));
  applyBiquad(ir, biquad('lowpass', fs, effectiveCutoff, 1.3066));

  // H. Top-End Air / Distance Absorption
  const combinedAirDb = micAirDb + roomAirDampeningDb;
  if (combinedAirDb !== 0) {
    applyBiquad(ir, biquad('highshelf', fs, 7800, 0.707, combinedAirDb));
  }

  // I. Open-Back Rear Reflection Phase Wave
  if (profile.enclosureType === 'open' && profile.reflectionDelayMs > 0) {
    const delaySamples = Math.floor((profile.reflectionDelayMs / 1000) * fs);
    const dry = Float32Array.from(ir);
    for (let i = delaySamples; i < length; i++) {
      ir[i] -= profile.reflectionStrength * dry[i - delaySamples];
    }
  }

  // J. Distance Early Studio Room Reflection (adds subtle physical 3D space)
  if (distNorm > 0.25) {
    const roomDelay = Math.floor(0.0025 * fs * distNorm); // 0.6ms to 2.5ms room bounce
    const reflectionAmt = 0.12 * distNorm;
    const dry = Float32Array.from(ir);
    for (let i = roomDelay; i < length; i++) {
      ir[i] += reflectionAmt * dry[i - roomDelay];
    }
  }

  // K. Natural Smooth Window Fade-out to prevent boundary clicks
  const fadeStart = Math.floor(length * 0.75);
  for (let i = fadeStart; i < length; i++) {
    const progress = (i - fadeStart) / (length - fadeStart);
    ir[i] *= 0.5 * (1 + Math.cos(Math.PI * progress));
  }

  // -------------------------------------------------------------
  // 5. Perceptual Loudness Calibration
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

  // The previous 60 ms IR produced a white-noise convolution RMS of ~0.56.
  // A longer decay adds energy, so normalize total energy too; otherwise the
  // cabinet would jump several dB louder just because the tail is longer.
  let energy = 0;
  for (let i = 0; i < length; i++) {
    const v = ir[i] * calibrationGain;
    energy += v * v;
  }
  const loudnessGain = 0.56 / (Math.sqrt(energy) || 1);
  const finalGain = calibrationGain * loudnessGain;

  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  for (let i = 0; i < length; i++) {
    left[i] = ir[i] * finalGain;
  }

  // Subtle micro-decorrelation for realistic stereo room dispersion
  for (let i = 0; i < length; i++) {
    const offsetIdx = Math.min(i + 3, length - 1);
    right[i] = left[i] * 0.94 + left[offsetIdx] * 0.06;
  }

  return buffer;
}
