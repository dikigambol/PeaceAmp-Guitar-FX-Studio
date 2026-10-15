import type { AudioPedalNode } from '../../../types/pedal';
import { levelToGain, applyBypassCrossfade, createDcBlocker, driveDependentTrimDb } from '../dspUtils';

/**
 * Output trim calibration:
 *   - TRIM_UNITY_DB: Output trim when DISTORTION is low (~unity loudness at noon)
 *   - TRIM_SAT_DB: Output trim when DISTORTION is high to keep perceived loudness balanced.
 */
const TRIM_UNITY_DB = 0.5;
const TRIM_SAT_DB = -6.0;

/**
 * ProCo RAT 2 Distortion (1988)
 * 
 * Authentic analog circuit model of the legendary LM308 op-amp rodent distortion:
 * 
 * 1. Input Buffer & Sub-sonic Filter:
 *    - C1 (0.022 µF) & R1 (1 MΩ) input highpass at ~45 Hz protecting headroom and keeping bass tight.
 * 
 * 2. LM308 Op-Amp Gain Stage with Dual Feedback RC Networks:
 *    - In the real schematic, two parallel RC branches set frequency-dependent negative feedback:
 *      * 560 Ω + 4.7 µF (corner ~60 Hz)
 *      * 47 Ω + 2.2 µF (corner ~1540 Hz)
 *    - Gain pot (100k reverse log) boosts upper mids & highs by up to +62 dB while rolling off
 *      sub-bass below 60 Hz. This gives the RAT its legendary punch, definition, and tight crunch.
 *    - LM308 slew-rate limiting (0.16 V/µs) & 30 pF compensation capacitor:
 *      rolls off frequencies above ~11 kHz, rounding sharp digital edges into smooth analog sustain.
 * 
 * 3. Hard Silicon Diode Clipper:
 *    - Symmetrical 1N4148 / 1N914 silicon diodes clipping to ground (Vf ≈ ±0.62V).
 *    - Smooth Shockley conduction knee with ~3% vintage component tolerance for rich 2nd and 3rd harmonics.
 *    - 4x oversampling WaveShaper for pristine aliasing-free distortion.
 * 
 * 4. Iconic Reverse Low-Pass "FILTER" Control:
 *    - 100k reverse audio potentiometer + 0.0033 µF (3.3 nF) capacitor to ground.
 *    - 0 (fully counter-clockwise): Wide open (~18 kHz), maximum bite, bright and cutting.
 *    - 5 (noon): Balanced vintage lead tone (~3.2 kHz).
 *    - 10 (fully clockwise): Heavily rolled off (~480 Hz), smooth, dark, woolly fuzz warmth.
 * 
 * 5. Master Output VOLUME:
 *    - Calibrated audio taper volume divider with unity at noon and roaring output boost.
 */
