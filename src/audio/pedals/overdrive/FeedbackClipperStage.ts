import { createOnePoleHighpass } from '../dspUtils';

/**
 * Authentic feedback-loop diode clipper used by the Tube Screamer family (TS808, TS9, TS Mini, SD-1).
 *
 * True analog non-inverting op-amp topology:
 *
 *   Vout = Vin + Vfeedback_clipped
 *
 * 1. Clean direct path passes Vin with unity gain, ensuring pick attack dynamics
 *    and clean bass response below the 720 Hz high-pass corner.
 * 2. Feedback path: 720 Hz high-pass (Rg=4.7k, Cg=47nF) -> variable gain (Rf/Rg) ->
 *    dynamic Rf||Cf smoothing low-pass -> 4x oversampled diode soft-clipping shaper.
 * 3. Summing combines clean Vin with the clipped feedback voltage, producing the iconic
 *    singing, warm, transparent Tube Screamer saturation.
 */

export interface FeedbackClipperConfig {
  /** Gain-shelf corner (720 Hz on the TS / SD-1). */
  humpHz: number;
  /** Diode knee in shaper domain (full scale = +-1). */
  clipKnee: number;
  /** Optional negative-half knee (asymmetric diodes, e.g. SD-1). */
  clipKneeNeg?: number;
  /** Knee sharpness used by the curve. */
  clipSharpness: number;
  /** Normalized feedback amount (retained for config compatibility). */
  feedback?: number;
}

function diodeCurveValue(x: number, knee: number, sharpness: number): number {
  return x / Math.pow(1 + Math.pow(Math.abs(x) / knee, sharpness), 1 / sharpness);
}

export class FeedbackClipperStage {
  public readonly inputNode: GainNode;
  public readonly outputNode: GainNode;

  private readonly ctx: AudioContext;
  private readonly cfg: FeedbackClipperConfig;

  // True analog non-inverting op-amp nodes:
  private unityPath: GainNode;
  private humpFilter: IIRFilterNode;
  private driveGain: GainNode;
  private feedbackLowpass: BiquadFilterNode;
  private shaper: WaveShaperNode;
  private summing: GainNode;

  constructor(ctx: AudioContext, cfg: FeedbackClipperConfig, initialDrive = 11) {
    this.ctx = ctx;
    this.cfg = cfg;
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Direct clean path: passes Vin unclipped
    this.unityPath = ctx.createGain();
    this.unityPath.gain.setValueAtTime(1.0, ctx.currentTime);

    // 2. High-pass shelf: 1 / (2*pi*Rg*Cg) = 720 Hz corner
    this.humpFilter = createOnePoleHighpass(ctx, cfg.humpHz);

    // 3. Drive gain: Rf / Rg
    this.driveGain = ctx.createGain();
    this.driveGain.gain.setValueAtTime(initialDrive, ctx.currentTime);

    // 4. Dynamic feedback capacitor low-pass: 1 / (2*pi*Rf*Cf)
    this.feedbackLowpass = ctx.createBiquadFilter();
    this.feedbackLowpass.type = 'lowpass';
    this.feedbackLowpass.frequency.setValueAtTime(20000, ctx.currentTime);
    this.feedbackLowpass.Q.setValueAtTime(0.5, ctx.currentTime);

    // 5. Diode soft-clipping shaper (symmetrical for TS, asymmetrical for SD-1)
    this.shaper = ctx.createWaveShaper();
    this.shaper.curve = this.createCurve(8192) as Float32Array<ArrayBuffer>;
    this.shaper.oversample = '4x';

    // 6. Summing: Vin + Vfeedback_clipped
    this.summing = ctx.createGain();

    // Wiring:
    // Clean branch:
    this.inputNode.connect(this.unityPath);
    this.unityPath.connect(this.summing);

    // Diode clipping branch:
    this.inputNode.connect(this.humpFilter);
    this.humpFilter.connect(this.driveGain);
    this.driveGain.connect(this.feedbackLowpass);
    this.feedbackLowpass.connect(this.shaper);
    this.shaper.connect(this.summing);

    // Output:
    this.summing.connect(this.outputNode);
  }

  public setDrive(gain: number): void {
    const now = this.ctx.currentTime;
    this.driveGain.gain.setTargetAtTime(gain, now, 0.02);
  }

  public setFeedback(_amount: number): void {
    // Retained for interface compatibility
  }

  public setFeedbackCutoff(hz: number): void {
    const now = this.ctx.currentTime;
    this.feedbackLowpass.frequency.setTargetAtTime(
      Math.min(20000, Math.max(200, hz)),
      now,
      0.02
    );
  }

  public dispose(): void {
    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.unityPath.disconnect();
      this.humpFilter.disconnect();
      this.driveGain.disconnect();
      this.feedbackLowpass.disconnect();
      this.shaper.disconnect();
      this.summing.disconnect();
    } catch (err) {
      console.warn('FeedbackClipperStage dispose error', err);
    }
  }

  private createCurve(samples: number): Float32Array {
    const { clipKnee, clipSharpness, clipKneeNeg } = this.cfg;
    const curve = new Float32Array(samples);
    const kPos = clipKnee ?? 0.45;
    const kNeg = clipKneeNeg ?? kPos;
    const p = clipSharpness ?? 1.8;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / (samples - 1) - 1;
      const k = x >= 0 ? kPos : kNeg;
      curve[i] = diodeCurveValue(x, k, p);
    }
    return curve;
  }
}
