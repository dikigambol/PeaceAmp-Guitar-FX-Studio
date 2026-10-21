import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';

/**
 * MXR M101 PHASE 90 (BLOCK LOGO)
 *
 * The definitive 4-stage JFET analog phase shifter:
 * - 4 all-pass filter stages with matched JFET modulation
 * - Fixed 22k feedback resistor loop produces iconic chewy bite and pronounced midrange sweep
 * - Famous for Eddie Van Halen ("Eruption", "Atomic Punk"), David Gilmour ("Have a Cigar")
 * - Single SPEED knob controlling LFO sweep from 0.1 Hz to 5.2 Hz
 */
export class MxrPhase90Node implements AudioPedalNode {
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

  // Fixed feedback loop (Block Logo 22k resistor emulation)
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
    speed: 4.0, // 0 to 10 (LFO speed: ~0.1 Hz to ~5.2 Hz)
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

    // 3. Sub-bass cleanup HPF (32Hz)
    this.preHighpass = ctx.createBiquadFilter();
    this.preHighpass.type = 'highpass';
    this.preHighpass.frequency.setValueAtTime(32, ctx.currentTime);
    this.preHighpass.Q.setValueAtTime(0.707, ctx.currentTime);
    this.bypassWet.connect(this.preHighpass);

    // 4. Input buffer warmth (subtle 360Hz analog fullness, +1.5dB)
    this.warmBodyFilter = ctx.createBiquadFilter();
    this.warmBodyFilter.type = 'peaking';
    this.warmBodyFilter.frequency.setValueAtTime(360, ctx.currentTime);
    this.warmBodyFilter.Q.setValueAtTime(0.7, ctx.currentTime);
    this.warmBodyFilter.gain.setValueAtTime(1.5, ctx.currentTime);
    this.preHighpass.connect(this.warmBodyFilter);

    // 5. 4 All-Pass Filter Stages (JFET emulation)
    this.stage1 = ctx.createBiquadFilter();
    this.stage2 = ctx.createBiquadFilter();
    this.stage3 = ctx.createBiquadFilter();
    this.stage4 = ctx.createBiquadFilter();

    this.allpassStages = [this.stage1, this.stage2, this.stage3, this.stage4];

    // Center frequency is ~920 Hz
    const baseFreq = 920;
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

    // 6. Fixed JFET Feedback Loop (0.36 gain)
    this.feedbackGain = ctx.createGain();
    this.feedbackGain.gain.setValueAtTime(0.36, ctx.currentTime);

    this.feedbackHighpass = ctx.createBiquadFilter();
    this.feedbackHighpass.type = 'highpass';
    this.feedbackHighpass.frequency.setValueAtTime(200, ctx.currentTime);
    this.feedbackHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    this.feedbackLimiter = ctx.createWaveShaper();
    this.feedbackLimiter.curve = this.createSaturationCurve(1024) as Float32Array<ArrayBuffer>;
    this.feedbackLimiter.oversample = '2x';

    this.stage4.connect(this.feedbackGain);
    this.feedbackGain.connect(this.feedbackHighpass);
    this.feedbackHighpass.connect(this.feedbackLimiter);
    this.feedbackLimiter.connect(this.stage1);

    // 7. LFO Modulation Core (Smooth sine sweep with musical JFET scale)
    this.lfoNode = ctx.createOscillator();
    this.lfoNode.type = 'sine';
    this.lfoNode.frequency.setValueAtTime(this.calcSpeedHz(this.params.speed), ctx.currentTime);

    this.lfoGainNode = ctx.createGain();
    // Sweeps frequency range: +/- 680 Hz around 920 Hz
    this.lfoGainNode.gain.setValueAtTime(680, ctx.currentTime);

    this.lfoNode.connect(this.lfoGainNode);

    // Modulate all 4 JFET all-pass stages
    this.allpassStages.forEach((stage) => {
      this.lfoGainNode.connect(stage.frequency);
    });

    this.lfoNode.start();

    // 8. Wet / Dry Mixer: 1.0 Dry + 1.0 Wet creates the signature Phase 90 twin notches
    this.dryGain = ctx.createGain();
    this.dryGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.warmBodyFilter.connect(this.dryGain);

    this.wetGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.stage4.connect(this.wetGain);

    this.mixer = ctx.createGain();
    this.dryGain.connect(this.mixer);
    this.wetGain.connect(this.mixer);

    // Output level compensation (-3.0 dB)
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

  private calcSpeedHz(speed: number): number {
    const clamped = Math.max(0, Math.min(10, speed));
    // 0 -> 0.10 Hz (slow 10s warm sweep), 5 -> 0.85 Hz (Van Halen classic sweep), 10 -> 5.2 Hz (fast rotary shimmer)
    return 0.10 * Math.pow(52, clamped / 10);
  }

  private createSaturationCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      // Soft saturation with unity gain
      curve[i] = Math.tanh(x);
    }
    return curve;
  }

  public updateParameter(paramId: string, value: number): void {
    if (this.isDisposed) return;
    this.params[paramId] = value;
    const now = this.ctx.currentTime;

    if (paramId === 'speed') {
      const speedHz = this.calcSpeedHz(value);
      this.lfoNode.frequency.cancelScheduledValues(now);
      this.lfoNode.frequency.setTargetAtTime(speedHz, now, 0.035);
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
