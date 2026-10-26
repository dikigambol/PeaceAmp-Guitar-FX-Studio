import type { CabinetSettings } from '../../types/cabinet';
import { generateCabinetImpulseResponse } from '../../dsp/amp/cabinetIRGenerator';

/** Mapping (cabinet, mic) -> filename in public/sample-irs/ */
const REAL_IR_MAP: Record<string, string> = {
  // Key format: "cabinetModel_micModel"
  '2x12-fender_ribbon': 'Fender_Twin_2x12_Ribbon_Warm.wav',
  '2x12-fender_sm57': 'Fender_Twin_2x12_Ribbon_Warm.wav',
  '1x12-open_sm57': 'Fender_Twin_2x12_Ribbon_Warm.wav',
  '1x12-open_ribbon': 'Fender_Twin_2x12_Ribbon_Warm.wav',

  '4x12-greenback_md421': 'Marshall_1960AX_4x12_Greenback_MD421.wav',
  '4x12-greenback_sm57': 'Marshall_1960AX_4x12_Greenback_MD421.wav',
  '4x12-closed_sm57': 'Mesa_Rectifier_4x12_V30_SM57.wav',
  '4x12-closed_md421': 'Marshall_1960AX_4x12_Greenback_MD421.wav',

  '4x12-recto-os_sm57': 'Mesa_Rectifier_4x12_V30_SM57.wav',
  '4x12-recto-os_md421': 'Mesa_Rectifier_4x12_V30_SM57.wav',

  '2x12-open_sm57': 'Vox_AC30_2x12_Alnico_SM57.wav',
  '2x12-open_md421': 'Vox_AC30_2x12_Alnico_SM57.wav',

  '2x12-jc120_sm7b': 'Roland_JC120_2x12_Studio_SM7.wav',
  '2x12-jc120_sm57': 'Roland_JC120_2x12_Studio_SM7.wav',

  '4x12-orange_sm57': 'Orange_PPC412_V30_SM57.wav',
  '4x12-orange_md421': 'Orange_PPC412_V30_SM57.wav',
};

function irMapKey(cabinet: string, mic: string): string {
  return `${cabinet}_${mic}`;
}

export class CabinetNode {
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private convolver: ConvolverNode;
  private convolverGain: GainNode;

  // Wet / Dry blend & Output Trim Level
  private dryGain: GainNode;
  private wetGain: GainNode;
  private levelGain: GainNode;

  // Bypass crossfaders
  private bypassDry: GainNode;
  private bypassWet: GainNode;

  // IR regeneration is expensive (whole filter chain) and is triggered by
  // position/distance sliders, so debounce it and crossfade the swap.
  private irUpdateTimer: ReturnType<typeof setTimeout> | null = null;
  private retireTimers = new Set<ReturnType<typeof setTimeout>>();
  private disposed = false;

  private settings: CabinetSettings = {
    enabled: true,
    model: '4x12-closed',
    mic: 'sm57',
    position: 0.5,
    distance: 0.15,
    mix: 1.0, // 100% WET by default (authentic guitar cabinet simulator standard)
    level: 0,
  };

  private customBuffer: AudioBuffer | null = null;
  public customIrName = '';

  // Cache for real IR buffers loaded from files
  private realIrCache = new Map<string, AudioBuffer>();

  constructor(ctx: AudioContext, initialSettings?: Partial<CabinetSettings>) {
    this.ctx = ctx;

    if (initialSettings) {
      this.settings = { ...this.settings, ...initialSettings };
    }

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    this.convolver = ctx.createConvolver();
    this.convolver.normalize = false;
    this.convolverGain = ctx.createGain();
    this.convolverGain.gain.setValueAtTime(1, ctx.currentTime);

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
    //         └─> convolver ──> convolverGain ────┴─> levelGain ──> outputNode
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    this.inputNode.connect(this.bypassWet);
    this.bypassWet.connect(this.dryGain);
    this.bypassWet.connect(this.convolver);

    this.dryGain.connect(this.levelGain);
    this.convolver.connect(this.convolverGain);
    this.convolverGain.connect(this.wetGain);
    this.wetGain.connect(this.levelGain);

    this.levelGain.connect(this.outputNode);

    // Initial setup
    this.applyMixAndLevel();
    this.applyBypassState();
    // Load IR asynchronously (real file preferred, synthetic fallback)
    this.loadImpulseResponse();
  }

