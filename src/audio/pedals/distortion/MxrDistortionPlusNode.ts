import type { AudioPedalNode } from '../../../types/pedal';
import { levelToGain, applyBypassCrossfade, createDcBlocker, driveDependentTrimDb } from '../dspUtils';

/**
 * Output trim calibration:
 *  - TRIM_UNITY_DB: Output trim when DISTORTION is low (~unity loudness at noon Output)
 *  - TRIM_SAT_DB: Output trim when DISTORTION is cranked, maintaining singing sustain
 *    and punchy perceived volume without boosting the idle noise floor.
 */
const TRIM_UNITY_DB = 2.0;
const TRIM_SAT_DB = -3.5;

/**
 * MXR Distortion+ (M-104 vintage block logo)
 * 
 * Authentic analog circuit model directly derived from the official schematic & analysis:
 * 
 * 1. Op-Amp Gain Stage (LM741 single op-amp architecture):
 *    - Feedback network: 500k reverse-audio pot (DISTORTION) with 4.7k resistor (R3)
 *      and 0.047 µF capacitor (C3) shunted to AC ground.
 *    - High-pass corner in feedback loop at ~720 Hz:
 *      * Frequencies below 720 Hz stay near unity gain, preventing low-end flub/mud.
 *      * Frequencies above 720 Hz are amplified by up to +41 dB to +46 dB, giving
 *        the signature articulate mid-push and singing treble bite.
 *    - LM741 slew-rate and gain-bandwidth roll-off naturally cushions highs around 10-12 kHz.
 * 
 * 2. Back-to-Back Symmetrical Germanium Hard Diode Clipper:
 *    - Pair of vintage Germanium diodes (1N270 / 1N34A) shunting to ground.
 *    - Very low forward threshold: ~0.30V - 0.34V (compared to 0.6V Silicon).
 *    - Soft, round exponential knee imparting warm, compressed, fuzzy vintage distortion
 *      rich in harmonic saturation.
 *    - Oversample 4x eliminates any digital aliasing artifacts.
 * 
 * 3. Passive Output RC Filter & OUTPUT Level:
 *    - C5 (0.001 µF) capacitor to ground smooths out harsh transient edge splatter (~10 kHz).
 *    - 50k log volume pot controls output amplitude smoothly from silence to loud boost.
 */
