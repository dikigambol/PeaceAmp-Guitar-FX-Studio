import type { AudioPedalNode } from '../../types/pedal';
import { makeTubePreampCurve } from '../../dsp/amp/tubeCurves';

export class AmpPedalNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private preGain: GainNode;
  private tubeShaper: WaveShaperNode;

  // 4-Band Interactive Tone Stack
  private bassFilter: BiquadFilterNode;
  private midFilter: BiquadFilterNode;
  private trebleFilter: BiquadFilterNode;
  private presenceFilter: BiquadFilterNode;
  private masterGain: GainNode;

  // Bypass crossfaders
  private bypassWet: GainNode;
  private bypassDry: GainNode;

  private isEnabled = true;
  private gainVal = 8;
  private bassVal = 0;
  private midVal = 2;
  private trebleVal = 1;
  private presenceVal = 2;
  private masterVal = 0;

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.gain !== undefined) this.gainVal = initialParams.gain;
    if (initialParams?.bass !== undefined) this.bassVal = initialParams.bass;
    if (initialParams?.middle !== undefined) this.midVal = initialParams.middle;
    if (initialParams?.treble !== undefined) this.trebleVal = initialParams.treble;
    if (initialParams?.presence !== undefined) this.presenceVal = initialParams.presence;
    if (initialParams?.master !== undefined) this.masterVal = initialParams.master;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Preamp Tube Gain stage
    this.preGain = ctx.createGain();
    this.preGain.gain.setValueAtTime(this.gainVal * 0.4, ctx.currentTime);

    // 2. 12AX7 Triode Tube WaveShaper (4x oversampled)
    this.tubeShaper = ctx.createWaveShaper();
    this.tubeShaper.oversample = '4x';
    this.tubeShaper.curve = makeTubePreampCurve(this.gainVal);

    // 3. Interactive Tone Stack
    // Bass (120 Hz Low Shelf)
    this.bassFilter = ctx.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.setValueAtTime(120, ctx.currentTime);
    this.bassFilter.gain.setValueAtTime(this.bassVal, ctx.currentTime);

    // Mid (650 Hz Peaking)
    this.midFilter = ctx.createBiquadFilter();
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.setValueAtTime(650, ctx.currentTime);
    this.midFilter.Q.setValueAtTime(1.1, ctx.currentTime);
    this.midFilter.gain.setValueAtTime(this.midVal, ctx.currentTime);

    // Treble (2800 Hz High Shelf)
    this.trebleFilter = ctx.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.setValueAtTime(2800, ctx.currentTime);
    this.trebleFilter.gain.setValueAtTime(this.trebleVal, ctx.currentTime);

    // Presence (4500 Hz Peaking)
    this.presenceFilter = ctx.createBiquadFilter();
    this.presenceFilter.type = 'peaking';
    this.presenceFilter.frequency.setValueAtTime(4500, ctx.currentTime);
    this.presenceFilter.Q.setValueAtTime(1.4, ctx.currentTime);
    this.presenceFilter.gain.setValueAtTime(this.presenceVal, ctx.currentTime);

    // 4. Master Volume
    this.masterGain = ctx.createGain();
    const linearLevel = Math.pow(10, this.masterVal / 20);
    this.masterGain.gain.setValueAtTime(linearLevel, ctx.currentTime);

    // 5. Bypass
    this.bypassWet = ctx.createGain();
    this.bypassDry = ctx.createGain();
    const wetTarget = this.isEnabled ? 1 : 0;
    const dryTarget = this.isEnabled ? 0 : 1;
    this.bypassWet.gain.setValueAtTime(wetTarget, ctx.currentTime);
    this.bypassDry.gain.setValueAtTime(dryTarget, ctx.currentTime);

    // Bypass dry
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    // Wet: inputNode -> preGain -> tubeShaper -> bass -> mid -> treble -> presence -> masterGain -> bypassWet -> outputNode
    this.inputNode.connect(this.preGain);
    this.preGain.connect(this.tubeShaper);
    this.tubeShaper.connect(this.bassFilter);
    this.bassFilter.connect(this.midFilter);
    this.midFilter.connect(this.trebleFilter);
    this.trebleFilter.connect(this.presenceFilter);
    this.presenceFilter.connect(this.masterGain);
    this.masterGain.connect(this.bypassWet);
    this.bypassWet.connect(this.outputNode);
  }

  public updateParameter(paramId: string, value: number): void {
    const now = this.ctx.currentTime;
    if (paramId === 'gain') {
      this.gainVal = value;
      this.preGain.gain.setTargetAtTime(value * 0.4, now, 0.015);
      this.tubeShaper.curve = makeTubePreampCurve(value);
    } else if (paramId === 'bass') {
      this.bassVal = value;
      this.bassFilter.gain.setTargetAtTime(value, now, 0.015);
    } else if (paramId === 'middle') {
      this.midVal = value;
      this.midFilter.gain.setTargetAtTime(value, now, 0.015);
    } else if (paramId === 'treble') {
      this.trebleVal = value;
      this.trebleFilter.gain.setTargetAtTime(value, now, 0.015);
    } else if (paramId === 'presence') {
      this.presenceVal = value;
      this.presenceFilter.gain.setTargetAtTime(value, now, 0.015);
    } else if (paramId === 'master') {
      this.masterVal = value;
      const linear = Math.pow(10, value / 20);
      this.masterGain.gain.setTargetAtTime(linear, now, 0.015);
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
      this.preGain.disconnect();
      this.tubeShaper.disconnect();
      this.bassFilter.disconnect();
      this.midFilter.disconnect();
      this.trebleFilter.disconnect();
      this.presenceFilter.disconnect();
      this.masterGain.disconnect();
      this.bypassWet.disconnect();
      this.bypassDry.disconnect();
    } catch (e) {
      console.warn('AmpPedalNode dispose error', e);
    }
  }
}
