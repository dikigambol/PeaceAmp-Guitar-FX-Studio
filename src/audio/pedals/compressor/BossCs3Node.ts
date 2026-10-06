import { CompressorPedalNode, type CompressorPedalFactory } from './CompressorPedalNode';

/** Output trim (dB) calibrated so Level=5 is ~unity loudness. */
const OUTPUT_TRIM_DB = 0;

/**
 * Boss CS-3 Compression Sustainer - 4-knob VCA compressor with variable attack
 * and an active tone control (peaking EQ around 3.2 kHz, +/-8 dB).
 */
const cs3Model: CompressorPedalFactory = (ctx) => {
  const tone = ctx.createBiquadFilter();
  tone.type = 'peaking';
  tone.frequency.setValueAtTime(3200, ctx.currentTime);
  tone.Q.setValueAtTime(0.7, ctx.currentTime);

  return {
    pre: [],
    post: [tone],
    resolve(params, now) {
      const sust = Math.max(0, Math.min(10, params.sustain)) / 10;
      const att = Math.max(0, Math.min(10, params.attack)) / 10;
      const toneNorm = Math.max(0, Math.min(10, params.tone)) / 10;
      tone.gain.setTargetAtTime((toneNorm - 0.5) * 16, now, 0.02);

      return {
        settings: {
          thresholdDb: -10 - sust * 34,
          ratio: 3 + sust * 13,
          attackSec: 0.002 + att * 0.043,
          releaseSec: 0.15 + sust * 0.55,
          kneeDb: 5,
          rmsMix: 0.2,
        },
        level: params.level,
        trimDb: OUTPUT_TRIM_DB,
      };
    },
  };
};

export class BossCs3Node extends CompressorPedalNode {
  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    super(ctx, id, cs3Model, { level: 5, tone: 5, attack: 5, sustain: 5 }, initialParams, enabled);
  }
}
