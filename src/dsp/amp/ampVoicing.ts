import type { AmpModelId } from '../../types/amp';

/**
 * Per-model amp voicing data.
 *
 * These are circuit-inspired approximations, not measured amp captures or a
 * component-level SPICE model. Each amp gets its own preamp transfer shape
 * (drive / asymmetry / bias), power-amp saturation and tone-stack corner
 * frequencies so the 18 models do not collapse into four shared curves.
 */
export interface CurveShape {
  kind: 'clean' | 'tube';
  /** Maximum absolute output of the shaper (keeps headroom before the next stage). */
  headroom: number;
  /** Clean only: linear region before the soft knee. */
  threshold: number;
  /** Tube only: overall saturation amount. */
  drive: number;
  /** Tube only: extra gain on the positive half (asymmetry / even harmonics). */
  positive: number;
  /** Tube only: extra gain on the negative half. */
  negative: number;
  /** Tube only: operating-point offset before the transfer function. */
  bias: number;
}

export interface AmpVoicingProfile {
  preampHighpassHz: number;
  preampPeakHz: number;
  preampPeakQ: number;
  preampPeakGainDb: number;
  /** Gain knob mapping: gainMin + gainNorm^gainExponent * gainRange. */
  gainMin: number;
  gainRange: number;
  gainExponent: number;
  toneStackBassHz: number;
  toneStackMidHz: number;
  toneStackMidQ: number;
  toneStackTrebleHz: number;
  presenceHz: number;
  presenceQ: number;
  preampCurve: CurveShape;
  powerAmpCurve: CurveShape;
  masterScale: number;
  /** Power amp tube sag: ratio (1.0 = solid state / no sag, 1.8-2.6 = tube sag). */
  sagRatio?: number;
  /** Power amp tube sag: threshold in dB where B+ voltage starts to sag (default: -15). */
  sagThresholdDb?: number;
  /** Power amp tube sag: recovery bloom time in seconds (default: 0.055). */
  sagReleaseSec?: number;
}

const cleanCurve = (threshold = 0.9, headroom = 0.98): CurveShape => ({
  kind: 'clean',
  headroom,
  threshold,
  drive: 1,
  positive: 1,
  negative: 1,
  bias: 0,
});

const tubeCurve = (
  drive: number,
  positive: number,
  negative: number,
  bias: number,
  headroom = 0.95
): CurveShape => ({
  kind: 'tube',
  headroom,
  threshold: 0,
  drive,
  positive,
  negative,
  bias,
});

/**
 * Tone-stack corner frequencies follow the character of each amp rather than a
 * single 110 Hz / 650 Hz / 3.2 kHz stack for everything. Values are still a
 * simplified shelving/peaking approximation of an FMV stack, not its exact
 * interactive impedance network.
 */
