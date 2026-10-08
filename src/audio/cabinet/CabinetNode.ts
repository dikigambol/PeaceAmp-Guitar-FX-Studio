import type { CabinetSettings } from '../../types/cabinet';
import { generateCabinetImpulseResponse } from '../../dsp/amp/cabinetIRGenerator';

export class CabinetNode {
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private convolver: ConvolverNode;

  // Wet / Dry blend
  private dryGain: GainNode;
  private wetGain: GainNode;
  private levelGain: GainNode;

  // Bypass crossfaders
  private bypassDry: GainNode;
  private bypassWet: GainNode;

  private settings: CabinetSettings = {
    enabled: true,
    model: '4x12-closed',
    mic: 'sm57',
    position: 0.5,
    mix: 1.0, // 100% WET by default (authentic guitar cabinet simulator standard)
    level: 0,
  };

  private customBuffer: AudioBuffer | null = null;
  public customIrName = '';

  constructor(ctx: AudioContext, initialSettings?: Partial<CabinetSettings>) {
    this.ctx = ctx;

    if (initialSettings) {
      this.settings = { ...this.settings, ...initialSettings };
    }

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    this.convolver = ctx.createConvolver();
    this.convolver.normalize = false;

    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.levelGain = ctx.createGain();

    this.bypassDry = ctx.createGain();
    this.bypassWet = ctx.createGain();

    // Wiring graph:
    // inputNode
    //   ├─> bypassDry ──> outputNode (when bypassed)
    //   └─> bypassWet ──> [active processing]
    //         ├─> dryGain ────────────────────────┐
    //         └─> convolver ──> wetGain ──────────┴─> levelGain ──> outputNode
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    this.inputNode.connect(this.bypassWet);
    this.bypassWet.connect(this.dryGain);
    this.bypassWet.connect(this.convolver);

    this.dryGain.connect(this.levelGain);
    this.convolver.connect(this.wetGain);
    this.wetGain.connect(this.levelGain);

    this.levelGain.connect(this.outputNode);

    // Initial setup
    this.applyMixAndLevel();
    this.applyBypassState();
    this.updateImpulseResponse();
  }

  /**
   * Recreates and hot-swaps the ConvolverNode with the newly generated IR buffer.
   * In Chromium and WebKit Web Audio engines, reusing an existing ConvolverNode with
   * buffer re-assignment can be silently ignored or cause glitch states. Re-instantiating
   * guarantees instant, seamless, reliable IR switching on every knob/dropdown tweak.
   */
  private updateImpulseResponse(): void {
    let buffer: AudioBuffer;

    if (this.settings.model === 'custom' && this.customBuffer) {
      buffer = this.customBuffer;
    } else {
      buffer = generateCabinetImpulseResponse(
        this.ctx,
        this.settings.model,
        this.settings.mic,
        this.settings.position
      );
    }

    // Create a fresh ConvolverNode
    const newConvolver = this.ctx.createConvolver();
    newConvolver.normalize = false;
    newConvolver.buffer = buffer;

    // Connect new convolver to the audio graph
    this.bypassWet.connect(newConvolver);
    newConvolver.connect(this.wetGain);

    // Disconnect and retire the old convolver cleanly
    const oldConvolver = this.convolver;
    try {
      this.bypassWet.disconnect(oldConvolver);
      oldConvolver.disconnect();
    } catch {
      // Ignore disconnect errors during hot-swap
    }

    this.convolver = newConvolver;
  }

  private applyMixAndLevel(): void {
    const now = this.ctx.currentTime;
    const mix = Math.max(0, Math.min(1, this.settings.mix));

    // Equal-power crossfade between raw direct amp output (Dry) and mic'd cabinet IR (Wet)
    const dryAmt = Math.cos(mix * 0.5 * Math.PI);
    const wetAmt = Math.sin(mix * 0.5 * Math.PI);

    this.dryGain.gain.setTargetAtTime(dryAmt, now, 0.015);
    this.wetGain.gain.setTargetAtTime(wetAmt, now, 0.015);

    const linearLevel = Math.pow(10, (this.settings.level || 0) / 20);
    this.levelGain.gain.setTargetAtTime(linearLevel, now, 0.015);
  }

  private applyBypassState(): void {
    const now = this.ctx.currentTime;
    const wetTarget = this.settings.enabled ? 1 : 0;
    const dryTarget = this.settings.enabled ? 0 : 1;

    this.bypassWet.gain.setTargetAtTime(wetTarget, now, 0.015);
    this.bypassDry.gain.setTargetAtTime(dryTarget, now, 0.015);
  }

  public updateSettings(newSettings: Partial<CabinetSettings>): void {
    const prevModel = this.settings.model;
    const prevMic = this.settings.mic;
    const prevPos = this.settings.position;
    const prevMix = this.settings.mix;
    const prevLevel = this.settings.level;
    const prevEnabled = this.settings.enabled;

    this.settings = { ...this.settings, ...newSettings };

    if (newSettings.enabled !== undefined && newSettings.enabled !== prevEnabled) {
      this.applyBypassState();
    }

    if (
      (newSettings.mix !== undefined && newSettings.mix !== prevMix) ||
      (newSettings.level !== undefined && newSettings.level !== prevLevel)
    ) {
      this.applyMixAndLevel();
    }

    if (
      (newSettings.model !== undefined && newSettings.model !== prevModel) ||
      (newSettings.mic !== undefined && newSettings.mic !== prevMic) ||
      (newSettings.position !== undefined && newSettings.position !== prevPos)
    ) {
      this.updateImpulseResponse();
    }
  }

  public setCustomIR(buffer: AudioBuffer, name: string): void {
    this.customBuffer = buffer;
    this.customIrName = name;
    this.settings.model = 'custom';
    this.settings.customIrName = name;
    this.updateImpulseResponse();
  }

  public setEnabled(enabled: boolean): void {
    this.settings.enabled = enabled;
    this.applyBypassState();
  }

  public getSettings(): CabinetSettings {
    return { ...this.settings, customIrName: this.customIrName };
  }

  public dispose(): void {
    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.convolver.disconnect();
      this.dryGain.disconnect();
      this.wetGain.disconnect();
      this.bypassDry.disconnect();
      this.bypassWet.disconnect();
      this.levelGain.disconnect();
    } catch (e) {
      console.warn('CabinetNode dispose error', e);
    }
  }
}
