import { TubeScreamerNode, type TubeScreamerConfig } from './TubeScreamerNode';

/** Output trim (dB) calibrated so Level=5 is ~unity loudness. */
const OUTPUT_TRIM_DB = -2.2;

/**
 * Ibanez Tube Screamer Mini
 * Same JRC4558D TS topology in a compact 1590A format: a little less top-end range on the
 * tone control and slightly less maximum gain than the full-size 808/TS9.
 */
const TS_MINI_CONFIG: TubeScreamerConfig = {
  driveParamId: 'overdrive',
  humpHz: 720,
  clipKnee: 0.3,
  clipSharpness: 2.0,
  potExponent: 3.3,
  toneMinHz: 723,
  toneMaxHz: 3000,
  presenceDb: 0,
  outputTrimDb: OUTPUT_TRIM_DB,
};

export class TsMiniNode extends TubeScreamerNode {
  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    super(ctx, id, TS_MINI_CONFIG, initialParams, enabled);
  }
}
