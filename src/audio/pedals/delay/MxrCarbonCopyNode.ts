import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';

/**
 * MXR Carbon Copy Analog Delay (M169)
 *
 * Full Hardware & DSP Emulation:
 * - Dual BBD Bucket-Brigade Line (B3208A / MN3205 emulation)
 * - Delay time range: 40 ms to 600 ms (extended analog BBD range)
 * - Dual-pole steep analog low-pass filtering (~1.9 kHz) for the trademark dark, warm, creamy repeats
 * - High-pass 130 Hz filter: Keeps feedback clean, preventing muddy sub-bass build-up
 * - Analog Modulation Circuit (MOD): Smooth sine LFO (~1.2 Hz) modulating delay clock for lush chorused shimmer
 * - Slew-damped clock ramp (0.10s time constant + cancelScheduledValues) preventing metallic FM/robotic glitches
 * - Tanh soft saturation limiter in the feedback loop: Allows creamy self-oscillation runaway at high REGEN (> 8.5)
 * - Pristine analog unity dry path (1.0x gain)
 */
export class MxrCarbonCopyNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private enabled: boolean;
  private isDisposed = false;

  private bypassDry: GainNode;
  private bypassWet: GainNode;

  // Wet delay path
  private inputBuffer: GainNode;
  private delayNode: DelayNode;
  private feedbackFilter1: BiquadFilterNode;
  private feedbackFilter2: BiquadFilterNode;
  private feedbackHighpass: BiquadFilterNode;
  private feedbackGain: GainNode;
  private feedbackLimiter: WaveShaperNode;

  // Modulation (MOD switch)
  private modOsc: OscillatorNode;
  private modGain: GainNode;

  // Mixers
  private dryGain: GainNode;
  private wetGain: GainNode;
  private delayMixer: GainNode;
  private dcBlocker: BiquadFilterNode;

  private params: Record<string, number> = {
    regen: 4.5,  // ~4 warm repeats (0 to 10)
    mix: 5.0,    // 50% wet blend (0 to 10)
    delay: 5.0,  // ~320 ms delay time (0 to 10 -> 40ms to 600ms)
    mod: 0,      // 0 = OFF, 1 = ON (analog modulation)
  };

  constructor(
    ctx: AudioContext,
    id: string,
    initialParams?: Record<string, number>,
    enabled = true
  ) {
    this.ctx = ctx;
    this.id = id;
    this.enabled = enabled;

    if (initialParams) {
      this.params = { ...this.params, ...initialParams };
    }

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    this.bypassDry = ctx.createGain();
    this.bypassWet = ctx.createGain();

    // 1. Dry bypass signal path
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    // 2. Wet delay input
    this.inputNode.connect(this.bypassWet);

    // 3. Direct dry guitar through the pedal (Pristine unity gain 1.0)
    this.dryGain = ctx.createGain();
    this.dryGain.gain.setValueAtTime(1.0, ctx.currentTime);

    // 4. Delay Line: 40 ms to 600 ms (max 0.8s)
    this.delayNode = ctx.createDelay(0.8);
    const initialDelay = Math.max(0, Math.min(10, this.params.delay ?? 5.0));
    const delaySec = 0.040 + (initialDelay / 10) * 0.560; // 40 ms to 600 ms
    this.delayNode.delayTime.setValueAtTime(delaySec, ctx.currentTime);

    // 5. Dual Cascaded BBD Tone Filtering (Warm analog dark repeats with clear note definition):
    this.feedbackFilter1 = ctx.createBiquadFilter();
    this.feedbackFilter1.type = 'lowpass';
    this.feedbackFilter1.frequency.setValueAtTime(3600, ctx.currentTime);
    this.feedbackFilter1.Q.setValueAtTime(0.85, ctx.currentTime);

    this.feedbackFilter2 = ctx.createBiquadFilter();
    this.feedbackFilter2.type = 'lowpass';
    this.feedbackFilter2.frequency.setValueAtTime(4400, ctx.currentTime);
    this.feedbackFilter2.Q.setValueAtTime(0.707, ctx.currentTime);

    // Highpass at 85 Hz: Prevents low-end boom / mud accumulation on feedback
    this.feedbackHighpass = ctx.createBiquadFilter();
    this.feedbackHighpass.type = 'highpass';
    this.feedbackHighpass.frequency.setValueAtTime(85, ctx.currentTime);
    this.feedbackHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    // 6. Feedback (REGEN) Gain with Musical Taper:
    // At 0: 0.0 (single slap)
    // At 5: ~0.46 (4-5 repeats)
    // At 8: ~0.75 (long ambient wash)
    // At 9.5-10: 1.02 (warm runaway analog self-oscillation)
    this.feedbackGain = ctx.createGain();
    const initialRegen = Math.max(0, Math.min(10, this.params.regen ?? 4.5));
    const normRegen = initialRegen / 10;
    const fbGain = Math.pow(normRegen, 1.25) * 1.02;
    this.feedbackGain.gain.setValueAtTime(fbGain, ctx.currentTime);

    // 7. Feedback Soft-Limiter (tanh curve with unity gain at center)
    this.feedbackLimiter = ctx.createWaveShaper();
    this.feedbackLimiter.curve = this.createSoftLimitCurve(4096);
    this.feedbackLimiter.oversample = '4x';

    // 8. Analog Modulation Circuit (MOD switch)
    // Sine LFO at ~0.85 Hz modulating delay time by ~1.8 ms for lush chorused shimmer
    this.modOsc = ctx.createOscillator();
    this.modOsc.type = 'sine';
    this.modOsc.frequency.setValueAtTime(0.85, ctx.currentTime);

    this.modGain = ctx.createGain();
    const isModOn = (this.params.mod ?? 0) >= 0.5;
    this.modGain.gain.setValueAtTime(isModOn ? 0.0018 : 0.0, ctx.currentTime);

    this.modOsc.connect(this.modGain);
    this.modGain.connect(this.delayNode.delayTime);
    this.modOsc.start();

    // 9. Wet Mix Gain: 85% at noon for clear, present echoes
    this.wetGain = ctx.createGain();
    const initialMix = Math.max(0, Math.min(10, this.params.mix ?? 5.0));
    const wetLevel = initialMix <= 5.0 ? (initialMix / 5.0) * 0.85 : 0.85 + ((initialMix - 5.0) / 5.0) * 0.35;
    this.wetGain.gain.setValueAtTime(wetLevel, ctx.currentTime);

    this.inputBuffer = ctx.createGain();
    this.delayMixer = ctx.createGain();
    this.dcBlocker = createDcBlocker(ctx, 15);

    // Audio Routing:
    // A) Direct dry guitar to mixer
    this.bypassWet.connect(this.dryGain);
    this.dryGain.connect(this.delayMixer);

    // B) Delay line feed
    this.bypassWet.connect(this.inputBuffer);
    this.inputBuffer.connect(this.delayNode);

    // C) Delay output through 2-pole cascaded dark BBD tone filters
    this.delayNode.connect(this.feedbackFilter1);
    this.feedbackFilter1.connect(this.feedbackFilter2);
    this.feedbackFilter2.connect(this.feedbackHighpass);

    // D) Feedback loop: highpass -> feedbackGain -> feedbackLimiter -> delayNode
    this.feedbackHighpass.connect(this.feedbackGain);
    this.feedbackGain.connect(this.feedbackLimiter);
    this.feedbackLimiter.connect(this.delayNode);

    // E) Wet signal to mixer (taken from filtered repeats)
    this.feedbackHighpass.connect(this.wetGain);
    this.wetGain.connect(this.delayMixer);

    // F) Output through DC blocker
    this.delayMixer.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputNode);

    // Initial bypass crossfade
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx, 0.001);
  }

  /**
   * Tanh saturation curve with unity gain at center (slope = 1.0 at x = 0).
   * Does NOT boost quiet signals, and softly compresses peaks above ~0.6.
   */
  private createSoftLimitCurve(samples: number): Float32Array<ArrayBuffer> {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1; // -1 to +1
      curve[i] = Math.tanh(x);
    }
    return curve as Float32Array<ArrayBuffer>;
  }

  public updateParameter(paramId: string, value: number): void {
    const now = this.ctx.currentTime;
    const clamped = Math.max(0, Math.min(10, value));
    this.params[paramId] = clamped;

    switch (paramId) {
      case 'delay': {
        // 40 ms to 600 ms with smooth analog Doppler slew (0.045s time constant)
        const delaySec = 0.040 + (clamped / 10) * 0.560;
        this.delayNode.delayTime.setTargetAtTime(delaySec, now, 0.045);
        break;
      }
      case 'regen': {
        // Regeneration feedback taper:
        const norm = clamped / 10;
        const fbGain = Math.pow(norm, 1.25) * 1.02;
        this.feedbackGain.gain.setTargetAtTime(fbGain, now, 0.03);
        break;
      }
      case 'mix': {
        // Wet mix: 85% at noon, 120% at 10
        const wetLevel = clamped <= 5.0 ? (clamped / 5.0) * 0.85 : 0.85 + ((clamped - 5.0) / 5.0) * 0.35;
        this.wetGain.gain.setTargetAtTime(wetLevel, now, 0.02);
        break;
      }
      case 'mod': {
        // MOD toggle: 0 = off, 1 = on (~1.8 ms lush chorused shimmer)
        const isModOn = clamped >= 0.5;
        this.modGain.gain.setTargetAtTime(isModOn ? 0.0018 : 0.0, now, 0.03);
        break;
      }
    }
  }

  public setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    applyBypassCrossfade(this.bypassWet, this.bypassDry, enabled, this.ctx, 0.015);
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.bypassDry.disconnect();
      this.bypassWet.disconnect();

      this.dryGain.disconnect();
      this.inputBuffer.disconnect();
      this.delayNode.disconnect();
      this.feedbackFilter1.disconnect();
      this.feedbackFilter2.disconnect();
      this.feedbackHighpass.disconnect();
      this.feedbackGain.disconnect();
      this.feedbackLimiter.disconnect();
      this.wetGain.disconnect();

      this.modOsc.stop();
      this.modOsc.disconnect();
      this.modGain.disconnect();

      this.delayMixer.disconnect();
      this.dcBlocker.disconnect();
    } catch {
      // AudioNode already disconnected
    }
  }
}
