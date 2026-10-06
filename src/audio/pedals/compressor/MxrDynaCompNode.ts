import { CompressorPedalNode, type CompressorPedalFactory } from './CompressorPedalNode';

/** Output trim (dB) calibrated so Output=5 is ~unity loudness. */
const OUTPUT_TRIM_DB = 0;

/**
 * MXR Dyna Comp - Classic 1970s CA3080 OTA Compression.
 * Fixed attack/release (only OUTPUT and SENSITIVITY on the real pedal): a ~6 ms attack lets the
 * pick transient through ("Nashville click") before the OTA squashes the sustain.
 */
const dynaCompModel: CompressorPedalFactory = () => ({
  pre: [],
  post: [],
  resolve(params) {
    const sens = Math.max(0, Math.min(10, params.sensitivity)) / 10;
    return {
      settings: {
        thresholdDb: -14 - sens * 28,
        ratio: 4 + sens * 8,
        attackSec: 0.006,
        releaseSec: 0.2,
        kneeDb: 4,
        rmsMix: 0,
      },
      level: params.output,
      trimDb: OUTPUT_TRIM_DB,
    };
  },
});

export class MxrDynaCompNode extends CompressorPedalNode {
  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    super(ctx, id, dynaCompModel, { output: 5, sensitivity: 5 }, initialParams, enabled);
  }
}