export const AMP_VOICING: Record<AmpModelId, AmpVoicingProfile> = {
  'pristine-clean': {
    preampHighpassHz: 40,
    preampPeakHz: 1200,
    preampPeakQ: 0.7,
    preampPeakGainDb: 0,
    gainMin: 0.9,
    gainRange: 1.1,
    gainExponent: 1.2,
    toneStackBassHz: 120,
    toneStackMidHz: 800,
    toneStackMidQ: 0.7,
    toneStackTrebleHz: 4000,
    presenceHz: 5000,
    presenceQ: 0.8,
    preampCurve: cleanCurve(0.9, 0.98),
    // JC-120 is solid-state: high-headroom power stage, no tube sag.
    powerAmpCurve: cleanCurve(0.95, 0.98),
    masterScale: 1.4,
    sagRatio: 1.0,
  },

  'fender-twin': {
    preampHighpassHz: 45,
    preampPeakHz: 2400,
    preampPeakQ: 0.85,
    preampPeakGainDb: 1.8,
    gainMin: 0.85,
    gainRange: 1.8,
    gainExponent: 1.3,
    toneStackBassHz: 90,
    toneStackMidHz: 700,
    toneStackMidQ: 0.8,
    toneStackTrebleHz: 3500,
    presenceHz: 4500,
    presenceQ: 0.9,
    // Very late breakup: the 12AX7s stay mostly linear until the power stage.
    preampCurve: tubeCurve(1.1, 1.05, 1.1, 0.015, 0.97),
    powerAmpCurve: tubeCurve(1.1, 1.0, 1.05, 0.005, 0.98),
    masterScale: 1.4,
    sagRatio: 1.4,
    sagThresholdDb: -12,
    sagReleaseSec: 0.035,
  },

  'clean-tweed': {
    preampHighpassHz: 65,
    preampPeakHz: 450,
    preampPeakQ: 0.9,
    preampPeakGainDb: 1.5,
    gainMin: 0.75,
    gainRange: 3.8,
    gainExponent: 1.5,
    toneStackBassHz: 80,
    toneStackMidHz: 500,
    toneStackMidQ: 0.9,
    toneStackTrebleHz: 2800,
    presenceHz: 3800,
    presenceQ: 1.0,
    preampCurve: tubeCurve(1.7, 1.5, 2.1, 0.03),
    powerAmpCurve: tubeCurve(1.3, 1.0, 1.1, 0.01, 0.97),
    masterScale: 1.5,
    sagRatio: 2.6,
    sagThresholdDb: -18,
    sagReleaseSec: 0.08,
  },

  'fender-deluxe': {
    preampHighpassHz: 60,
    preampPeakHz: 850,
    preampPeakQ: 0.8,
    preampPeakGainDb: -1.2,
    gainMin: 0.8,
    gainRange: 4.6,
    gainExponent: 1.4,
    toneStackBassHz: 90,
    toneStackMidHz: 750,
    toneStackMidQ: 0.85,
    toneStackTrebleHz: 3200,
    presenceHz: 4200,
    presenceQ: 0.95,
    preampCurve: tubeCurve(2.2, 1.9, 2.6, 0.03),
    // 6V6 power tubes break up earlier than the 6L6 amps.
    powerAmpCurve: tubeCurve(1.45, 1.0, 1.15, 0.01, 0.97),
    masterScale: 1.5,
    sagRatio: 2.2,
    sagThresholdDb: -16,
    sagReleaseSec: 0.06,
  },

  'chime-ac30': {
    preampHighpassHz: 85,
    preampPeakHz: 2600,
    preampPeakQ: 1.2,
    preampPeakGainDb: 4.0,
    gainMin: 1.1,
    gainRange: 8.5,
    gainExponent: 1.45,
    toneStackBassHz: 100,
    toneStackMidHz: 900,
    toneStackMidQ: 1.1,
    toneStackTrebleHz: 3800,
    presenceHz: 5000,
    presenceQ: 1.2,
    preampCurve: tubeCurve(2.5, 2.2, 3.0, 0.04),
    // Class-A EL84: relatively early, compressed power-stage breakup.
    powerAmpCurve: tubeCurve(1.65, 1.0, 1.2, 0.015),
    masterScale: 1.5,
    sagRatio: 2.4,
    sagThresholdDb: -16,
    sagReleaseSec: 0.075,
  },

  'crunch-plexi': {
    preampHighpassHz: 95,
    preampPeakHz: 1400,
    preampPeakQ: 1.0,
    preampPeakGainDb: 3.2,
    gainMin: 1.2,
    gainRange: 12.0,
    gainExponent: 1.5,
    toneStackBassHz: 100,
    toneStackMidHz: 700,
    toneStackMidQ: 1.0,
    toneStackTrebleHz: 3200,
    presenceHz: 4500,
    presenceQ: 1.0,
    preampCurve: tubeCurve(3.1, 2.7, 3.4, 0.04),
    powerAmpCurve: tubeCurve(1.35, 1.0, 1.1, 0.01),
    masterScale: 1.5,
    sagRatio: 2.1,
    sagThresholdDb: -15,
    sagReleaseSec: 0.06,
  },

  'marshall-jcm800': {
    preampHighpassHz: 110,
    preampPeakHz: 1750,
    preampPeakQ: 1.15,
    preampPeakGainDb: 3.8,
    gainMin: 1.3,
    gainRange: 15.0,
    gainExponent: 1.5,
    toneStackBassHz: 110,
    toneStackMidHz: 750,
    toneStackMidQ: 1.1,
    toneStackTrebleHz: 3400,
    presenceHz: 4800,
    presenceQ: 1.05,
    preampCurve: tubeCurve(4.0, 3.2, 4.1, 0.05),
    powerAmpCurve: tubeCurve(1.4, 1.0, 1.1, 0.01),
    masterScale: 1.5,
    sagRatio: 1.9,
    sagThresholdDb: -15,
    sagReleaseSec: 0.05,
  },

  'marshall-silver-jubilee': {
    preampHighpassHz: 115,
    preampPeakHz: 1300,
    preampPeakQ: 1.1,
    preampPeakGainDb: 2.8,
    gainMin: 1.4,
    gainRange: 18.0,
    gainExponent: 1.55,
    toneStackBassHz: 110,
    toneStackMidHz: 650,
    toneStackMidQ: 1.0,
    toneStackTrebleHz: 3000,
    presenceHz: 4200,
    presenceQ: 1.0,
    preampCurve: tubeCurve(4.5, 3.4, 4.4, 0.05),
    powerAmpCurve: tubeCurve(1.45, 1.0, 1.1, 0.01),
    masterScale: 1.5,
  },

  'orange-rockerverb': {
    preampHighpassHz: 80,
    preampPeakHz: 680,
    preampPeakQ: 1.05,
    preampPeakGainDb: 3.4,
    gainMin: 1.4,
    gainRange: 17.0,
    gainExponent: 1.5,
    toneStackBassHz: 120,
    toneStackMidHz: 550,
    toneStackMidQ: 1.1,
    toneStackTrebleHz: 2800,
    presenceHz: 4000,
    presenceQ: 1.05,
    preampCurve: tubeCurve(4.8, 3.1, 4.2, 0.06),
    powerAmpCurve: tubeCurve(1.55, 1.0, 1.15, 0.015),
    masterScale: 1.5,
  },

  'dumble-ods': {
    preampHighpassHz: 75,
    preampPeakHz: 1100,
    preampPeakQ: 1.3,
    preampPeakGainDb: 2.6,
    gainMin: 0.9,
    gainRange: 7.5,
    gainExponent: 1.4,
    toneStackBassHz: 90,
    toneStackMidHz: 800,
    toneStackMidQ: 1.4,
    toneStackTrebleHz: 3000,
    presenceHz: 4200,
    presenceQ: 1.1,
    preampCurve: tubeCurve(3.0, 2.2, 2.9, 0.05),
    powerAmpCurve: tubeCurve(1.2, 1.0, 1.05, 0.005),
    masterScale: 1.5,
  },

  'mesa-lonestar': {
    preampHighpassHz: 70,
    preampPeakHz: 550,
    preampPeakQ: 0.95,
    preampPeakGainDb: 1.8,
    gainMin: 0.85,
    gainRange: 6.5,
    gainExponent: 1.4,
    toneStackBassHz: 85,
    toneStackMidHz: 650,
    toneStackMidQ: 1.0,
    toneStackTrebleHz: 3200,
    presenceHz: 4500,
    presenceQ: 1.0,
    preampCurve: tubeCurve(2.6, 2.0, 2.8, 0.04),
    powerAmpCurve: tubeCurve(1.2, 1.0, 1.05, 0.005),
    masterScale: 1.5,
  },

  'mesa-mark': {
    preampHighpassHz: 130,
    preampPeakHz: 750,
    preampPeakQ: 1.3,
    preampPeakGainDb: -3.2,
    gainMin: 1.5,
    gainRange: 20.0,
    gainExponent: 1.6,
    toneStackBassHz: 100,
    toneStackMidHz: 600,
    toneStackMidQ: 1.3,
    toneStackTrebleHz: 3500,
    presenceHz: 5000,
    presenceQ: 1.1,
    preampCurve: tubeCurve(5.2, 3.7, 5.0, 0.07),
    powerAmpCurve: tubeCurve(1.45, 1.0, 1.1, 0.01),
    masterScale: 1.5,
  },

  'lead-recto': {
    preampHighpassHz: 120,
    preampPeakHz: 720,
    preampPeakQ: 1.2,
    preampPeakGainDb: -2.5,
    gainMin: 1.5,
    gainRange: 22.0,
    gainExponent: 1.6,
    toneStackBassHz: 130,
    toneStackMidHz: 600,
    toneStackMidQ: 1.2,
    toneStackTrebleHz: 3600,
    presenceHz: 5000,
    presenceQ: 1.1,
    preampCurve: tubeCurve(5.5, 3.5, 4.8, 0.07),
    powerAmpCurve: tubeCurve(1.5, 1.0, 1.1, 0.01),
    masterScale: 1.5,
  },

  'soldano-slo100': {
    preampHighpassHz: 125,
    preampPeakHz: 1600,
    preampPeakQ: 1.25,
    preampPeakGainDb: 3.6,
    gainMin: 1.6,
    gainRange: 23.5,
    gainExponent: 1.6,
    toneStackBassHz: 110,
    toneStackMidHz: 750,
    toneStackMidQ: 1.2,
    toneStackTrebleHz: 3600,
    presenceHz: 4800,
    presenceQ: 1.1,
    preampCurve: tubeCurve(5.2, 3.8, 5.2, 0.06),
    powerAmpCurve: tubeCurve(1.5, 1.0, 1.1, 0.01),
    masterScale: 1.5,
  },

  'bogner-ecstasy': {
    preampHighpassHz: 110,
    preampPeakHz: 1200,
    preampPeakQ: 1.05,
    preampPeakGainDb: 2.2,
    gainMin: 1.5,
    gainRange: 21.0,
    gainExponent: 1.55,
    toneStackBassHz: 110,
    toneStackMidHz: 700,
    toneStackMidQ: 1.1,
    toneStackTrebleHz: 3200,
    presenceHz: 4400,
    presenceQ: 1.05,
    preampCurve: tubeCurve(4.8, 3.3, 4.4, 0.06),
    powerAmpCurve: tubeCurve(1.5, 1.0, 1.1, 0.01),
    masterScale: 1.5,
  },

  'evh-5150': {
    preampHighpassHz: 140,
    preampPeakHz: 1900,
    preampPeakQ: 1.35,
    preampPeakGainDb: 4.2,
    gainMin: 1.8,
    gainRange: 26.5,
    gainExponent: 1.65,
    toneStackBassHz: 120,
    toneStackMidHz: 650,
    toneStackMidQ: 1.3,
    toneStackTrebleHz: 3800,
    presenceHz: 5200,
    presenceQ: 1.15,
    preampCurve: tubeCurve(6.0, 3.9, 5.4, 0.08),
    powerAmpCurve: tubeCurve(1.55, 1.0, 1.12, 0.012),
    masterScale: 1.5,
  },

  'modern-djent': {
    preampHighpassHz: 155,
    preampPeakHz: 1800,
    preampPeakQ: 1.4,
    preampPeakGainDb: 4.5,
    gainMin: 2.0,
    gainRange: 26.0,
    gainExponent: 1.65,
    toneStackBassHz: 140,
    toneStackMidHz: 800,
    toneStackMidQ: 1.4,
    toneStackTrebleHz: 4000,
    presenceHz: 5500,
    presenceQ: 1.2,
    preampCurve: tubeCurve(6.4, 4.1, 5.6, 0.08),
    powerAmpCurve: tubeCurve(1.6, 1.0, 1.12, 0.012),
    masterScale: 1.5,
  },

  'engl-powerball': {
    preampHighpassHz: 150,
    preampPeakHz: 2100,
    preampPeakQ: 1.4,
    preampPeakGainDb: 4.0,
    gainMin: 1.9,
    gainRange: 27.5,
    gainExponent: 1.65,
    toneStackBassHz: 130,
    toneStackMidHz: 700,
    toneStackMidQ: 1.3,
    toneStackTrebleHz: 3900,
    presenceHz: 5200,
    presenceQ: 1.15,
    preampCurve: tubeCurve(6.1, 3.85, 5.5, 0.075),
    powerAmpCurve: tubeCurve(1.58, 1.0, 1.1, 0.012),
    masterScale: 1.5,
  },
};

