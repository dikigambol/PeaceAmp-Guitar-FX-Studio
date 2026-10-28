import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';
import { ReverbEngine, type ReverbMode } from './ReverbEngine';

export const HOLY_GRAIL_MODES: ReverbMode[] = [
  'spring',
  'hall',
  'flerb',
];

/**
 * EHX Holy Grail Nano Reverb Node
 *
 * Controls:
 * - reverb: 0 - 10 (Master wet/dry blend knob)
 * - mode: 0 - 2 (0=Spring, 1=Hall, 2=Flerb)
 */
export class EhxHolyGrailNode implements AudioPedalNode {
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
    reverb: 4.5,
    mode: 0, // Default: Spring
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
    // Dry guitar path in active mode
    this.dryDirectGain = ctx.createGain();
    this.dryDirectGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.inputNode.connect(this.dryDirectGain);

    // Wet reverb branch
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

    this.applyAllParams();
  }

  public updateParameter(paramId: string, value: number): void {
    this.params[paramId] = value;
    const now = this.ctx.currentTime;

    switch (paramId) {
      case 'reverb': {
        // Authentic Holy Grail Reverb Blend & Decay Tracking:
        // Single knob smoothly expands wet level and lengthens tail:
        // 0 = Dry only
        // 4.5 = Legendary Holy Grail sweet spot (100% dry + warm lush bloom)
        // 10 = Fully drenched ambient surf wash
        const r = Math.max(0, Math.min(10, value)) / 10;
        const dryGain = r > 0.75 ? 1.0 - (r - 0.75) * 1.6 : 1.0;
        const wetGain = Math.min(1.4, r * 1.3);

        this.dryDirectGain.gain.setTargetAtTime(Math.max(0.2, dryGain), now, 0.02);
        this.wetLevelGain.gain.setTargetAtTime(wetGain, now, 0.02);

        // Track decay time: 0.6s at min up to 5.8s at max
        const decaySec = 0.6 + Math.pow(r, 1.3) * 5.2;
        this.reverbTank.setDecayTime(decaySec);
        break;
      }
      case 'mode': {
        const modeIdx = Math.max(0, Math.min(2, Math.round(value)));
        const selectedMode = HOLY_GRAIL_MODES[modeIdx] || 'spring';
        this.reverbTank.setMode(selectedMode);
        break;
      }
    }
  }

  private applyAllParams(): void {
    const now = this.ctx.currentTime;
    const r = Math.max(0, Math.min(10, this.params.reverb ?? 4.5)) / 10;
    const dryGain = r > 0.75 ? 1.0 - (r - 0.75) * 1.6 : 1.0;
    const wetGain = Math.min(1.4, r * 1.3);

    this.dryDirectGain.gain.setValueAtTime(Math.max(0.2, dryGain), now);
    this.wetLevelGain.gain.setValueAtTime(wetGain, now);

    const decaySec = 0.6 + Math.pow(r, 1.3) * 5.2;
    this.reverbTank.setDecayTime(decaySec);

    const modeIdx = Math.max(0, Math.min(2, Math.round(this.params.mode ?? 0)));
    this.reverbTank.setMode(HOLY_GRAIL_MODES[modeIdx] || 'spring');
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
      // Ignore disconnect errors
    }
  }
}
