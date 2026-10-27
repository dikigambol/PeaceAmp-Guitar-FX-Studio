import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';
import { PhaserEngine } from './PhaserEngine';

/**
 * MXR M101 PHASE 90 (BLOCK LOGO)
 *
 * 4-stage JFET analog phase shifter:
 * - 4 first-order all-pass stages (4 poles, 2 moving notches when mixed with dry),
 *   processed sample-accurately in an AudioWorklet with a per-sample LFO.
 * - Fixed feedback loop (0.36) for the chewy midrange bite.
 * - Single SPEED knob controlling the LFO from 0.1 Hz to 5.2 Hz.
 */
export class MxrPhase90Node implements AudioPedalNode {
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
    speed: 4.0, // 0 to 10 (LFO speed: ~0.1 Hz to ~5.2 Hz)
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

    // 3. Sub-bass cleanup HPF (32Hz)
    this.preHighpass = ctx.createBiquadFilter();
    this.preHighpass.type = 'highpass';
    this.preHighpass.frequency.setValueAtTime(32, ctx.currentTime);
    this.preHighpass.Q.setValueAtTime(0.707, ctx.currentTime);
    this.bypassWet.connect(this.preHighpass);

    // 4. Input buffer warmth (subtle 360Hz analog fullness, +1.5dB)
    this.warmBodyFilter = ctx.createBiquadFilter();
    this.warmBodyFilter.type = 'peaking';
    this.warmBodyFilter.frequency.setValueAtTime(360, ctx.currentTime);
    this.warmBodyFilter.Q.setValueAtTime(0.7, ctx.currentTime);
    this.warmBodyFilter.gain.setValueAtTime(1.5, ctx.currentTime);
    this.preHighpass.connect(this.warmBodyFilter);

    // 5. 4 x first-order all-pass stages with JFET-style modulation
    // Base 950Hz with 750Hz sweep provides an authentic 3.1 octave log range (200Hz to 1700Hz)
    // Feedback 0.44 delivers the iconic chewy Block Logo midrange bite
    this.engine = new PhaserEngine(ctx, {
      baseFreq: 950,
      sweepHz: 750,
      rateHz: this.calcSpeedHz(this.params.speed),
      feedback: 0.44,
    });
    this.warmBodyFilter.connect(this.engine.inputNode);

    // 6. Wet / Dry Mixer: 1.0 Dry + 1.0 Wet creates the signature twin notches
    this.dryGain = ctx.createGain();
    this.dryGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.warmBodyFilter.connect(this.dryGain);

    this.wetGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.engine.outputNode.connect(this.wetGain);

    this.mixer = ctx.createGain();
    this.dryGain.connect(this.mixer);
    this.wetGain.connect(this.mixer);

    // Output level compensation: 1.05 maintains perceived unity loudness when engaged,
    // offsetting the natural perceived volume dip caused by the moving phase notches
    this.levelComp = ctx.createGain();
    this.levelComp.gain.setValueAtTime(1.05, ctx.currentTime);
    this.mixer.connect(this.levelComp);

    // 7. DC blocker
    this.dcBlocker = createDcBlocker(ctx);
    this.levelComp.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputNode);

    // Apply initial bypass state (1 ms, matching the other bypass-style pedals so the
    // startup crossfade finishes inside SignalChain's insert mute)
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx, 0.001);
  }

  private calcSpeedHz(speed: number): number {
    const clamped = Math.max(0, Math.min(10, speed));
    // 0 -> 0.10 Hz, 5 -> 0.85 Hz (classic sweep), 10 -> 5.2 Hz
    return 0.10 * Math.pow(52, clamped / 10);
  }

  public updateParameter(paramId: string, value: number): void {
    if (this.isDisposed) return;
    this.params[paramId] = value;

    if (paramId === 'speed') {
      this.engine.setRate(this.calcSpeedHz(value));
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
