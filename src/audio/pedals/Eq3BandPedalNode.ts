import type { AudioPedalNode } from '../../types/pedal';

export class Eq3BandPedalNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;

  // Filters
  private bassFilter: BiquadFilterNode;
  private midFilter: BiquadFilterNode;
  private trebleFilter: BiquadFilterNode;
  private levelNode: GainNode;

  // Bypass crossfaders
  private wetGain: GainNode;
  private dryGain: GainNode;

  private isEnabled = true;

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    const bassVal = initialParams?.bass ?? 0;
    const midVal = initialParams?.middle ?? 0;
    const trebleVal = initialParams?.treble ?? 0;
    const levelVal = initialParams?.level ?? 0;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // Bass: Low Shelf @ 100 Hz
    this.bassFilter = ctx.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.setValueAtTime(100, ctx.currentTime);
    this.bassFilter.gain.setValueAtTime(bassVal, ctx.currentTime);

    // Mid: Peaking @ 800 Hz, Q = 1.0
    this.midFilter = ctx.createBiquadFilter();
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.setValueAtTime(800, ctx.currentTime);
    this.midFilter.Q.setValueAtTime(1.0, ctx.currentTime);
    this.midFilter.gain.setValueAtTime(midVal, ctx.currentTime);

    // Treble: High Shelf @ 3500 Hz
    this.trebleFilter = ctx.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.setValueAtTime(3500, ctx.currentTime);
    this.trebleFilter.gain.setValueAtTime(trebleVal, ctx.currentTime);

    // Master Level trim
    this.levelNode = ctx.createGain();
    const linearLevel = Math.pow(10, levelVal / 20);
    this.levelNode.gain.setValueAtTime(linearLevel, ctx.currentTime);

    // Bypass crossfaders
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();

    const wetTarget = this.isEnabled ? 1 : 0;
    const dryTarget = this.isEnabled ? 0 : 1;
    this.wetGain.gain.setValueAtTime(wetTarget, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(dryTarget, ctx.currentTime);

    // Topology:
    // Dry: inputNode -> dryGain -> outputNode
    // Wet: inputNode -> bassFilter -> midFilter -> trebleFilter -> levelNode -> wetGain -> outputNode
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    this.inputNode.connect(this.bassFilter);
    this.bassFilter.connect(this.midFilter);
    this.midFilter.connect(this.trebleFilter);
    this.trebleFilter.connect(this.levelNode);
    this.levelNode.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);
  }

  public updateParameter(paramId: string, value: number): void {
    const now = this.ctx.currentTime;
    if (paramId === 'bass') {
      this.bassFilter.gain.setTargetAtTime(value, now, 0.015);
    } else if (paramId === 'middle') {
      this.midFilter.gain.setTargetAtTime(value, now, 0.015);
    } else if (paramId === 'treble') {
      this.trebleFilter.gain.setTargetAtTime(value, now, 0.015);
    } else if (paramId === 'level') {
      const linear = Math.pow(10, value / 20);
      this.levelNode.gain.setTargetAtTime(linear, now, 0.015);
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
      this.bassFilter.disconnect();
      this.midFilter.disconnect();
      this.trebleFilter.disconnect();
      this.levelNode.disconnect();
      this.wetGain.disconnect();
      this.dryGain.disconnect();
    } catch (e) {
      console.warn('Eq3BandPedalNode dispose error', e);
    }
  }
}
