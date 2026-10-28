import type { AmpModelId } from '../../types/amp';

/**
 * Per-model amp voicing data.
 *
 * These are circuit-inspired approximations, not measured amp captures or a
 * component-level SPICE model. Each amp gets its own preamp transfer shape
 * (drive / asymmetry / bias), power-amp saturation, 12AX7 plate/Miller snubber
 * low-pass, output transformer roll-off, and tone-stack corner frequencies
 * so the 18 models each deliver authentic harmonic character without digital fizz.
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
  /** 12AX7 plate snubber / Miller capacitance low-pass after preamp clipping (tames harsh fizz). */
  postPreampLowpassHz?: number;
  /** Output transformer high-frequency roll-off after power-amp saturation. */
  outputLowpassHz?: number;
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
    powerAmpCurve: cleanCurve(0.95, 0.98),
    masterScale: 1.35,
    postPreampLowpassHz: 11000,
    outputLowpassHz: 12000,
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
    preampCurve: tubeCurve(1.1, 1.05, 1.1, 0.015, 0.97),
    powerAmpCurve: tubeCurve(1.1, 1.0, 1.05, 0.005, 0.98),
    masterScale: 1.35,
    postPreampLowpassHz: 8500,
    outputLowpassHz: 9200,
    sagRatio: 1.4,
    sagThresholdDb: -12,
    sagReleaseSec: 0.035,
  },

  'clean-tweed': {
    preampHighpassHz: 65,
    preampPeakHz: 650,
    preampPeakQ: 0.9,
    preampPeakGainDb: 2.0,
    gainMin: 0.75,
    gainRange: 3.8,
    gainExponent: 1.45,
    toneStackBassHz: 85,
    toneStackMidHz: 550,
    toneStackMidQ: 0.9,
    toneStackTrebleHz: 2800,
    presenceHz: 3800,
    presenceQ: 1.0,
    preampCurve: tubeCurve(1.7, 1.5, 2.1, 0.03),
    powerAmpCurve: tubeCurve(1.3, 1.0, 1.1, 0.01, 0.97),
    masterScale: 1.35,
    postPreampLowpassHz: 5800,
    outputLowpassHz: 6400,
    sagRatio: 2.5,
    sagThresholdDb: -16,
    sagReleaseSec: 0.08,
  },

  'fender-deluxe': {
    preampHighpassHz: 60,
    preampPeakHz: 850,
    preampPeakQ: 0.8,
    preampPeakGainDb: -1.0,
    gainMin: 0.8,
    gainRange: 4.4,
    gainExponent: 1.4,
    toneStackBassHz: 90,
    toneStackMidHz: 750,
    toneStackMidQ: 0.85,
    toneStackTrebleHz: 3200,
    presenceHz: 4200,
    presenceQ: 0.95,
    preampCurve: tubeCurve(2.1, 1.8, 2.5, 0.03),
    powerAmpCurve: tubeCurve(1.45, 1.0, 1.15, 0.01, 0.97),
    masterScale: 1.35,
    postPreampLowpassHz: 6400,
    outputLowpassHz: 7000,
    sagRatio: 2.2,
    sagThresholdDb: -16,
    sagReleaseSec: 0.06,
  },

  'chime-ac30': {
    preampHighpassHz: 92,
    preampPeakHz: 1120,
    preampPeakQ: 0.88,
    preampPeakGainDb: 3.8,
    gainMin: 1.0,
    gainRange: 5.4,
    gainExponent: 1.38,
    toneStackBassHz: 105,
    toneStackMidHz: 860,
    toneStackMidQ: 0.92,
    toneStackTrebleHz: 3100,
    presenceHz: 3900,
    presenceQ: 0.85,
    // Class-A cathode-biased 12AX7 + EL84 quad: rich 2nd-order harmonic asymmetry, orchestral vocal bloom & Top-Cut smoothing
    preampCurve: tubeCurve(2.2, 1.75, 2.65, 0.065),
    powerAmpCurve: tubeCurve(1.95, 1.18, 1.52, 0.035),
    masterScale: 1.3,
    postPreampLowpassHz: 4350,
    outputLowpassHz: 5100,
    sagRatio: 2.35,
    sagThresholdDb: -16,
    sagReleaseSec: 0.075,
  },

  'crunch-plexi': {
    preampHighpassHz: 98,
    preampPeakHz: 1320,
    preampPeakQ: 0.95,
    preampPeakGainDb: 3.2,
    gainMin: 1.1,
    gainRange: 7.4,
    gainExponent: 1.42,
    toneStackBassHz: 100,
    toneStackMidHz: 700,
    toneStackMidQ: 1.0,
    toneStackTrebleHz: 3200,
    presenceHz: 4300,
    presenceQ: 0.95,
    preampCurve: tubeCurve(2.5, 2.1, 2.8, 0.045),
    powerAmpCurve: tubeCurve(1.5, 1.05, 1.2, 0.015),
    masterScale: 1.35,
    postPreampLowpassHz: 4850,
    outputLowpassHz: 5600,
    sagRatio: 2.1,
    sagThresholdDb: -15,
    sagReleaseSec: 0.06,
  },

  'marshall-jcm800': {
    preampHighpassHz: 112,
    preampPeakHz: 1480,
    preampPeakQ: 1.0,
    preampPeakGainDb: 3.4,
    gainMin: 1.15,
    gainRange: 8.8,
    gainExponent: 1.45,
    toneStackBassHz: 110,
    toneStackMidHz: 750,
    toneStackMidQ: 1.05,
    toneStackTrebleHz: 3200,
    presenceHz: 4400,
    presenceQ: 0.95,
    preampCurve: tubeCurve(3.0, 2.5, 3.2, 0.05),
    powerAmpCurve: tubeCurve(1.45, 1.0, 1.14, 0.012),
    masterScale: 1.35,
    postPreampLowpassHz: 4650,
    outputLowpassHz: 5450,
    sagRatio: 1.9,
    sagThresholdDb: -15,
    sagReleaseSec: 0.05,
  },

  'marshall-silver-jubilee': {
    preampHighpassHz: 115,
    preampPeakHz: 1220,
    preampPeakQ: 1.0,
    preampPeakGainDb: 3.0,
    gainMin: 1.2,
    gainRange: 9.8,
    gainExponent: 1.45,
    toneStackBassHz: 110,
    toneStackMidHz: 650,
    toneStackMidQ: 1.0,
    toneStackTrebleHz: 3000,
    presenceHz: 4100,
    presenceQ: 0.95,
    preampCurve: tubeCurve(3.2, 2.6, 3.4, 0.05),
    powerAmpCurve: tubeCurve(1.45, 1.0, 1.12, 0.012),
    masterScale: 1.35,
    postPreampLowpassHz: 4500,
    outputLowpassHz: 5300,
    sagRatio: 1.9,
    sagThresholdDb: -15,
    sagReleaseSec: 0.05,
  },

  'orange-rockerverb': {
    preampHighpassHz: 90,
    preampPeakHz: 740,
    preampPeakQ: 0.95,
    preampPeakGainDb: 3.2,
    gainMin: 1.2,
    gainRange: 9.6,
    gainExponent: 1.45,
    toneStackBassHz: 115,
    toneStackMidHz: 580,
    toneStackMidQ: 1.05,
    toneStackTrebleHz: 2800,
    presenceHz: 3900,
    presenceQ: 0.95,
    preampCurve: tubeCurve(3.3, 2.5, 3.4, 0.06),
    powerAmpCurve: tubeCurve(1.5, 1.0, 1.15, 0.015),
    masterScale: 1.35,
    postPreampLowpassHz: 4350,
    outputLowpassHz: 5150,
    sagRatio: 2.0,
    sagThresholdDb: -15,
    sagReleaseSec: 0.055,
  },

  'dumble-ods': {
    preampHighpassHz: 78,
    preampPeakHz: 1050,
    preampPeakQ: 1.1,
    preampPeakGainDb: 3.0,
    gainMin: 0.9,
    gainRange: 6.2,
    gainExponent: 1.4,
    toneStackBassHz: 95,
    toneStackMidHz: 780,
    toneStackMidQ: 1.2,
    toneStackTrebleHz: 3000,
    presenceHz: 4100,
    presenceQ: 0.95,
    preampCurve: tubeCurve(2.4, 1.9, 2.6, 0.05),
    powerAmpCurve: tubeCurve(1.3, 1.0, 1.1, 0.008),
    masterScale: 1.35,
    postPreampLowpassHz: 4650,
    outputLowpassHz: 5500,
    sagRatio: 2.0,
    sagThresholdDb: -15,
    sagReleaseSec: 0.06,
  },

  'mesa-lonestar': {
    preampHighpassHz: 72,
    preampPeakHz: 640,
    preampPeakQ: 0.95,
    preampPeakGainDb: 2.2,
    gainMin: 0.85,
    gainRange: 5.8,
    gainExponent: 1.4,
    toneStackBassHz: 88,
    toneStackMidHz: 650,
    toneStackMidQ: 1.0,
    toneStackTrebleHz: 3200,
    presenceHz: 4300,
    presenceQ: 0.95,
    preampCurve: tubeCurve(2.3, 1.85, 2.5, 0.04),
    powerAmpCurve: tubeCurve(1.25, 1.0, 1.06, 0.008),
    masterScale: 1.35,
    postPreampLowpassHz: 5100,
    outputLowpassHz: 6000,
    sagRatio: 2.0,
    sagThresholdDb: -15,
    sagReleaseSec: 0.06,
  },

  'mesa-mark': {
    preampHighpassHz: 130,
    preampPeakHz: 840,
    preampPeakQ: 1.1,
    preampPeakGainDb: 2.8,
    gainMin: 1.25,
    gainRange: 10.8,
    gainExponent: 1.48,
    toneStackBassHz: 100,
    toneStackMidHz: 680,
    toneStackMidQ: 1.15,
    toneStackTrebleHz: 3300,
    presenceHz: 4500,
    presenceQ: 1.0,
    preampCurve: tubeCurve(3.5, 2.8, 3.7, 0.055),
    powerAmpCurve: tubeCurve(1.4, 1.0, 1.1, 0.01),
    masterScale: 1.35,
    postPreampLowpassHz: 4450,
    outputLowpassHz: 5250,
    sagRatio: 1.7,
    sagThresholdDb: -14,
    sagReleaseSec: 0.045,
  },

  'lead-recto': {
    preampHighpassHz: 128,
    preampPeakHz: 950,
    preampPeakQ: 1.05,
    preampPeakGainDb: 2.4,
    gainMin: 1.25,
    gainRange: 11.4,
    gainExponent: 1.48,
    toneStackBassHz: 120,
    toneStackMidHz: 620,
    toneStackMidQ: 1.1,
    toneStackTrebleHz: 3400,
    presenceHz: 4600,
    presenceQ: 1.0,
    preampCurve: tubeCurve(3.6, 2.8, 3.7, 0.055),
    powerAmpCurve: tubeCurve(1.45, 1.0, 1.1, 0.01),
    masterScale: 1.35,
    postPreampLowpassHz: 4350,
    outputLowpassHz: 5150,
    sagRatio: 2.1,
    sagThresholdDb: -15,
    sagReleaseSec: 0.06,
  },

  'soldano-slo100': {
    preampHighpassHz: 125,
    preampPeakHz: 1380,
    preampPeakQ: 1.08,
    preampPeakGainDb: 3.2,
    gainMin: 1.25,
    gainRange: 11.6,
    gainExponent: 1.48,
    toneStackBassHz: 110,
    toneStackMidHz: 750,
    toneStackMidQ: 1.1,
    toneStackTrebleHz: 3400,
    presenceHz: 4500,
    presenceQ: 1.0,
    preampCurve: tubeCurve(3.6, 2.9, 3.8, 0.055),
    powerAmpCurve: tubeCurve(1.45, 1.0, 1.1, 0.01),
    masterScale: 1.35,
    postPreampLowpassHz: 4450,
    outputLowpassHz: 5250,
    sagRatio: 1.8,
    sagThresholdDb: -15,
    sagReleaseSec: 0.05,
  },

  'bogner-ecstasy': {
    preampHighpassHz: 112,
    preampPeakHz: 1150,
    preampPeakQ: 1.02,
    preampPeakGainDb: 2.8,
    gainMin: 1.2,
    gainRange: 10.6,
    gainExponent: 1.46,
    toneStackBassHz: 110,
    toneStackMidHz: 700,
    toneStackMidQ: 1.08,
    toneStackTrebleHz: 3200,
    presenceHz: 4300,
    presenceQ: 0.95,
    preampCurve: tubeCurve(3.4, 2.7, 3.5, 0.055),
    powerAmpCurve: tubeCurve(1.45, 1.0, 1.1, 0.01),
    masterScale: 1.35,
    postPreampLowpassHz: 4450,
    outputLowpassHz: 5250,
    sagRatio: 1.9,
    sagThresholdDb: -15,
    sagReleaseSec: 0.055,
  },

  'evh-5150': {
    preampHighpassHz: 138,
    preampPeakHz: 1520,
    preampPeakQ: 1.12,
    preampPeakGainDb: 3.2,
    gainMin: 1.3,
    gainRange: 12.2,
    gainExponent: 1.48,
    toneStackBassHz: 120,
    toneStackMidHz: 650,
    toneStackMidQ: 1.15,
    toneStackTrebleHz: 3500,
    presenceHz: 4600,
    presenceQ: 1.0,
    preampCurve: tubeCurve(3.8, 2.9, 3.9, 0.06),
    powerAmpCurve: tubeCurve(1.48, 1.0, 1.12, 0.012),
    masterScale: 1.35,
    postPreampLowpassHz: 4350,
    outputLowpassHz: 5150,
    sagRatio: 1.7,
    sagThresholdDb: -14,
    sagReleaseSec: 0.045,
  },

  'modern-djent': {
    preampHighpassHz: 150,
    preampPeakHz: 1520,
    preampPeakQ: 1.15,
    preampPeakGainDb: 3.4,
    gainMin: 1.35,
    gainRange: 12.6,
    gainExponent: 1.48,
    toneStackBassHz: 130,
    toneStackMidHz: 800,
    toneStackMidQ: 1.2,
    toneStackTrebleHz: 3600,
    presenceHz: 4800,
    presenceQ: 1.0,
    preampCurve: tubeCurve(3.9, 3.0, 4.0, 0.06),
    powerAmpCurve: tubeCurve(1.5, 1.0, 1.12, 0.012),
    masterScale: 1.35,
    postPreampLowpassHz: 4400,
    outputLowpassHz: 5200,
    sagRatio: 1.5,
    sagThresholdDb: -14,
    sagReleaseSec: 0.035,
  },

  'engl-powerball': {
    preampHighpassHz: 145,
    preampPeakHz: 1620,
    preampPeakQ: 1.12,
    preampPeakGainDb: 3.2,
    gainMin: 1.35,
    gainRange: 12.8,
    gainExponent: 1.48,
    toneStackBassHz: 128,
    toneStackMidHz: 700,
    toneStackMidQ: 1.15,
    toneStackTrebleHz: 3550,
    presenceHz: 4700,
    presenceQ: 1.0,
    preampCurve: tubeCurve(3.85, 2.95, 3.95, 0.06),
    powerAmpCurve: tubeCurve(1.5, 1.0, 1.1, 0.012),
    masterScale: 1.35,
    postPreampLowpassHz: 4350,
    outputLowpassHz: 5150,
    sagRatio: 1.6,
    sagThresholdDb: -14,
    sagReleaseSec: 0.04,
  },
};

