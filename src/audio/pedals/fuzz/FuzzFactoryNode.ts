import type { AudioPedalNode } from '../../../types/pedal';
import { levelToGain, applyBypassCrossfade, driveDependentTrimDb, createDcBlocker } from '../dspUtils';

/**
 * Output trim (dB) calibrated so Vol=5 is ~unity loudness at moderate settings.
 */
const TRIM_UNITY_DB = -1.5;
const TRIM_SAT_DB = -11.0;

/**
 * Z.Vex Fuzz Factory (1995)
 * 
 * Authentic analog circuit model of Zachary Vex's legendary 3-transistor Germanium fuzz
 * (2N3906 silicon preamp + matched AC128 Germanium PNP clipping pair):
 * 
 *   - VOL: Master output volume attenuator.
 *   - DRIVE: Controls Q1 preamp gain into the Germanium core (from vintage warm breakup to roaring fuzz).
 *   - COMP: Modulates Q2 collector bias, squashing attack transients into sustaining square-wave synth tones.
 *   - GATE: Adjusts transistor leakage / bias clamp:
 *           * At low gate (0-2): Natural open decay and maximum sustain.
 *           * At medium gate (3-5): 100% SILENT noise floor when not playing (zero hiss / howling).
 *           * At high gate (6-10): Signature sputtering "velcro" choked decay.
 *   - STAB: Circuit DC rail voltage sag:
 *           * At 10: Full 9V DC supply, lush and 100% stable vintage Germanium fuzz.
 *           * Below 5: Voltage starvation collapses headroom into gritty, buzzy battery-starved fuzz.
 */
