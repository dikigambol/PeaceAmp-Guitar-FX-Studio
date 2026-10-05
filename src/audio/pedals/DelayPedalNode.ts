import type { AudioPedalNode } from '../../types/pedal';

export class DelayPedalNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private delayNode: DelayNode;
  private feedbackGain: GainNode;
  private toneFilter: BiquadFilterNode;
  private wetGain: GainNode;
  private dryGain: GainNode;
  private levelGain: GainNode;

  // Bypass crossfaders
  private bypassWet: GainNode;
  private bypassDry: GainNode;

  private isEnabled = true;
  private timeVal = 0.35;    // 350ms
  private feedbackVal = 0.45; // 45%
  private toneVal = 3500;     // 3.5kHz analog tape roll-off
  private mixVal = 0.4;       // 40%
  private levelVal = 0;       // dB

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.time !== undefined) this.timeVal = initialParams.time;
    if (initialParams?.feedback !== undefined) this.feedbackVal = initialParams.feedback;
    if (initialParams?.tone !== undefined) this.toneVal = initialParams.tone;
    if (initialParams?.mix !== undefined) this.mixVal = initialParams.mix;
    if (initialParams?.level !== undefined) this.levelVal = initialParams.level;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Delay line (max 1.5s)
    this.delayNode = ctx.createDelay(1.5);
    this.delayNode.delayTime.setValueAtTime(this.timeVal, ctx.currentTime);

    // 2. Feedback loop gain
    this.feedbackGain = ctx.createGain();
    this.feedbackGain.gain.setValueAtTime(this.feedbackVal, ctx.currentTime);

    // 3. High-cut damping filter inside feedback loop (creates warm tape degradation)
    this.toneFilter = ctx.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.frequency.setValueAtTime(this.toneVal, ctx.currentTime);
    this.toneFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    // Connect feedback loop: delayNode -> toneFilter -> feedbackGain -> delayNode
    this.delayNode.connect(this.toneFilter);
    this.toneFilter.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNode);

    // 4. Mix
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(this.mixVal, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(1 - this.mixVal * 0.3, ctx.currentTime);

    // 5. Output Level
    this.levelGain = ctx.createGain();
    const linearLevel = Math.pow(10, this.levelVal / 20);
    this.levelGain.gain.setValueAtTime(linearLevel, ctx.currentTime);

    // 6. True bypass crossfaders
    this.bypassWet = ctx.createGain();
    this.bypassDry = ctx.createGain();
    const wetTarget = this.isEnabled ? 1 : 0;
    const dryTarget = this.isEnabled ? 0 : 1;
    this.bypassWet.gain.setValueAtTime(wetTarget, ctx.currentTime);
    this.bypassDry.gain.setValueAtTime(dryTarget, ctx.currentTime);

    // Dry path for true bypass
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    // Wet effect path
    this.inputNode.connect(this.dryGain);
    this.inputNode.connect(this.delayNode);

    this.dryGain.connect(this.levelGain);
    this.toneFilter.connect(this.wetGain);
    this.wetGain.connect(this.levelGain);

    this.levelGain.connect(this.bypassWet);
    this.bypassWet.connect(this.outputNode);
  }

  public updateParameter(paramId: string, value: number): void {
    const now = this.ctx.currentTime;
    if (paramId === 'time') {
      this.timeVal = value;
      this.delayNode.delayTime.setTargetAtTime(value, now, 0.02);
    } else if (paramId === 'feedback') {
      this.feedbackVal = Math.min(0.92, Math.max(0, value));
      this.feedbackGain.gain.setTargetAtTime(this.feedbackVal, now, 0.015);
    } else if (paramId === 'tone') {
      this.toneVal = value;
      this.toneFilter.frequency.setTargetAtTime(value, now, 0.015);
    } else if (paramId === 'mix') {
      this.mixVal = value;
      this.wetGain.gain.setTargetAtTime(value, now, 0.015);
      this.dryGain.gain.setTargetAtTime(1 - value * 0.3, now, 0.015);
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
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.delayNode.disconnect();
      this.feedbackGain.disconnect();
      this.toneFilter.disconnect();
      this.wetGain.disconnect();
      this.dryGain.disconnect();
      this.levelGain.disconnect();
      this.bypassWet.disconnect();
      this.bypassDry.disconnect();
    } catch (e) {
      console.warn('DelayPedalNode dispose error', e);
    }
  }
}
