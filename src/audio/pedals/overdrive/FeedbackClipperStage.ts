import { createOnePoleHighpass } from '../dspUtils';

/**
 * Feedback-loop diode clipper used by the Tube Screamer family drive stage.
 *
 * Primary path: AudioWorklet processor (`feedback-clipper-processor`) that keeps
 * the diodes inside a filtered feedback loop with 4x internal oversampling.
 *
 * Fallback path: the previous native topology (unity + high-passed gain path,
 * then a memoryless WaveShaper). It is kept only for browsers/contexts where an
 * AudioWorkletNode cannot be created; it does not have loop dynamics.
 */

export interface FeedbackClipperConfig {
  /** Gain-shelf corner (720 Hz on the TS / SD-1). */
  humpHz: number;
  /** Diode knee in shaper domain (full scale = +-1). */
  clipKnee: number;
  /** Optional negative-half knee (asymmetric diodes, e.g. SD-1). */
  clipKneeNeg?: number;
  /** Knee sharpness used by the native fallback curve. */
  clipSharpness: number;
  /** Normalized feedback amount for the worklet loop (0..0.95). */
  feedback: number;
}

/** Guitar level -> shaper domain (full scale == 2 V of op-amp swing). */
const SHAPER_INPUT_SCALE = 0.5;

/** Old memoryless curve, used only to derive matching knees/levels. */
function diodeCurveValue(x: number, knee: number, sharpness: number): number {
  return x / Math.pow(1 + Math.pow(Math.abs(x) / knee, sharpness), 1 / sharpness);
}

export class FeedbackClipperStage {
  public readonly inputNode: GainNode;
  public readonly outputNode: GainNode;

  public readonly mode: 'worklet' | 'fallback';

  private readonly ctx: AudioContext;
  private readonly cfg: FeedbackClipperConfig;
  private readonly worklet: AudioWorkletNode | null = null;

  // Native fallback nodes (only built when the worklet is unavailable).
  private unityPath: GainNode | null = null;
  private humpFilter: IIRFilterNode | null = null;
  private driveGain: GainNode | null = null;
  private feedbackLowpass: BiquadFilterNode | null = null;
  private summing: GainNode | null = null;
  private shaperScale: GainNode | null = null;
  private shaper: WaveShaperNode | null = null;

  constructor(ctx: AudioContext, cfg: FeedbackClipperConfig, initialDrive = 11) {
    this.ctx = ctx;
    this.cfg = cfg;
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    if (typeof AudioWorkletNode !== 'undefined' && ctx.audioWorklet) {
      try {
        const node = new AudioWorkletNode(ctx, 'feedback-clipper-processor', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [2],
          channelCount: 2,
          channelCountMode: 'explicit',
        });

        const kneePos = 2 * diodeCurveValue(1, cfg.clipKnee, cfg.clipSharpness);
        const kneeNeg = 2 * diodeCurveValue(1, cfg.clipKneeNeg ?? cfg.clipKnee, cfg.clipSharpness);

        this.writeParam(node, 'drive', initialDrive, true);
        this.writeParam(node, 'feedback', cfg.feedback, true);
        this.writeParam(node, 'kneePos', kneePos, true);
        this.writeParam(node, 'kneeNeg', kneeNeg, true);
        this.writeParam(node, 'humpHz', cfg.humpHz, true);
        this.writeParam(node, 'feedbackHz', 20000, true);
        this.writeParam(node, 'makeup', SHAPER_INPUT_SCALE, true);

        this.inputNode.connect(node);
        node.connect(this.outputNode);
        this.worklet = node;
        this.mode = 'worklet';
        return;
      } catch (err) {
        console.warn('Feedback clipper AudioWorklet unavailable, using native fallback:', err);
      }
    }

    this.buildFallback(initialDrive);
    this.mode = 'fallback';
  }

  public setDrive(gain: number): void {
    if (this.worklet) {
      this.writeParam(this.worklet, 'drive', gain, false);
    } else if (this.driveGain) {
      const now = this.ctx.currentTime;
      this.driveGain.gain.setTargetAtTime(gain, now, 0.02);
    }
  }

  public setFeedback(amount: number): void {
    if (this.worklet) {
      this.writeParam(this.worklet, 'feedback', Math.max(0, Math.min(0.95, amount)), false);
    }
  }

  public setFeedbackCutoff(hz: number): void {
    if (this.worklet) {
      this.writeParam(this.worklet, 'feedbackHz', hz, false);
    } else if (this.feedbackLowpass) {
      const now = this.ctx.currentTime;
      this.feedbackLowpass.frequency.setTargetAtTime(
        Math.min(20000, Math.max(200, hz)),
        now,
        0.02
      );
    }
  }

  public dispose(): void {
    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.worklet?.disconnect();
      this.unityPath?.disconnect();
      this.humpFilter?.disconnect();
      this.driveGain?.disconnect();
      this.feedbackLowpass?.disconnect();
      this.summing?.disconnect();
      this.shaperScale?.disconnect();
      this.shaper?.disconnect();
    } catch (err) {
      console.warn('FeedbackClipperStage dispose error', err);
    }
  }

  private writeParam(
    node: AudioWorkletNode,
    name: string,
    value: number,
    immediate: boolean
  ): void {
    const param = node.parameters.get(name);
    if (!param) return;
    const now = this.ctx.currentTime;
    if (immediate) {
      param.setValueAtTime(value, now);
    } else {
      param.setTargetAtTime(value, now, 0.02);
    }
  }

  private buildFallback(initialDrive: number): void {
    const ctx = this.ctx;
    const cfg = this.cfg;

    this.unityPath = ctx.createGain();
    this.humpFilter = createOnePoleHighpass(ctx, cfg.humpHz);
    this.driveGain = ctx.createGain();
    this.feedbackLowpass = ctx.createBiquadFilter();
    this.feedbackLowpass.type = 'lowpass';
    this.feedbackLowpass.Q.setValueAtTime(0.5, ctx.currentTime);
    this.summing = ctx.createGain();
    this.shaperScale = ctx.createGain();
    this.shaperScale.gain.setValueAtTime(SHAPER_INPUT_SCALE, ctx.currentTime);
    this.shaper = ctx.createWaveShaper();
    this.shaper.curve = this.createCurve(8192) as Float32Array<ArrayBuffer>;
    this.shaper.oversample = '4x';

    this.driveGain.gain.setValueAtTime(initialDrive, ctx.currentTime);

    this.inputNode.connect(this.unityPath);
    this.unityPath.connect(this.summing);
    this.inputNode.connect(this.humpFilter);
    this.humpFilter.connect(this.driveGain);
    this.driveGain.connect(this.feedbackLowpass);
    this.feedbackLowpass.connect(this.summing);
    this.summing.connect(this.shaperScale);
    this.shaperScale.connect(this.shaper);
    this.shaper.connect(this.outputNode);
  }

  private createCurve(samples: number): Float32Array {
    const { clipKnee, clipSharpness, clipKneeNeg } = this.cfg;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / (samples - 1) - 1;
      const knee = x < 0 && clipKneeNeg !== undefined ? clipKneeNeg : clipKnee;
      curve[i] = diodeCurveValue(x, knee, clipSharpness);
    }
    return curve;
  }
}
