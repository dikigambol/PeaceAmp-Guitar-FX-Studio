import { CompressorPedalNode, type CompressorPedalFactory } from './CompressorPedalNode';

/** Output trim (dB) calibrated so Level=5 is ~unity loudness. */
const OUTPUT_TRIM_DB = 0;

/**
 * Ross Compressor - vintage grey-box OTA compressor.
 * Softer knee, slower attack and an RMS-leaning detector for the smooth, singing sustain,
 * plus a gentle low-shelf for the characteristic warm body.
 */
const rossModel: CompressorPedalFactory = (ctx) => {
  const warm = ctx.createBiquadFilter();
  warm.type = 'lowshelf';
  warm.frequency.setValueAtTime(320, ctx.currentTime);
  warm.gain.setValueAtTime(1.2, ctx.currentTime);

  return {
    pre: [warm],
    post: [],
    resolve(params) {
      const sust = Math.max(0, Math.min(10, params.sustain)) / 10;
      return {
        settings: {
          thresholdDb: -12 - sust * 26,
          ratio: 3 + sust * 7,
          attackSec: 0.012,
          releaseSec: 0.32,
          kneeDb: 10,
          rmsMix: 0.5,
        },
        level: params.level,
        trimDb: OUTPUT_TRIM_DB,
      };
    },
  };
};

export class RossCompressorNode extends CompressorPedalNode {
  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    super(ctx, id, rossModel, { sustain: 5, level: 5 }, initialParams, enabled);
  }
}
