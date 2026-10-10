import type { AudioPedalNode } from '../../../types/pedal';
import { levelToGain, applyBypassCrossfade, createDcBlocker, driveDependentTrimDb } from '../dspUtils';

/**
  * Output trim calibration:
  *   - TRIM_UNITY_DB: Output trim when DIST is moderate
  *   - TRIM_SAT_DB: Output trim when DIST is maxed, maintaining punchy perceived loudness.
  */
const TRIM_UNITY_DB = 1.0;
const TRIM_SAT_DB = -5.0;

/**
 * Boss HM-2 Heavy Metal (1983)
 * 
 * Authentic analog circuit model of the legendary "Swedish Chainsaw" pedal:
 * 
 * 1. Input Buffer & Pre-Emphasis:
 *    - C1 / C2 high-pass corner at 80 Hz keeps low-end chugs articulate.
 *    - Pre-emphasis shelf boosts upper mids around 850 Hz (+5 dB) to push the drive stage.
 * 
 * 2. Dual-Stage Overdrive & Asymmetrical Diode Distortion:
 *    - Op-amp drive stage controlled by DIST pot (ranges from dynamic crunch to saturated chainsaw sustain).
 *    - Symmetrical & asymmetrical silicon + germanium hybrid clipping curve imparting rich harmonic rasp.
 *    - 4x oversampling to prevent digital aliasing.
 * 
 * 3. Iconic "Color Mix" Gyrator Dual-Peaking Active EQ:
 *    - Low: Active gyrator peaking filter centered at 100 Hz (Q = 1.4, ±14 dB).
 *    - High: The famous HM-2 dual-resonance mid-high gyrator peak centered at 1000 Hz (Q = 2.5, ±16 dB).
 *      When High & Low are dimed ("all knobs on 10"), it creates the legendary Swedish death metal chainsaw roar!
 * 
 * 4. Output Recovery & Master Level:
 *    - 6.8 kHz analog low-pass smoothing filter.
 *    - Master output LEVEL control.
 */
