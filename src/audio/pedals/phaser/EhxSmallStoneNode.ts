import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';
import { PhaserEngine } from './PhaserEngine';

/**
 * ELECTRO-HARMONIX SMALL STONE (NANO / EH4800)
 *
 * 4-stage OTA phase shifter:
 * - 4 first-order all-pass stages (4 poles, 2 moving notches with dry),
 *   processed sample-accurately in an AudioWorklet with a per-sample LFO.
 * - COLOR switch adds feedback resonance (0 -> 0.62) and widens the sweep.
 * - RATE: ~0.08 Hz to ~6.5 Hz.
 */
export class EhxSmallStoneNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private enabled: boolean;

  // Bypass crossfade
  private bypassDry: GainNode;
  private bypassWet: GainNode;

  // Input buffer & sub-bass cleanup
  private preHighpass: BiquadFilterNode;
  private warmBodyFilter: BiquadFilterNode;

  // 4-pole phase-shift core (worklet, or 2-biquad native fallback)
  private engine: PhaserEngine;

  // Wet / Dry Mixer
  private dryGain: GainNode;
  private wetGain: GainNode;
  private mixer: GainNode;
  private levelComp: GainNode;
  private dcBlocker: BiquadFilterNode;

  private isDisposed = false;

  private params: Record<string, number> = {
    rate: 3.5,  // 0 to 10 (LFO speed)
    color: 0.0, // 0: Normal / Warm, 1: Deep Color resonance
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

    this.bypassDry = ctx.createGain();
    this.bypassWet = ctx.createGain();

    // 1. Dry bypass signal path
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    // 2. Wet path input
    this.inputNode.connect(this.bypassWet);

    // 3. Sub-bass cleanup HPF (30Hz)
    this.preHighpass = ctx.createBiquadFilter();
    this.preHighpass.type = 'highpass';
    this.preHighpass.frequency.setValueAtTime(30, ctx.currentTime);
    this.preHighpass.Q.setValueAtTime(0.707, ctx.currentTime);
    this.bypassWet.connect(this.preHighpass);

    // 4. Input buffer warmth (gentle analog low-mid support at 340Hz, +1.2dB)
    this.warmBodyFilter = ctx.createBiquadFilter();
    this.warmBodyFilter.type = 'peaking';
    this.warmBodyFilter.frequency.setValueAtTime(340, ctx.currentTime);
    this.warmBodyFilter.Q.setValueAtTime(0.7, ctx.currentTime);
    this.warmBodyFilter.gain.setValueAtTime(1.2, ctx.currentTime);
    this.preHighpass.connect(this.warmBodyFilter);

    // 5. 4 x first-order all-pass stages with OTA-style modulation
    const isColorActive = this.params.color >= 0.5;
    this.engine = new PhaserEngine(ctx, {
      baseFreq: 800,
      sweepHz: isColorActive ? 750 : 600,
      rateHz: this.calcRateHz(this.params.rate),
      feedback: isColorActive ? 0.62 : 0.0,
    });
    this.warmBodyFilter.connect(this.engine.inputNode);

    // 6. Wet / Dry Mixer: 1.0 Dry + 1.0 Wet creates the 2 phase-cancellation notches
    this.dryGain = ctx.createGain();
    this.dryGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.warmBodyFilter.connect(this.dryGain);

    this.wetGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.engine.outputNode.connect(this.wetGain);

    this.mixer = ctx.createGain();
    this.dryGain.connect(this.mixer);
    this.wetGain.connect(this.mixer);

    // Output level compensation (-3.0 dB)
    this.levelComp = ctx.createGain();
    this.levelComp.gain.setValueAtTime(0.72, ctx.currentTime);
    this.mixer.connect(this.levelComp);

    // 7. DC blocker
    this.dcBlocker = createDcBlocker(ctx);
    this.levelComp.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputNode);

    // Apply initial bypass state (1 ms, matching the other bypass-style pedals so the
    // startup crossfade finishes inside SignalChain's insert mute)
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx, 0.001);
  }

  private calcRateHz(rate: number): number {
    const clamped = Math.max(0, Math.min(10, rate));
    // 0 -> 0.08 Hz, 5 -> 0.72 Hz, 10 -> 6.5 Hz
    return 0.08 * Math.pow(81.25, clamped / 10);
  }

  public updateParameter(paramId: string, value: number): void {
    if (this.isDisposed) return;
    this.params[paramId] = value;

    switch (paramId) {
      case 'rate':
        this.engine.setRate(this.calcRateHz(value));
        break;

      case 'color': {
        const isColor = value >= 0.5;
        this.engine.setFeedback(isColor ? 0.62 : 0.0);
        this.engine.setSweep(isColor ? 750 : 600);
        break;
      }
    }
  }

  public setEnabled(enabled: boolean): void {
    if (this.isDisposed) return;
    this.enabled = enabled;
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx);
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.bypassDry.disconnect();
      this.bypassWet.disconnect();
      this.preHighpass.disconnect();
      this.warmBodyFilter.disconnect();
      this.engine.dispose();
      this.dryGain.disconnect();
      this.wetGain.disconnect();
      this.mixer.disconnect();
      this.levelComp.disconnect();
      this.dcBlocker.disconnect();
    } catch {
      // Nodes already disconnected
    }
  }
}
