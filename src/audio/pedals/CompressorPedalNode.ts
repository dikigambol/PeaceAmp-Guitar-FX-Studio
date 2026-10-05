import type { AudioPedalNode } from '../../types/pedal';

export class CompressorPedalNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private compressor: DynamicsCompressorNode;
  private makeupGain: GainNode;

  // Bypass crossfaders
  private wetGain: GainNode;
  private dryGain: GainNode;

  private isEnabled = true;

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    const threshold = initialParams?.threshold ?? -20;
    const ratio = initialParams?.ratio ?? 4;
    const attack = initialParams?.attack ?? 0.015;
    const release = initialParams?.release ?? 0.15;
    const makeup = initialParams?.makeup ?? 4;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(threshold, ctx.currentTime);
    this.compressor.ratio.setValueAtTime(ratio, ctx.currentTime);
    this.compressor.attack.setValueAtTime(attack, ctx.currentTime);
    this.compressor.release.setValueAtTime(release, ctx.currentTime);
    this.compressor.knee.setValueAtTime(6, ctx.currentTime);

    this.makeupGain = ctx.createGain();
    const makeupLinear = Math.pow(10, makeup / 20);
    this.makeupGain.gain.setValueAtTime(makeupLinear, ctx.currentTime);

    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();

    const wetTarget = this.isEnabled ? 1 : 0;
    const dryTarget = this.isEnabled ? 0 : 1;
    this.wetGain.gain.setValueAtTime(wetTarget, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(dryTarget, ctx.currentTime);

    // Dry path
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Wet path
    this.inputNode.connect(this.compressor);
    this.compressor.connect(this.makeupGain);
    this.makeupGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);
  }

  public updateParameter(paramId: string, value: number): void {
    const now = this.ctx.currentTime;
    switch (paramId) {
      case 'threshold':
        this.compressor.threshold.setTargetAtTime(value, now, 0.015);
        break;
      case 'ratio':
        this.compressor.ratio.setTargetAtTime(value, now, 0.015);
        break;
      case 'attack':
        this.compressor.attack.setTargetAtTime(value, now, 0.015);
        break;
      case 'release':
        this.compressor.release.setTargetAtTime(value, now, 0.015);
        break;
      case 'makeup': {
        const linear = Math.pow(10, value / 20);
        this.makeupGain.gain.setTargetAtTime(linear, now, 0.015);
        break;
      }
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
      this.compressor.disconnect();
      this.makeupGain.disconnect();
      this.wetGain.disconnect();
      this.dryGain.disconnect();
    } catch (e) {
      console.warn('CompressorPedalNode dispose error', e);
    }
  }
}