export class FuzzFactoryNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;

  // 1. Input Conditioning & RF Rejection (Q1 2N3906 stage)
  private inputHighpass: BiquadFilterNode;
  private inputRfFilter: BiquadFilterNode;
  private inputPreGain: GainNode;

  // 2. Drive Gain (Preamp boost 1.2x to 30x)
  private driveGain: GainNode;

  // 3. Comp Dynamic Squash & Saturation
  private compGain: GainNode;
  private compShaper: WaveShaperNode;

  // 4. Germanium Fuzz Core (AC128 PNP Pair) with Voltage Sag
  private sagPreGain: GainNode;
  private geCoreShaper: WaveShaperNode;
  private sagPostGain: GainNode;
  private dcBlocker: BiquadFilterNode;

  // 5. Gate / Velcro Clamping Stage (Static Transfer Shaper with dynamic threshold)
  private gateInGain: GainNode;
  private gateShaper: WaveShaperNode;
  private gateOutGain: GainNode;

  // 6. Vintage Germanium Miller Capacitance & Tone Smoothing Filter (~4.8 kHz)
  private millerLowpass: BiquadFilterNode;
  private postGain: GainNode;

  // Bypass crossfade
  private wetGain: GainNode;
  private dryGain: GainNode;
  private isEnabled = true;

  // Parameters (0 - 10)
  private volVal = 5;
  private gateVal = 4;
  private compVal = 3;
  private driveVal = 6;
  private stabVal = 8.5;

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.vol !== undefined) this.volVal = initialParams.vol;
    if (initialParams?.gate !== undefined) this.gateVal = initialParams.gate;
    if (initialParams?.comp !== undefined) this.compVal = initialParams.comp;
    if (initialParams?.drive !== undefined) this.driveVal = initialParams.drive;
    if (initialParams?.stab !== undefined) this.stabVal = initialParams.stab;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Input Highpass (80 Hz 0.1 uF coupling cap prevents flubby bass saturation)
    this.inputHighpass = ctx.createBiquadFilter();
    this.inputHighpass.type = 'highpass';
    this.inputHighpass.frequency.setValueAtTime(80, ctx.currentTime);
    this.inputHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    // RF Lowpass (5.2 kHz prevents high-frequency acoustic feedback howling through mic)
    this.inputRfFilter = ctx.createBiquadFilter();
    this.inputRfFilter.type = 'lowpass';
    this.inputRfFilter.frequency.setValueAtTime(5200, ctx.currentTime);
    this.inputRfFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    // Q1 Preamp initial gain
    this.inputPreGain = ctx.createGain();
    this.inputPreGain.gain.setValueAtTime(1.6, ctx.currentTime);

    // 2. Drive Gain Stage
    this.driveGain = ctx.createGain();

    // 3. Comp Dynamic Stage: hyperbolic tangent soft compressor
    this.compGain = ctx.createGain();
    this.compShaper = ctx.createWaveShaper();
    this.compShaper.curve = this.createCompCurve(2048) as Float32Array<ArrayBuffer>;
    this.compShaper.oversample = '4x';

    // 4. Germanium Fuzz Core (AC128 PNP pair) with voltage sag
    this.sagPreGain = ctx.createGain();
    this.geCoreShaper = ctx.createWaveShaper();
    this.geCoreShaper.curve = this.createGermaniumCoreCurve(4096) as Float32Array<ArrayBuffer>;
    this.geCoreShaper.oversample = '4x';
    this.sagPostGain = ctx.createGain();

    // DC Blocker (removes DC offset from asymmetric Germanium clipping)
    this.dcBlocker = createDcBlocker(ctx, 16);

    // 5. Gate Velcro Clamping Stage (Static shaper with dynamic gain thresholding)
    this.gateInGain = ctx.createGain();
    this.gateShaper = ctx.createWaveShaper();
    this.gateShaper.curve = this.createGateCurve(4096) as Float32Array<ArrayBuffer>;
    this.gateShaper.oversample = 'none';
    this.gateOutGain = ctx.createGain();

    // 6. Miller Capacitance Warmth Filter (~4.6 kHz vintage Germanium roll-off)
    this.millerLowpass = ctx.createBiquadFilter();
    this.millerLowpass.type = 'lowpass';
    this.millerLowpass.frequency.setValueAtTime(4600, ctx.currentTime);
    this.millerLowpass.Q.setValueAtTime(0.707, ctx.currentTime);

    // 7. Master Post Gain
    this.postGain = ctx.createGain();

    // 8. Bypass crossfade
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(enabled ? 1.0 : 0.0, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(enabled ? 0.0 : 1.0, ctx.currentTime);

    // Connect Audio Flow: Robust, stable, forward-only analog pipeline (ZERO runaway feedback!)
    // Dry Path
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Wet Path
    this.inputNode.connect(this.inputHighpass);
    this.inputHighpass.connect(this.inputRfFilter);
    this.inputRfFilter.connect(this.inputPreGain);
    this.inputPreGain.connect(this.driveGain);
    this.driveGain.connect(this.compGain);
    this.compGain.connect(this.compShaper);
    this.compShaper.connect(this.sagPreGain);
    this.sagPreGain.connect(this.geCoreShaper);
    this.geCoreShaper.connect(this.sagPostGain);
    this.sagPostGain.connect(this.dcBlocker);
    this.dcBlocker.connect(this.gateInGain);
    this.gateInGain.connect(this.gateShaper);
    this.gateShaper.connect(this.gateOutGain);
    this.gateOutGain.connect(this.millerLowpass);
    this.millerLowpass.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);

    this.recalculate();
  }

  /**
   * Comp Curve: Soft hyperbolic tangent saturation.
   * Compresses peak attack transients into a smooth, sustaining square wave.
   */
  private createCompCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      // Soft saturation without hard edges
      curve[i] = Math.tanh(x * 1.6) * 0.92;
    }
    return curve;
  }

  /**
   * Germanium Core Curve: Authentic AC128 PNP asymmetric soft-knee transfer function.
   * Low conduction threshold (Vf ~0.26V) with rich 2nd and 3rd harmonic bloom.
   */
  private createGermaniumCoreCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    const kneePos = 0.30;
    const kneeNeg = 0.22;

    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      if (x >= 0) {
        // Positive half-wave: gentle Germanium compression
        const s = x / kneePos;
        curve[i] = (kneePos * s) / Math.pow(1 + Math.pow(s, 2.2), 1 / 2.2);
      } else {
        // Negative half-wave: asymmetrical conduction
        const s = -x / kneeNeg;
        curve[i] = -(kneeNeg * s) / Math.pow(1 + Math.pow(s, 1.9), 1 / 1.9);
      }
    }
    return curve;
  }

  /**
   * Gate Curve: Static non-linear transfer function with smooth deadband around zero.
   * Modulated via input and output gain to eliminate zipper noise and clicks while
   * providing dead-silent background noise floor and velcro sputter decay.
   */
  private createGateCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    const deadband = 0.04;

    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      const absX = Math.abs(x);
      if (absX <= deadband) {
        // Below deadband: silent (kills hiss, noise, and acoustic mic howling)
        curve[i] = 0;
      } else {
        const sign = x < 0 ? -1 : 1;
        const norm = (absX - deadband) / (1 - deadband);
        // Smooth polynomial transition into linear transfer
        curve[i] = sign * Math.pow(norm, 1.35);
      }
    }
    return curve;
  }

  private recalculate(): void {
    const now = this.ctx.currentTime;

    // 1. DRIVE: Preamp gain (1.2x at 0 up to 28x at 10)
    // Tapered curve: smooth control across the dial without piercing feedback jumps
    const driveNorm = Math.max(0, Math.min(10, this.driveVal)) / 10;
    const driveGainVal = 1.2 + 26.8 * Math.pow(driveNorm, 2.2);
    this.driveGain.gain.setTargetAtTime(driveGainVal, now, 0.02);

    // 2. COMP: Controls Q2 collector bias compression
    // Sweeps from 1.0x (dynamic, open) up to 2.8x (squashed attack, brass synth tone)
    const compNorm = Math.max(0, Math.min(10, this.compVal)) / 10;
    const compGainVal = 1.0 + compNorm * 1.8;
    this.compGain.gain.setTargetAtTime(compGainVal, now, 0.02);

    // 3. STAB: 9V rail voltage sag emulation
    // At 10: 9V rail is fully powered (sag = 1.0), rich round fuzz.
    // Below 5: voltage drops down to ~3V (sag = 0.42), starved buzzy rasp.
    const stabNorm = Math.max(0, Math.min(10, this.stabVal)) / 10;
    const vSag = 0.42 + 0.58 * stabNorm;
    this.sagPreGain.gain.setTargetAtTime(1.0 / vSag, now, 0.02);
    this.sagPostGain.gain.setTargetAtTime(vSag, now, 0.02);

    // 4. GATE: Controls noise floor silencing & velcro sputter
    // At 0: Gate is wide open (inGain boosts signal through deadband, outGain normalizes)
    // At 5: Noise floor is silenced completely when strings are muted.
    // At 10: Decaying notes choke off abruptly in signature velcro sputter.
    const gateNorm = Math.max(0, Math.min(10, this.gateVal)) / 10;
    const gateInMult = 1.0 / (0.15 + 0.85 * (1 - gateNorm));
    const gateOutMult = 0.15 + 0.85 * (1 - gateNorm);
    this.gateInGain.gain.setTargetAtTime(gateInMult, now, 0.02);
    this.gateOutGain.gain.setTargetAtTime(gateOutMult, now, 0.02);

    // 5. Miller Capacitance Warmth Filter
    // Under higher drive, Miller effect warms up highs (4.8 kHz down to 3.8 kHz)
    const millerHz = 4800 - driveNorm * 1000;
    this.millerLowpass.frequency.setTargetAtTime(millerHz, now, 0.02);

    // 6. Master Volume Trim & Level
    // Total gain staging calibrated for unity loudness at Vol=5
    const effectiveDrive = driveGainVal * compGainVal;
    const trim = driveDependentTrimDb(effectiveDrive, TRIM_UNITY_DB, TRIM_SAT_DB, 8);
    const volGain = levelToGain(this.volVal, trim);
    this.postGain.gain.setTargetAtTime(volGain, now, 0.02);
  }

  public updateParameter(paramId: string, value: number): void {
    if (paramId === 'vol') this.volVal = value;
    else if (paramId === 'gate') this.gateVal = value;
    else if (paramId === 'comp') this.compVal = value;
    else if (paramId === 'drive') this.driveVal = value;
    else if (paramId === 'stab') this.stabVal = value;

    this.recalculate();
  }

  public setEnabled(enabled: boolean): void {
    if (this.isEnabled === enabled) return;
    this.isEnabled = enabled;
    applyBypassCrossfade(this.wetGain, this.dryGain, enabled, this.ctx);
  }

  public dispose(): void {
    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.dryGain.disconnect();
      this.wetGain.disconnect();
      this.inputHighpass.disconnect();
      this.inputRfFilter.disconnect();
      this.inputPreGain.disconnect();
      this.driveGain.disconnect();
      this.compGain.disconnect();
      this.compShaper.disconnect();
      this.sagPreGain.disconnect();
      this.geCoreShaper.disconnect();
      this.sagPostGain.disconnect();
      this.dcBlocker.disconnect();
      this.gateInGain.disconnect();
      this.gateShaper.disconnect();
      this.gateOutGain.disconnect();
      this.millerLowpass.disconnect();
      this.postGain.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
}