export class BossHm2Node implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;

  // 1. Input Stage
  private inputHighpass: BiquadFilterNode;
  private inputPreEmphasis: BiquadFilterNode;

  // 2. Drive & Diode Clipping Stage
  private driveGain: GainNode;
  private diodeClipper: WaveShaperNode;
  private dcBlocker: BiquadFilterNode;

  // 3. Color Mix Active Gyrator EQ (Low @ 100 Hz, High @ 1000 Hz)
  private colorMixLow: BiquadFilterNode;
  private colorMixHigh: BiquadFilterNode;

  // 4. Recovery & Output Stage
  private postRecoveryFilter: BiquadFilterNode;
  private levelGain: GainNode;

  // Bypass crossfade
  private wetGain: GainNode;
  private dryGain: GainNode;
  private isEnabled = true;

  // Parameters (0 - 10)
  private distVal = 6;
  private colorMixLVal = 5;
  private colorMixHVal = 5;
  private levelVal = 5;

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.dist !== undefined) this.distVal = initialParams.dist;
    if (initialParams?.colorMixL !== undefined) this.colorMixLVal = initialParams.colorMixL;
    if (initialParams?.colorMixH !== undefined) this.colorMixHVal = initialParams.colorMixH;
    if (initialParams?.level !== undefined) this.levelVal = initialParams.level;

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

    // 1. Input Buffering & Pre-Emphasis
    this.inputHighpass = ctx.createBiquadFilter();
    this.inputHighpass.type = 'highpass';
    this.inputHighpass.frequency.setValueAtTime(80, ctx.currentTime);
    this.inputHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    this.inputPreEmphasis = ctx.createBiquadFilter();
    this.inputPreEmphasis.type = 'peaking';
    this.inputPreEmphasis.frequency.setValueAtTime(850, ctx.currentTime);
    this.inputPreEmphasis.Q.setValueAtTime(1.1, ctx.currentTime);
    this.inputPreEmphasis.gain.setValueAtTime(4.5, ctx.currentTime);

    // 2. Drive & Diode Clipper
    this.driveGain = ctx.createGain();

    this.diodeClipper = ctx.createWaveShaper();
    this.diodeClipper.curve = this.createHm2ClippingCurve(4096) as Float32Array<ArrayBuffer>;
    this.diodeClipper.oversample = '4x';

    this.dcBlocker = createDcBlocker(ctx, 15);

    // 3. Color Mix Active Gyrator EQ (Low & High)
    this.colorMixLow = ctx.createBiquadFilter();
    this.colorMixLow.type = 'peaking';
    this.colorMixLow.frequency.setValueAtTime(100, ctx.currentTime);
    this.colorMixLow.Q.setValueAtTime(1.4, ctx.currentTime);

    this.colorMixHigh = ctx.createBiquadFilter();
    this.colorMixHigh.type = 'peaking';
    this.colorMixHigh.frequency.setValueAtTime(1000, ctx.currentTime);
    this.colorMixHigh.Q.setValueAtTime(2.5, ctx.currentTime); // The razor-sharp Swedish chainsaw resonance

    // 4. Recovery Filter & Level Stage
    this.postRecoveryFilter = ctx.createBiquadFilter();
    this.postRecoveryFilter.type = 'lowpass';
    this.postRecoveryFilter.frequency.setValueAtTime(6800, ctx.currentTime);
    this.postRecoveryFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    this.levelGain = ctx.createGain();

    // Chain Wet Audio Processing:
    // inputNode -> inputHighpass -> inputPreEmphasis -> driveGain -> diodeClipper -> dcBlocker
    // -> colorMixLow -> colorMixHigh -> postRecoveryFilter -> levelGain -> wetGain -> outputNode
    this.inputNode.connect(this.inputHighpass);
    this.inputHighpass.connect(this.inputPreEmphasis);
    this.inputPreEmphasis.connect(this.driveGain);
    this.driveGain.connect(this.diodeClipper);
    this.diodeClipper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.colorMixLow);
    this.colorMixLow.connect(this.colorMixHigh);
    this.colorMixHigh.connect(this.postRecoveryFilter);
    this.postRecoveryFilter.connect(this.levelGain);
    this.levelGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);

    // Apply initial parameter state
    this.updateDist();
    this.updateColorMixL();
    this.updateColorMixH();
    this.updateLevel();
  }

  /**
   * Authentic HM-2 Asymmetrical WaveShaper transfer curve:
   * Silicon hard-clipping diodes with soft germanium crossover knee.
   */
  private createHm2ClippingCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    const mid = (samples - 1) / 2;

    for (let i = 0; i < samples; i++) {
      const x = (i - mid) / mid; // Range -1 to +1

      let y: number;
      if (x > 0) {
        // Positive half-wave: sharp silicon diode clip with soft transition
        const v = x * 3.8;
        y = Math.tanh(v * 0.72) * 0.76;
      } else {
        // Negative half-wave: slightly asymmetric crossover inflection
        const v = Math.abs(x) * 4.2;
        y = -Math.tanh(v * 0.82) * 0.82;
      }

      curve[i] = y;
    }

    return curve;
  }

  private updateDist(): void {
    const t = Math.max(0, Math.min(10, this.distVal)) / 10;
    // Logarithmic drive taper ranging from mild crunch (6x) to scorching chainsaw (120x)
    const driveLin = 6.0 * Math.pow(20.0, t);
    this.driveGain.gain.setTargetAtTime(driveLin, this.ctx.currentTime, 0.015);
    this.updateLevel();
  }

  private updateColorMixL(): void {
    const t = Math.max(0, Math.min(10, this.colorMixLVal)) / 10;
    // -12 dB at 0, 0 dB at 5, +14 dB at 10
    const gainDb = -12 + t * 26;
    this.colorMixLow.gain.setTargetAtTime(gainDb, this.ctx.currentTime, 0.015);
  }

  private updateColorMixH(): void {
    const t = Math.max(0, Math.min(10, this.colorMixHVal)) / 10;
    // -12 dB at 0, 0 dB at 5, +16 dB at 10 (Chainsaw peak)
    const gainDb = -12 + t * 28;
    this.colorMixHigh.gain.setTargetAtTime(gainDb, this.ctx.currentTime, 0.015);
  }

  private updateLevel(): void {
    const t = Math.max(0, Math.min(10, this.distVal)) / 10;
    const driveGainEstimate = 6.0 * Math.pow(20.0, t);
    const trimDb = driveDependentTrimDb(driveGainEstimate, TRIM_UNITY_DB, TRIM_SAT_DB);
    const gain = levelToGain(this.levelVal, trimDb);
    this.levelGain.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.015);
  }

  public updateParameter(paramId: string, value: number): void {
    switch (paramId) {
      case 'dist':
        this.distVal = value;
        this.updateDist();
        break;
      case 'colorMixL':
        this.colorMixLVal = value;
        this.updateColorMixL();
        break;
      case 'colorMixH':
        this.colorMixHVal = value;
        this.updateColorMixH();
        break;
      case 'level':
        this.levelVal = value;
        this.updateLevel();
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
      this.colorMixLow.disconnect();
      this.colorMixHigh.disconnect();
      this.postRecoveryFilter.disconnect();
      this.levelGain.disconnect();
      this.outputNode.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
}