  /**
   * Loads the impulse response (real WAV file if available, otherwise synthetic).
   * Uses async fetch + decode for real files, with crossfade swap on completion.
   */
  private async loadImpulseResponse(): Promise<void> {
    if (this.disposed) return;

    let buffer: AudioBuffer;

    if (this.settings.model === 'custom' && this.customBuffer) {
      buffer = this.customBuffer;
    } else {
      // Try to load real IR file first
      const key = irMapKey(this.settings.model, this.settings.mic);
      const filename = REAL_IR_MAP[key];

      if (filename && !this.realIrCache.has(key)) {
        try {
          const response = await fetch(`/sample-irs/${filename}`);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const decoded = await this.ctx.decodeAudioData(arrayBuffer);
            this.realIrCache.set(key, decoded);
            buffer = decoded;
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (err) {
          console.warn(`[CabinetNode] Failed to load real IR "${filename}", falling back to synthetic:`, err);
          buffer = generateCabinetImpulseResponse(
            this.ctx,
            this.settings.model,
            this.settings.mic,
            this.settings.position,
            this.settings.distance ?? 0.15
          );
        }
      } else if (filename && this.realIrCache.has(key)) {
        buffer = this.realIrCache.get(key)!;
      } else {
        // No real IR mapped for this cabinet+mic combo -> synthetic
        buffer = generateCabinetImpulseResponse(
          this.ctx,
          this.settings.model,
          this.settings.mic,
          this.settings.position,
          this.settings.distance ?? 0.15
        );
      }
    }

    await this.swapConvolverBuffer(buffer);
  }

  /**
   * Crossfade-swaps the ConvolverNode's buffer (same logic as before, but async-ready).
   */
  private swapConvolverBuffer(buffer: AudioBuffer): void {
    if (this.disposed) return;

    const now = this.ctx.currentTime;
    const newConvolver = this.ctx.createConvolver();
    newConvolver.normalize = false;
    newConvolver.buffer = buffer;

    const newGain = this.ctx.createGain();
    newGain.gain.setValueAtTime(0, now);

    this.bypassWet.connect(newConvolver);
    newConvolver.connect(newGain);
    newGain.connect(this.wetGain);

    const oldConvolver = this.convolver;
    const oldGain = this.convolverGain;

    newGain.gain.linearRampToValueAtTime(1, now + 0.02);
    oldGain.gain.cancelScheduledValues(now);
    oldGain.gain.setValueAtTime(oldGain.gain.value, now);
    oldGain.gain.linearRampToValueAtTime(0, now + 0.02);

    this.convolver = newConvolver;
    this.convolverGain = newGain;

    // Retire the previous graph once the crossfade has finished.
    const retire = setTimeout(() => {
      this.retireTimers.delete(retire);
      try {
        this.bypassWet.disconnect(oldConvolver);
      } catch {
        // Already disconnected.
      }
      try {
        oldConvolver.disconnect();
        oldGain.disconnect();
      } catch {
        // Already disconnected.
      }
    }, 60);
    this.retireTimers.add(retire);
  }

  /**
   * Rebuilds the impulse response in a fresh ConvolverNode and crossfades it.
   * Kept for synchronous synthetic-only updates (position/distance sliders).
   */
  private updateImpulseResponse(): void {
    if (this.disposed) return;

    // Only synthetic path uses position/distance; real IRs are fixed captures.
    // If a real IR is mapped for current model+mic, we don't rebuild on pos/dist changes.
    const key = irMapKey(this.settings.model, this.settings.mic);
    const hasRealIr = REAL_IR_MAP[key] !== undefined;

    if (hasRealIr) {
      // Real IR loaded once in loadImpulseResponse(); position/distance are baked into the capture.
      // Could optionally apply a gentle tone shift here, but skip full rebuild to avoid clicks.
      return;
    }

    // Synthetic fallback: rebuild with current position/distance
    const buffer = generateCabinetImpulseResponse(
      this.ctx,
      this.settings.model,
      this.settings.mic,
      this.settings.position,
      this.settings.distance ?? 0.15
    );
    this.swapConvolverBuffer(buffer);
  }

  /**
   * Sliders fire on every pointer move; rebuilding the IR (and a ConvolverNode)
   * on each event caused audible churn. Coalesce them into one rebuild.
   */
  private scheduleImpulseResponseUpdate(): void {
    if (this.irUpdateTimer !== null) clearTimeout(this.irUpdateTimer);
    this.irUpdateTimer = setTimeout(() => {
      this.irUpdateTimer = null;
      this.updateImpulseResponse();
    }, 90);
  }

  private cancelScheduledImpulseUpdate(): void {
    if (this.irUpdateTimer !== null) {
      clearTimeout(this.irUpdateTimer);
      this.irUpdateTimer = null;
    }
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
    const prevDist = this.settings.distance;
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

    const modelChanged = newSettings.model !== undefined && newSettings.model !== prevModel;
    const micChanged = newSettings.mic !== undefined && newSettings.mic !== prevMic;
    const posChanged = newSettings.position !== undefined && newSettings.position !== prevPos;
    const distChanged = newSettings.distance !== undefined && newSettings.distance !== prevDist;

    if (modelChanged || micChanged) {
      // Model or mic change -> may need different real IR file (async load)
      this.cancelScheduledImpulseUpdate();
      this.loadImpulseResponse();
    } else if (posChanged || distChanged) {
      // Position/distance only affect synthetic IRs (real IRs are fixed captures)
      this.scheduleImpulseResponseUpdate();
    }
  }

  public setCustomIR(buffer: AudioBuffer, name: string): void {
    this.customBuffer = buffer;
    this.customIrName = name;
    this.settings.model = 'custom';
    this.settings.customIrName = name;
    // A user upload should take effect immediately, not after the slider debounce.
    this.cancelScheduledImpulseUpdate();
    this.swapConvolverBuffer(buffer);
  }

  /**
   * Helper to decode an uploaded .wav / .aiff audio file directly into AudioBuffer
   */
  public async loadCustomIRFromFile(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const decodedBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.setCustomIR(decodedBuffer, file.name);
    return file.name;
  }

  public setEnabled(enabled: boolean): void {
    this.settings.enabled = enabled;
    this.applyBypassState();
  }

  public getSettings(): CabinetSettings {
    return { ...this.settings, customIrName: this.customIrName };
  }

  public getAudioContext(): AudioContext {
    return this.ctx;
  }

  public dispose(): void {
    this.disposed = true;
    this.cancelScheduledImpulseUpdate();
    for (const timer of this.retireTimers) clearTimeout(timer);
    this.retireTimers.clear();
    this.realIrCache.clear();

    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.convolver.disconnect();
      this.convolverGain.disconnect();
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
