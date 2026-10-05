import type { AudioPedalNode } from '../../types/pedal';

export class ChorusPedalNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private delayNode: DelayNode;
  private lfo: OscillatorNode;
  private lfoGain: GainNode;
  private wetGainNode: GainNode;
  private dryGainNode: GainNode;
  private levelGain: GainNode;

  // Bypass crossfaders
  private bypassWet: GainNode;
  private bypassDry: GainNode;

  private isEnabled = true;
  private rateVal = 1.2;     // Hz
  private depthVal = 0.003;  // Seconds modulation
  private mixVal = 0.5;      // 0 to 1
  private levelVal = 0;      // dB

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.rate !== undefined) this.rateVal = initialParams.rate;
    if (initialParams?.depth !== undefined) this.depthVal = initialParams.depth;
    if (initialParams?.mix !== undefined) this.mixVal = initialParams.mix;
    if (initialParams?.level !== undefined) this.levelVal = initialParams.level;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Modulated Delay line (nominal base delay 25ms)
    this.delayNode = ctx.createDelay(0.1);
    this.delayNode.delayTime.setValueAtTime(0.025, ctx.currentTime);

    // 2. LFO (Low Frequency Oscillator)
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.setValueAtTime(this.rateVal, ctx.currentTime);

    // 3. LFO depth gain connected to delayTime AudioParam
    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.setValueAtTime(this.depthVal, ctx.currentTime);
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.delayNode.delayTime);
    this.lfo.start();

    // 4. Mix stages
    this.wetGainNode = ctx.createGain();
    this.dryGainNode = ctx.createGain();
    this.wetGainNode.gain.setValueAtTime(this.mixVal, ctx.currentTime);
    this.dryGainNode.gain.setValueAtTime(1 - this.mixVal * 0.5, ctx.currentTime);

    // 5. Level
    this.levelGain = ctx.createGain();
    const linearLevel = Math.pow(10, this.levelVal / 20);
    this.levelGain.gain.setValueAtTime(linearLevel, ctx.currentTime);

    // 6. Bypass
    this.bypassWet = ctx.createGain();
    this.bypassDry = ctx.createGain();
    const wetTarget = this.isEnabled ? 1 : 0;
    const dryTarget = this.isEnabled ? 0 : 1;
    this.bypassWet.gain.setValueAtTime(wetTarget, ctx.currentTime);
    this.bypassDry.gain.setValueAtTime(dryTarget, ctx.currentTime);

    // Dry Passthrough for True Bypass
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    // Wet Effect Path:
    // inputNode -> dryGainNode ─┐
    // inputNode -> delayNode -> wetGainNode ─┴─> levelGain -> bypassWet -> outputNode
    this.inputNode.connect(this.dryGainNode);
    this.inputNode.connect(this.delayNode);

    this.dryGainNode.connect(this.levelGain);
    this.delayNode.connect(this.wetGainNode);
    this.wetGainNode.connect(this.levelGain);

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
      this.lfoGain.gain.setTargetAtTime(value, now, 0.015);
    } else if (paramId === 'mix') {
      this.mixVal = value;
      this.wetGainNode.gain.setTargetAtTime(value, now, 0.015);
      this.dryGainNode.gain.setTargetAtTime(1 - value * 0.5, now, 0.015);
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
      this.lfoGain.disconnect();
      this.delayNode.disconnect();
      this.dryGainNode.disconnect();
      this.wetGainNode.disconnect();
      this.levelGain.disconnect();
      this.bypassWet.disconnect();
      this.bypassDry.disconnect();
      this.inputNode.disconnect();
      this.outputNode.disconnect();
    } catch (e) {
      console.warn('ChorusPedalNode dispose error', e);
    }
  }
}
