import type { AudioPedalNode } from '../../types/pedal';

export class PhaserPedalNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private allpassFilters: BiquadFilterNode[] = [];
  private feedbackGain: GainNode;
  private lfo: OscillatorNode;
  private lfoDepthGain: GainNode;
  private wetGain: GainNode;
  private dryGain: GainNode;
  private levelGain: GainNode;

  // Bypass crossfaders
  private bypassWet: GainNode;
  private bypassDry: GainNode;

  private isEnabled = true;
  private speedVal = 0.8;     // Hz
  private depthVal = 700;     // Frequency swing in Hz
  private feedbackVal = 0.3;  // 0 to 0.7
  private levelVal = 0;       // dB

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.speed !== undefined) this.speedVal = initialParams.speed;
    if (initialParams?.depth !== undefined) this.depthVal = initialParams.depth;
    if (initialParams?.feedback !== undefined) this.feedbackVal = initialParams.feedback;
    if (initialParams?.level !== undefined) this.levelVal = initialParams.level;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Create 4 allpass filter stages
    const baseFreq = 1000;
    for (let i = 0; i < 4; i++) {
      const ap = ctx.createBiquadFilter();
      ap.type = 'allpass';
      ap.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      this.allpassFilters.push(ap);
    }

    // Chain the 4 allpass filters
    for (let i = 0; i < 3; i++) {
      this.allpassFilters[i].connect(this.allpassFilters[i + 1]);
    }

    // 2. Feedback loop (from 4th stage back into 1st stage)
    this.feedbackGain = ctx.createGain();
    this.feedbackGain.gain.setValueAtTime(this.feedbackVal, ctx.currentTime);
    this.allpassFilters[3].connect(this.feedbackGain);
    this.feedbackGain.connect(this.allpassFilters[0]);

    // 3. LFO to modulate filter frequencies
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.setValueAtTime(this.speedVal, ctx.currentTime);

    this.lfoDepthGain = ctx.createGain();
    this.lfoDepthGain.gain.setValueAtTime(this.depthVal, ctx.currentTime);
    this.lfo.connect(this.lfoDepthGain);

    // Connect LFO modulation to all 4 allpass filter frequencies
    for (const ap of this.allpassFilters) {
      this.lfoDepthGain.connect(ap.frequency);
    }
    this.lfo.start();

    // 4. Mix stages: Phase effect requires mixing dry and phase-shifted wet
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

    // Dry passthrough for bypass
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    // Wet signal routing
    this.inputNode.connect(this.dryGain);
    this.inputNode.connect(this.allpassFilters[0]);
    this.allpassFilters[3].connect(this.wetGain);

    this.dryGain.connect(this.levelGain);
    this.wetGain.connect(this.levelGain);

    this.levelGain.connect(this.bypassWet);
    this.bypassWet.connect(this.outputNode);
  }

  public updateParameter(paramId: string, value: number): void {
    const now = this.ctx.currentTime;
    if (paramId === 'speed') {
      this.speedVal = value;
      this.lfo.frequency.setTargetAtTime(value, now, 0.015);
    } else if (paramId === 'depth') {
      this.depthVal = value;
      this.lfoDepthGain.gain.setTargetAtTime(value, now, 0.015);
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
      this.lfoDepthGain.disconnect();
      this.feedbackGain.disconnect();
      for (const ap of this.allpassFilters) {
        ap.disconnect();
      }
      this.wetGain.disconnect();
      this.dryGain.disconnect();
      this.levelGain.disconnect();
      this.bypassWet.disconnect();
      this.bypassDry.disconnect();
      this.inputNode.disconnect();
      this.outputNode.disconnect();
    } catch (e) {
      console.warn('PhaserPedalNode dispose error', e);
    }
  }
}
