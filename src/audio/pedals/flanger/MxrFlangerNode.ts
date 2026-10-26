import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';
import { BbdAnalogWarmthStage } from '../chorus/BbdAnalogWarmthStage';

/**
 * MXR M117R FLANGER
 *
 * Legendary 1970s BBD Analog Flanger:
 * - Bucket-Brigade analog delay architecture (Reticon SAD1024 / Panasonic MN3007)
 * - Famous for Eddie Van Halen's "Unchained" and "Ain't Talkin' 'Bout Love" jet sweeps
 * - Controls:
 *   - MANUAL: Sets center delay / comb filter frequency notch (~0.4 ms to ~4.2 ms)
 *   - WIDTH: Modulation sweep depth/amplitude from 0 (static comb filter) to full dynamic sweep
 *   - SPEED: LFO sweep frequency from ultra-slow cosmic roar (~0.04 Hz) to rapid swirl (~3.5 Hz)
 *   - REGEN: Regeneration / feedback resonance into BBD input
 * - 220 Hz low-cut filter in feedback loop prevents low-frequency drone/hum even at maximum REGEN
 * - Authentic 4-pole Sallen-Key reconstruction filter & compander saturation via BbdAnalogWarmthStage
 */
export class MxrFlangerNode implements AudioPedalNode {
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
  private bbdWarmth: BbdAnalogWarmthStage;

  // Feedback (REGEN) loop
  private feedbackGain: GainNode;
  private feedbackHighpass: BiquadFilterNode;
  private feedbackLowpass: BiquadFilterNode;
  private feedbackLimiter: WaveShaperNode;

  // Modulation (LFO)
  private lfoNode: OscillatorNode;
  private lfoGainNode: GainNode;

  // Wet / Dry Mixer
  private dryGain: GainNode;
  private wetGain: GainNode;
  private mixer: GainNode;
  private dcBlocker: BiquadFilterNode;

  private isDisposed = false;

  private params: Record<string, number> = {
    manual: 5.0, // 0 to 10 (~0.4ms to ~4.2ms)
    width: 6.0,  // 0 to 10 (sweep width)
    speed: 3.0,  // 0 to 10 (LFO rate: ~0.04 Hz to ~3.5 Hz)
    regen: 5.0,  // 0 to 10 (feedback resonance)
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

    // 3. Sub-bass cleanup HPF (30Hz)
    this.preHighpass = ctx.createBiquadFilter();
    this.preHighpass.type = 'highpass';
    this.preHighpass.frequency.setValueAtTime(30, ctx.currentTime);
    this.preHighpass.Q.setValueAtTime(0.707, ctx.currentTime);
    this.bypassWet.connect(this.preHighpass);

    // 4. Analog input buffer warmth & round body EQ (320Hz peaking, +1.6dB)
    this.warmBodyFilter = ctx.createBiquadFilter();
    this.warmBodyFilter.type = 'peaking';
    this.warmBodyFilter.frequency.setValueAtTime(320, ctx.currentTime);
    this.warmBodyFilter.Q.setValueAtTime(0.7, ctx.currentTime);
    this.warmBodyFilter.gain.setValueAtTime(1.6, ctx.currentTime);
    this.preHighpass.connect(this.warmBodyFilter);

    // 5. Delay Input Summing Node
    this.delayInputSum = ctx.createGain();
    this.warmBodyFilter.connect(this.delayInputSum);

    // 6. Analog BBD Delay Line (~0.4ms to ~4.2ms)
    this.delayNode = ctx.createDelay(0.05);
    const initialDelay = this.calcBaseDelay(this.params.manual);
    this.delayNode.delayTime.setValueAtTime(initialDelay, ctx.currentTime);
    this.delayInputSum.connect(this.delayNode);

    // 7. BBD Reconstruction & Anti-Aliasing (4-Pole Sallen-Key 4.2 kHz) & Compander Saturation
    this.bbdWarmth = new BbdAnalogWarmthStage(ctx, {
      cutoffFreq: 4200,
      saturationAmount: 0.35,
      oversample: '4x',
    });
    this.delayNode.connect(this.bbdWarmth.inputNode);

    // 8. Feedback (REGEN) loop: Bandpass filtered (220Hz - 3.2kHz) + soft saturation limiter
    this.feedbackGain = ctx.createGain();
    this.feedbackGain.gain.setValueAtTime(
      this.calcFeedbackGain(this.params.regen),
      ctx.currentTime
    );

    this.feedbackHighpass = ctx.createBiquadFilter();
    this.feedbackHighpass.type = 'highpass';
    this.feedbackHighpass.frequency.setValueAtTime(220, ctx.currentTime);
    this.feedbackHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    this.feedbackLowpass = ctx.createBiquadFilter();
    this.feedbackLowpass.type = 'lowpass';
    this.feedbackLowpass.frequency.setValueAtTime(3200, ctx.currentTime);
    this.feedbackLowpass.Q.setValueAtTime(0.707, ctx.currentTime);

    this.feedbackLimiter = ctx.createWaveShaper();
    this.feedbackLimiter.curve = this.createSaturationCurve(1024) as Float32Array<ArrayBuffer>;
    this.feedbackLimiter.oversample = '2x';

    this.bbdWarmth.outputNode.connect(this.feedbackGain);
    this.feedbackGain.connect(this.feedbackHighpass);
    this.feedbackHighpass.connect(this.feedbackLowpass);
    this.feedbackLowpass.connect(this.feedbackLimiter);
    this.feedbackLimiter.connect(this.delayInputSum);

    // 9. LFO Modulation Core (Smooth sine sweep with musical depth scaling)
    this.lfoNode = ctx.createOscillator();
    this.lfoNode.type = 'sine';
    this.lfoNode.frequency.setValueAtTime(this.calcSpeedHz(this.params.speed), ctx.currentTime);

    this.lfoGainNode = ctx.createGain();
    const initialDepth = this.calcWidthSec(this.params.width, initialDelay);
    this.lfoGainNode.gain.setValueAtTime(initialDepth, ctx.currentTime);

    this.lfoNode.connect(this.lfoGainNode);
    this.lfoGainNode.connect(this.delayNode.delayTime);
    this.lfoNode.start();

    // 10. Wet / Dry Mixer: 1.0 Dry + 0.82 Wet preserves guitar attack and fullness
    this.dryGain = ctx.createGain();
    this.dryGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.warmBodyFilter.connect(this.dryGain);

    this.wetGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(0.82, ctx.currentTime);
    this.bbdWarmth.outputNode.connect(this.wetGain);

    this.mixer = ctx.createGain();
    this.dryGain.connect(this.mixer);
    this.wetGain.connect(this.mixer);

    // 11. DC Blocker
    this.dcBlocker = createDcBlocker(ctx);
    this.mixer.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputNode);

