import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker, levelToGain } from '../dspUtils';

/**
 * MXR M68 UNI-VIBE (Chorus / Vibrato)
 *
 * Modeled after the legendary 1968 Shin-ei / Univox Uni-Vibe:
 * - 4-stage staggered allpass phase network emulating the vintage capacitor stagger
 *   (C1=0.015µF, C2=0.22µF, C3=470pF, C4=4.7nF) for the signature "chewy" rotary throb.
 * - Non-linear optical incandescent lamp driver with thermal filament rise/fall inertia.
 * - VIBE switch:
 *   - CHORUS (0): 50% Dry + 50% Wet phase-shifted signal (iconic Hendrix / Trower / Gilmour swirl).
 *   - VIBRATO (1): 100% Phase-shifted signal without dry (pure Doppler pitch/phase vibrato).
 * - LEVEL: Makeup gain buffer (unity at 5.0, up to +6 dB clean boost).
 * - SPEED: LFO sweep from ~0.5 Hz to ~9.0 Hz.
 * - DEPTH: Lamp modulation intensity.
 */
export class MxrUniVibeNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private enabled: boolean;

  // Bypass crossfade
  private bypassDry: GainNode;
  private bypassWet: GainNode;

  // Pre-filtering & Input buffer
  private preFilter: BiquadFilterNode;
  private warmBodyFilter: BiquadFilterNode;

  // 4-Stage Staggered Allpass Network
  private allpass1: BiquadFilterNode;
  private allpass2: BiquadFilterNode;
  private allpass3: BiquadFilterNode;
  private allpass4: BiquadFilterNode;

  // Mixer
  private dryMixGain: GainNode;
  private wetMixGain: GainNode;
  private mixBus: GainNode;

  // Level & DC Blocker
  private levelGainNode: GainNode;
  private dcBlocker: BiquadFilterNode;

  // Optical Lamp Driver LFO Engine
  private lfoOsc: OscillatorNode;
  private lfoDepthGain: GainNode;
  private lfoLampShaper: WaveShaperNode;

  // Stage modulation gains (staggered scaling)
  private modGain1: GainNode;
  private modGain2: GainNode;
  private modGain3: GainNode;
  private modGain4: GainNode;

  private isDisposed = false;

  private params: Record<string, number> = {
    level: 5.0, // 0 to 10
    speed: 4.5, // 0 to 10 (~0.5 Hz to ~9.0 Hz)
    depth: 7.0, // 0 to 10
    vibe: 0.0,  // 0 = CHORUS, 1 = VIBRATO
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

    // 2. Wet path input & input buffering
    this.inputNode.connect(this.bypassWet);

    this.preFilter = ctx.createBiquadFilter();
    this.preFilter.type = 'highpass';
    this.preFilter.frequency.setValueAtTime(25, ctx.currentTime);
    this.preFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    // Subtle 320 Hz analog preamp body
    this.warmBodyFilter = ctx.createBiquadFilter();
    this.warmBodyFilter.type = 'peaking';
    this.warmBodyFilter.frequency.setValueAtTime(320, ctx.currentTime);
    this.warmBodyFilter.Q.setValueAtTime(0.8, ctx.currentTime);
    this.warmBodyFilter.gain.setValueAtTime(1.2, ctx.currentTime);

    this.bypassWet.connect(this.preFilter);
    this.preFilter.connect(this.warmBodyFilter);

    // 3. Staggered 4-stage All-Pass Network
    // Base center frequencies matching the staggered 0.015µF / 0.22µF / 470pF / 4.7nF capacitors
    this.allpass1 = ctx.createBiquadFilter();
    this.allpass1.type = 'allpass';
    this.allpass1.frequency.setValueAtTime(750, ctx.currentTime);
    this.allpass1.Q.setValueAtTime(0.707, ctx.currentTime);

    this.allpass2 = ctx.createBiquadFilter();
    this.allpass2.type = 'allpass';
    this.allpass2.frequency.setValueAtTime(180, ctx.currentTime);
    this.allpass2.Q.setValueAtTime(0.707, ctx.currentTime);

    this.allpass3 = ctx.createBiquadFilter();
    this.allpass3.type = 'allpass';
    this.allpass3.frequency.setValueAtTime(3800, ctx.currentTime);
    this.allpass3.Q.setValueAtTime(0.707, ctx.currentTime);

    this.allpass4 = ctx.createBiquadFilter();
    this.allpass4.type = 'allpass';
    this.allpass4.frequency.setValueAtTime(1600, ctx.currentTime);
    this.allpass4.Q.setValueAtTime(0.707, ctx.currentTime);

    // Cascade: Input -> Stage1 -> Stage2 -> Stage3 -> Stage4
    this.warmBodyFilter.connect(this.allpass1);
    this.allpass1.connect(this.allpass2);
    this.allpass2.connect(this.allpass3);
    this.allpass3.connect(this.allpass4);

    // 4. Mode Routing (Chorus vs Vibrato)
    this.dryMixGain = ctx.createGain();
    this.wetMixGain = ctx.createGain();
    this.mixBus = ctx.createGain();

    this.warmBodyFilter.connect(this.dryMixGain);
    this.allpass4.connect(this.wetMixGain);
    this.dryMixGain.connect(this.mixBus);
    this.wetMixGain.connect(this.mixBus);

    // Level makeup gain & DC Blocker
    this.levelGainNode = ctx.createGain();
    this.dcBlocker = createDcBlocker(ctx, 15);

    this.mixBus.connect(this.levelGainNode);
    this.levelGainNode.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputNode);

    // 5. Optical Lamp Driver LFO
    this.lfoOsc = ctx.createOscillator();
    this.lfoOsc.type = 'sine';

    // Asymmetric filament heating/cooling waveshaper curve
    this.lfoLampShaper = ctx.createWaveShaper();
    this.lfoLampShaper.curve = this.createLampCurve() as Float32Array<ArrayBuffer>;

    this.lfoDepthGain = ctx.createGain();

    this.modGain1 = ctx.createGain();
    this.modGain2 = ctx.createGain();
    this.modGain3 = ctx.createGain();
    this.modGain4 = ctx.createGain();

    this.lfoOsc.connect(this.lfoLampShaper);
    this.lfoLampShaper.connect(this.lfoDepthGain);

    this.lfoDepthGain.connect(this.modGain1);
    this.lfoDepthGain.connect(this.modGain2);
    this.lfoDepthGain.connect(this.modGain3);
    this.lfoDepthGain.connect(this.modGain4);

    this.modGain1.connect(this.allpass1.frequency);
    this.modGain2.connect(this.allpass2.frequency);
    this.modGain3.connect(this.allpass3.frequency);
    this.modGain4.connect(this.allpass4.frequency);

    this.lfoOsc.start();

    // Initial parameter sync
    this.updateAllParameters();

    // Bypass crossfade initialization
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx, 0.001);
  }

  /**
   * Generates the non-linear incandescent bulb filament curve.
   * Lamp heats up faster than it cools down, producing the asymmetrical "thump".
   */
  private createLampCurve(): Float32Array {
    const samples = 1024;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1; // -1 to 1
      // Non-linear exponential optical response
      if (x < 0) {
        curve[i] = Math.pow(x + 1, 1.8) - 1;
      } else {
        curve[i] = Math.pow(x, 1.2);
      }
    }
    return curve;
  }

  private updateAllParameters(): void {
    if (this.isDisposed) return;
    const now = this.ctx.currentTime;

    const levelParam = this.params.level ?? 5.0;
    const speedParam = this.params.speed ?? 4.5;
    const depthParam = this.params.depth ?? 7.0;
    const isVibe = (this.params.vibe ?? 0.0) >= 0.5;

    // Speed: 0 to 10 -> 0.5 Hz to 9.2 Hz exponential sweep
    const speedHz = 0.5 * Math.pow(9.2 / 0.5, speedParam / 10);
    this.lfoOsc.frequency.setTargetAtTime(speedHz, now, 0.02);

    // Depth & Staggered frequency excursions
    const depthNorm = Math.max(0, Math.min(10, depthParam)) / 10;
    this.lfoDepthGain.gain.setTargetAtTime(depthNorm, now, 0.02);

    // Each allpass stage sweeps around its nominal center proportional to its capacitor
    this.modGain1.gain.setTargetAtTime(540 * depthNorm, now, 0.02);
    this.modGain2.gain.setTargetAtTime(140 * depthNorm, now, 0.02);
    this.modGain3.gain.setTargetAtTime(2600 * depthNorm, now, 0.02);
    this.modGain4.gain.setTargetAtTime(1100 * depthNorm, now, 0.02);

    // Mode:
    // CHORUS (vibe = 0): 50% dry + 50% phase-shifted wet
    // VIBRATO (vibe = 1): 0% dry + 100% phase-shifted wet (pure Doppler pitch vibrato)
    if (isVibe) {
      this.dryMixGain.gain.setTargetAtTime(0.0, now, 0.02);
      this.wetMixGain.gain.setTargetAtTime(1.0, now, 0.02);
    } else {
      this.dryMixGain.gain.setTargetAtTime(0.707, now, 0.02);
      this.wetMixGain.gain.setTargetAtTime(0.707, now, 0.02);
    }

    // Level: 0 to 10 (unity at 5.0, +6 dB at 10)
    // +0.5dB trim offsets perceived notch dip in Chorus mode for true unity perceived loudness at noon
    const levelGain = levelToGain(levelParam, 0.5);
    this.levelGainNode.gain.setTargetAtTime(levelGain, now, 0.02);

    // Always keep bypass state synchronized
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx, 0.02);
  }

  public updateParameter(paramId: string, value: number): void {
    this.params[paramId] = value;
    this.updateAllParameters();
  }

  public setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx);
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    try {
      this.lfoOsc.stop();
      this.lfoOsc.disconnect();
      this.lfoLampShaper.disconnect();
      this.lfoDepthGain.disconnect();
      this.modGain1.disconnect();
      this.modGain2.disconnect();
      this.modGain3.disconnect();
      this.modGain4.disconnect();

      this.inputNode.disconnect();
      this.bypassDry.disconnect();
      this.bypassWet.disconnect();
      this.preFilter.disconnect();
      this.warmBodyFilter.disconnect();
      this.allpass1.disconnect();
      this.allpass2.disconnect();
      this.allpass3.disconnect();
      this.allpass4.disconnect();
      this.dryMixGain.disconnect();
      this.wetMixGain.disconnect();
      this.mixBus.disconnect();
      this.levelGainNode.disconnect();
      this.dcBlocker.disconnect();
      this.outputNode.disconnect();
    } catch {
      // Ignore cleanup errors
    }
  }
}
