import type { AudioPedalNode } from '../../types/pedal';
import { generateCabinetImpulseResponse } from '../../dsp/amp/tubeCurves';

const activeCabs = new Map<string, CabPedalNode>();

export function getActiveCab(id?: string): CabPedalNode | undefined {
  if (id) return activeCabs.get(id);
  const first = activeCabs.values().next();
  return first.done ? undefined : first.value;
}

export class CabPedalNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private convolver: ConvolverNode;
  private levelGain: GainNode;

  // Bypass crossfaders
  private bypassWet: GainNode;
  private bypassDry: GainNode;

  private isEnabled = true;
  private modelVal = 0;   // 0 = 4x12 V30, 1 = 2x12 US, 2 = 1x12 Tweed, 3 = Custom IR
  private micVal = 0.3;   // 0.0 (center) to 1.0 (edge)
  private levelVal = 0;   // dB

  private customBuffer: AudioBuffer | null = null;
  public customIrName = '';

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.model !== undefined) this.modelVal = initialParams.model;
    if (initialParams?.mic !== undefined) this.micVal = initialParams.mic;
    if (initialParams?.level !== undefined) this.levelVal = initialParams.level;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Convolver with Cabinet Impulse Response
    this.convolver = ctx.createConvolver();
    this.convolver.normalize = true;
    this.updateCabinetBuffer();

    // 2. Output level
    this.levelGain = ctx.createGain();
    const linearLevel = Math.pow(10, this.levelVal / 20);
    this.levelGain.gain.setValueAtTime(linearLevel, ctx.currentTime);

    // 3. True bypass crossfaders
    this.bypassWet = ctx.createGain();
    this.bypassDry = ctx.createGain();
    const wetTarget = this.isEnabled ? 1 : 0;
    const dryTarget = this.isEnabled ? 0 : 1;
    this.bypassWet.gain.setValueAtTime(wetTarget, ctx.currentTime);
    this.bypassDry.gain.setValueAtTime(dryTarget, ctx.currentTime);

    // Bypass dry
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    // Wet: inputNode -> convolver -> levelGain -> bypassWet -> outputNode
    this.inputNode.connect(this.convolver);
    this.convolver.connect(this.levelGain);
    this.levelGain.connect(this.bypassWet);
    this.bypassWet.connect(this.outputNode);

    activeCabs.set(this.id, this);
  }

  private updateCabinetBuffer(): void {
    if (this.modelVal === 3 && this.customBuffer) {
      this.convolver.buffer = this.customBuffer;
    } else {
      this.convolver.buffer = generateCabinetImpulseResponse(this.ctx, this.modelVal, this.micVal);
    }
  }

  public setCustomIR(buffer: AudioBuffer, name: string): void {
    this.customBuffer = buffer;
    this.customIrName = name;
    this.modelVal = 3;
    this.updateCabinetBuffer();
  }

  public updateParameter(paramId: string, value: number): void {
    if (paramId === 'model') {
      this.modelVal = Math.round(value);
      this.updateCabinetBuffer();
    } else if (paramId === 'mic') {
      this.micVal = value;
      this.updateCabinetBuffer();
    } else if (paramId === 'level') {
      this.levelVal = value;
      const linear = Math.pow(10, value / 20);
      this.levelGain.gain.setTargetAtTime(linear, this.ctx.currentTime, 0.015);
    }
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    const now = this.ctx.currentTime;
    this.bypassWet.gain.setTargetAtTime(enabled ? 1 : 0, now, 0.015);
    this.bypassDry.gain.setTargetAtTime(enabled ? 0 : 1, now, 0.015);
  }

  public dispose(): void {
    activeCabs.delete(this.id);
    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.convolver.disconnect();
      this.levelGain.disconnect();
      this.bypassWet.disconnect();
      this.bypassDry.disconnect();
    } catch (e) {
      console.warn('CabPedalNode dispose error', e);
    }
  }
}
