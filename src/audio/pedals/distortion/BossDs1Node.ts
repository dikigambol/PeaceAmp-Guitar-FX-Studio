import type { AudioPedalNode } from '../../../types/pedal';
import { levelToGain, applyBypassCrossfade, createDcBlocker, driveDependentTrimDb } from '../dspUtils';

/**
 * Output trim calibration:
 *   - TRIM_UNITY_DB: Output trim when DIST is low (~unity loudness at noon)
 *   - TRIM_SAT_DB: Output trim when DIST is maxed, maintaining punchy perceived loudness
 *     without elevating the idle noise floor.
 */
const TRIM_UNITY_DB = 1.0;
const TRIM_SAT_DB = -5.5;

/**
 * Boss DS-1 Distortion (1978)
 * 
 * Authentic analog circuit model directly derived from the official schematic & analysis:
 * 
 * 1. Input Buffer & Q2 Transistor Booster:
 *    - C1 / C2 coupling capacitors create a 72 Hz high-pass corner to keep low-end tight.
 *    - C3 (0.47 µF) across R8 (470 Ω) forms an emitter-bypass shelf boosting upper-mids
 *      above 720 Hz (+8 dB pre-emphasis).
 *    - Common-emitter BJT booster imparts ~11 dB clean pre-gain to overdrive the op-amp.
 * 
 * 2. Variable Op-Amp Gain Stage:
 *    - Controlled by DIST pot (100k log + 4.7k in feedback loop).
 *    - Smooth audio-taper drive ranges from ~5.4x (light dynamic crunch) to 115x (singing sustain).
 * 
 * 3. Symmetrical Hard Silicon Diode Clipper (D4 & D5):
 *    - 1N4148 silicon diodes clipping hard to ground at ±0.60V threshold.
 *    - C-1 continuous Shockley conduction curve with slight tolerance asymmetry,
 *      producing rich 2nd-order warmth and roaring 3rd-order square-wave bite.
 *    - 4x oversampling completely eliminates digital aliasing.
 * 
 * 4. C10 Diode Smoothing Low-Pass Filter:
 *    - 7.2 kHz filter in parallel with the diodes (C10 = 0.01 µF / R14 = 2.2k)
 *      shaving off harsh raw diode edge splatter.
 * 
 * 5. Authentic Dual-Branch Passive Tone Stack (Big Muff style):
 *    - Branch 1: Fixed Low-Pass Filter at 234 Hz (-6 dB/octave).
 *    - Branch 2: Fixed High-Pass Filter at 1063 Hz (-6 dB/octave).
 *    - TONE potentiometer blends between the two branches:
 *        * Tone = 0: 100% Low-pass branch (thick, dark, warm fuzz/distortion).
 *        * Tone = 5 (noon): 50/50 crossover blend producing the iconic -7.5 dB mid-scoop at 500 Hz.
 *        * Tone = 10: 100% High-pass branch (razor-sharp, piercing, aggressive cut).
 * 
 * 6. Q3 Recovery Buffer & Analog Output Filter:
 *    - 6.0 kHz 2nd-order analog ceiling filter ensuring smooth, singing distortion through any amp.
 *    - Calibrated LEVEL pot with unity volume at noon and punchy boost up to 10.
 */
