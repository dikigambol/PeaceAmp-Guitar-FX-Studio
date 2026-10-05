import type { AudioPedalNode } from '../../types/pedal';

export class ReverbPedalNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private convolver: ConvolverNode;
  private preDelayNode: DelayNode;
  private dampFilter: BiquadFilterNode;
  private wetGain: GainNode;
  private dryGain: GainNode;
  private levelGain: GainNode;

  // Bypass crossfaders
  private bypassWet: GainNode;
  private bypassDry: GainNode;

  private isEnabled = true;
  private decayVal = 2.4;    // Seconds
  private dampVal = 4500;    // Lowpass cutoff Hz
  private mixVal = 0.35;     // 35%
  private levelVal = 0;      // dB

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.decay !== undefined) this.decayVal = initialParams.decay;
    if (initialParams?.damp !== undefined) this.dampVal = initialParams.damp;
    if (initialParams?.mix !== undefined) this.mixVal = initialParams.mix;
    if (initialParams?.level !== undefined) this.levelVal = initialParams.level;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Pre-delay (fixed 20ms for natural room early reflections)
    this.preDelayNode = ctx.createDelay(0.1);
    this.preDelayNode.delayTime.setValueAtTime(0.02, ctx.currentTime);

    // 2. Convolver node with synthetic studio hall impulse response
    this.convolver = ctx.createConvolver();
    this.convolver.normalize = true;
    this.convolver.buffer = this.generateImpulseResponse(this.decayVal);

    // 3. High-frequency damping filter
    this.dampFilter = ctx.createBiquadFilter();
    this.dampFilter.type = 'lowpass';
    this.dampFilter.frequency.setValueAtTime(this.dampVal, ctx.currentTime);

    // 4. Mix
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(this.mixVal, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(1.0 - this.mixVal * 0.25, ctx.currentTime);

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

    // Bypass Dry
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    // Wet Path:
    // inputNode -> dryGain ─┐
    // inputNode -> preDelay -> convolver -> dampFilter -> wetGain ─┴─> levelGain -> bypassWet -> outputNode
    this.inputNode.connect(this.dryGain);
    this.inputNode.connect(this.preDelayNode);
    this.preDelayNode.connect(this.convolver);
    this.convolver.connect(this.dampFilter);
    this.dampFilter.connect(this.wetGain);

    this.dryGain.connect(this.levelGain);
    this.wetGain.connect(this.levelGain);

    this.levelGain.connect(this.bypassWet);
    this.bypassWet.connect(this.outputNode);
  }

  /**
   * Generates a stereo diffuse impulse response with exponential decay envelope
   */
  private generateImpulseResponse(decaySeconds: number): AudioBuffer {
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * Math.max(0.4, Math.min(decaySeconds, 6.0)));
    const buffer = this.ctx.createBuffer(2, length, rate);

    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    // Tail decay exponent
    const decayPower = 3.5;

    for (let i = 0; i < length; i++) {
      const progress = i / length;
      const envelope = Math.pow(1 - progress, decayPower);

      // Stereo decorrelation
      left[i] = (Math.random() * 2 - 1) * envelope;
      right[i] = (Math.random() * 2 - 1) * envelope;
    }

    return buffer;
  }

  public updateParameter(paramId: string, value: number): void {
    const now = this.ctx.currentTime;
    if (paramId === 'decay') {
      this.decayVal = value;
      this.convolver.buffer = this.generateImpulseResponse(value);
    } else if (paramId === 'damp') {
      this.dampVal = value;
      this.dampFilter.frequency.setTargetAtTime(value, now, 0.015);
    } else if (paramId === 'mix') {
      this.mixVal = value;
      this.wetGain.gain.setTargetAtTime(value, now, 0.015);
      this.dryGain.gain.setTargetAtTime(1.0 - value * 0.25, now, 0.015);
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
      this.preDelayNode.disconnect();
      this.convolver.disconnect();
      this.dampFilter.disconnect();
      this.wetGain.disconnect();
      this.dryGain.disconnect();
      this.levelGain.disconnect();
      this.bypassWet.disconnect();
      this.bypassDry.disconnect();
    } catch (e) {
      console.warn('ReverbPedalNode dispose error', e);
    }
  }
}