export function getAmpVoicing(model: AmpModelId): AmpVoicingProfile {
  return AMP_VOICING[model];
}

function buildCleanCurve(spec: CurveShape, samples: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(samples * Float32Array.BYTES_PER_ELEMENT));
  // Distance from the knee to the input limit, and the output headroom gained
  // over that same region. The tanh is normalized to reach exactly `headroom`.
  const knee = Math.max(1e-4, spec.headroom - spec.threshold);
  const inputSpan = Math.max(1e-4, 1 - spec.threshold);
  const norm = 1 / Math.tanh(1);

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / (samples - 1) - 1;
    const a = Math.abs(x);
    if (a <= spec.threshold) {
      curve[i] = x;
    } else {
      const over = (a - spec.threshold) / inputSpan;
      curve[i] = Math.sign(x) * (spec.threshold + knee * Math.tanh(over) * norm);
    }
  }
  return curve;
}

function buildTubeCurve(spec: CurveShape, samples: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(samples * Float32Array.BYTES_PER_ELEMENT));
  const transfer = (u: number): number =>
    u >= 0
      ? Math.tanh(spec.drive * spec.positive * u)
      : Math.tanh(spec.drive * spec.negative * u);
  const atBias = transfer(spec.bias);
  const positiveSpan = Math.max(1e-6, transfer(1 + spec.bias) - atBias);
  const negativeSpan = Math.max(1e-6, atBias - transfer(-1 + spec.bias));

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / (samples - 1) - 1;
    const y = transfer(x + spec.bias) - atBias;
    const span = x >= 0 ? positiveSpan : negativeSpan;
    curve[i] = (y / span) * spec.headroom;
  }
  return curve;
}

export function makePreampCurve(
  model: AmpModelId,
  samples = 4096
): Float32Array<ArrayBuffer> {
  const spec = getAmpVoicing(model).preampCurve;
  return spec.kind === 'clean' ? buildCleanCurve(spec, samples) : buildTubeCurve(spec, samples);
}

export function makePowerAmpCurve(
  model: AmpModelId,
  samples = 2048
): Float32Array<ArrayBuffer> {
  const spec = getAmpVoicing(model).powerAmpCurve;
  return spec.kind === 'clean' ? buildCleanCurve(spec, samples) : buildTubeCurve(spec, samples);
}
