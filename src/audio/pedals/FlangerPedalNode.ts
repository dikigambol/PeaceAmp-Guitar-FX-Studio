import type { AudioPedalNode } from '../../types/pedal';

export class FlangerPedalNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private delayNode: DelayNode;
  private feedbackGain: GainNode;
  private lfo: OscillatorNode;
  private lfoGain: GainNode;
  private wetGain: GainNode;
  private dryGain: GainNode;
  private levelGain: GainNode;

  // Bypass crossfaders
  private bypassWet: GainNode;
  private bypassDry: GainNode;

  private isEnabled = true;
  private rateVal = 0.5;     // Hz
  private depthVal = 0.0018; // 1.8ms modulation
  private feedbackVal = 0.6; // 0 to 0.85
  private levelVal = 0;      // dB

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.rate !== undefined) this.rateVal = initialParams.rate;
    if (initialParams?.depth !== undefined) this.depthVal = initialParams.depth;
    if (initialParams?.feedback !== undefined) this.feedbackVal = initialParams.feedback;
    if (initialParams?.level !== undefined) this.levelVal = initialParams.level;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Ultra-short flanger delay line (base 2.5ms)
    this.delayNode = ctx.createDelay(0.02);
    this.delayNode.delayTime.setValueAtTime(0.0025, ctx.currentTime);

    // 2. High regenerative feedback for intense comb filtering
    this.feedbackGain = ctx.createGain();
    this.feedbackGain.gain.setValueAtTime(this.feedbackVal, ctx.currentTime);
    this.delayNode.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNode);

    // 3. LFO
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'triangle'; // Triangle wave gives linear flanger pitch sweeps
    this.lfo.frequency.setValueAtTime(this.rateVal, ctx.currentTime);

    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.setValueAtTime(this.depthVal, ctx.currentTime);
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.delayNode.delayTime);
    this.lfo.start();

    // 4. Mix
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(0.5, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(0.5, ctx.currentTime);

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

    // Dry for bypass
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    // Wet
    this.inputNode.connect(this.dryGain);
    this.inputNode.connect(this.delayNode);
    this.delayNode.connect(this.wetGain);

    this.dryGain.connect(this.levelGain);
    this.wetGain.connect(this.levelGain);

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
    } else if (paramId === 'feedback') {
      this.feedbackVal = value;
      this.feedbackGain.gain.setTargetAtTime(value, now, 0.015);
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
      this.feedbackGain.disconnect();
      this.wetGain.disconnect();
      this.dryGain.disconnect();
      this.levelGain.disconnect();
      this.bypassWet.disconnect();
      this.bypassDry.disconnect();
      this.inputNode.disconnect();
      this.outputNode.disconnect();
    } catch (e) {
      console.warn('FlangerPedalNode dispose error', e);
    }
  }
}
