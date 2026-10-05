import type { AudioPedalNode } from '../../types/pedal';

export class TremoloPedalNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private tremoloGain: GainNode;
  private lfo: OscillatorNode;
  private lfoDepthGain: GainNode;
  private levelGain: GainNode;

  // Bypass crossfaders
  private bypassWet: GainNode;
  private bypassDry: GainNode;

  private isEnabled = true;
  private rateVal = 4.0;    // Hz
  private depthVal = 0.65;  // 0 to 1
  private levelVal = 0;     // dB

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.rate !== undefined) this.rateVal = initialParams.rate;
    if (initialParams?.depth !== undefined) this.depthVal = initialParams.depth;
    if (initialParams?.level !== undefined) this.levelVal = initialParams.level;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Modulated tremolo gain stage
    this.tremoloGain = ctx.createGain();
    const baseGain = 1.0 - this.depthVal * 0.5;
    this.tremoloGain.gain.setValueAtTime(baseGain, ctx.currentTime);

    // 2. LFO
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.setValueAtTime(this.rateVal, ctx.currentTime);

    // 3. LFO depth scaler connected to tremoloGain.gain
    this.lfoDepthGain = ctx.createGain();
    this.lfoDepthGain.gain.setValueAtTime(this.depthVal * 0.5, ctx.currentTime);
    this.lfo.connect(this.lfoDepthGain);
    this.lfoDepthGain.connect(this.tremoloGain.gain);
    this.lfo.start();

    // 4. Output level
    this.levelGain = ctx.createGain();
    const linearLevel = Math.pow(10, this.levelVal / 20);
    this.levelGain.gain.setValueAtTime(linearLevel, ctx.currentTime);

    // 5. Bypass
    this.bypassWet = ctx.createGain();
    this.bypassDry = ctx.createGain();
    const wetTarget = this.isEnabled ? 1 : 0;
    const dryTarget = this.isEnabled ? 0 : 1;
    this.bypassWet.gain.setValueAtTime(wetTarget, ctx.currentTime);
    this.bypassDry.gain.setValueAtTime(dryTarget, ctx.currentTime);

    // Dry
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    // Wet: inputNode -> tremoloGain -> levelGain -> bypassWet -> outputNode
    this.inputNode.connect(this.tremoloGain);
    this.tremoloGain.connect(this.levelGain);
    this.levelGain.connect(this.bypassWet);
    this.bypassWet.connect(this.outputNode);
  }

  public updateParameter(paramId: string, value: number): void {
    const now = this.ctx.currentTime;
    if (paramId === 'rate') {
      this.rateVal = value;
      this.lfo.frequency.setTargetAtTime(value, now, 0.015);
    } else if (paramId === 'depth') {
      this.depthVal = value;
      const baseGain = 1.0 - value * 0.5;
      this.tremoloGain.gain.setTargetAtTime(baseGain, now, 0.015);
      this.lfoDepthGain.gain.setTargetAtTime(value * 0.5, now, 0.015);
    } else if (paramId === 'level') {
      this.levelVal = value;
      const linear = Math.pow(10, value / 20);
      this.levelGain.gain.setTargetAtTime(linear, now, 0.015);
    }
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    const now = this.ctx.currentTime;
    this.bypassWet.gain.setTargetAtTime(enabled ? 1 : 0, now, 0.015);
    this.bypassDry.gain.setTargetAtTime(enabled ? 0 : 1, now, 0.015);
  }

  public dispose(): void {
    try {
      this.lfo.stop();
      this.lfo.disconnect();
      this.lfoDepthGain.disconnect();
      this.tremoloGain.disconnect();
      this.levelGain.disconnect();
      this.bypassWet.disconnect();
      this.bypassDry.disconnect();
      this.inputNode.disconnect();
      this.outputNode.disconnect();
    } catch (e) {
      console.warn('TremoloPedalNode dispose error', e);
    }
  }
}