export class ProCoRatNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;

  // 1. Input Stage
  private inputSubCut: BiquadFilterNode;

  // 2. Dual RC feedback network & LM308 op-amp simulation
  private feedbackBassShelf: BiquadFilterNode;
  private driveGain: GainNode;
  private lm308SlewFilter: BiquadFilterNode;

  // 3. Symmetrical Silicon Diode Clipper
  private diodeClipper: WaveShaperNode;
  private diodeSmoothingFilter: BiquadFilterNode;
  private dcBlocker: BiquadFilterNode;

  // 4. Reverse Low-Pass Filter
  private ratFilterNode: BiquadFilterNode;

  // 5. Output Volume
  private outputGain: GainNode;

  // Bypass crossfaders
  private wetGain: GainNode;
  private dryGain: GainNode;
  private isEnabled = true;

  // Parameters (0 - 10)
  private distortionVal = 6;
  private filterVal = 5;
  private volumeVal = 5;

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.distortion !== undefined) this.distortionVal = initialParams.distortion;
    if (initialParams?.filter !== undefined) this.filterVal = initialParams.filter;
    if (initialParams?.volume !== undefined) this.volumeVal = initialParams.volume;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Input sub-cut (45 Hz highpass)
    this.inputSubCut = ctx.createBiquadFilter();
    this.inputSubCut.type = 'highpass';
    this.inputSubCut.frequency.setValueAtTime(45, ctx.currentTime);
    this.inputSubCut.Q.setValueAtTime(0.707, ctx.currentTime);

    // 2. Dual RC feedback modeling:
    // Low-shelf cutting bass relative to the screaming upper-mid gain boost
    this.feedbackBassShelf = ctx.createBiquadFilter();
    this.feedbackBassShelf.type = 'lowshelf';
    this.feedbackBassShelf.frequency.setValueAtTime(650, ctx.currentTime);

    this.driveGain = ctx.createGain();

    // LM308 slew-rate / 30pF compensation capacitor rolloff (~11.5 kHz)
    this.lm308SlewFilter = ctx.createBiquadFilter();
    this.lm308SlewFilter.type = 'lowpass';
    this.lm308SlewFilter.frequency.setValueAtTime(11500, ctx.currentTime);
    this.lm308SlewFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    // 3. Hard Silicon Diode Clipper
    this.diodeClipper = ctx.createWaveShaper();
    this.diodeClipper.oversample = '4x';
    this.diodeClipper.curve = this.createSiliconDiodeCurve() as Float32Array<ArrayBuffer>;

    // Diode high-frequency smoothing (~9.8 kHz)
    this.diodeSmoothingFilter = ctx.createBiquadFilter();
    this.diodeSmoothingFilter.type = 'lowpass';
    this.diodeSmoothingFilter.frequency.setValueAtTime(9800, ctx.currentTime);
    this.diodeSmoothingFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    // DC Blocker
    this.dcBlocker = createDcBlocker(ctx, 16);

    // 4. Reverse Low-Pass Filter (Rat Filter control)
    this.ratFilterNode = ctx.createBiquadFilter();
    this.ratFilterNode.type = 'lowpass';
    this.ratFilterNode.Q.setValueAtTime(0.707, ctx.currentTime);

    // 5. Output Volume
    this.outputGain = ctx.createGain();

    // Wet / Dry for seamless click-free true bypass
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(enabled ? 1 : 0, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(enabled ? 0 : 1, ctx.currentTime);

    // Connect DSP Chain:
    // Input -> inputSubCut -> feedbackBassShelf -> driveGain -> lm308SlewFilter
    //       -> diodeClipper -> diodeSmoothingFilter -> dcBlocker -> ratFilterNode
    //       -> outputGain -> wetGain -> Output
    // Dry: Input -> dryGain -> Output
    this.inputNode.connect(this.inputSubCut);
    this.inputSubCut.connect(this.feedbackBassShelf);
    this.feedbackBassShelf.connect(this.driveGain);
    this.driveGain.connect(this.lm308SlewFilter);
    this.lm308SlewFilter.connect(this.diodeClipper);
    this.diodeClipper.connect(this.diodeSmoothingFilter);
    this.diodeSmoothingFilter.connect(this.dcBlocker);
    this.dcBlocker.connect(this.ratFilterNode);
    this.ratFilterNode.connect(this.outputGain);
    this.outputGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);

    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Initialize parameters
    this.updateDriveStage();
    this.updateFilter();
    this.updateVolume();
  }

  /**
   * Generates authentic 1N4148 / 1N914 silicon diode conduction curve.
   * Silicon features:
   *  - Sharp threshold: ~0.60V - 0.65V
   *  - Distinct knee into hard squared-off saturation
   *  - Subtle ~3% component asymmetry for rich harmonic bloom
   */
  private createSiliconDiodeCurve(): Float32Array {
    const samples = 8192;
    const curve = new Float32Array(samples);
    const posVf = 0.62;
    const negVf = 0.60; // Subtle diode mismatch

    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      if (x >= 0) {
        const norm = x / posVf;
        curve[i] = (x / Math.pow(1 + Math.pow(norm, 3.8), 1 / 3.8)) * 1.04;
      } else {
        const absX = -x;
        const norm = absX / negVf;
        curve[i] = -(absX / Math.pow(1 + Math.pow(norm, 3.8), 1 / 3.8)) * 1.04;
      }
    }

    return curve;
  }

  /**
   * Updates the op-amp gain and bass-tightening shelf based on DISTORTION knob.
   * Distortion pot (0 to 10) ranges from ~1.8x (+5 dB) to ~1800x (+65 dB).
   * Concurrently, the bass shelf tightens up below 650 Hz as drive increases.
   */
  private updateDriveStage(): void {
    const d = Math.max(0, Math.min(10, this.distortionVal));
    const now = this.ctx.currentTime;

    const norm = d / 10;
    // Logarithmic reverse-audio gain taper
    const gainFactor = 1.8 * Math.pow(1000, Math.pow(norm, 1.45));

    // Tightening bass cut relative to searing upper-mids
    const shelfCutDb = -16.0 * Math.pow(norm, 1.25);

    // Slew rate simulation: as gain approaches max, bandwidth narrows slightly (~11.5 kHz down to ~9.5 kHz)
    const slewCutoff = 11500 - 2000 * norm;

    try {
      this.driveGain.gain.cancelScheduledValues(now);
      this.driveGain.gain.setTargetAtTime(gainFactor, now, 0.015);

      this.feedbackBassShelf.gain.cancelScheduledValues(now);
      this.feedbackBassShelf.gain.setTargetAtTime(shelfCutDb, now, 0.015);

      this.lm308SlewFilter.frequency.cancelScheduledValues(now);
      this.lm308SlewFilter.frequency.setTargetAtTime(slewCutoff, now, 0.015);
    } catch {
      this.driveGain.gain.setValueAtTime(gainFactor, now);
      this.feedbackBassShelf.gain.setValueAtTime(shelfCutDb, now);
      this.lm308SlewFilter.frequency.setValueAtTime(slewCutoff, now);
    }

    this.updateVolume();
  }

  /**
   * Signature Reverse Low-Pass Filter:
   * 0 (CCW) -> Wide open (~18 kHz, bright & crisp)
   * 5 (Noon) -> Sweet lead (~3.2 kHz)
   * 10 (CW) -> Heavy rolloff (~480 Hz, creamy & dark)
   */
  private updateFilter(): void {
    const f = Math.max(0, Math.min(10, this.filterVal));
    const norm = f / 10;
    const now = this.ctx.currentTime;

    // Exponential reverse sweep from 18,000 Hz down to 480 Hz
    const freq = 18000 * Math.pow(480 / 18000, Math.pow(norm, 1.15));

    try {
      this.ratFilterNode.frequency.cancelScheduledValues(now);
      this.ratFilterNode.frequency.setTargetAtTime(freq, now, 0.015);
    } catch {
      this.ratFilterNode.frequency.setValueAtTime(freq, now);
    }
  }

  /**
   * Updates output level gain stage.
   */
  private updateVolume(): void {
    const now = this.ctx.currentTime;
    const d = Math.max(0, Math.min(10, this.distortionVal));
    const driveGainNorm = 1.8 * Math.pow(1000, Math.pow(d / 10, 1.45));
    const trim = driveDependentTrimDb(driveGainNorm, TRIM_UNITY_DB, TRIM_SAT_DB, 6.0);
    const gain = levelToGain(this.volumeVal, trim);

    try {
      this.outputGain.gain.cancelScheduledValues(now);
      this.outputGain.gain.setTargetAtTime(gain, now, 0.015);
    } catch {
      this.outputGain.gain.setValueAtTime(gain, now);
    }
  }

  public updateParameter(paramId: string, value: number): void {
    switch (paramId) {
      case 'distortion':
        this.distortionVal = value;
        this.updateDriveStage();
        break;
      case 'filter':
        this.filterVal = value;
        this.updateFilter();
        break;
      case 'volume':
        this.volumeVal = value;
        this.updateVolume();
        break;
    }
  }

  public setEnabled(enabled: boolean): void {
    if (this.isEnabled === enabled) return;
    this.isEnabled = enabled;
    applyBypassCrossfade(this.wetGain, this.dryGain, enabled, this.ctx, 0.015);
  }

  public dispose(): void {
    try {
      this.inputNode.disconnect();
      this.inputSubCut.disconnect();
      this.feedbackBassShelf.disconnect();
      this.driveGain.disconnect();
      this.lm308SlewFilter.disconnect();
      this.diodeClipper.disconnect();
      this.diodeSmoothingFilter.disconnect();
      this.dcBlocker.disconnect();
      this.ratFilterNode.disconnect();
      this.outputGain.disconnect();
      this.wetGain.disconnect();
      this.dryGain.disconnect();
      this.outputNode.disconnect();
    } catch {
      // Ignore disconnect errors during disposal
    }
  }
}
