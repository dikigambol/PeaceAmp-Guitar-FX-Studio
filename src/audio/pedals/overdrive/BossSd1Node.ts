import type { AudioPedalNode } from '../../../types/pedal';
import { createDcBlocker, levelToGain, applyBypassCrossfade } from '../dspUtils';

/** Output trim (dB) calibrated so Level=5 is ~unity loudness. */
const OUTPUT_TRIM_DB = -10.7;

/**
 * Boss SD-1 Super OverDrive (1981)
 * Legendary patented Asymmetrical Diode Clipping circuit (2 diodes one way, 1 reverse).
 * Generates rich even-order (2nd harmonic) tube warmth, smooth singing sustain, and
 * punchy midrange that cuts effortlessly through dense rhythm sections.
 */
export class BossSd1Node implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private preHpFilter: BiquadFilterNode;
  private preGain: GainNode;
  private shaper: WaveShaperNode;
  private dcBlocker: BiquadFilterNode;
  private toneFilter: BiquadFilterNode;
  private postGain: GainNode;

  private wetGain: GainNode;
  private dryGain: GainNode;
  private isEnabled = true;

  private levelVal = 5;
  private toneVal = 5;
  private driveVal = 5;

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.level !== undefined) this.levelVal = initialParams.level;
    if (initialParams?.tone !== undefined) this.toneVal = initialParams.tone;
    if (initialParams?.drive !== undefined) this.driveVal = initialParams.drive;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. SD-1 Pre-emphasis Highpass (cuts mud below ~700Hz before distortion)
    this.preHpFilter = ctx.createBiquadFilter();
    this.preHpFilter.type = 'highpass';
    this.preHpFilter.frequency.setValueAtTime(680, ctx.currentTime);
    this.preHpFilter.Q.setValueAtTime(0.7, ctx.currentTime);

    this.preGain = ctx.createGain();

    // 2. Boss Asymmetrical Diode Waveshaping (2:1 diode configuration)
    this.shaper = ctx.createWaveShaper();
    this.shaper.curve = this.createAsymmetricalCurve(4096) as Float32Array<ArrayBuffer>;
    this.shaper.oversample = '4x';

    // Asymmetric clipping generates DC offset -> block it before the tone stage
    this.dcBlocker = createDcBlocker(ctx);

    // 3. Active Tone Filter (classic Boss lowpass tone circuit)
    this.toneFilter = ctx.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.Q.setValueAtTime(0.85, ctx.currentTime);

    this.postGain = ctx.createGain();

    this.applyParameters();

    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    const wetTarget = this.isEnabled ? 1 : 0;
    const dryTarget = this.isEnabled ? 0 : 1;
    this.wetGain.gain.setValueAtTime(wetTarget, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(dryTarget, ctx.currentTime);

    // True bypass
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Overdrive path
    this.inputNode.connect(this.preHpFilter);
    this.preHpFilter.connect(this.preGain);
    this.preGain.connect(this.shaper);
    this.shaper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.toneFilter);
    this.toneFilter.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);
  }

  private createAsymmetricalCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      if (x > 0) {
        // Two diodes in series = higher forward voltage threshold, softer compression
        curve[i] = Math.tanh(1.5 * x) * 1.1;
      } else {
        // One diode reverse = lower forward voltage, earlier and sharper clipping
        curve[i] = Math.tanh(2.6 * x) * 0.75;
      }
    }
    return curve;
  }

  private applyParameters(): void {
    const now = this.ctx.currentTime;
    const driveNorm = Math.max(0, Math.min(10, this.driveVal)) / 10;
    const toneNorm = Math.max(0, Math.min(10, this.toneVal)) / 10;

    // Drive: 1.5x up to 24x input gain
    const gain = 1.5 + Math.pow(driveNorm, 1.7) * 22.5;
    this.preGain.gain.setTargetAtTime(gain, now, 0.02);

    // Tone: 1100Hz (dark) to 5200Hz (bright, biting)
    const cutoff = 1100 + Math.pow(toneNorm, 1.3) * 4100;
    this.toneFilter.frequency.setTargetAtTime(cutoff, now, 0.02);

    // Level: unified taper (unity at noon)
    this.postGain.gain.setTargetAtTime(levelToGain(this.levelVal, OUTPUT_TRIM_DB), now, 0.02);
  }

  public updateParameter(paramId: string, value: number): void {
    if (paramId === 'level') this.levelVal = value;
    else if (paramId === 'tone') this.toneVal = value;
    else if (paramId === 'drive') this.driveVal = value;
    this.applyParameters();
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    applyBypassCrossfade(this.wetGain, this.dryGain, enabled, this.ctx);
  }

  public dispose(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.preHpFilter.disconnect();
    this.preGain.disconnect();
    this.shaper.disconnect();
    this.dcBlocker.disconnect();
    this.toneFilter.disconnect();
    this.postGain.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
  }
}
