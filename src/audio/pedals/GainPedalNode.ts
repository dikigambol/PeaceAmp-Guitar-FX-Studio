import type { AudioPedalNode } from '../../types/pedal';

export class GainPedalNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private boostNode: GainNode;
  private levelNode: GainNode;

  // Bypass crossfaders
  private wetGain: GainNode;
  private dryGain: GainNode;

  private isEnabled = true;
  private boostDb = 6;  // default +6 dB boost
  private levelDb = 0;  // default 0 dB trim

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.boost !== undefined) this.boostDb = initialParams.boost;
    if (initialParams?.level !== undefined) this.levelDb = initialParams.level;

    // In / Out splitters
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // Effect processing nodes
    this.boostNode = ctx.createGain();
    this.levelNode = ctx.createGain();

    // Bypass crossfade nodes
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();

    // Apply values
    const boostLinear = Math.pow(10, this.boostDb / 20);
    const levelLinear = Math.pow(10, this.levelDb / 20);
    this.boostNode.gain.setValueAtTime(boostLinear, ctx.currentTime);
    this.levelNode.gain.setValueAtTime(levelLinear, ctx.currentTime);

    const wetTarget = this.isEnabled ? 1 : 0;
    const dryTarget = this.isEnabled ? 0 : 1;
    this.wetGain.gain.setValueAtTime(wetTarget, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(dryTarget, ctx.currentTime);

    // Topology:
    // inputNode -> dryGain -> outputNode
    // inputNode -> boostNode -> levelNode -> wetGain -> outputNode
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    this.inputNode.connect(this.boostNode);
    this.boostNode.connect(this.levelNode);
    this.levelNode.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);
  }

  public updateParameter(paramId: string, value: number): void {
    const now = this.ctx.currentTime;
    if (paramId === 'boost') {
      this.boostDb = value;
      const linear = Math.pow(10, value / 20);
      this.boostNode.gain.setTargetAtTime(linear, now, 0.015);
    } else if (paramId === 'level') {
      this.levelDb = value;
      const linear = Math.pow(10, value / 20);
      this.levelNode.gain.setTargetAtTime(linear, now, 0.015);
    }
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    const now = this.ctx.currentTime;
    // Pop-free crossfade over 15ms
    this.wetGain.gain.setTargetAtTime(enabled ? 1 : 0, now, 0.015);
    this.dryGain.gain.setTargetAtTime(enabled ? 0 : 1, now, 0.015);
  }

  public dispose(): void {
    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.boostNode.disconnect();
      this.levelNode.disconnect();
      this.wetGain.disconnect();
      this.dryGain.disconnect();
    } catch (e) {
      console.warn('GainPedalNode dispose error', e);
    }
  }
}
