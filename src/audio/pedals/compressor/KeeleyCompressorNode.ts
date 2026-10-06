import { CompressorPedalNode, type CompressorPedalFactory } from './CompressorPedalNode';

/** Output trim (dB) calibrated so Level=5 is ~unity loudness. */
const OUTPUT_TRIM_DB = 0;

/**
 * Keeley Compressor Plus / 4-Knob (C4)
 * Studio-grade, transparent soft-knee compression with adjustable attack and an input
 * "clipping" pad (-6 dB for hot humbuckers .. +2 dB for weak single coils).
 */
const keeleyModel: CompressorPedalFactory = (ctx) => {
  const inputPad = ctx.createGain();

  return {
    pre: [inputPad],
    post: [],
    resolve(params, now) {
      const sust = Math.max(0, Math.min(10, params.sustain)) / 10;
      const att = Math.max(0, Math.min(10, params.attack)) / 10;
      const clip = Math.max(0, Math.min(10, params.clipping)) / 10;
      inputPad.gain.setTargetAtTime(Math.pow(10, (-6 + clip * 8) / 20), now, 0.02);

      return {
        settings: {
          thresholdDb: -14 - sust * 26,
          ratio: 2.5 + sust * 7.5,
          attackSec: 0.005 + att * 0.03,
          releaseSec: 0.18 + sust * 0.4,
          kneeDb: 6,
          rmsMix: 0.4,
        },
        level: params.level,
        trimDb: OUTPUT_TRIM_DB,
      };
    },
  };
};

export class KeeleyCompressorNode extends CompressorPedalNode {
  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    super(ctx, id, keeleyModel, { sustain: 5, level: 5, attack: 5, clipping: 5 }, initialParams, enabled);
  }
}
