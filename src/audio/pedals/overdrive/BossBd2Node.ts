import type { AudioPedalNode } from '../../../types/pedal';
import { levelToGain, applyBypassCrossfade, driveDependentTrimDb, createDcBlocker } from '../dspUtils';

/** Output trim (dB) calibrated so Level=5 is ~unity loudness. */
const TRIM_UNITY_DB = -1.0;
const TRIM_SAT_DB = -12.0;

/**
 * Boss BD-2 Blues Driver (1995)
 * Discrete multi-stage FET overdrive circuitry.
 * Famous for extreme touch-sensitivity, responding immediately to guitar volume pot adjustments
 * and pick attack dynamics from crystalline clean boost to gritty vintage tweed amp breakup.
 */
export class BossBd2Node implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private fetStage1: GainNode;
  private fetShaper1: WaveShaperNode;
  private fetStage2: GainNode;
  private fetShaper2: WaveShaperNode;
  private toneHigh: BiquadFilterNode;
  private toneLow: BiquadFilterNode;
  private postGain: GainNode;

  private wetGain: GainNode;
  private dryGain: GainNode;
  private isEnabled = true;

  private preHighpass!: BiquadFilterNode;
  private dcBlocker!: BiquadFilterNode;
  private levelVal = 5;
  private toneVal = 5;
  private gainVal = 5;

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.level !== undefined) this.levelVal = initialParams.level;
    if (initialParams?.tone !== undefined) this.toneVal = initialParams.tone;
    if (initialParams?.gain !== undefined) this.gainVal = initialParams.gain;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // Input coupling high-pass: keeps the transistor stages from turning boomy
    this.preHighpass = ctx.createBiquadFilter();
    this.preHighpass.type = 'highpass';
    this.preHighpass.frequency.setValueAtTime(110, ctx.currentTime);
    this.preHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    // FET Stage 1
    this.fetStage1 = ctx.createGain();
    this.fetShaper1 = ctx.createWaveShaper();
    this.fetShaper1.curve = this.createFetCurve(4096, 0.85, 0.6) as Float32Array<ArrayBuffer>;
    this.fetShaper1.oversample = '4x';

    // FET Stage 2 (second cascading FET transistor stage)
    this.fetStage2 = ctx.createGain();
    this.fetShaper2 = ctx.createWaveShaper();
    this.fetShaper2.curve = this.createFetCurve(4096, 0.8, 0.55) as Float32Array<ArrayBuffer>;
    this.fetShaper2.oversample = '4x';

    // Asymmetric clipping leaves DC offset
    this.dcBlocker = createDcBlocker(ctx);

    // Active Tilt Tone Network (Highs peaking + Lows shelf)
    this.toneHigh = ctx.createBiquadFilter();
    this.toneHigh.type = 'peaking';
    this.toneHigh.frequency.setValueAtTime(3200, ctx.currentTime);
    this.toneHigh.Q.setValueAtTime(0.8, ctx.currentTime);

    this.toneLow = ctx.createBiquadFilter();
    this.toneLow.type = 'lowshelf';
    this.toneLow.frequency.setValueAtTime(260, ctx.currentTime);

    this.postGain = ctx.createGain();

    this.applyParameters();

    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    const wetTarget = this.isEnabled ? 1 : 0;
    const dryTarget = this.isEnabled ? 0 : 1;
    this.wetGain.gain.setValueAtTime(wetTarget, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(dryTarget, ctx.currentTime);

    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Multi-stage FET chain:
    this.inputNode.connect(this.preHighpass);
    this.preHighpass.connect(this.fetStage1);
    this.fetStage1.connect(this.fetShaper1);
    this.fetShaper1.connect(this.fetStage2);
    this.fetStage2.connect(this.fetShaper2);
    this.fetShaper2.connect(this.dcBlocker);
    this.dcBlocker.connect(this.toneHigh);
    this.toneHigh.connect(this.toneLow);
    this.toneLow.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);
  }

  /**
   * Asymmetric transistor-style soft clip. Slope is exactly 1 at zero (no hidden gain);
   * positive / negative rails differ so even-order harmonics appear.
   */
  private createFetCurve(samples: number, posRail: number, negRail: number): Float32Array {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / (samples - 1) - 1;
      curve[i] = x >= 0 ? posRail * Math.tanh(x / posRail) : negRail * Math.tanh(x / negRail);
    }
    return curve;
  }

  private applyParameters(): void {
    const now = this.ctx.currentTime;
    const gainNorm = Math.max(0, Math.min(10, this.gainVal)) / 10;
    const toneNorm = Math.max(0, Math.min(10, this.toneVal)) / 10;

    // Gain: clean boost (1x) up to ~25 dB of crunch (about 3x * 6x)
    const stage1 = 1.0 + Math.pow(gainNorm, 1.4) * 2.0;
    const stage2 = 1.0 + Math.pow(gainNorm, 1.6) * 5.0;
    this.fetStage1.gain.setTargetAtTime(stage1, now, 0.02);
    this.fetStage2.gain.setTargetAtTime(stage2, now, 0.02);

    // Active Tone Tilt (-8dB to +9dB on highs, +5dB to -4dB on lows)
    const highGain = -8 + toneNorm * 17;
    const lowGain = 5 - toneNorm * 9;
    this.toneHigh.gain.setTargetAtTime(highGain, now, 0.02);
    this.toneLow.gain.setTargetAtTime(lowGain, now, 0.02);

    // Level: unified taper, trim follows total gain for consistent loudness
    const trimDb = driveDependentTrimDb(stage1 * stage2, TRIM_UNITY_DB, TRIM_SAT_DB, 6);
    this.postGain.gain.setTargetAtTime(levelToGain(this.levelVal, trimDb), now, 0.02);
  }

  public updateParameter(paramId: string, value: number): void {
    if (paramId === 'level') this.levelVal = value;
    else if (paramId === 'tone') this.toneVal = value;
    else if (paramId === 'gain') this.gainVal = value;
    this.applyParameters();
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    applyBypassCrossfade(this.wetGain, this.dryGain, enabled, this.ctx);
  }

  public dispose(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.preHighpass.disconnect();
    this.dcBlocker.disconnect();
    this.fetStage1.disconnect();
    this.fetShaper1.disconnect();
    this.fetStage2.disconnect();
    this.fetShaper2.disconnect();
    this.toneHigh.disconnect();
    this.toneLow.disconnect();
    this.postGain.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
  }
}
