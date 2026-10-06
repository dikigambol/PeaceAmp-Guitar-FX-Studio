import type { AudioPedalNode } from '../../../types/pedal';
import { createDcBlocker, levelToGain, applyBypassCrossfade } from '../dspUtils';

/** Output trim (dB) calibrated so Level=5 is ~unity loudness. */
const OUTPUT_TRIM_DB = -17.2;

/**
 * Boss OD-3 OverDrive (Dual-Stage Overdrive Circuit)
 * Features dual cascaded gain stages for expansive bass response, creamy sustained saturation,
 * and immense dynamic clarity that never thins out on low chords.
 */
export class BossOd3Node implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private stage1Pre: GainNode;
  private stage1Shaper: WaveShaperNode;
  private interstageFilter: BiquadFilterNode;
  private stage2Pre: GainNode;
  private stage2Shaper: WaveShaperNode;
  private dcBlocker: BiquadFilterNode;
  private postBassEnhance: BiquadFilterNode;
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

    // Stage 1: Initial warm preamp breakup
    this.stage1Pre = ctx.createGain();
    this.stage1Shaper = ctx.createWaveShaper();
    this.stage1Shaper.curve = this.createStage1Curve(4096) as Float32Array<ArrayBuffer>;
    this.stage1Shaper.oversample = '2x';

    // Interstage band shaping (keeps lows punchy)
    this.interstageFilter = ctx.createBiquadFilter();
    this.interstageFilter.type = 'highpass';
    this.interstageFilter.frequency.setValueAtTime(140, ctx.currentTime);

    // Stage 2: Main dual-stage overdrive saturation
    this.stage2Pre = ctx.createGain();
    this.stage2Shaper = ctx.createWaveShaper();
    this.stage2Shaper.curve = this.createStage2Curve(4096) as Float32Array<ArrayBuffer>;
    this.stage2Shaper.oversample = '4x';

    // Asymmetric stage-2 clipping creates DC offset -> block it
    this.dcBlocker = createDcBlocker(ctx);

    // OD-3 Signature Warm Bass Shelf
    this.postBassEnhance = ctx.createBiquadFilter();
    this.postBassEnhance.type = 'lowshelf';
    this.postBassEnhance.frequency.setValueAtTime(180, ctx.currentTime);
    this.postBassEnhance.gain.setValueAtTime(2.2, ctx.currentTime);

    // Tone filter
    this.toneFilter = ctx.createBiquadFilter();
    this.toneFilter.type = 'lowpass';

    this.postGain = ctx.createGain();

    this.applyParameters();

    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    const wetTarget = this.isEnabled ? 1 : 0;
    const dryTarget = this.isEnabled ? 0 : 1;
    this.wetGain.gain.setValueAtTime(wetTarget, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(dryTarget, ctx.currentTime);

    // Bypass route
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Dual-Stage OD route:
    this.inputNode.connect(this.stage1Pre);
    this.stage1Pre.connect(this.stage1Shaper);
    this.stage1Shaper.connect(this.interstageFilter);
    this.interstageFilter.connect(this.stage2Pre);
    this.stage2Pre.connect(this.stage2Shaper);
    this.stage2Shaper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.postBassEnhance);
    this.postBassEnhance.connect(this.toneFilter);
    this.toneFilter.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);
  }

  private createStage1Curve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(1.2 * x) * 0.9;
    }
    return curve;
  }

  private createStage2Curve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      // Soft compression on top, slightly asymmetrical for tube richness
      const pos = Math.tanh(1.6 * Math.max(0, x));
      const neg = Math.tanh(2.0 * Math.min(0, x));
      curve[i] = pos + neg;
    }
    return curve;
  }

  private applyParameters(): void {
    const now = this.ctx.currentTime;
    const driveNorm = Math.max(0, Math.min(10, this.driveVal)) / 10;
    const toneNorm = Math.max(0, Math.min(10, this.toneVal)) / 10;

    // Stage 1 gain
    const s1Gain = 1.0 + driveNorm * 3.5;
    this.stage1Pre.gain.setTargetAtTime(s1Gain, now, 0.02);

    // Stage 2 gain: up to 18x
    const s2Gain = 1.2 + Math.pow(driveNorm, 1.5) * 16.8;
    this.stage2Pre.gain.setTargetAtTime(s2Gain, now, 0.02);

    // Tone: 1400Hz to 6000Hz
    const cutoff = 1400 + Math.pow(toneNorm, 1.3) * 4600;
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
    this.stage1Pre.disconnect();
    this.stage1Shaper.disconnect();
    this.interstageFilter.disconnect();
    this.stage2Pre.disconnect();
    this.stage2Shaper.disconnect();
    this.dcBlocker.disconnect();
    this.postBassEnhance.disconnect();
    this.toneFilter.disconnect();
    this.postGain.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
  }
}
