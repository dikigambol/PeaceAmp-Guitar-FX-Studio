import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';

/**
 * Boss DM-2 Delay (1981 Vintage Analog Delay)
 *
 * Circuit & DSP Architecture:
 * - Matsushita MN3005 4096-stage BBD emulation.
 * - Delay time range: 80 ms to 330 ms (authentic BBD clock range).
 *   Prevents metallic comb-filter / robotic resonance by staying strictly in discrete echo territory.
 * - Slew-Damped Delay Clock (100 ms time constant + cancelScheduledValues):
 *   Eliminates stacked Doppler artifacts and robotic ring modulation when sweeping knobs back and forth.
 * - Cascaded 24 dB/oct BBD Reconstruction Filters (2.2 kHz & 2.4 kHz):
 *   Replicates the 5-pole active Chebychev low-pass filter of the original DM-2,
 *   completely stripping high-frequency modulation sidebands and providing the trademark dark, warm decay.
 * - High-pass 140 Hz filter: Eliminates low-end rumble and bass mud build-up on feedback.
 * - Musical feedback taper with tanh soft limiting:
 *   Repeats fade smoothly from 0 to 8, with warm runaway self-oscillation only at the very top (9.5+).
 * - Direct dry guitar: 100% transparent unity gain.
 */
export class BossDm2Node implements AudioPedalNode {
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

  // Mixers
  private dryGain: GainNode;
  private wetGain: GainNode;
  private delayMixer: GainNode;
  private dcBlocker: BiquadFilterNode;

  private params: Record<string, number> = {
    repeatRate: 4.5, // ~190 ms (classic musical echo)
    intensity: 4.0,  // ~4 warm repeats, no runaway
    echo: 5.0,       // balanced 50% wet mix relative to dry
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

    // 4. Delay Line: 80 ms (slapback) to 330 ms (vintage DM-2 max)
    this.delayNode = ctx.createDelay(0.6);
    const initialRate = Math.max(0, Math.min(10, this.params.repeatRate ?? 4.5));
    const delaySec = 0.080 + (initialRate / 10) * 0.250;
    this.delayNode.delayTime.setValueAtTime(delaySec, ctx.currentTime);

    // 5. Dual Cascaded BBD Tone Filtering (24 dB/oct steep analog roll-off):
    // Stage 1: 2.2 kHz lowpass
    this.feedbackFilter1 = ctx.createBiquadFilter();
    this.feedbackFilter1.type = 'lowpass';
    this.feedbackFilter1.frequency.setValueAtTime(2200, ctx.currentTime);
    this.feedbackFilter1.Q.setValueAtTime(0.707, ctx.currentTime);

    // Stage 2: 2.4 kHz lowpass
    this.feedbackFilter2 = ctx.createBiquadFilter();
    this.feedbackFilter2.type = 'lowpass';
    this.feedbackFilter2.frequency.setValueAtTime(2400, ctx.currentTime);
    this.feedbackFilter2.Q.setValueAtTime(0.707, ctx.currentTime);

    // Highpass at 140 Hz: prevents low-end boom / mud accumulation on feedback
    this.feedbackHighpass = ctx.createBiquadFilter();
    this.feedbackHighpass.type = 'highpass';
    this.feedbackHighpass.frequency.setValueAtTime(140, ctx.currentTime);
    this.feedbackHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    // 6. Feedback Gain with Musical Taper:
    this.feedbackGain = ctx.createGain();
    const initialIntensity = Math.max(0, Math.min(10, this.params.intensity ?? 4.0));
    const normInt = initialIntensity / 10;
    const fbGain = Math.pow(normInt, 1.25) * 1.02;
    this.feedbackGain.gain.setValueAtTime(fbGain, ctx.currentTime);

    // 7. Feedback Soft-Limiter (tanh curve with unity gain at center)
    this.feedbackLimiter = ctx.createWaveShaper();
    this.feedbackLimiter.curve = this.createSoftLimitCurve(4096);
    this.feedbackLimiter.oversample = '4x';

    // 8. Wet Mix Gain
    this.wetGain = ctx.createGain();
    const initialEcho = Math.max(0, Math.min(10, this.params.echo ?? 5.0));
    const wetLevel = (initialEcho / 10) * 1.0;
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

    // C) Delay output through 24 dB/oct BBD tone filters
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
      case 'repeatRate': {
        // 80 ms to 330 ms with well-damped slew (0.10s time constant)
        // cancelScheduledValues prevents stacked Doppler events and metallic FM robot artifacts
        const delaySec = 0.080 + (clamped / 10) * 0.250;
        this.delayNode.delayTime.cancelScheduledValues(now);
        this.delayNode.delayTime.setTargetAtTime(delaySec, now, 0.10);
        break;
      }
      case 'intensity': {
        // Musical feedback taper with smooth ramp:
        const norm = clamped / 10;
        const fbGain = Math.pow(norm, 1.25) * 1.02;
        this.feedbackGain.gain.cancelScheduledValues(now);
        this.feedbackGain.gain.setTargetAtTime(fbGain, now, 0.05);
        break;
      }
      case 'echo': {
        // Wet mix: 0 to 1.0
        const wetLevel = (clamped / 10) * 1.0;
        this.wetGain.gain.cancelScheduledValues(now);
        this.wetGain.gain.setTargetAtTime(wetLevel, now, 0.02);
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

      this.delayMixer.disconnect();
      this.dcBlocker.disconnect();
    } catch {
      // AudioNode already disconnected
    }
  }
}
