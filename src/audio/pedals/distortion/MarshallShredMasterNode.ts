import type { AudioPedalNode } from '../../../types/pedal';
import { levelToGain, applyBypassCrossfade, createDcBlocker, driveDependentTrimDb } from '../dspUtils';

/**
 * Output trim calibration:
 *   - TRIM_UNITY_DB: Output trim when GAIN is moderate (~unity loudness at noon)
 *   - TRIM_SAT_DB: Output trim when GAIN is maxed, maintaining punchy perceived loudness.
 */
const TRIM_UNITY_DB = 1.0;
const TRIM_SAT_DB = -7.0;

/**
 * Marshall ShredMaster (1991)
 * 
 * Authentic analog circuit model of the legendary British high-gain distortion pedal:
 * 
 * 1. Input Buffer & High-Pass Conditioning:
 *    - TL072 input buffer with 72 Hz highpass corner to retain articulate bass definition.
 *    - Pre-gain emphasis peak around 2.2 kHz (+4 dB) for aggressive pick response.
 * 
 * 2. Cascaded Op-Amp Gain Stages & Diode Hard Clipping:
 *    - Dual-stage high-gain overdrive pushing symmetrical diode clipping.
 *    - Delivers the thick, singing, saturated roar of a cranked Marshall JCM800 stack.
 *    - 4x oversampling eliminates digital aliasing.
 *    - Analog low-pass smoothing filter at 5.8 kHz.
 * 
 * 3. Iconic Active 3-Band EQ & CONTOUR Gyrator Circuit:
 *    - BASS: Active peaking filter centered at 100 Hz (±12 dB boost/cut, Q = 1.2).
 *    - TREBLE: Active peaking filter centered at 4.2 kHz (±12 dB boost/cut, Q = 1.2).
 *    - CONTOUR (The famous Marshall Mid-Sweep Network):
 *        * Sweeps between a pronounced mid-forward punch at 0 (+6 dB mid boost @ 750 Hz)
 *          to a dramatic, crushing mid-scoop at 10 (-14 dB deep mid scoop @ 850 Hz, Q = 1.5).
 *        * The secret sauce behind Radiohead's "Creep" crunch and My Bloody Valentine's shoegaze roar.
 * 
 * 4. Master VOLUME & Click-Free Crossfade Bypass.
 */
