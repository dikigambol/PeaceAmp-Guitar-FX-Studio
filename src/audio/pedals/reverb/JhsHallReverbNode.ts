import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';
import { ReverbEngine } from './ReverbEngine';

/**
 * JHS 3 Series Hall Reverb Node
 *
 * Controls:
 * - verb: 0 - 10 (Master reverb wet mix / blend)
 * - dampen: 0 - 10 (High-frequency damping / absorption; clockwise = darker & warmer)
 * - decay: 0 - 10 (Hall decay time RT60, 0.5s - 5.5s)
 * - modulate: 0 or 1 (Modulation toggle switch; introduces sweeping chorus into the hall tail)
 */
export class JhsHallReverbNode implements AudioPedalNode {
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
    verb: 5.0,
    dampen: 5.0,
    decay: 5.5,
    modulate: 0.0,
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

    // 1. Bypass Crossfade Paths
    this.bypassDry = ctx.createGain();
    this.bypassWet = ctx.createGain();
    this.bypassDry.gain.setValueAtTime(enabled ? 0 : 1, ctx.currentTime);
    this.bypassWet.gain.setValueAtTime(enabled ? 1 : 0, ctx.currentTime);

    // Clean dry passthrough when pedal is OFF (Bypassed)
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    // 2. Active Effect Path
    // Pure transparent analog dry-through
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
    // Guarantees 100% zero wet leakage / zero hum when pedal is OFF
    this.dcBlocker = createDcBlocker(ctx, 20);
    this.activeMixer.connect(this.bypassWet);
    this.bypassWet.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputNode);

    this.applyAllParams();
  }

  public updateParameter(paramId: string, value: number): void {
    this.params[paramId] = value;
    const now = this.ctx.currentTime;

    switch (paramId) {
      case 'verb': {
        // Verb blend: 0 = completely dry, 5 = noon unity balance (1.0), 10 = +3 dB ambient immersion
        const v = Math.max(0, Math.min(10, value));
        const gain = v <= 5 ? v / 5 : 1.0 + (v - 5) * 0.18;
        this.wetLevelGain.gain.setTargetAtTime(gain, now, 0.02);
        break;
      }
      case 'dampen': {
        // Dampen: 0 = minimum damping (brightest, tone = 10), 10 = max damping (darkest, tone = 0.5)
        const d = Math.max(0, Math.min(10, value));
        const toneEquivalent = 10 - d * 0.95;
        this.reverbTank.setTone(toneEquivalent);
        break;
      }
      case 'decay': {
        this.reverbTank.setTime(value);
        break;
      }
      case 'modulate': {
        const isMod = value >= 0.5;
        this.reverbTank.setMode(isMod ? 'modulate' : 'hall');
        break;
      }
    }
  }

  private applyAllParams(): void {
    const now = this.ctx.currentTime;
    const v = Math.max(0, Math.min(10, this.params.verb ?? 5));
    const gain = v <= 5 ? v / 5 : 1.0 + (v - 5) * 0.18;
    this.wetLevelGain.gain.setValueAtTime(gain, now);

    const d = Math.max(0, Math.min(10, this.params.dampen ?? 5));
    const toneEquivalent = 10 - d * 0.95;
    this.reverbTank.setTone(toneEquivalent);

    this.reverbTank.setTime(this.params.decay ?? 5.5);

    const isMod = (this.params.modulate ?? 0) >= 0.5;
    this.reverbTank.setMode(isMod ? 'modulate' : 'hall');
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