export function getAmpVoicing(model: AmpModelId): AmpVoicingProfile {
  return AMP_VOICING[model];
}

/**
 * Models V1A 12AX7 input grid-current conduction when a boost or overdrive pedal
 * pushes the amp's front-end hard. Prevents harsh digital rail-clipping and excessive
 * noise-floor multiplication while adding authentic asymmetric tube compression.
 */
export function makeInputGridLimiterCurve(samples = 2048): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(samples * Float32Array.BYTES_PER_ELEMENT));
  const kneePos = 0.48; // Positive grid conduction threshold
  const kneeNeg = 0.62; // Cathode cutoff side has wider swing before soft compression

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / (samples - 1) - 1;
    let out: number;
    if (x >= 0) {
      if (x <= kneePos) {
        out = x;
      } else {
        const over = (x - kneePos) / (1 - kneePos);
        out = kneePos + (0.94 - kneePos) * Math.tanh(over * 1.35);
      }
    } else {
      const ax = -x;
      if (ax <= kneeNeg) {
        out = x;
      } else {
        const over = (ax - kneeNeg) / (1 - kneeNeg);
        out = -(kneeNeg + (0.97 - kneeNeg) * Math.tanh(over * 1.25));
      }
    }
    curve[i] = out;
  }
  return curve;
}

function buildCleanCurve(spec: CurveShape, samples: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(samples * Float32Array.BYTES_PER_ELEMENT));
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
