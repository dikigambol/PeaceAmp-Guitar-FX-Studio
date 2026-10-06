import { TubeScreamerNode, type TubeScreamerConfig } from './TubeScreamerNode';

/** Output trim (dB) calibrated so Level=5 is ~unity loudness. */
const OUTPUT_TRIM_DB = -3.0;

/**
 * Ibanez TS9 Tube Screamer (1982 9-Series)
 * Same op-amp topology as the TS808, with 1N914-class clipping diodes (slightly higher knee,
 * a bit harder), and the later output buffer that adds a touch more top-end presence.
 */
const TS9_CONFIG: TubeScreamerConfig = {
  driveParamId: 'drive',
  humpHz: 720,
  clipKnee: 0.31,
  clipSharpness: 2.3,
  potExponent: 3.0,
  toneMinHz: 723,
  toneMaxHz: 3300,
  presenceDb: 1.5,
  outputTrimDb: OUTPUT_TRIM_DB,
};

export class Ts9Node extends TubeScreamerNode {
  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    super(ctx, id, TS9_CONFIG, initialParams, enabled);
  }
}
