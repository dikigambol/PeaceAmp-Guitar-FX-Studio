import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';

/**
 * ELECTRO-HARMONIX SMALL STONE (NANO / EH4800)
 *
 * Legendary 4-Stage OTA (Operational Transconductance Amplifier) Phase Shifter:
 * - 4 all-pass filter stages producing 2 moving notches in frequency spectrum
 * - Controls:
 *   - RATE: Sets LFO sweep speed from slow cosmic swell (~0.08 Hz) to rapid watery swirl (~6.5 Hz)
 *   - COLOR: Two-position toggle switch:
 *     - 0 (Down/Off): Warm, smooth, transparent vintage phasing
 *     - 1 (Up/On): Deep feedback resonance with enhanced vowel sweep and psychedelic frequency peak
 * - High-pass protection in feedback loop ensures 100% stability without runaway low drone
 */
export class EhxSmallStoneNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private enabled: boolean;

  // Bypass crossfade
  private bypassDry: GainNode;
  private bypassWet: GainNode;

  // Input buffer & sub-bass cleanup
  private preHighpass: BiquadFilterNode;
  private warmBodyFilter: BiquadFilterNode;

  // 4-Stage All-pass Phase Shifter Chain
  private stage1: BiquadFilterNode;
  private stage2: BiquadFilterNode;
  private stage3: BiquadFilterNode;
  private stage4: BiquadFilterNode;
  private allpassStages: BiquadFilterNode[];

  // Feedback (COLOR) loop
  private feedbackGain: GainNode;
  private feedbackHighpass: BiquadFilterNode;
  private feedbackLimiter: WaveShaperNode;

  // LFO Modulation Core
  private lfoNode: OscillatorNode;
  private lfoGainNode: GainNode;

  // Wet / Dry Mixer
  private dryGain: GainNode;
  private wetGain: GainNode;
  private mixer: GainNode;
  private dcBlocker: BiquadFilterNode;

  private isDisposed = false;

  private params: Record<string, number> = {
    rate: 3.5,  // 0 to 10 (LFO speed)
    color: 0.0, // 0: Normal / Warm, 1: Deep Color resonance
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

    // 4. Input buffer warmth (gentle analog low-mid support at 340Hz, +1.2dB)
    this.warmBodyFilter = ctx.createBiquadFilter();
    this.warmBodyFilter.type = 'peaking';
    this.warmBodyFilter.frequency.setValueAtTime(340, ctx.currentTime);
    this.warmBodyFilter.Q.setValueAtTime(0.7, ctx.currentTime);
    this.warmBodyFilter.gain.setValueAtTime(1.2, ctx.currentTime);
    this.preHighpass.connect(this.warmBodyFilter);

    // 5. 4 All-Pass Filter Stages (OTA emulation)
    this.stage1 = ctx.createBiquadFilter();
    this.stage2 = ctx.createBiquadFilter();
    this.stage3 = ctx.createBiquadFilter();
    this.stage4 = ctx.createBiquadFilter();

    this.allpassStages = [this.stage1, this.stage2, this.stage3, this.stage4];

    // Base center frequency is ~800 Hz
    const baseFreq = 800;
    this.allpassStages.forEach((stage) => {
      stage.type = 'allpass';
      stage.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      stage.Q.setValueAtTime(0.707, ctx.currentTime);
    });

    // Chain stages: warmBody -> stage1 -> stage2 -> stage3 -> stage4
    this.warmBodyFilter.connect(this.stage1);
    this.stage1.connect(this.stage2);
    this.stage2.connect(this.stage3);
    this.stage3.connect(this.stage4);

    // 6. Feedback (COLOR) Loop: stage4 -> feedbackGain -> feedbackHPF -> limiter -> stage1
    this.feedbackGain = ctx.createGain();
    const isColorActive = this.params.color >= 0.5;
    this.feedbackGain.gain.setValueAtTime(isColorActive ? 0.62 : 0.0, ctx.currentTime);

    this.feedbackHighpass = ctx.createBiquadFilter();
    this.feedbackHighpass.type = 'highpass';
    this.feedbackHighpass.frequency.setValueAtTime(220, ctx.currentTime);
    this.feedbackHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    this.feedbackLimiter = ctx.createWaveShaper();
    this.feedbackLimiter.curve = this.createSaturationCurve(1024) as Float32Array<ArrayBuffer>;
    this.feedbackLimiter.oversample = '2x';

    this.stage4.connect(this.feedbackGain);
    this.feedbackGain.connect(this.feedbackHighpass);
    this.feedbackHighpass.connect(this.feedbackLimiter);
    this.feedbackLimiter.connect(this.stage1);

    // 7. LFO Modulation Core (Smooth triangle/sine sweep)
    this.lfoNode = ctx.createOscillator();
    this.lfoNode.type = 'sine';
    this.lfoNode.frequency.setValueAtTime(this.calcRateHz(this.params.rate), ctx.currentTime);

    this.lfoGainNode = ctx.createGain();
    // Sweep range: +/- 600 Hz around center 800 Hz (sweeping 200 Hz to 1400 Hz)
    const sweepRange = isColorActive ? 750 : 600;
    this.lfoGainNode.gain.setValueAtTime(sweepRange, ctx.currentTime);

    this.lfoNode.connect(this.lfoGainNode);

    // Connect LFO modulation to all 4 all-pass stages
    this.allpassStages.forEach((stage) => {
      this.lfoGainNode.connect(stage.frequency);
    });

    this.lfoNode.start();

    // 8. Wet / Dry Mixer: Combining 1.0 Dry + 1.0 Wet creates the 2 phase-cancellation notches!
    this.dryGain = ctx.createGain();
    this.dryGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.warmBodyFilter.connect(this.dryGain);

    this.wetGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.stage4.connect(this.wetGain);

    this.mixer = ctx.createGain();
    this.dryGain.connect(this.mixer);
    this.wetGain.connect(this.mixer);

    // Output level compensation (-3.0 dB to prevent clipping from in-phase peaks)
    const levelComp = ctx.createGain();
    levelComp.gain.setValueAtTime(0.72, ctx.currentTime);
    this.mixer.connect(levelComp);

    // 9. DC Blocker
    this.dcBlocker = createDcBlocker(ctx);
    levelComp.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputNode);

    // Apply initial bypass state
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx);
  }

  private calcRateHz(rate: number): number {
    const clamped = Math.max(0, Math.min(10, rate));
    // 0 -> 0.08 Hz (slow 12-second ocean sweep), 5 -> 0.72 Hz, 10 -> 6.5 Hz (fast rotary swirl)
    return 0.08 * Math.pow(81.25, clamped / 10);
  }

  private createSaturationCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      // Pure soft saturation with unity center gain
      curve[i] = Math.tanh(x);
    }
    return curve;
  }

  public updateParameter(paramId: string, value: number): void {
    if (this.isDisposed) return;
    this.params[paramId] = value;
    const now = this.ctx.currentTime;

    switch (paramId) {
      case 'rate': {
        const rateHz = this.calcRateHz(value);
        this.lfoNode.frequency.cancelScheduledValues(now);
        this.lfoNode.frequency.setTargetAtTime(rateHz, now, 0.035);
        break;
      }

      case 'color': {
        const isColor = value >= 0.5;
        const targetFeedback = isColor ? 0.62 : 0.0;
        this.feedbackGain.gain.cancelScheduledValues(now);
        this.feedbackGain.gain.setTargetAtTime(targetFeedback, now, 0.04);

        const sweepRange = isColor ? 750 : 600;
        this.lfoGainNode.gain.cancelScheduledValues(now);
        this.lfoGainNode.gain.setTargetAtTime(sweepRange, now, 0.04);
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

    this.allpassStages.forEach((stage) => {
      stage.disconnect();
    });

    this.feedbackGain.disconnect();
    this.feedbackHighpass.disconnect();
    this.feedbackLimiter.disconnect();
    this.lfoGainNode.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.mixer.disconnect();
    this.dcBlocker.disconnect();
  }
}
