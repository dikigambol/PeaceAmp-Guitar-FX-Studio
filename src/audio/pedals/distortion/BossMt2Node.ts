import type { AudioPedalNode } from '../../../types/pedal';
import { levelToGain, applyBypassCrossfade, createDcBlocker, driveDependentTrimDb } from '../dspUtils';

/**
 * Output trim calibration:
 *   - TRIM_UNITY_DB: Output trim when DIST is moderate (~unity loudness at noon)
 *   - TRIM_SAT_DB: Output trim when DIST is maxed, maintaining punchy perceived loudness.
 */
const TRIM_UNITY_DB = 1.0;
const TRIM_SAT_DB = -6.0;

/**
 * Boss MT-2 Metal Zone (1991)
 * 
 * Authentic analog circuit model of the legendary dual-gain stage high-gain distortion
 * with semi-parametric 3-band active EQ:
 * 
 * 1. Input Buffering & Multi-Stage Pre-Emphasis:
 *    - 72 Hz high-pass corner to maintain articulate tight chugs without mud.
 *    - Pre-emphasis peak at 1.8 kHz (+6 dB) pushing the front-end hard.
 * 
 * 2. Dual-Stage High-Gain Distortion Cascade:
 *    - Dual op-amp overdrive with 4-diode symmetrical hard clipper.
 *    - Delivers massive, crushing saturation, endless singing sustain, and razor-sharp bite.
 *    - 4x oversampling prevents digital aliasing on extreme high-gain settings.
 *    - 5.5 kHz 2nd-order analog smoothing filter eliminating harsh fizzy splatter.
 * 
 * 3. Iconic 3-Band Semi-Parametric Active EQ Stack:
 *    - LOW: Active gyrator peaking filter centered at 100 Hz (±15 dB boost/cut, Q = 1.3).
 *    - HIGH: Active peaking/shelving filter centered at 5.0 kHz (±15 dB boost/cut, Q = 1.2).
 *    - MIDDLE & MID FREQ (Semi-Parametric Midrange):
 *        * Sweepable center frequency tunable from 200 Hz to 5,000 Hz (logarithmic sweep, noon = 1.0 kHz).
 *        * Focused Q = 1.8 active peaking filter with ±15 dB boost/cut.
 *        * Mid-scoop produces the iconic 90s Gothenburg/thrash metal wall of sound;
 *          mid-boost delivers scorching lead presence.
 * 
 * 4. Recovery Stage & Master LEVEL:
 *    - Analog low-pass filter at 6.5 kHz.
 *    - Master LEVEL control with unity calibration and click-free crossfade bypass.
 */