    // Apply initial bypass state (1 ms, matching the other bypass-style pedals so the
    // startup crossfade finishes inside SignalChain's insert mute)
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx, 0.001);
  }

  private calcBaseDelay(manual: number): number {
    // 0 -> 0.4 ms (high metallic comb notch), 5 -> 2.3 ms, 10 -> 4.2 ms (deep whoosh)
    const clamped = Math.max(0, Math.min(10, manual));
    return 0.0004 + (clamped / 10) * 0.0038;
  }

  private calcWidthSec(width: number, baseDelaySec: number): number {
    const clamped = Math.max(0, Math.min(10, width));
    // Safe sweep modulation width (never dropping delay below 0.25ms)
    const maxSafeSweep = Math.min(0.0018, Math.max(0.0002, baseDelaySec - 0.00025));
    return (clamped / 10) * maxSafeSweep;
  }

  private calcSpeedHz(speed: number): number {
    const clamped = Math.max(0, Math.min(10, speed));
    // 0 -> 0.04 Hz (slow 25s EVH sweep), 5 -> 0.52 Hz, 10 -> 3.5 Hz (fast rotary wobble)
    return 0.04 * Math.pow(87.5, clamped / 10);
  }

  private calcFeedbackGain(regen: number): number {
    const clamped = Math.max(0, Math.min(10, regen));
    // Progressive feedback curve capped safely at 0.60 to avoid runaway self-oscillation
    return Math.pow(clamped / 10, 1.35) * 0.60;
  }

  private createSaturationCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      // Pure soft saturation with unity gain at center (f'(0) = 1.0)
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

        const widthSec = this.calcWidthSec(this.params.width, baseDelay);
        this.lfoGainNode.gain.cancelScheduledValues(now);
        this.lfoGainNode.gain.setTargetAtTime(widthSec, now, 0.035);
        break;
      }

      case 'width': {
        const baseDelay = this.calcBaseDelay(this.params.manual);
        const widthSec = this.calcWidthSec(value, baseDelay);
        this.lfoGainNode.gain.cancelScheduledValues(now);
        this.lfoGainNode.gain.setTargetAtTime(widthSec, now, 0.03);
        break;
      }

      case 'speed': {
        const speedHz = this.calcSpeedHz(value);
        this.lfoNode.frequency.cancelScheduledValues(now);
        this.lfoNode.frequency.setTargetAtTime(speedHz, now, 0.04);
        break;
      }

      case 'regen': {
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
    this.bbdWarmth.dispose();
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
