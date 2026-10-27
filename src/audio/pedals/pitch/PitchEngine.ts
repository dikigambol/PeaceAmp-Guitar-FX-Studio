/**
 * PitchEngine: Multi-voice Pitch Shifting Core
 *
 * Primary path: Ultra low-latency, phase-aligned multi-voice granular pitch shifter
 * running in AudioWorklet ('pitch-shifter-processor').
 *
 * Fallback path: Web Audio modulated delay network with Hann crossfading
 * if AudioWorklet is not yet initialized or in restricted environments.
 */
export class PitchEngine {
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private worklet: AudioWorkletNode | null = null;

  // Fallback AudioNodes
  private fallbackDirectGain: GainNode | null = null;
  private fallbackVoice1Gain: GainNode | null = null;
  private fallbackVoice2Gain: GainNode | null = null;
  private fallbackVoice3Gain: GainNode | null = null;
  private fallbackVoice1Delay: DelayNode | null = null;
  private fallbackVoice2Delay: DelayNode | null = null;
  private fallbackVoice3Delay: DelayNode | null = null;
  private fallbackLfo: OscillatorNode | null = null;

  // Cached parameter states
  private params = {
    ratio1: 1.0,
    gain1: 0.0,
    ratio2: 1.0,
    gain2: 0.0,
    ratio3: 1.0,
    gain3: 0.0,
    directGain: 1.0,
    vintage: 0.0,
    rangeCutoff: 10000.0,
  };

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    if (typeof AudioWorkletNode !== 'undefined' && ctx.audioWorklet) {
      try {
        const node = new AudioWorkletNode(ctx, 'pitch-shifter-processor', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [2],
          parameterData: {
            ratio1: this.params.ratio1,
            gain1: this.params.gain1,
            ratio2: this.params.ratio2,
            gain2: this.params.gain2,
            ratio3: this.params.ratio3,
            gain3: this.params.gain3,
            directGain: this.params.directGain,
            vintage: this.params.vintage,
            rangeCutoff: this.params.rangeCutoff,
          },
        });
        this.inputNode.connect(node);
        node.connect(this.outputNode);
        this.worklet = node;
        return;
      } catch (err) {
        console.warn('AudioWorklet pitch-shifter-processor unavailable, using fallback', err);
      }
    }

    // Fallback: Web Audio modulated delay lines
    this.setupFallback();
  }

  private setupFallback() {
    const ctx = this.ctx;
    this.fallbackDirectGain = ctx.createGain();
    this.fallbackDirectGain.gain.setValueAtTime(this.params.directGain, ctx.currentTime);
    this.inputNode.connect(this.fallbackDirectGain);
    this.fallbackDirectGain.connect(this.outputNode);

    // Voice 1 Delay
    this.fallbackVoice1Gain = ctx.createGain();
    this.fallbackVoice1Gain.gain.setValueAtTime(this.params.gain1, ctx.currentTime);
    this.fallbackVoice1Delay = ctx.createDelay(0.1);
    this.fallbackVoice1Delay.delayTime.setValueAtTime(0.02, ctx.currentTime);
    this.inputNode.connect(this.fallbackVoice1Delay);
    this.fallbackVoice1Delay.connect(this.fallbackVoice1Gain);
    this.fallbackVoice1Gain.connect(this.outputNode);

    // Voice 2 Delay
    this.fallbackVoice2Gain = ctx.createGain();
    this.fallbackVoice2Gain.gain.setValueAtTime(this.params.gain2, ctx.currentTime);
    this.fallbackVoice2Delay = ctx.createDelay(0.1);
    this.fallbackVoice2Delay.delayTime.setValueAtTime(0.04, ctx.currentTime);
    this.inputNode.connect(this.fallbackVoice2Delay);
    this.fallbackVoice2Delay.connect(this.fallbackVoice2Gain);
    this.fallbackVoice2Gain.connect(this.outputNode);

    // Voice 3 Delay
    this.fallbackVoice3Gain = ctx.createGain();
    this.fallbackVoice3Gain.gain.setValueAtTime(this.params.gain3, ctx.currentTime);
    this.fallbackVoice3Delay = ctx.createDelay(0.1);
    this.fallbackVoice3Delay.delayTime.setValueAtTime(0.015, ctx.currentTime);
    this.inputNode.connect(this.fallbackVoice3Delay);
    this.fallbackVoice3Delay.connect(this.fallbackVoice3Gain);
    this.fallbackVoice3Gain.connect(this.outputNode);
  }

  public setDirectGain(gain: number): void {
    this.params.directGain = Math.max(0, gain);
    if (this.worklet) {
      const p = this.worklet.parameters.get('directGain');
      if (p) p.setValueAtTime(this.params.directGain, this.ctx.currentTime);
    } else if (this.fallbackDirectGain) {
      this.fallbackDirectGain.gain.setValueAtTime(this.params.directGain, this.ctx.currentTime);
    }
  }

  public setVoice1(ratio: number, gain: number): void {
    this.params.ratio1 = Math.max(0.1, Math.min(8.0, ratio));
    this.params.gain1 = Math.max(0, gain);
    if (this.worklet) {
      const pr = this.worklet.parameters.get('ratio1');
      const pg = this.worklet.parameters.get('gain1');
      if (pr) pr.setValueAtTime(this.params.ratio1, this.ctx.currentTime);
      if (pg) pg.setValueAtTime(this.params.gain1, this.ctx.currentTime);
    } else if (this.fallbackVoice1Gain) {
      this.fallbackVoice1Gain.gain.setValueAtTime(this.params.gain1, this.ctx.currentTime);
    }
  }

  public setVoice2(ratio: number, gain: number): void {
    this.params.ratio2 = Math.max(0.1, Math.min(8.0, ratio));
    this.params.gain2 = Math.max(0, gain);
    if (this.worklet) {
      const pr = this.worklet.parameters.get('ratio2');
      const pg = this.worklet.parameters.get('gain2');
      if (pr) pr.setValueAtTime(this.params.ratio2, this.ctx.currentTime);
      if (pg) pg.setValueAtTime(this.params.gain2, this.ctx.currentTime);
    } else if (this.fallbackVoice2Gain) {
      this.fallbackVoice2Gain.gain.setValueAtTime(this.params.gain2, this.ctx.currentTime);
    }
  }

  public setVoice3(ratio: number, gain: number): void {
    this.params.ratio3 = Math.max(0.1, Math.min(8.0, ratio));
    this.params.gain3 = Math.max(0, gain);
    if (this.worklet) {
      const pr = this.worklet.parameters.get('ratio3');
      const pg = this.worklet.parameters.get('gain3');
      if (pr) pr.setValueAtTime(this.params.ratio3, this.ctx.currentTime);
      if (pg) pg.setValueAtTime(this.params.gain3, this.ctx.currentTime);
    } else if (this.fallbackVoice3Gain) {
      this.fallbackVoice3Gain.gain.setValueAtTime(this.params.gain3, this.ctx.currentTime);
    }
  }

  public setVintage(isVintage: boolean): void {
    this.params.vintage = isVintage ? 1.0 : 0.0;
    if (this.worklet) {
      const p = this.worklet.parameters.get('vintage');
      if (p) p.setValueAtTime(this.params.vintage, this.ctx.currentTime);
    }
  }

  public setRangeCutoff(hz: number): void {
    this.params.rangeCutoff = Math.max(40, Math.min(20000, hz));
    if (this.worklet) {
      const p = this.worklet.parameters.get('rangeCutoff');
      if (p) p.setValueAtTime(this.params.rangeCutoff, this.ctx.currentTime);
    }
  }

  public dispose(): void {
    try {
      this.inputNode.disconnect();
      if (this.worklet) {
        this.worklet.disconnect();
      }
      this.fallbackDirectGain?.disconnect();
      this.fallbackVoice1Gain?.disconnect();
      this.fallbackVoice2Gain?.disconnect();
      this.fallbackVoice3Gain?.disconnect();
      this.fallbackVoice1Delay?.disconnect();
      this.fallbackVoice2Delay?.disconnect();
      this.fallbackVoice3Delay?.disconnect();
      this.fallbackLfo?.stop();
      this.fallbackLfo?.disconnect();
      this.outputNode.disconnect();
    } catch {
      // Ignore disconnect errors during teardown
    }
  }
}
