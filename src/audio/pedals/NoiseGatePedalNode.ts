import type { AudioPedalNode } from '../../types/pedal';

export class NoiseGatePedalNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private workletNode: AudioWorkletNode | null = null;
  private fallbackGain: GainNode | null = null;

  // Bypass crossfaders
  private wetGain: GainNode;
  private dryGain: GainNode;

  private isEnabled = true;

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    const threshold = initialParams?.threshold ?? -50;
    const release = initialParams?.release ?? 0.05;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();

    const wetTarget = this.isEnabled ? 1 : 0;
    const dryTarget = this.isEnabled ? 0 : 1;
    this.wetGain.gain.setValueAtTime(wetTarget, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(dryTarget, ctx.currentTime);

    // Dry path
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Wet path via AudioWorklet
    try {
      this.workletNode = new AudioWorkletNode(ctx, 'noise-gate-processor');
      const paramThreshold = this.workletNode.parameters.get('threshold');
      const paramRelease = this.workletNode.parameters.get('release');
      if (paramThreshold) paramThreshold.setValueAtTime(threshold, ctx.currentTime);
      if (paramRelease) paramRelease.setValueAtTime(release, ctx.currentTime);

      this.inputNode.connect(this.workletNode);
      this.workletNode.connect(this.wetGain);
      this.wetGain.connect(this.outputNode);
    } catch {
      // Fallback to passthrough if worklet not ready
      this.fallbackGain = ctx.createGain();
      this.inputNode.connect(this.fallbackGain);
      this.fallbackGain.connect(this.wetGain);
      this.wetGain.connect(this.outputNode);
    }
  }

  public updateParameter(paramId: string, value: number): void {
    if (!this.workletNode) return;
    const now = this.ctx.currentTime;
    if (paramId === 'threshold') {
      const p = this.workletNode.parameters.get('threshold');
      if (p) p.setTargetAtTime(value, now, 0.015);
    } else if (paramId === 'release') {
      const p = this.workletNode.parameters.get('release');
      if (p) p.setTargetAtTime(value, now, 0.015);
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
      if (this.workletNode) this.workletNode.disconnect();
      if (this.fallbackGain) this.fallbackGain.disconnect();
      this.wetGain.disconnect();
      this.dryGain.disconnect();
    } catch (e) {
      console.warn('NoiseGatePedalNode dispose error', e);
    }
  }
}
