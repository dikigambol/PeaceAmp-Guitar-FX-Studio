import { TubeScreamerNode, type TubeScreamerConfig } from './TubeScreamerNode';

/** Output trim (dB) calibrated so Level=5 is ~unity loudness. */
const OUTPUT_TRIM_DB = -2.6;

/**
 * Boss SD-1 Super OverDrive (1981)
 * Same op-amp topology as the Tube Screamer (unity-gain bass path + gain shelf above the hump,
 * clipping diodes in the feedback loop) but with the patented ASYMMETRIC diode arrangement
 * (2 diodes one way, 1 the other). Asymmetric clipping adds even-order (2nd harmonic) warmth.
 */
const SD1_CONFIG: TubeScreamerConfig = {
  driveParamId: 'drive',
  humpHz: 720,
  clipKnee: 0.42,
  clipKneeNeg: 0.26,
  clipSharpness: 2.0,
  potExponent: 2.2,
  toneMinHz: 900,
  toneMaxHz: 4600,
  presenceDb: 0,
  outputTrimDb: OUTPUT_TRIM_DB,
};

export class BossSd1Node extends TubeScreamerNode {
  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    super(ctx, id, SD1_CONFIG, initialParams, enabled);
  }
}
