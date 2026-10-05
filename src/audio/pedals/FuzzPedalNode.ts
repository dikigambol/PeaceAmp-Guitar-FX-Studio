import type { AudioPedalNode } from '../../types/pedal';
import { makeFuzzCurve } from '../../dsp/distortion/curves';

export class FuzzPedalNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private preGain: GainNode;
  private waveShaper: WaveShaperNode;
  private toneFilter: BiquadFilterNode;
  private levelGain: GainNode;

  // Bypass crossfaders
  private wetGain: GainNode;
  private dryGain: GainNode;

  private isEnabled = true;
  private fuzzVal = 20;
  private toneVal = 3000;
  private levelVal = 0;

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.fuzz !== undefined) this.fuzzVal = initialParams.fuzz;
    if (initialParams?.tone !== undefined) this.toneVal = initialParams.tone;
    if (initialParams?.level !== undefined) this.levelVal = initialParams.level;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Extreme Pre-Gain for square-wave fuzz saturation
    this.preGain = ctx.createGain();
    this.preGain.gain.setValueAtTime(this.fuzzVal * 0.8, ctx.currentTime);

    // 2. Fuzz WaveShaper with 4x oversampling
    this.waveShaper = ctx.createWaveShaper();
    this.waveShaper.oversample = '4x';
    this.waveShaper.curve = makeFuzzCurve(this.fuzzVal);

    // 3. Tone filter (mid-emphasis / low-pass)
    this.toneFilter = ctx.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.setValueAtTime(this.toneVal, ctx.currentTime);
    this.toneFilter.Q.setValueAtTime(1.5, ctx.currentTime);

    // 4. Output level
    this.levelGain = ctx.createGain();
    const linearLevel = Math.pow(10, this.levelVal / 20);
    this.levelGain.gain.setValueAtTime(linearLevel, ctx.currentTime);

    // 5. Bypass crossfaders
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();

    const wetTarget = this.isEnabled ? 1 : 0;
    const dryTarget = this.isEnabled ? 0 : 1;
    this.wetGain.gain.setValueAtTime(wetTarget, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(dryTarget, ctx.currentTime);

    // Graph
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    this.inputNode.connect(this.preGain);
    this.preGain.connect(this.waveShaper);
    this.waveShaper.connect(this.toneFilter);
    this.toneFilter.connect(this.levelGain);
    this.levelGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);
  }

  public updateParameter(paramId: string, value: number): void {
    const now = this.ctx.currentTime;
    if (paramId === 'fuzz') {
      this.fuzzVal = value;
      this.preGain.gain.setTargetAtTime(value * 0.8, now, 0.015);
      this.waveShaper.curve = makeFuzzCurve(value);
    } else if (paramId === 'tone') {
      this.toneVal = value;
      this.toneFilter.frequency.setTargetAtTime(value, now, 0.015);
    } else if (paramId === 'level') {
      this.levelVal = value;
      const linear = Math.pow(10, value / 20);
      this.levelGain.gain.setTargetAtTime(linear, now, 0.015);
    }
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    const now = this.ctx.currentTime;
    this.wetGain.gain.setTargetAtTime(enabled ? 1 : 0, now, 0.015);
    this.dryGain.gain.setTargetAtTime(enabled ? 0 : 1, now, 0.015);
  }

  public dispose(): void {
    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.preGain.disconnect();
      this.waveShaper.disconnect();
      this.toneFilter.disconnect();
      this.levelGain.disconnect();
      this.wetGain.disconnect();
      this.dryGain.disconnect();
    } catch (e) {
      console.warn('FuzzPedalNode dispose error', e);
    }
  }
}
