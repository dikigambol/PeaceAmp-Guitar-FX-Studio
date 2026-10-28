import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';
import { ReverbEngine } from './ReverbEngine';

/**
 * TC Electronic Drip Spring Reverb Node
 *
 * Controls:
 * - dwell: 0 - 10 (Spring transducer drive; drives the coils harder for thicker splash & drip)
 * - mix: 0 - 10 (Wet reverb blend level)
 * - tone: 0 - 10 (HF brightness bite vs dark vintage spring warmth)
 */
export class TcDripSpringReverbNode implements AudioPedalNode {
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
    dwell: 5.0,
    mix: 5.0,
    tone: 5.0,
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
    // Pure transparent analog dry guitar
    this.dryDirectGain = ctx.createGain();
    this.dryDirectGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.inputNode.connect(this.dryDirectGain);

    // Reverb wet branch
    this.wetPreGain = ctx.createGain();
    this.wetPreGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.inputNode.connect(this.wetPreGain);

    this.reverbTank = new ReverbEngine(ctx);
    this.reverbTank.setMode('spring');
    this.wetPreGain.connect(this.reverbTank.inputNode);

    this.wetLevelGain = ctx.createGain();
    this.reverbTank.outputNode.connect(this.wetLevelGain);

    // Active mixer combines direct dry + wet spring reverb
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
      case 'dwell': {
        // Dwell drives the virtual spring coils harder
        this.reverbTank.setSpringDwell(value);
        // Also tracks decay time between 1.2s and 3.4s
        const decaySec = 1.2 + (Math.max(0, Math.min(10, value)) / 10) * 2.2;
        this.reverbTank.setDecayTime(decaySec);
        break;
      }
      case 'mix': {
        // Mix: 0 = silent wet, 5 = noon balance (1.0), 10 = drenched surf drip (+4 dB)
        const m = Math.max(0, Math.min(10, value));
        const gain = m <= 5 ? m / 5 : 1.0 + (m - 5) * 0.22;
        this.wetLevelGain.gain.setTargetAtTime(gain, now, 0.02);
        break;
      }
      case 'tone': {
        this.reverbTank.setTone(value);
        break;
      }
    }
  }

  private applyAllParams(): void {
    const now = this.ctx.currentTime;
    const m = Math.max(0, Math.min(10, this.params.mix ?? 5));
    const gain = m <= 5 ? m / 5 : 1.0 + (m - 5) * 0.22;
    this.wetLevelGain.gain.setValueAtTime(gain, now);

    const dwellVal = this.params.dwell ?? 5;
    this.reverbTank.setSpringDwell(dwellVal);
    const decaySec = 1.2 + (Math.max(0, Math.min(10, dwellVal)) / 10) * 2.2;
    this.reverbTank.setDecayTime(decaySec);

    this.reverbTank.setTone(this.params.tone ?? 5);
    this.reverbTank.setMode('spring');
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
