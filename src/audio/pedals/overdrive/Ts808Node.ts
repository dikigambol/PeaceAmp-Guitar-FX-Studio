import { TubeScreamerNode, type TubeScreamerConfig } from './TubeScreamerNode';

/** Output trim (dB) calibrated so Level=5 is ~unity loudness. */
const OUTPUT_TRIM_DB = -2.4;

/**
 * Ibanez Tube Screamer TS-808 (The Original Overdrive Pro)
 * JRC4558D op-amp, 1S1588 diode pair in the feedback loop, 720 Hz gain shelf (mid-hump),
 * passive tone low-pass. Rounder / more compressed than the TS9.
 */
const TS808_CONFIG: TubeScreamerConfig = {
  driveParamId: 'overdrive',
  humpHz: 720,
  clipKnee: 0.3,
  clipSharpness: 2.0,
  potExponent: 3.0,
  toneMinHz: 723,
  toneMaxHz: 3200,
  presenceDb: 0,
  outputTrimDb: OUTPUT_TRIM_DB,
};

export class Ts808Node extends TubeScreamerNode {
  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    super(ctx, id, TS808_CONFIG, initialParams, enabled);
  }
}
