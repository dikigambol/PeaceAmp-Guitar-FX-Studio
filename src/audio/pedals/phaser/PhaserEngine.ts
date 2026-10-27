/**
 * Shared phaser core used by the MXR Phase 90 and EHX Small Stone models.
 *
 * Primary path: one AudioWorkletNode running four first-order all-pass stages
 * (4 poles) with a per-sample LFO and sample-accurate feedback. That is the
 * real analog topology - four 1st-order stages, not four 2nd-order biquads
 * (which would give 8 poles / 4 notches).
 *
 * Fallback path (AudioWorklet unavailable): two BiquadFilter all-pass stages
 * (4 poles total). No feedback in the fallback: a native feedback cycle forces a
 * DelayNode of at least one render quantum, which would comb-filter the signal.
 */

export interface PhaserEngineConfig {
  /** All-pass centre frequency at rest (Hz) */
  baseFreq: number;
  /** Peak frequency excursion around baseFreq (Hz) */
  sweepHz: number;
  /** LFO rate (Hz) */
  rateHz: number;
  /** Feedback amount 0..0.9 (Phase 90 / Small Stone COLOR) */
  feedback: number;
}

interface FallbackState {
  sum: GainNode;
  stage1: BiquadFilterNode;
  stage2: BiquadFilterNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
}

export class PhaserEngine {
  public readonly inputNode: GainNode;
  public readonly outputNode: GainNode;

  private readonly ctx: AudioContext;
  private worklet: AudioWorkletNode | null = null;
  private fallback: FallbackState | null = null;
  private disposed = false;

  constructor(ctx: AudioContext, cfg: PhaserEngineConfig) {
    this.ctx = ctx;
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    if (typeof AudioWorkletNode !== 'undefined' && ctx.audioWorklet) {
      try {
        const node = new AudioWorkletNode(ctx, 'phaser-processor', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [1],
          channelCount: 1,
          channelCountMode: 'explicit',
        });

        this.writeWorkletParam(node, 'rate', cfg.rateHz, true);
        this.writeWorkletParam(node, 'center', cfg.baseFreq, true);
        this.writeWorkletParam(node, 'sweep', cfg.sweepHz, true);
        this.writeWorkletParam(node, 'feedback', cfg.feedback, true);

        this.inputNode.connect(node);
        node.connect(this.outputNode);
        this.worklet = node;
        return;
      } catch (err) {
        console.warn('Phaser AudioWorklet unavailable, using native fallback:', err);
      }
    }

    this.buildFallback(cfg);
  }

  /** Current LFO rate in Hz. */
  public setRate(hz: number): void {
    if (this.disposed) return;
    if (this.worklet) {
      this.writeWorkletParam(this.worklet, 'rate', hz, false);
    } else if (this.fallback) {
      this.fallback.lfo.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.03);
    }
  }

  /** All-pass centre frequency in Hz. */
  public setCenter(hz: number): void {
    if (this.disposed) return;
    if (this.worklet) {
      this.writeWorkletParam(this.worklet, 'center', hz, false);
    } else if (this.fallback) {
      this.fallback.stage1.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.03);
      this.fallback.stage2.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.03);
    }
  }

  /** Peak frequency excursion in Hz. */
  public setSweep(hz: number): void {
    if (this.disposed) return;
    if (this.worklet) {
      this.writeWorkletParam(this.worklet, 'sweep', hz, false);
    } else if (this.fallback) {
      this.fallback.lfoGain.gain.setTargetAtTime(hz, this.ctx.currentTime, 0.03);
    }
  }

  /** Feedback amount 0..0.9 (ignored by the no-feedback native fallback). */
  public setFeedback(amount: number): void {
    if (this.disposed) return;
    if (this.worklet) {
      this.writeWorkletParam(this.worklet, 'feedback', amount, false);
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();

      if (this.worklet) {
        this.worklet.disconnect();
        this.worklet = null;
      }

      if (this.fallback) {
        const f = this.fallback;
        try {
          f.lfo.stop();
        } catch {
          // Already stopped
        }
        f.lfo.disconnect();
        f.lfoGain.disconnect();
        f.sum.disconnect();
        f.stage1.disconnect();
        f.stage2.disconnect();
        this.fallback = null;
      }
    } catch {
      // Nodes already disconnected
    }
  }

  private writeWorkletParam(
    node: AudioWorkletNode,
    name: string,
    value: number,
    immediate: boolean
  ): void {
    const param = node.parameters.get(name);
    if (!param) return;
    if (immediate) {
      param.setValueAtTime(value, this.ctx.currentTime);
    } else {
      param.setTargetAtTime(value, this.ctx.currentTime, 0.03);
    }
  }

  private buildFallback(cfg: PhaserEngineConfig): void {
    const now = this.ctx.currentTime;

    // Mono summing input: the pedal chain is mono and the feedback loop must be mono.
    const sum = this.ctx.createGain();
    sum.channelCount = 1;
    sum.channelCountMode = 'explicit';
    sum.channelInterpretation = 'speakers';

    const stage1 = this.ctx.createBiquadFilter();
    stage1.type = 'allpass';
    stage1.frequency.setValueAtTime(cfg.baseFreq, now);
    stage1.Q.setValueAtTime(0.707, now);

    const stage2 = this.ctx.createBiquadFilter();
    stage2.type = 'allpass';
    stage2.frequency.setValueAtTime(cfg.baseFreq, now);
    stage2.Q.setValueAtTime(0.707, now);

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(cfg.rateHz, now);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(cfg.sweepHz, now);

    this.inputNode.connect(sum);
    sum.connect(stage1);
    stage1.connect(stage2);
    stage2.connect(this.outputNode);

    lfo.connect(lfoGain);
    lfoGain.connect(stage1.frequency);
    lfoGain.connect(stage2.frequency);
    lfo.start();

    this.fallback = { sum, stage1, stage2, lfo, lfoGain };
  }
}
