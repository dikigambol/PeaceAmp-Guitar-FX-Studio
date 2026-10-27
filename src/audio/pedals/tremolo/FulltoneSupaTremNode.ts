import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';

/**
 * FULLTONE SUPA-TREM ST-1
 *
 * Modeled accurately after the revered Fulltone Supa-Trem:
 * - Photocell / Optocoupler-based optical tremolo circuit.
 * - SPEED: Large knob controlling LFO rate from ~0.7 Hz to ~14.0 Hz.
 * - MIX: Large knob controlling photocell modulation intensity (0 to 100%).
 * - VOLUME: High-headroom JFET clean preamp boost knob (unity at 5.0, up to +12 dB boost).
 * - HARD / SOFT footswitch:
 *   - SOFT: Warm, thumping vintage photocell response (smooth sinusoidal/exponential optical throb).
 *   - HARD: Dramatic stutter square-wave opto chopper.
 * - HALF-SPEED footswitch: Instantly halves the modulation speed without altering the speed knob.
 */
export class FulltoneSupaTremNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private enabled: boolean;

  // Bypass crossfade
  private bypassDry: GainNode;
  private bypassWet: GainNode;

  // Audio Path
  private tremoloGain: GainNode;
  private jfetWarmth: WaveShaperNode;
  private volumeBoostNode: GainNode;
  private dcBlocker: BiquadFilterNode;

  // Optical LFO Engine
  private lfoSoft: OscillatorNode;
  private lfoHard: OscillatorNode;
  private lfoHardSlew: BiquadFilterNode;
  private lfoSoftGain: GainNode;
  private lfoHardGain: GainNode;
  private lfoMixer: GainNode;
  private lfoDepthGain: GainNode;
  private lfoOffset: ConstantSourceNode;

  private isDisposed = false;

  private params: Record<string, number> = {
    speed: 5.0,     // 0 to 10
    mix: 7.0,       // 0 to 10
    volume: 5.0,    // 0 to 10 (5 = unity, 10 = +12dB boost)
    hardSoft: 0.0,  // 0 = SOFT, 1 = HARD
    halfSpeed: 0.0, // 0 = Normal, 1 = Half-Speed
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

    // 2. Wet audio path
    this.inputNode.connect(this.bypassWet);

    this.tremoloGain = ctx.createGain();
    // In Web Audio, connected AudioParams sum with param.value.
    // Setting intrinsic value to 0.0 ensures the ConstantSourceNode offset (1 - modDepth)
    // precisely controls the baseline gain without exceeding 1.0.
    this.tremoloGain.gain.setValueAtTime(0.0, ctx.currentTime);

    // JFET Preamp discrete warmth stage (modeled after discrete 2N5457 / J201 stage)
    this.jfetWarmth = ctx.createWaveShaper();
    this.jfetWarmth.curve = this.createJfetCurve() as Float32Array<ArrayBuffer>;
    this.jfetWarmth.oversample = '2x';

    this.volumeBoostNode = ctx.createGain();
    this.dcBlocker = createDcBlocker(ctx, 15);

    this.bypassWet.connect(this.tremoloGain);
    this.tremoloGain.connect(this.jfetWarmth);
    this.jfetWarmth.connect(this.volumeBoostNode);
    this.volumeBoostNode.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputNode);

    // 3. Dual-mode Opto LFO Engine
    this.lfoSoft = ctx.createOscillator();
    this.lfoSoft.type = 'sine';

    this.lfoHard = ctx.createOscillator();
    this.lfoHard.type = 'square';

    // Model optical CdS photocell slew lag (~2.5ms rise/fall) to eliminate digital edge pops
    this.lfoHardSlew = ctx.createBiquadFilter();
    this.lfoHardSlew.type = 'lowpass';
    this.lfoHardSlew.frequency.setValueAtTime(85, ctx.currentTime);
    this.lfoHardSlew.Q.setValueAtTime(0.5, ctx.currentTime);

    this.lfoSoftGain = ctx.createGain();
    this.lfoHardGain = ctx.createGain();
    this.lfoMixer = ctx.createGain();
    this.lfoDepthGain = ctx.createGain();

    this.lfoOffset = ctx.createConstantSource();
    this.lfoOffset.offset.setValueAtTime(1.0, ctx.currentTime);

    this.lfoSoft.connect(this.lfoSoftGain);
    this.lfoHard.connect(this.lfoHardSlew);
    this.lfoHardSlew.connect(this.lfoHardGain);
    this.lfoSoftGain.connect(this.lfoMixer);
    this.lfoHardGain.connect(this.lfoMixer);

    this.lfoMixer.connect(this.lfoDepthGain);
    this.lfoDepthGain.connect(this.tremoloGain.gain);
    this.lfoOffset.connect(this.tremoloGain.gain);

    this.lfoSoft.start();
    this.lfoHard.start();
    this.lfoOffset.start();

    // Apply parameters
    this.updateAllParameters();

    // Apply bypass crossfade
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx, 0.001);
  }

  private createJfetCurve(): Float32Array {
    const samples = 1024;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Gentle asymmetric JFET tube-like saturation with analog warmth
      if (x < 0) {
        curve[i] = Math.tanh(x * 1.1) / 1.1;
      } else {
        curve[i] = x - 0.1 * x * x;
      }
    }
    return curve;
  }

  private updateAllParameters(): void {
    if (this.isDisposed) return;
    const now = this.ctx.currentTime;

    const speedParam = this.params.speed ?? 5.0;
    const mixParam = this.params.mix ?? 7.0;
    const volumeParam = this.params.volume ?? 5.0;
    const isHard = (this.params.hardSoft ?? 0.0) >= 0.5;
    const isHalf = (this.params.halfSpeed ?? 0.0) >= 0.5;

    // Base speed: 0 to 10 -> 0.7 Hz to 14.5 Hz
    let baseSpeedHz = 0.7 * Math.pow(14.5 / 0.7, speedParam / 10);
    if (isHalf) {
      baseSpeedHz *= 0.5; // Half-Speed mode
    }

    this.lfoSoft.frequency.setTargetAtTime(baseSpeedHz, now, 0.02);
    this.lfoHard.frequency.setTargetAtTime(baseSpeedHz, now, 0.02);

    // Hard / Soft switch
    if (isHard) {
      this.lfoSoftGain.gain.setTargetAtTime(0.0, now, 0.02);
      this.lfoHardGain.gain.setTargetAtTime(0.88, now, 0.02);
    } else {
      this.lfoSoftGain.gain.setTargetAtTime(1.0, now, 0.02);
      this.lfoHardGain.gain.setTargetAtTime(0.0, now, 0.02);
    }

    // Mix (Depth)
    const mixNorm = Math.max(0, Math.min(10, mixParam)) / 10;
    const modDepth = mixNorm * 0.5;
    this.lfoDepthGain.gain.setTargetAtTime(modDepth, now, 0.02);
    this.lfoOffset.offset.setTargetAtTime(1.0 - modDepth, now, 0.02);

    // Volume Boost: 0 to 10 (5 = 1.0 unity gain, 0 = 0.0 silent, 10 = ~3.8 / +11.5 dB)
    let volGain = 1.0;
    if (volumeParam <= 5.0) {
      volGain = (volumeParam / 5.0);
    } else {
      // 5 to 10 -> 1.0 to 3.8
      volGain = 1.0 + ((volumeParam - 5.0) / 5.0) * 2.8;
    }
    this.volumeBoostNode.gain.setTargetAtTime(volGain, now, 0.02);
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
      this.lfoSoft.stop();
      this.lfoHard.stop();
      this.lfoOffset.stop();

      this.lfoSoft.disconnect();
      this.lfoHard.disconnect();
      this.lfoHardSlew.disconnect();
      this.lfoSoftGain.disconnect();
      this.lfoHardGain.disconnect();
      this.lfoMixer.disconnect();
      this.lfoDepthGain.disconnect();
      this.lfoOffset.disconnect();

      this.inputNode.disconnect();
      this.bypassDry.disconnect();
      this.bypassWet.disconnect();
      this.tremoloGain.disconnect();
      this.jfetWarmth.disconnect();
      this.volumeBoostNode.disconnect();
      this.dcBlocker.disconnect();
      this.outputNode.disconnect();
    } catch {
      // Ignore cleanup errors
    }
  }
}