export class BossMt2Node implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;

  // 1. Input & Pre-Emphasis
  private inputHighpass: BiquadFilterNode;
  private inputPreEmphasis: BiquadFilterNode;

  // 2. Dual-Stage Overdrive & 4-Diode Hard Clipper
  private driveGain: GainNode;
  private diodeClipper: WaveShaperNode;
  private dcBlocker: BiquadFilterNode;
  private postDistSmoothingFilter: BiquadFilterNode;

  // 3. 3-Band Semi-Parametric Active EQ
  private eqLow: BiquadFilterNode;
  private eqMid: BiquadFilterNode;
  private eqHigh: BiquadFilterNode;

  // 4. Output Stage
  private postRecoveryFilter: BiquadFilterNode;
  private levelGain: GainNode;

  // Bypass crossfade
  private wetGain: GainNode;
  private dryGain: GainNode;
  private isEnabled = true;

  // Parameters (0 - 10)
  private distVal = 6;
  private lowVal = 5;
  private highVal = 5;
  private middleVal = 5;
  private midFreqVal = 5;
  private levelVal = 5;

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.dist !== undefined) this.distVal = initialParams.dist;
    if (initialParams?.low !== undefined) this.lowVal = initialParams.low;
    if (initialParams?.high !== undefined) this.highVal = initialParams.high;
    if (initialParams?.middle !== undefined) this.middleVal = initialParams.middle;
    if (initialParams?.midFreq !== undefined) this.midFreqVal = initialParams.midFreq;
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
    this.inputHighpass.frequency.setValueAtTime(72, ctx.currentTime);
    this.inputHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    this.inputPreEmphasis = ctx.createBiquadFilter();
    this.inputPreEmphasis.type = 'peaking';
    this.inputPreEmphasis.frequency.setValueAtTime(1800, ctx.currentTime);
    this.inputPreEmphasis.Q.setValueAtTime(1.1, ctx.currentTime);
    this.inputPreEmphasis.gain.setValueAtTime(6.0, ctx.currentTime);

    // 2. Dual-Stage Overdrive & 4-Diode Hard Clipper
    this.driveGain = ctx.createGain();

    this.diodeClipper = ctx.createWaveShaper();
    this.diodeClipper.curve = this.createMt2ClippingCurve(4096) as Float32Array<ArrayBuffer>;
    this.diodeClipper.oversample = '4x';

    this.dcBlocker = createDcBlocker(ctx, 15);

    this.postDistSmoothingFilter = ctx.createBiquadFilter();
    this.postDistSmoothingFilter.type = 'lowpass';
    this.postDistSmoothingFilter.frequency.setValueAtTime(5500, ctx.currentTime);
    this.postDistSmoothingFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    // 3. 3-Band Semi-Parametric Active EQ
    this.eqLow = ctx.createBiquadFilter();
    this.eqLow.type = 'peaking';
    this.eqLow.frequency.setValueAtTime(100, ctx.currentTime);
    this.eqLow.Q.setValueAtTime(1.3, ctx.currentTime);

    this.eqMid = ctx.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqMid.Q.setValueAtTime(1.8, ctx.currentTime);

    this.eqHigh = ctx.createBiquadFilter();
    this.eqHigh.type = 'peaking';
    this.eqHigh.frequency.setValueAtTime(5000, ctx.currentTime);
    this.eqHigh.Q.setValueAtTime(1.2, ctx.currentTime);

    // 4. Output Recovery & Level
    this.postRecoveryFilter = ctx.createBiquadFilter();
    this.postRecoveryFilter.type = 'lowpass';
    this.postRecoveryFilter.frequency.setValueAtTime(6500, ctx.currentTime);
    this.postRecoveryFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    this.levelGain = ctx.createGain();

    // Wet signal routing:
    // inputNode -> inputHighpass -> inputPreEmphasis -> driveGain -> diodeClipper -> dcBlocker
    // -> postDistSmoothingFilter -> eqLow -> eqMid -> eqHigh -> postRecoveryFilter -> levelGain
    // -> wetGain -> outputNode
    this.inputNode.connect(this.inputHighpass);
    this.inputHighpass.connect(this.inputPreEmphasis);
    this.inputPreEmphasis.connect(this.driveGain);
    this.driveGain.connect(this.diodeClipper);
    this.diodeClipper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.postDistSmoothingFilter);
    this.postDistSmoothingFilter.connect(this.eqLow);
    this.eqLow.connect(this.eqMid);
    this.eqMid.connect(this.eqHigh);
    this.eqHigh.connect(this.postRecoveryFilter);
    this.postRecoveryFilter.connect(this.levelGain);
    this.levelGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);

    // Apply initial parameter state
    this.updateDist();
    this.updateLow();
    this.updateHigh();
    this.updateMid();
    this.updateLevel();
  }

  /**
   * Authentic MT-2 Quad-Diode Hard Clipping transfer curve:
   * Symmetrical multi-stage silicon saturation with rich compressed harmonics.
   */
  private createMt2ClippingCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    const mid = (samples - 1) / 2;

    for (let i = 0; i < samples; i++) {
      const x = (i - mid) / mid; // -1 to +1

      // 4-diode series hard clipping: fast tanh saturation with square-wave limit
      const sign = x < 0 ? -1 : 1;
      const absX = Math.abs(x);
      const v = absX * 5.2;
      const y = sign * Math.tanh(v * 0.88) * 0.85;

      curve[i] = y;
    }

    return curve;
  }

  private updateDist(): void {
    const t = Math.max(0, Math.min(10, this.distVal)) / 10;
    // Logarithmic high-gain drive range (10x to 220x)
    const driveLin = 10.0 * Math.pow(22.0, t);
    this.driveGain.gain.setTargetAtTime(driveLin, this.ctx.currentTime, 0.015);
    this.updateLevel();
  }

  private updateLow(): void {
    const t = Math.max(0, Math.min(10, this.lowVal)) / 10;
    // -15 dB to +15 dB
    const gainDb = -15 + t * 30;
    this.eqLow.gain.setTargetAtTime(gainDb, this.ctx.currentTime, 0.015);
  }

  private updateHigh(): void {
    const t = Math.max(0, Math.min(10, this.highVal)) / 10;
    // -15 dB to +15 dB
    const gainDb = -15 + t * 30;
    this.eqHigh.gain.setTargetAtTime(gainDb, this.ctx.currentTime, 0.015);
  }

  private updateMid(): void {
    const tFreq = Math.max(0, Math.min(10, this.midFreqVal)) / 10;
    // Logarithmic frequency sweep: 200 Hz to 5,000 Hz (noon = 1,000 Hz)
    const freq = 200 * Math.pow(25.0, tFreq);
    this.eqMid.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.015);

    const tGain = Math.max(0, Math.min(10, this.middleVal)) / 10;
    // -15 dB to +15 dB
    const gainDb = -15 + tGain * 30;
    this.eqMid.gain.setTargetAtTime(gainDb, this.ctx.currentTime, 0.015);
  }

  private updateLevel(): void {
    const t = Math.max(0, Math.min(10, this.distVal)) / 10;
    const driveGainEstimate = 10.0 * Math.pow(22.0, t);
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
      case 'low':
        this.lowVal = value;
        this.updateLow();
        break;
      case 'high':
        this.highVal = value;
        this.updateHigh();
        break;
      case 'middle':
        this.middleVal = value;
        this.updateMid();
        break;
      case 'midFreq':
        this.midFreqVal = value;
        this.updateMid();
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
      this.postDistSmoothingFilter.disconnect();
      this.eqLow.disconnect();
      this.eqMid.disconnect();
      this.eqHigh.disconnect();
      this.postRecoveryFilter.disconnect();
      this.levelGain.disconnect();
      this.outputNode.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
}
