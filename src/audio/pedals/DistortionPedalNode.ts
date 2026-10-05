import type { AudioPedalNode } from '../../types/pedal';
import { makeDistortionCurve } from '../../dsp/distortion/curves';

export class DistortionPedalNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private preGain: GainNode;
  private waveShaper: WaveShaperNode;
  private filterNode: BiquadFilterNode;
  private levelGain: GainNode;

  // Bypass crossfaders
  private wetGain: GainNode;
  private dryGain: GainNode;

  private isEnabled = true;
  private distVal = 18;
  private filterVal = 2800;
  private levelVal = 0;

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.distortion !== undefined) this.distVal = initialParams.distortion;
    if (initialParams?.filter !== undefined) this.filterVal = initialParams.filter;
    if (initialParams?.level !== undefined) this.levelVal = initialParams.level;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. High Gain stage
    this.preGain = ctx.createGain();
    this.preGain.gain.setValueAtTime(this.distVal * 0.6, ctx.currentTime);

    // 2. Hard Symmetrical Diode WaveShaper (4x oversampled)
    this.waveShaper = ctx.createWaveShaper();
    this.waveShaper.oversample = '4x';
    this.waveShaper.curve = makeDistortionCurve(this.distVal);

    // 3. Post-Clip Low-pass Filter (Classic Rat style high cut)
    this.filterNode = ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(this.filterVal, ctx.currentTime);
    this.filterNode.Q.setValueAtTime(1.2, ctx.currentTime);

    // 4. Master Level
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

    // Dry
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Wet
    this.inputNode.connect(this.preGain);
    this.preGain.connect(this.waveShaper);
    this.waveShaper.connect(this.filterNode);
    this.filterNode.connect(this.levelGain);
    this.levelGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);
  }

  public updateParameter(paramId: string, value: number): void {
    const now = this.ctx.currentTime;
    if (paramId === 'distortion') {
      this.distVal = value;
      this.preGain.gain.setTargetAtTime(value * 0.6, now, 0.015);
      this.waveShaper.curve = makeDistortionCurve(value);
    } else if (paramId === 'filter') {
      this.filterVal = value;
      this.filterNode.frequency.setTargetAtTime(value, now, 0.015);
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
      this.filterNode.disconnect();
      this.levelGain.disconnect();
      this.wetGain.disconnect();
      this.dryGain.disconnect();
    } catch (e) {
      console.warn('DistortionPedalNode dispose error', e);
    }
  }
}