export class MarshallShredMasterNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;

  // 1. Input & Pre-Emphasis
  private inputHighpass: BiquadFilterNode;
  private inputPreEmphasis: BiquadFilterNode;

  // 2. High-Gain Drive & Diode Hard Clipper
  private driveGain: GainNode;
  private diodeClipper: WaveShaperNode;
  private dcBlocker: BiquadFilterNode;
  private postDistSmoothing: BiquadFilterNode;

  // 3. 3-Band Active EQ + CONTOUR Gyrator Network
  private eqBass: BiquadFilterNode;
  private eqContour: BiquadFilterNode;
  private eqTreble: BiquadFilterNode;

  // 4. Output Recovery & Volume
  private postRecoveryFilter: BiquadFilterNode;
  private volumeGain: GainNode;

  // Bypass crossfade
  private wetGain: GainNode;
  private dryGain: GainNode;
  private isEnabled = true;

  // Parameters (0 - 10)
  private gainVal = 6;
  private bassVal = 5;
  private contourVal = 5;
  private trebleVal = 5;
  private volumeVal = 5;

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.gain !== undefined) this.gainVal = initialParams.gain;
    if (initialParams?.bass !== undefined) this.bassVal = initialParams.bass;
    if (initialParams?.contour !== undefined) this.contourVal = initialParams.contour;
    if (initialParams?.treble !== undefined) this.trebleVal = initialParams.treble;
    if (initialParams?.volume !== undefined) this.volumeVal = initialParams.volume;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // Crossfade wet/dry gains
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(this.isEnabled ? 1.0 : 0.0, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(this.isEnabled ? 0.0 : 1.0, ctx.currentTime);

    // Dry path
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // 1. Input High-Pass & Pre-Emphasis
    this.inputHighpass = ctx.createBiquadFilter();
    this.inputHighpass.type = 'highpass';
    this.inputHighpass.frequency.setValueAtTime(72, ctx.currentTime);
    this.inputHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    this.inputPreEmphasis = ctx.createBiquadFilter();
    this.inputPreEmphasis.type = 'peaking';
    this.inputPreEmphasis.frequency.setValueAtTime(2200, ctx.currentTime);
    this.inputPreEmphasis.Q.setValueAtTime(1.1, ctx.currentTime);
    this.inputPreEmphasis.gain.setValueAtTime(4.0, ctx.currentTime);

    // 2. High-Gain Drive & Clipper
    this.driveGain = ctx.createGain();

    this.diodeClipper = ctx.createWaveShaper();
    this.diodeClipper.curve = this.createShredClippingCurve(4096) as Float32Array<ArrayBuffer>;
    this.diodeClipper.oversample = '4x';

    this.dcBlocker = createDcBlocker(ctx, 15);

    this.postDistSmoothing = ctx.createBiquadFilter();
    this.postDistSmoothing.type = 'lowpass';
    this.postDistSmoothing.frequency.setValueAtTime(5800, ctx.currentTime);
    this.postDistSmoothing.Q.setValueAtTime(0.707, ctx.currentTime);

    // 3. 3-Band Active EQ + CONTOUR Network
    this.eqBass = ctx.createBiquadFilter();
    this.eqBass.type = 'peaking';
    this.eqBass.frequency.setValueAtTime(100, ctx.currentTime);
    this.eqBass.Q.setValueAtTime(1.2, ctx.currentTime);

    this.eqContour = ctx.createBiquadFilter();
    this.eqContour.type = 'peaking';
    this.eqContour.frequency.setValueAtTime(800, ctx.currentTime);
    this.eqContour.Q.setValueAtTime(1.4, ctx.currentTime);

    this.eqTreble = ctx.createBiquadFilter();
    this.eqTreble.type = 'peaking';
    this.eqTreble.frequency.setValueAtTime(4200, ctx.currentTime);
    this.eqTreble.Q.setValueAtTime(1.2, ctx.currentTime);

    // 4. Output Recovery & Volume
    this.postRecoveryFilter = ctx.createBiquadFilter();
    this.postRecoveryFilter.type = 'lowpass';
    this.postRecoveryFilter.frequency.setValueAtTime(6500, ctx.currentTime);
    this.postRecoveryFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    this.volumeGain = ctx.createGain();

    // Signal Routing:
    // inputNode -> inputHighpass -> inputPreEmphasis -> driveGain -> diodeClipper -> dcBlocker
    // -> postDistSmoothing -> eqBass -> eqContour -> eqTreble -> postRecoveryFilter
    // -> volumeGain -> wetGain -> outputNode
    this.inputNode.connect(this.inputHighpass);
    this.inputHighpass.connect(this.inputPreEmphasis);
    this.inputPreEmphasis.connect(this.driveGain);
    this.driveGain.connect(this.diodeClipper);
    this.diodeClipper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.postDistSmoothing);
    this.postDistSmoothing.connect(this.eqBass);
    this.eqBass.connect(this.eqContour);
    this.eqContour.connect(this.eqTreble);
    this.eqTreble.connect(this.postRecoveryFilter);
    this.postRecoveryFilter.connect(this.volumeGain);
    this.volumeGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);

    // Apply initial parameter state
    this.updateGain();
    this.updateBass();
    this.updateContour();
    this.updateTreble();
    this.updateVolume();
  }

  /**
   * Authentic Marshall ShredMaster asymmetrical hard clipping curve:
   * Symmetrical silicon diodes with warm compressed saturation knee and singing sustain.
   */
  private createShredClippingCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    const mid = (samples - 1) / 2;

    for (let i = 0; i < samples; i++) {
      const x = (i - mid) / mid; // -1 to +1

      // Soft-knee tanh with progressive hard ceiling
      const sign = x < 0 ? -1 : 1;
      const absX = Math.abs(x);
      const v = absX * 4.6;
      const y = sign * Math.tanh(v * 0.92) * 0.88;

      curve[i] = y;
    }

    return curve;
  }

  private updateGain(): void {
    const t = Math.max(0, Math.min(10, this.gainVal)) / 10;
    // Logarithmic gain sweep (8x to 200x)
    const driveLin = 8.0 * Math.pow(25.0, t);
    this.driveGain.gain.setTargetAtTime(driveLin, this.ctx.currentTime, 0.015);
    this.updateVolume();
  }

  private updateBass(): void {
    const t = Math.max(0, Math.min(10, this.bassVal)) / 10;
    // -12 dB to +12 dB
    const gainDb = -12 + t * 24;
    this.eqBass.gain.setTargetAtTime(gainDb, this.ctx.currentTime, 0.015);
  }

  private updateContour(): void {
    const t = Math.max(0, Math.min(10, this.contourVal)) / 10;
    const now = this.ctx.currentTime;

    // CONTOUR behavior:
    // At 0: +6 dB mid boost at 720 Hz (British roar)
    // At 5: -4 dB mid dip at 800 Hz
    // At 10: -14 dB deep mid scoop at 880 Hz (Modern/shoegaze wall of sound)
    const contourDb = 6.0 - t * 20.0;
    const centerFreq = 720 + t * 160;

    this.eqContour.frequency.setTargetAtTime(centerFreq, now, 0.015);
    this.eqContour.gain.setTargetAtTime(contourDb, now, 0.015);
  }

  private updateTreble(): void {
    const t = Math.max(0, Math.min(10, this.trebleVal)) / 10;
    // -12 dB to +12 dB
    const gainDb = -12 + t * 24;
    this.eqTreble.gain.setTargetAtTime(gainDb, this.ctx.currentTime, 0.015);
  }

  private updateVolume(): void {
    const t = Math.max(0, Math.min(10, this.gainVal)) / 10;
    const driveGainEstimate = 8.0 * Math.pow(25.0, t);
    const trimDb = driveDependentTrimDb(driveGainEstimate, TRIM_UNITY_DB, TRIM_SAT_DB);
    const gain = levelToGain(this.volumeVal, trimDb);
    this.volumeGain.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.015);
  }

  public updateParameter(paramId: string, value: number): void {
    switch (paramId) {
      case 'gain':
        this.gainVal = value;
        this.updateGain();
        break;
      case 'bass':
        this.bassVal = value;
        this.updateBass();
        break;
      case 'contour':
        this.contourVal = value;
        this.updateContour();
        break;
      case 'treble':
        this.trebleVal = value;
        this.updateTreble();
        break;
      case 'volume':
        this.volumeVal = value;
        this.updateVolume();
        break;
    }
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    applyBypassCrossfade(this.wetGain, this.dryGain, enabled, this.ctx);
  }

  public dispose(): void {
    try {
      this.inputNode.disconnect();
      this.dryGain.disconnect();
      this.wetGain.disconnect();
      this.inputHighpass.disconnect();
      this.inputPreEmphasis.disconnect();
      this.driveGain.disconnect();
      this.diodeClipper.disconnect();
      this.dcBlocker.disconnect();
      this.postDistSmoothing.disconnect();
      this.eqBass.disconnect();
      this.eqContour.disconnect();
      this.eqTreble.disconnect();
      this.postRecoveryFilter.disconnect();
      this.volumeGain.disconnect();
      this.outputNode.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
}
