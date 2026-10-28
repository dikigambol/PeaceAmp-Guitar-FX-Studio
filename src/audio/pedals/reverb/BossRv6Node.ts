import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';
import { ReverbEngine, type ReverbMode } from './ReverbEngine';

export const RV6_MODES: ReverbMode[] = [
  'room',
  'hall',
  'plate',
  'spring',
  'modulate',
  'delay',
  'shimmer',
  'dynamic',
];

/**
 * Boss RV-6 Digital Reverb Node
 *
 * Controls:
 * - eLevel: 0 - 10 (Effect level / wet mix)
 * - tone: 0 - 10 (HF damping filter corner frequency)
 * - time: 0 - 10 (Decay time RT60)
 * - mode: 0 - 7 (0=Room, 1=Hall, 2=Plate, 3=Spring, 4=Modulate, 5=+Delay, 6=Shimmer, 7=Dynamic)
 */
export class BossRv6Node implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private enabled: boolean;
  private isDisposed = false;

  private bypassDry: GainNode;
  private bypassWet: GainNode;

  // Active effect path
  private dryDirectGain: GainNode;
  private wetPreGain: GainNode;
  private wetLevelGain: GainNode;
  private activeMixer: GainNode;
  private reverbTank: ReverbEngine;
  private dcBlocker: BiquadFilterNode;

  private params: Record<string, number> = {
    eLevel: 5.0,
    tone: 5.0,
    time: 5.0,
    mode: 1.0, // Default: Hall
  };

  constructor(
    ctx: AudioContext,
    id: string,
    initialParams?: Record<string, number>,
    enabled = true
  ) {
    this.ctx = ctx;
    this.id = id;
    this.enabled = enabled;

    if (initialParams) {
      this.params = { ...this.params, ...initialParams };
    }

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Bypass Crossfade Nodes
    this.bypassDry = ctx.createGain();
    this.bypassWet = ctx.createGain();
    this.bypassDry.gain.setValueAtTime(enabled ? 0 : 1, ctx.currentTime);
    this.bypassWet.gain.setValueAtTime(enabled ? 1 : 0, ctx.currentTime);

    // Clean dry passthrough when pedal is OFF (Bypassed)
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    // 2. Active Effect Path
    // Direct dry guitar (Boss buffered dry-through)
    this.dryDirectGain = ctx.createGain();
    this.dryDirectGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.inputNode.connect(this.dryDirectGain);

    // Reverb wet branch
    this.wetPreGain = ctx.createGain();
    this.wetPreGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.inputNode.connect(this.wetPreGain);

    this.reverbTank = new ReverbEngine(ctx);
    this.wetPreGain.connect(this.reverbTank.inputNode);

    this.wetLevelGain = ctx.createGain();
    this.reverbTank.outputNode.connect(this.wetLevelGain);

    // Active mixer combines direct dry + wet reverb
    this.activeMixer = ctx.createGain();
    this.dryDirectGain.connect(this.activeMixer);
    this.wetLevelGain.connect(this.activeMixer);

    // Active mixer is strictly gated by bypassWet before reaching outputNode
    // This guarantees 100% zero wet leakage / zero hum when pedal is OFF
    this.dcBlocker = createDcBlocker(ctx, 20);
    this.activeMixer.connect(this.bypassWet);
    this.bypassWet.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputNode);

    // Apply initial parameter state
    this.applyAllParams();
  }

  public updateParameter(paramId: string, value: number): void {
    this.params[paramId] = value;
    const now = this.ctx.currentTime;

    switch (paramId) {
      case 'eLevel': {
        // E.Level: 0 = silent wet, 5 = noon unity balance (1.0), 10 = +4 dB boost for ambient immersion
        const lvl = Math.max(0, Math.min(10, value));
        const gain = lvl <= 5 ? lvl / 5 : 1.0 + (lvl - 5) * 0.15;
        this.wetLevelGain.gain.setTargetAtTime(gain, now, 0.02);
        break;
      }
      case 'tone':
        this.reverbTank.setTone(value);
        break;
      case 'time':
        this.reverbTank.setTime(value);
        break;
      case 'mode': {
        const modeIdx = Math.max(0, Math.min(7, Math.round(value)));
        const selectedMode = RV6_MODES[modeIdx] || 'hall';
        this.reverbTank.setMode(selectedMode);
        break;
      }
    }
  }

  private applyAllParams(): void {
    const now = this.ctx.currentTime;
    const lvl = Math.max(0, Math.min(10, this.params.eLevel ?? 5));
    const gain = lvl <= 5 ? lvl / 5 : 1.0 + (lvl - 5) * 0.15;
    this.wetLevelGain.gain.setValueAtTime(gain, now);

    this.reverbTank.setTone(this.params.tone ?? 5);
    this.reverbTank.setTime(this.params.time ?? 5);

    const modeIdx = Math.max(0, Math.min(7, Math.round(this.params.mode ?? 1)));
    this.reverbTank.setMode(RV6_MODES[modeIdx] || 'hall');
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    applyBypassCrossfade(this.bypassWet, this.bypassDry, enabled, this.ctx, 0.015);
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    try {
      this.reverbTank.dispose();
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.bypassDry.disconnect();
      this.bypassWet.disconnect();
      this.dryDirectGain.disconnect();
      this.wetPreGain.disconnect();
      this.wetLevelGain.disconnect();
      this.activeMixer.disconnect();
      this.dcBlocker.disconnect();
    } catch {
      // Safe ignore
    }
  }
}