export class MxrDistortionPlusNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;

  // 1. Input coupling & op-amp band-limiting (LM741 characteristics)
  private inputSubCut: BiquadFilterNode;
  private opAmpRollOff: BiquadFilterNode;

  // 2. Frequency-dependent feedback network (720 Hz high-pass boost shelf)
  private feedbackBassShelf: BiquadFilterNode;
  private driveGain: GainNode;

  // 3. Germanium diode clipper & smoothing
  private diodeClipper: WaveShaperNode;
  private diodeSmoothingFilter: BiquadFilterNode;
  private dcBlocker: BiquadFilterNode;

  // 4. Output level
  private levelGain: GainNode;

  // Bypass crossfade
  private wetGain: GainNode;
  private dryGain: GainNode;
  private isEnabled = true;

  // Parameters (0 - 10)
  private distortionVal = 6;
  private outputVal = 5;

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.distortion !== undefined) this.distortionVal = initialParams.distortion;
    if (initialParams?.output !== undefined) this.outputVal = initialParams.output;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Input sub-bass cutoff (C1 0.01 µF with bias network, ~20 Hz)
    this.inputSubCut = ctx.createBiquadFilter();
    this.inputSubCut.type = 'highpass';
    this.inputSubCut.frequency.setValueAtTime(22, ctx.currentTime);
    this.inputSubCut.Q.setValueAtTime(0.707, ctx.currentTime);

    // 2. LM741 internal slew rate / gain-bandwidth rolloff at high gain (~11 kHz)
    this.opAmpRollOff = ctx.createBiquadFilter();
    this.opAmpRollOff.type = 'lowpass';
    this.opAmpRollOff.frequency.setValueAtTime(11500, ctx.currentTime);
    this.opAmpRollOff.Q.setValueAtTime(0.707, ctx.currentTime);

    // 3. Feedback loop filter modeling:
    // In the real circuit, Av(f) = 1 + R_dist / (4.7k + 1/(j*w*0.047uF))
    // Below 720 Hz, gain falls toward 1 (0 dB).
    // Above 720 Hz, gain rises up to +41.5 dB (at max pot).
    // We model this with a low-shelf filter cutting the bass relative to the mid/high boost,
    // combined with the main driveGain.
    this.feedbackBassShelf = ctx.createBiquadFilter();
    this.feedbackBassShelf.type = 'lowshelf';
    this.feedbackBassShelf.frequency.setValueAtTime(720, ctx.currentTime);

    this.driveGain = ctx.createGain();

    // 4. Germanium diode wave shaper
    this.diodeClipper = ctx.createWaveShaper();
    this.diodeClipper.oversample = '4x';
    this.diodeClipper.curve = this.createGermaniumDiodeCurve() as Float32Array<ArrayBuffer>;

    // 5. C5 (0.001 µF) diode parallel lowpass filter (~9.5 kHz)
    this.diodeSmoothingFilter = ctx.createBiquadFilter();
    this.diodeSmoothingFilter.type = 'lowpass';
    this.diodeSmoothingFilter.frequency.setValueAtTime(9500, ctx.currentTime);
    this.diodeSmoothingFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    // 6. DC Blocker
    this.dcBlocker = createDcBlocker(ctx, 16);

    // 7. Output Level Gain
    this.levelGain = ctx.createGain();

    // Wet / Dry Bypass
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(enabled ? 1 : 0, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(enabled ? 0 : 1, ctx.currentTime);

    // Connect DSP Chain:
    // Input -> inputSubCut -> feedbackBassShelf -> opAmpRollOff -> driveGain
    //       -> diodeClipper -> diodeSmoothingFilter -> dcBlocker -> levelGain -> wetGain -> Output
    // Dry: Input -> dryGain -> Output
    this.inputNode.connect(this.inputSubCut);
    this.inputSubCut.connect(this.feedbackBassShelf);
    this.feedbackBassShelf.connect(this.opAmpRollOff);
    this.opAmpRollOff.connect(this.driveGain);

    this.driveGain.connect(this.diodeClipper);
    this.diodeClipper.connect(this.diodeSmoothingFilter);
    this.diodeSmoothingFilter.connect(this.dcBlocker);
    this.dcBlocker.connect(this.levelGain);
    this.levelGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);

    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Apply initial parameter values
    this.updateDriveStage();
    this.updateOutputGain();
  }

  /**
   * Generates authentic Germanium diode conduction curve (back-to-back 1N270).
   * Germanium features:
   *  - Very low threshold: ~0.30V - 0.34V
   *  - Soft, gradual exponential knee (rounder than Silicon)
   *  - Slight ~4% component tolerance asymmetry for subtle, warm 2nd-order harmonics
   */
  private createGermaniumDiodeCurve(): Float32Array {
    const samples = 8192;
    const curve = new Float32Array(samples);
    const posVf = 0.31; // Germanium positive threshold
    const negVf = 0.33; // Germanium negative threshold (subtle vintage diode tolerance)

    for (let i = 0; i < samples; i++) {
      // Map i from 0..samples-1 to x in [-1, 1]
      const x = (i / (samples - 1)) * 2 - 1;

      // Soft Germanium saturation function:
      // x / (1 + (|x| / Vf)^2.5)^(1/2.5) with soft knee rounding
      if (x >= 0) {
        const norm = x / posVf;
        curve[i] = (x / Math.pow(1 + Math.pow(norm, 2.4), 1 / 2.4)) * 1.05;
      } else {
        const absX = -x;
        const norm = absX / negVf;
        curve[i] = -(absX / Math.pow(1 + Math.pow(norm, 2.4), 1 / 2.4)) * 1.05;
      }
    }

    return curve;
  }

  /**
   * Updates the op-amp gain and frequency-dependent feedback response based on DISTORTION knob.
   * Distortion pot (0 to 10) ranges from ~1.5x (clean/mild breakup) to ~140x (screaming vintage sustain).
   * Concurrently, the 720 Hz low shelf tightens up as drive increases, mimicking the C3 feedback rolloff.
   */
  private updateDriveStage(): void {
    const d = Math.max(0, Math.min(10, this.distortionVal));
    const now = this.ctx.currentTime;

    // Logarithmic pot taper (500k reverse log):
    // d = 0  -> gain ~ 1.5x (+3.5 dB)
    // d = 5  -> gain ~ 22x (+26.8 dB)
    // d = 10 -> gain ~ 135x (+42.6 dB)
    const norm = d / 10;
    const gainFactor = 1.5 * Math.pow(90, Math.pow(norm, 1.4));

    // Low-shelf bass cut relative to treble:
    // At minimum drive, response is flat (0 dB shelf).
    // At maximum drive, bass below 720 Hz is shelving down by up to -14 dB relative to mid/highs.
    const shelfCutDb = -14.0 * Math.pow(norm, 1.2);

    try {
      this.driveGain.gain.cancelScheduledValues(now);
      this.driveGain.gain.setTargetAtTime(gainFactor, now, 0.015);

      this.feedbackBassShelf.gain.cancelScheduledValues(now);
      this.feedbackBassShelf.gain.setTargetAtTime(shelfCutDb, now, 0.015);
    } catch {
      this.driveGain.gain.setValueAtTime(gainFactor, now);
      this.feedbackBassShelf.gain.setValueAtTime(shelfCutDb, now);
    }

    // Refresh output gain as drive affects perceived trim
    this.updateOutputGain();
  }

  /**
   * Updates output level using drive-dependent compensation and standard levelToGain taper.
   */
  private updateOutputGain(): void {
    const d = Math.max(0, Math.min(10, this.distortionVal));
    const norm = d / 10;
    const totalGain = 1.5 * Math.pow(90, Math.pow(norm, 1.4));

    // Dynamic compensation keeps volume smooth across drive knob
    const trim = driveDependentTrimDb(totalGain, TRIM_UNITY_DB, TRIM_SAT_DB, 6.0);
    const targetGain = levelToGain(this.outputVal, trim);
    const now = this.ctx.currentTime;

    try {
      this.levelGain.gain.cancelScheduledValues(now);
      this.levelGain.gain.setTargetAtTime(targetGain, now, 0.015);
    } catch {
      this.levelGain.gain.setValueAtTime(targetGain, now);
    }
  }

  public updateParameter(paramId: string, value: number): void {
    switch (paramId) {
      case 'distortion':
      case 'dist':
        this.distortionVal = value;
        this.updateDriveStage();
        break;
      case 'output':
      case 'level':
        this.outputVal = value;
        this.updateOutputGain();
        break;
      default:
        break;
    }
  }

  public setParameter(paramId: string, value: number): void {
    this.updateParameter(paramId, value);
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    applyBypassCrossfade(this.wetGain, this.dryGain, enabled, this.ctx);
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  public dispose(): void {
    try {
      this.inputNode.disconnect();
      this.inputSubCut.disconnect();
      this.feedbackBassShelf.disconnect();
      this.opAmpRollOff.disconnect();
      this.driveGain.disconnect();
      this.diodeClipper.disconnect();
      this.diodeSmoothingFilter.disconnect();
      this.dcBlocker.disconnect();
      this.levelGain.disconnect();
      this.wetGain.disconnect();
      this.dryGain.disconnect();
      this.outputNode.disconnect();
    } catch {
      // Ignore disconnect errors during teardown
    }
  }
}
