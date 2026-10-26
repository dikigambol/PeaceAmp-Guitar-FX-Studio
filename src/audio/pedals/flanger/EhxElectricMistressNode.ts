import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';
import { BbdAnalogWarmthStage } from '../chorus/BbdAnalogWarmthStage';

/**
 * ELECTRO-HARMONIX STEREO ELECTRIC MISTRESS
 *
 * Legendary Dual Flanger & Chorus Modulation Pedal:
 * - Independent Flanger & Chorus engines modulating in harmonic parallel
 * - Controls:
 *   - RATE: Master modulation speed for both Flanger and Chorus (0.05 Hz to 5.5 Hz)
 *   - FLANGER DEPTH: Controls sweep depth & intensity of the flanger section
 *   - CHORUS DEPTH: Controls sweep depth & shimmer of the chorus section
 * - Bandpass-filtered feedback loop with 220Hz low-cut & soft-clip saturation ensures zero hum/drone
 * - Authentic 4-pole Sallen-Key reconstruction filtering & compander saturation via BbdAnalogWarmthStage
 * - Authentic 1.0 Dry level preserves punchy guitar body and dynamics
 */
export class EhxElectricMistressNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private enabled: boolean;

  // Bypass crossfade
  private bypassDry: GainNode;
  private bypassWet: GainNode;

  // Common input buffering
  private preHighpass: BiquadFilterNode;
  private warmBodyFilter: BiquadFilterNode;

  // Flanger section
  private flangerInputSum: GainNode;
  private flangerDelayNode: DelayNode;
  private flangerBbdWarmth: BbdAnalogWarmthStage;
  private flangerFeedbackGain: GainNode;
  private flangerFeedbackHighpass: BiquadFilterNode;
  private flangerFeedbackLowpass: BiquadFilterNode;
  private flangerFeedbackLimiter: WaveShaperNode;
  private flangerWetGain: GainNode;
  private flangerLfoGain: GainNode;

  // Chorus section
  private chorusDelayNode: DelayNode;
  private chorusBbdWarmth: BbdAnalogWarmthStage;
  private chorusWetGain: GainNode;
  private chorusLfoGain: GainNode;
  private chorusLfoInvert: GainNode; // 180° inverted phase for lush 3D dimensional space

  // Master LFO
  private lfoNode: OscillatorNode;

  // Wet / Dry Mixer
  private dryGain: GainNode;
  private mixer: GainNode;
  private dcBlocker: BiquadFilterNode;

  private isDisposed = false;

  private params: Record<string, number> = {
    rate: 3.5,          // 0 to 10 (LFO speed: ~0.05 Hz to ~5.5 Hz)
    flangerDepth: 5.0,  // 0 to 10 (Flanger intensity)
    chorusDepth: 4.0,   // 0 to 10 (Chorus intensity)
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
      // Map backwards-compatible legacy keys if present
      const mapped = { ...initialParams };
      if ('color' in mapped && !('flangerDepth' in mapped)) {
        mapped.flangerDepth = mapped.color;
      }
      if ('range' in mapped && !('chorusDepth' in mapped)) {
        mapped.chorusDepth = mapped.range;
      }
      this.params = { ...this.params, ...mapped };
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

    // 4. Subtle input buffer EQ (Gentle presence & body boost at 300Hz, +1.8dB)
    this.warmBodyFilter = ctx.createBiquadFilter();
    this.warmBodyFilter.type = 'peaking';
    this.warmBodyFilter.frequency.setValueAtTime(300, ctx.currentTime);
    this.warmBodyFilter.Q.setValueAtTime(0.75, ctx.currentTime);
    this.warmBodyFilter.gain.setValueAtTime(1.8, ctx.currentTime);
    this.preHighpass.connect(this.warmBodyFilter);

    // =========================================================================
    // 5. FLANGER ENGINE (Reticon BBD style short delay ~2.8ms with feedback)
    // =========================================================================
    this.flangerInputSum = ctx.createGain();
    this.warmBodyFilter.connect(this.flangerInputSum);

    this.flangerDelayNode = ctx.createDelay(0.05);
    this.flangerDelayNode.delayTime.setValueAtTime(0.0028, ctx.currentTime);
    this.flangerInputSum.connect(this.flangerDelayNode);

    this.flangerBbdWarmth = new BbdAnalogWarmthStage(ctx, {
      cutoffFreq: 4800,
      saturationAmount: 0.35,
      oversample: '4x',
    });
    this.flangerDelayNode.connect(this.flangerBbdWarmth.inputNode);

    // Feedback Loop (Bandpass 220Hz - 3.0kHz + pure tanh limiter)
    this.flangerFeedbackGain = ctx.createGain();
    this.flangerFeedbackGain.gain.setValueAtTime(
      this.calcFlangerFeedback(this.params.flangerDepth),
      ctx.currentTime
    );

    this.flangerFeedbackHighpass = ctx.createBiquadFilter();
    this.flangerFeedbackHighpass.type = 'highpass';
    this.flangerFeedbackHighpass.frequency.setValueAtTime(220, ctx.currentTime);
    this.flangerFeedbackHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    this.flangerFeedbackLowpass = ctx.createBiquadFilter();
    this.flangerFeedbackLowpass.type = 'lowpass';
    this.flangerFeedbackLowpass.frequency.setValueAtTime(3000, ctx.currentTime);
    this.flangerFeedbackLowpass.Q.setValueAtTime(0.707, ctx.currentTime);

    this.flangerFeedbackLimiter = ctx.createWaveShaper();
    this.flangerFeedbackLimiter.curve = this.createSaturationCurve(1024) as Float32Array<ArrayBuffer>;
    this.flangerFeedbackLimiter.oversample = '2x';

    this.flangerBbdWarmth.outputNode.connect(this.flangerFeedbackGain);
    this.flangerFeedbackGain.connect(this.flangerFeedbackHighpass);
    this.flangerFeedbackHighpass.connect(this.flangerFeedbackLowpass);
    this.flangerFeedbackLowpass.connect(this.flangerFeedbackLimiter);
    this.flangerFeedbackLimiter.connect(this.flangerInputSum);

    this.flangerWetGain = ctx.createGain();
    this.flangerWetGain.gain.setValueAtTime(
      this.calcFlangerWetMix(this.params.flangerDepth),
      ctx.currentTime
    );
    this.flangerBbdWarmth.outputNode.connect(this.flangerWetGain);

    // =========================================================================
    // 6. CHORUS ENGINE (Analog BBD chorus delay ~7.5ms)
    // =========================================================================
    this.chorusDelayNode = ctx.createDelay(0.05);
    this.chorusDelayNode.delayTime.setValueAtTime(0.0075, ctx.currentTime);
    this.warmBodyFilter.connect(this.chorusDelayNode);

    this.chorusBbdWarmth = new BbdAnalogWarmthStage(ctx, {
      cutoffFreq: 5200,
      saturationAmount: 0.35,
      oversample: '4x',
    });
    this.chorusDelayNode.connect(this.chorusBbdWarmth.inputNode);

    this.chorusWetGain = ctx.createGain();
    this.chorusWetGain.gain.setValueAtTime(
      this.calcChorusWetMix(this.params.chorusDepth),
      ctx.currentTime
    );
    this.chorusBbdWarmth.outputNode.connect(this.chorusWetGain);

    // =========================================================================
    // 7. LFO MODULATION CORE
    // =========================================================================
    this.lfoNode = ctx.createOscillator();
    this.lfoNode.type = 'sine';
    this.lfoNode.frequency.setValueAtTime(this.calcRateHz(this.params.rate), ctx.currentTime);

    // Flanger LFO feed
    this.flangerLfoGain = ctx.createGain();
    this.flangerLfoGain.gain.setValueAtTime(
      this.calcFlangerLfoDepth(this.params.flangerDepth),
      ctx.currentTime
    );
    this.lfoNode.connect(this.flangerLfoGain);
    this.flangerLfoGain.connect(this.flangerDelayNode.delayTime);

    // Chorus LFO feed (Inverted phase for 3D stereo illusion)
    this.chorusLfoInvert = ctx.createGain();
    this.chorusLfoInvert.gain.setValueAtTime(-1.0, ctx.currentTime);
    this.lfoNode.connect(this.chorusLfoInvert);

    this.chorusLfoGain = ctx.createGain();
    this.chorusLfoGain.gain.setValueAtTime(
      this.calcChorusLfoDepth(this.params.chorusDepth),
      ctx.currentTime
    );
    this.chorusLfoInvert.connect(this.chorusLfoGain);
    this.chorusLfoGain.connect(this.chorusDelayNode.delayTime);

    this.lfoNode.start();

    // =========================================================================
    // 8. DRY / WET MIXER
    // =========================================================================
    this.dryGain = ctx.createGain();
    this.dryGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.warmBodyFilter.connect(this.dryGain);

    this.mixer = ctx.createGain();
    this.dryGain.connect(this.mixer);
    this.flangerWetGain.connect(this.mixer);
    this.chorusWetGain.connect(this.mixer);

    // 9. DC Blocker
    this.dcBlocker = createDcBlocker(ctx);
    this.mixer.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputNode);

    // Apply initial bypass state (1 ms, matching the other bypass-style pedals so the
    // startup crossfade finishes inside SignalChain's insert mute)
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx, 0.001);
  }

  private calcRateHz(rate: number): number {
    const clamped = Math.max(0, Math.min(10, rate));
    // 0 -> 0.05 Hz (slow 20-second sweep), 5 -> 0.65 Hz, 10 -> 5.5 Hz (fast rotary swirl)
    return 0.05 * Math.pow(110, clamped / 10);
  }

  private calcFlangerFeedback(depth: number): number {
    const clamped = Math.max(0, Math.min(10, depth));
    // Safe progressive feedback curve capped at 0.58
    return Math.pow(clamped / 10, 1.35) * 0.58;
  }

  private calcFlangerWetMix(depth: number): number {
    const clamped = Math.max(0, Math.min(10, depth));
    if (clamped <= 0.05) return 0.0;
    return Math.min(0.78, 0.15 + (clamped / 10) * 0.63);
  }

  private calcFlangerLfoDepth(depth: number): number {
    const clamped = Math.max(0, Math.min(10, depth));
    return (clamped / 10) * 0.0016; // Up to 1.6ms sweep
  }

  private calcChorusWetMix(depth: number): number {
    const clamped = Math.max(0, Math.min(10, depth));
    if (clamped <= 0.05) return 0.0;
    return Math.min(0.72, 0.12 + (clamped / 10) * 0.60);
  }

  private calcChorusLfoDepth(depth: number): number {
    const clamped = Math.max(0, Math.min(10, depth));
    return (clamped / 10) * 0.0022; // Up to 2.2ms chorus vibrato width
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
      case 'rate': {
        const rateHz = this.calcRateHz(value);
        this.lfoNode.frequency.cancelScheduledValues(now);
        this.lfoNode.frequency.setTargetAtTime(rateHz, now, 0.04);
        break;
      }

      case 'flangerDepth':
      case 'color': {
        const fbGain = this.calcFlangerFeedback(value);
        this.flangerFeedbackGain.gain.cancelScheduledValues(now);
        this.flangerFeedbackGain.gain.setTargetAtTime(fbGain, now, 0.035);

        const wetMix = this.calcFlangerWetMix(value);
        this.flangerWetGain.gain.cancelScheduledValues(now);
        this.flangerWetGain.gain.setTargetAtTime(wetMix, now, 0.035);

        const lfoDepth = this.calcFlangerLfoDepth(value);
        this.flangerLfoGain.gain.cancelScheduledValues(now);
        this.flangerLfoGain.gain.setTargetAtTime(lfoDepth, now, 0.035);
        break;
      }

      case 'chorusDepth':
      case 'range': {
        const wetMix = this.calcChorusWetMix(value);
        this.chorusWetGain.gain.cancelScheduledValues(now);
        this.chorusWetGain.gain.setTargetAtTime(wetMix, now, 0.035);

        const lfoDepth = this.calcChorusLfoDepth(value);
        this.chorusLfoGain.gain.cancelScheduledValues(now);
        this.chorusLfoGain.gain.setTargetAtTime(lfoDepth, now, 0.035);
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

    this.flangerInputSum.disconnect();
    this.flangerDelayNode.disconnect();
    this.flangerBbdWarmth.dispose();
    this.flangerFeedbackGain.disconnect();
    this.flangerFeedbackHighpass.disconnect();
    this.flangerFeedbackLowpass.disconnect();
    this.flangerFeedbackLimiter.disconnect();
    this.flangerWetGain.disconnect();
    this.flangerLfoGain.disconnect();

    this.chorusDelayNode.disconnect();
    this.chorusBbdWarmth.dispose();
    this.chorusWetGain.disconnect();
    this.chorusLfoInvert.disconnect();
    this.chorusLfoGain.disconnect();

    this.dryGain.disconnect();
    this.mixer.disconnect();
    this.dcBlocker.disconnect();
  }
}