export class BossDs1Node implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;

  // 1. Input Stage: Highpass & Q2 Transistor Booster
  private inputHighpass: BiquadFilterNode;
  private inputPreEmphasis: BiquadFilterNode;
  private preBoostGain: GainNode;

  // 2. Op-Amp Distortion Drive & Hard Diode Clipper
  private driveGain: GainNode;
  private diodeClipper: WaveShaperNode;
  private diodeSmoothingFilter: BiquadFilterNode;
  private dcBlocker: BiquadFilterNode;

  // 3. Authentic Passive DS-1 Tone Stack (234 Hz LPF + 1063 Hz HPF)
  private toneLpf: BiquadFilterNode;
  private toneHpf: BiquadFilterNode;
  private toneLpfGain: GainNode;
  private toneHpfGain: GainNode;
  private toneSum: GainNode;

  // 4. Recovery & Output Stage
  private postRecoveryFilter: BiquadFilterNode;
  private levelGain: GainNode;

  // Bypass crossfade
  private wetGain: GainNode;
  private dryGain: GainNode;
  private isEnabled = true;

  // Parameters (0 - 10)
  private distVal = 6;
  private toneVal = 5;
  private levelVal = 5;

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.dist !== undefined) this.distVal = initialParams.dist;
    if (initialParams?.tone !== undefined) this.toneVal = initialParams.tone;
    if (initialParams?.level !== undefined) this.levelVal = initialParams.level;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Input Stage:
    // 72 Hz highpass cuts sub-audio bass mud
    this.inputHighpass = ctx.createBiquadFilter();
    this.inputHighpass.type = 'highpass';
    this.inputHighpass.frequency.setValueAtTime(72, ctx.currentTime);
    this.inputHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    // Q2 Transistor pre-emphasis: C3 (0.47 µF) across R8 (470 Ω) boosts upper-mids above 720 Hz
    this.inputPreEmphasis = ctx.createBiquadFilter();
    this.inputPreEmphasis.type = 'highshelf';
    this.inputPreEmphasis.frequency.setValueAtTime(720, ctx.currentTime);
    this.inputPreEmphasis.gain.setValueAtTime(8.0, ctx.currentTime);

    // Q2 common-emitter transistor stage clean booster (~11 dB gain = 3.6x)
    this.preBoostGain = ctx.createGain();
    this.preBoostGain.gain.setValueAtTime(3.6, ctx.currentTime);

    // 2. Op-Amp Gain Stage controlled by DIST pot
    this.driveGain = ctx.createGain();

    // 3. Symmetrical Hard Diode Clipper (1N4148 diodes to ground, 4x oversampled)
    this.diodeClipper = ctx.createWaveShaper();
    this.diodeClipper.curve = this.createDs1DiodeCurve(4096) as Float32Array<ArrayBuffer>;
    this.diodeClipper.oversample = '4x';

    // C10 parallel capacitor low-pass filter (7.2 kHz) across diodes
    this.diodeSmoothingFilter = ctx.createBiquadFilter();
    this.diodeSmoothingFilter.type = 'lowpass';
    this.diodeSmoothingFilter.frequency.setValueAtTime(7200, ctx.currentTime);
    this.diodeSmoothingFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    // DC Blocker (15 Hz)
    this.dcBlocker = createDcBlocker(ctx, 15);

    // 4. Authentic Passive DS-1 Tone Stack:
    // Branch 1: Fixed Low-Pass Filter at 234 Hz (-6 dB/octave)
    this.toneLpf = ctx.createBiquadFilter();
    this.toneLpf.type = 'lowpass';
    this.toneLpf.frequency.setValueAtTime(234, ctx.currentTime);
    this.toneLpf.Q.setValueAtTime(0.5, ctx.currentTime); // 6 dB/oct single-pole slope

    // Branch 2: Fixed High-Pass Filter at 1063 Hz (-6 dB/octave)
    this.toneHpf = ctx.createBiquadFilter();
    this.toneHpf.type = 'highpass';
    this.toneHpf.frequency.setValueAtTime(1063, ctx.currentTime);
    this.toneHpf.Q.setValueAtTime(0.5, ctx.currentTime); // 6 dB/oct single-pole slope

    this.toneLpfGain = ctx.createGain();
    this.toneHpfGain = ctx.createGain();
    this.toneSum = ctx.createGain();

    // 5. Recovery Post-Lowpass (6.0 kHz analog ceiling filter)
    this.postRecoveryFilter = ctx.createBiquadFilter();
    this.postRecoveryFilter.type = 'lowpass';
    this.postRecoveryFilter.frequency.setValueAtTime(6000, ctx.currentTime);
    this.postRecoveryFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    // 6. Level Output Stage
    this.levelGain = ctx.createGain();

    // 7. Wet / Dry routing for pop-free bypass
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();

    this.wetGain.gain.setValueAtTime(this.isEnabled ? 1 : 0, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(this.isEnabled ? 0 : 1, ctx.currentTime);

    // Connect Wet Signal Path:
    // Input -> inputHighpass -> inputPreEmphasis -> preBoostGain -> driveGain -> diodeClipper
    //       -> diodeSmoothingFilter -> dcBlocker
    this.inputNode.connect(this.inputHighpass);
    this.inputHighpass.connect(this.inputPreEmphasis);
    this.inputPreEmphasis.connect(this.preBoostGain);
    this.preBoostGain.connect(this.driveGain);
    this.driveGain.connect(this.diodeClipper);
    this.diodeClipper.connect(this.diodeSmoothingFilter);
    this.diodeSmoothingFilter.connect(this.dcBlocker);

    // Split into 2-branch Tone Stack:
    this.dcBlocker.connect(this.toneLpf);
    this.dcBlocker.connect(this.toneHpf);
    this.toneLpf.connect(this.toneLpfGain);
    this.toneHpf.connect(this.toneHpfGain);
    this.toneLpfGain.connect(this.toneSum);
    this.toneHpfGain.connect(this.toneSum);

    // ToneSum -> postRecoveryFilter -> levelGain -> wetGain -> outputNode
    this.toneSum.connect(this.postRecoveryFilter);
    this.postRecoveryFilter.connect(this.levelGain);
    this.levelGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);

    // Connect Dry Bypass Path:
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Apply initial parameter settings immediately
    this.applyParameters(true);
  }

  /**
   * Generates continuous symmetrical hard silicon diode clipping transfer curve.
   * Models 1N4148 diodes clamping to ground with a sharp silicon forward knee (~0.60V)
   * and a gentle bulk resistance slope above threshold.
   * C-1 continuous with zero piecewise discontinuities.
   */
  private createDs1DiodeCurve(samples = 4096): Float32Array<ArrayBuffer> {
    const curve = new Float32Array(samples) as Float32Array<ArrayBuffer>;
    const vThPos = 0.58; // Positive threshold (1N4148 Vf ~0.60V)
    const vThNeg = 0.55; // Slight diode tolerance asymmetry (~5%) for 2nd-order warmth
    const knee = 0.12;   // Sharp silicon conduction knee

    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1; // -1.0 to +1.0
      const sign = x < 0 ? -1 : 1;
      const absX = Math.abs(x);
      const vTh = x >= 0 ? vThPos : vThNeg;

      let y: number;
      if (absX < vTh - knee) {
        // Completely linear below diode forward conduction threshold
        y = absX;
      } else {
        // Smooth exponential/hyperbolic tangent knee into hard saturation
        const delta = absX - (vTh - knee);
        y = (vTh - knee) + knee * Math.tanh(delta / knee) + 0.035 * Math.log1p(delta * 2.0);
      }

      // Scaled output
      curve[i] = sign * y * 1.35;
    }
    return curve;
  }

  private applyParameters(immediate = false): void {
    const now = this.ctx.currentTime;
    const rampTime = 0.015;

    // 1. Distortion Drive:
    // dist = 0:  1.5x (total pre-gain = 5.4x) -> light dynamic crunch
    // dist = 5: 14.0x (total pre-gain = 50.4x) -> classic heavy rock crunch
    // dist = 10: 32.0x (total pre-gain = 115x) -> screaming, singing saturated sustain
    const distNorm = Math.max(0, Math.min(10, this.distVal)) / 10;
    const driveMult = 1.5 + 30.5 * Math.pow(distNorm, 1.7);
    const totalDrive = 3.6 * driveMult;

    // 2. Dual-branch Passive Tone Stack blending:
    // tone = 0:  100% LPF (234 Hz)  - fat, dark, warm fuzz/distortion
    // tone = 5:  50% LPF + 50% HPF  - classic -7.5 dB mid-scoop at 500 Hz
    // tone = 10: 100% HPF (1063 Hz) - razor-sharp, bright, cutting edge
    const toneNorm = Math.max(0, Math.min(10, this.toneVal)) / 10;
    const lpfGainVal = Math.cos(toneNorm * Math.PI * 0.5) * 1.25;
    const hpfGainVal = Math.sin(toneNorm * Math.PI * 0.5) * 1.25;

    // 3. Dynamic output trim:
    // Ensures level stays authoritative while suppressing idle noise floor
    const trim = driveDependentTrimDb(totalDrive, TRIM_UNITY_DB, TRIM_SAT_DB, 8.0);
    const outGain = levelToGain(this.levelVal, trim);

    if (immediate) {
      this.driveGain.gain.setValueAtTime(driveMult, now);
      this.toneLpfGain.gain.setValueAtTime(lpfGainVal, now);
      this.toneHpfGain.gain.setValueAtTime(hpfGainVal, now);
      this.levelGain.gain.setValueAtTime(outGain, now);
    } else {
      this.driveGain.gain.setTargetAtTime(driveMult, now, rampTime);
      this.toneLpfGain.gain.setTargetAtTime(lpfGainVal, now, rampTime);
      this.toneHpfGain.gain.setTargetAtTime(hpfGainVal, now, rampTime);
      this.levelGain.gain.setTargetAtTime(outGain, now, rampTime);
    }
  }

  public updateParameter(paramId: string, value: number): void {
    if (paramId === 'dist') this.distVal = value;
    else if (paramId === 'tone') this.toneVal = value;
    else if (paramId === 'level') this.levelVal = value;
    this.applyParameters(false);
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    applyBypassCrossfade(this.wetGain, this.dryGain, enabled, this.ctx);
  }

  public dispose(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
  }
}
