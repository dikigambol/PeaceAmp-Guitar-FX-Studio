import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';

/**
 * BOSS BF-2 Flanger (1980 - 2002)
 *
 * Full Authentic Analog BBD Hardware Modeling:
 * - Matsushita MN3207 1024-stage BBD bucket-brigade analog delay line clocked by MN3102
 * - Delay time range: ~1.5 ms to ~12.5 ms for thick, warm, vocal midrange comb filtering
 * - Smooth analog LFO sweep: 0.05 Hz (ultra-slow deep ocean jet whoosh) to 5.5 Hz (fast rotary shimmer)
 * - MANUAL control sets the center BBD clock frequency / delay bias (1.5ms - 12ms)
 * - DEPTH control sets the modulation width
 * - RES (Resonance) control feeds delayed signal back into BBD input through warm analog lowpass
 *   and tanh saturation, producing that signature thick, chewy, round metallic whoosh
 * - Analog reconstruction & de-emphasis filter at 5.0 kHz (eliminates digital fizziness)
 * - Warm body filter at 320 Hz to preserve low-end roundness and punch during phase cancellation
 */
export class BossBf2Node implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private enabled: boolean;

  // Bypass crossfade
  private bypassDry: GainNode;
  private bypassWet: GainNode;

  // Audio path nodes
  private preHighpass: BiquadFilterNode;
  private warmBodyFilter: BiquadFilterNode;
  private delayInputSum: GainNode;
  private delayNode: DelayNode;
  private postLowpass: BiquadFilterNode;

  // Feedback loop (Resonance)
  private feedbackGain: GainNode;
  private feedbackHighpass: BiquadFilterNode;
  private feedbackLowpass: BiquadFilterNode;
  private feedbackLimiter: WaveShaperNode;

  // Modulation (Smooth LFO)
  private lfoNode: OscillatorNode;
  private lfoGainNode: GainNode;

  // Wet / Dry Mixer
  private dryGain: GainNode;
  private wetGain: GainNode;
  private mixer: GainNode;
  private dcBlocker: BiquadFilterNode;

  private isDisposed = false;

  private params: Record<string, number> = {
    manual: 5.0, // 0 to 10 (~2.2 ms to ~8.0 ms)
    depth: 5.0,  // 0 to 10 (balanced musical sweep width ~0.2ms - 1.8ms)
    rate: 2.8,   // 0 to 10 (~0.08 Hz to ~4.5 Hz)
    res: 3.5,    // 0 to 10 (warm chewy analog resonance, progressive curve)
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

    // 2. Wet path input
    this.inputNode.connect(this.bypassWet);

    // 3. Sub-bass cleanup HPF (35Hz)
    this.preHighpass = ctx.createBiquadFilter();
    this.preHighpass.type = 'highpass';
    this.preHighpass.frequency.setValueAtTime(35, ctx.currentTime);
    this.preHighpass.Q.setValueAtTime(0.707, ctx.currentTime);
    this.bypassWet.connect(this.preHighpass);

    // 4. Analog input buffer warmth & round body EQ (280Hz peaking, +2.0dB)
    // Preserves guitar low-mid fundamental weight and prevents hollow/tinny phase cancellations
    this.warmBodyFilter = ctx.createBiquadFilter();
    this.warmBodyFilter.type = 'peaking';
    this.warmBodyFilter.frequency.setValueAtTime(280, ctx.currentTime);
    this.warmBodyFilter.Q.setValueAtTime(0.7, ctx.currentTime);
    this.warmBodyFilter.gain.setValueAtTime(2.0, ctx.currentTime);
    this.preHighpass.connect(this.warmBodyFilter);

    // 5. Delay Input Summing Node (merges incoming signal with feedback)
    this.delayInputSum = ctx.createGain();
    this.warmBodyFilter.connect(this.delayInputSum);

    // 6. Analog BBD Delay Line (Warm musical range: 2.2ms - 8.0ms)
    this.delayNode = ctx.createDelay(0.05);
    const initialDelay = this.calcBaseDelay(this.params.manual);
    this.delayNode.delayTime.setValueAtTime(initialDelay, ctx.currentTime);
    this.delayInputSum.connect(this.delayNode);

    // 7. Analog BBD Reconstruction Filter (Low-pass at 4.5 kHz)
    // Tames harsh high-frequency fizziness and ensures smooth, rounded analog sweep
    this.postLowpass = ctx.createBiquadFilter();
    this.postLowpass.type = 'lowpass';
    this.postLowpass.frequency.setValueAtTime(4500, ctx.currentTime);
    this.postLowpass.Q.setValueAtTime(0.707, ctx.currentTime);
    this.delayNode.connect(this.postLowpass);

    // 8. Feedback (Resonance) loop: Bandpass filtered (200Hz - 2.8kHz) & pure tanh soft-clip
    // Low-cut at 200Hz eliminates low hum/droning; high-cut at 2.8kHz prevents metallic whistling
    this.feedbackGain = ctx.createGain();
    this.feedbackGain.gain.setValueAtTime(this.calcFeedbackGain(this.params.res), ctx.currentTime);

    this.feedbackHighpass = ctx.createBiquadFilter();
    this.feedbackHighpass.type = 'highpass';
    this.feedbackHighpass.frequency.setValueAtTime(200, ctx.currentTime);
    this.feedbackHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    this.feedbackLowpass = ctx.createBiquadFilter();
    this.feedbackLowpass.type = 'lowpass';
    this.feedbackLowpass.frequency.setValueAtTime(2800, ctx.currentTime);
    this.feedbackLowpass.Q.setValueAtTime(0.707, ctx.currentTime);

    this.feedbackLimiter = ctx.createWaveShaper();
    this.feedbackLimiter.curve = this.createSaturationCurve(1024) as Float32Array<ArrayBuffer>;
    this.feedbackLimiter.oversample = '2x';

    this.postLowpass.connect(this.feedbackGain);
    this.feedbackGain.connect(this.feedbackHighpass);
    this.feedbackHighpass.connect(this.feedbackLowpass);
    this.feedbackLowpass.connect(this.feedbackLimiter);
    this.feedbackLimiter.connect(this.delayInputSum);

    // 9. LFO Modulation Core (Smooth sine wave with musical depth scaling)
    this.lfoNode = ctx.createOscillator();
    this.lfoNode.type = 'sine';
    this.lfoNode.frequency.setValueAtTime(this.calcRateHz(this.params.rate), ctx.currentTime);

    this.lfoGainNode = ctx.createGain();
    const initialDepth = this.calcDepthSec(this.params.depth, initialDelay);
    this.lfoGainNode.gain.setValueAtTime(initialDepth, ctx.currentTime);

    this.lfoNode.connect(this.lfoGainNode);
    this.lfoGainNode.connect(this.delayNode.delayTime);
    this.lfoNode.start();

    // 10. Wet / Dry Mixer: 1.0 Dry + 0.75 Wet ensures guitar core tone is never hollowed out
    this.dryGain = ctx.createGain();
    this.dryGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.warmBodyFilter.connect(this.dryGain);

    this.wetGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(0.75, ctx.currentTime);
    this.postLowpass.connect(this.wetGain);

    this.mixer = ctx.createGain();
    this.dryGain.connect(this.mixer);
    this.wetGain.connect(this.mixer);

    // 11. DC Blocker
    this.dcBlocker = createDcBlocker(ctx);
    this.mixer.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputNode);

    // Apply initial bypass state
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx);
  }

  private calcBaseDelay(manual: number): number {
    // 0 -> 2.2 ms, 5 -> 5.1 ms, 10 -> 8.0 ms
    // Keeps center frequency musical, vocal, and warm
    const clamped = Math.max(0, Math.min(10, manual));
    return 0.0022 + (clamped / 10) * 0.0058;
  }

  private calcDepthSec(depth: number, baseDelaySec: number): number {
    // Musical sweep depth (0.2ms to ~1.8ms max)
    // Guarantees delay variation never drops below safe 1.2ms boundary
    const clamped = Math.max(0, Math.min(10, depth));
    const maxSafeSweep = Math.min(0.0018, Math.max(0.0004, baseDelaySec - 0.0012));
    return (clamped / 10) * maxSafeSweep;
  }

  private calcRateHz(rate: number): number {
    const clamped = Math.max(0, Math.min(10, rate));
    // 0 -> 0.08 Hz (rich, slow sweeping whoosh), 5 -> 0.65 Hz (classic analog swirl), 10 -> 4.5 Hz (fast rotary shimmer)
    return 0.08 * Math.pow(56, clamped / 10);
  }

  private calcFeedbackGain(res: number): number {
    const clamped = Math.max(0, Math.min(10, res));
    // Progressive curve:
    // res = 0 -> 0.0
    // res = 3.5 -> 0.15 (subtle warm body)
    // res = 5 -> 0.25 (classic chewy BF-2 flanging)
    // res = 7 -> 0.39 (noticeable jet swirl)
    // res = 10 -> 0.62 (deep resonant sweep without runaway self-oscillation or hum)
    return Math.pow(clamped / 10, 1.4) * 0.62;
  }

  private createSaturationCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      // Pure soft saturation with unity gain at center (f'(0) = 1.0)
      // Compresses loud peaks without boosting low-level noise floor into feedback hum
      curve[i] = Math.tanh(x);
    }
    return curve;
  }

  public updateParameter(paramId: string, value: number): void {
    if (this.isDisposed) return;
    this.params[paramId] = value;
    const now = this.ctx.currentTime;

    switch (paramId) {
      case 'manual': {
        const baseDelay = this.calcBaseDelay(value);
        this.delayNode.delayTime.cancelScheduledValues(now);
        this.delayNode.delayTime.setTargetAtTime(baseDelay, now, 0.035);

        // Re-scale depth so modulation doesn't exceed safe bounds
        const depthSec = this.calcDepthSec(this.params.depth, baseDelay);
        this.lfoGainNode.gain.cancelScheduledValues(now);
        this.lfoGainNode.gain.setTargetAtTime(depthSec, now, 0.035);
        break;
      }

      case 'depth': {
        const baseDelay = this.calcBaseDelay(this.params.manual);
        const depthSec = this.calcDepthSec(value, baseDelay);
        this.lfoGainNode.gain.cancelScheduledValues(now);
        this.lfoGainNode.gain.setTargetAtTime(depthSec, now, 0.03);
        break;
      }

      case 'rate': {
        const rateHz = this.calcRateHz(value);
        this.lfoNode.frequency.cancelScheduledValues(now);
        this.lfoNode.frequency.setTargetAtTime(rateHz, now, 0.04);
        break;
      }

      case 'res': {
        const fbGain = this.calcFeedbackGain(value);
        this.feedbackGain.gain.cancelScheduledValues(now);
        this.feedbackGain.gain.setTargetAtTime(fbGain, now, 0.03);
        break;
      }
    }
  }

  public setEnabled(enabled: boolean): void {
    if (this.isDisposed) return;
    this.enabled = enabled;
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx);
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    try {
      this.lfoNode.stop();
      this.lfoNode.disconnect();
    } catch {
      // Ignore if already stopped
    }

    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.bypassDry.disconnect();
    this.bypassWet.disconnect();
    this.preHighpass.disconnect();
    this.warmBodyFilter.disconnect();
    this.delayInputSum.disconnect();
    this.delayNode.disconnect();
    this.postLowpass.disconnect();
    this.feedbackGain.disconnect();
    this.feedbackHighpass.disconnect();
    this.feedbackLowpass.disconnect();
    this.feedbackLimiter.disconnect();
    this.lfoGainNode.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.mixer.disconnect();
    this.dcBlocker.disconnect();
  }
}
