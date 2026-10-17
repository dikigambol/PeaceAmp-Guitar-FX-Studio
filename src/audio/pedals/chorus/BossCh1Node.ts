import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';

/**
 * BOSS CH-1 Super Chorus (1989 - Present)
 *
 * Full Authentic Hardware Modeling:
 * - Crisp, bright, modern chorus designed to cut through dense band mixes
 * - 4 Control Parameters:
 *   1. E. LEVEL (Effect Level): Blends the modulated wet chorus voice (0% to 100%)
 *   2. EQ (Tone / Brilliance): Dedicated active EQ shelf/peak on the chorus voice
 *      - LO (0): Warm, rolled-off vintage voicing
 *      - HI (10): Crystal clear, glassy 80s/90s chime
 *   3. RATE: LFO modulation speed (0.2 Hz slow ocean swirl to 4.5 Hz fast shimmer)
 *   4. DEPTH: Delay time excursion depth (0 to ±1.8 ms)
 * - Shorter BBD base delay (~4.5 ms) than the CE-2 for tighter comb filtering and sharper definition
 */
export class BossCh1Node implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private enabled: boolean;

  // Bypass crossfade
  private bypassDry: GainNode;
  private bypassWet: GainNode;

  // Chorus Audio Path Nodes
  private preHighpass: BiquadFilterNode;
  private delayNode: DelayNode;
  private eqFilter: BiquadFilterNode;
  private postLowpass: BiquadFilterNode;

  // LFO Modulation Core
  private lfoNode: OscillatorNode;
  private lfoGainNode: GainNode;

  // Wet / Dry Summing Mixer
  private dryGain: GainNode;
  private wetGain: GainNode;
  private chorusMixer: GainNode;
  private dcBlocker: BiquadFilterNode;
  private makeupGain: GainNode;

  private isDisposed = false;

  private params: Record<string, number> = {
    eLevel: 5.0, // 0 to 10 (Wet effect mix)
    eq: 5.0,     // 0 to 10 (LO to HI tone control)
    rate: 5.0,   // 0 to 10 (0.2 Hz to 4.5 Hz)
    depth: 6.0,  // 0 to 10 (0.0 ms to 1.8 ms width)
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

    // 2. Wet chorus input
    this.inputNode.connect(this.bypassWet);

    // 3. Pre-filtering: 40 Hz highpass to eliminate sub-audio mud
    this.preHighpass = ctx.createBiquadFilter();
    this.preHighpass.type = 'highpass';
    this.preHighpass.frequency.setValueAtTime(40, ctx.currentTime);
    this.preHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    // 4. Short analog delay line (~4.5 ms base delay for crisp Super Chorus chime)
    this.delayNode = ctx.createDelay(0.05);
    const baseDelaySec = 0.0045;
    this.delayNode.delayTime.setValueAtTime(baseDelaySec, ctx.currentTime);

    // 5. Analog LFO Oscillator & Depth Driver
    this.lfoNode = ctx.createOscillator();
    this.lfoNode.type = 'sine';

    const rateVal = Math.max(0, Math.min(10, this.params.rate ?? 5.0));
    const rateHz = 0.2 + Math.pow(rateVal / 10, 1.8) * 4.3;
    this.lfoNode.frequency.setValueAtTime(rateHz, ctx.currentTime);

    this.lfoGainNode = ctx.createGain();
    const depthVal = Math.max(0, Math.min(10, this.params.depth ?? 6.0));
    const depthSec = (depthVal / 10) * 0.0018; // up to ±1.8 ms delay excursion
    this.lfoGainNode.gain.setValueAtTime(depthSec, ctx.currentTime);

    // Connect LFO into delayTime AudioParam
    this.lfoNode.connect(this.lfoGainNode);
    this.lfoGainNode.connect(this.delayNode.delayTime);

    // 6. Signature CH-1 EQ Filter (Active High Shelf / Peaking)
    // At center (5.0) = 0 dB. Towards LO = cut highs, towards HI = boost presence
    this.eqFilter = ctx.createBiquadFilter();
    this.eqFilter.type = 'peaking';
    this.eqFilter.frequency.setValueAtTime(3600, ctx.currentTime);
    this.eqFilter.Q.setValueAtTime(0.85, ctx.currentTime);
    const eqVal = Math.max(0, Math.min(10, this.params.eq ?? 5.0));
    const eqDb = ((eqVal - 5.0) / 5.0) * 9.0; // -9 dB to +9 dB
    this.eqFilter.gain.setValueAtTime(eqDb, ctx.currentTime);

    // Post lowpass reconstruction filter (8.5 kHz cutoff)
    this.postLowpass = ctx.createBiquadFilter();
    this.postLowpass.type = 'lowpass';
    this.postLowpass.frequency.setValueAtTime(8500, ctx.currentTime);
    this.postLowpass.Q.setValueAtTime(0.707, ctx.currentTime);

    // 7. Dry & Wet Mixing Network
    this.dryGain = ctx.createGain();
    this.dryGain.gain.setValueAtTime(0.707, ctx.currentTime);

    this.wetGain = ctx.createGain();
    const eLevelVal = Math.max(0, Math.min(10, this.params.eLevel ?? 5.0));
    const wetLevel = (eLevelVal / 10) * 0.707;
    this.wetGain.gain.setValueAtTime(wetLevel, ctx.currentTime);

    this.chorusMixer = ctx.createGain();
    this.dcBlocker = createDcBlocker(ctx, 15);
    this.makeupGain = ctx.createGain();
    this.makeupGain.gain.setValueAtTime(1.05, ctx.currentTime);

    // Audio Routing:
    // A) Direct dry path
    this.bypassWet.connect(this.dryGain);
    this.dryGain.connect(this.chorusMixer);

    // B) Modulated wet path
    this.bypassWet.connect(this.preHighpass);
    this.preHighpass.connect(this.delayNode);
    this.delayNode.connect(this.eqFilter);
    this.eqFilter.connect(this.postLowpass);
    this.postLowpass.connect(this.wetGain);
    this.wetGain.connect(this.chorusMixer);

    // C) Output stage
    this.chorusMixer.connect(this.dcBlocker);
    this.dcBlocker.connect(this.makeupGain);
    this.makeupGain.connect(this.outputNode);

    // Start LFO
    this.lfoNode.start();

    // Initial bypass crossfade
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx, 0.001);
  }

  public updateParameter(paramId: string, value: number): void {
    const clampedVal = Math.max(0, Math.min(10, value));
    this.params[paramId] = clampedVal;

    const now = this.ctx.currentTime;
    const tc = 0.02;

    if (paramId === 'rate') {
      const rateHz = 0.2 + Math.pow(clampedVal / 10, 1.8) * 4.3;
      this.lfoNode.frequency.setTargetAtTime(rateHz, now, tc);
    } else if (paramId === 'depth') {
      const depthSec = (clampedVal / 10) * 0.0018;
      this.lfoGainNode.gain.setTargetAtTime(depthSec, now, tc);
    } else if (paramId === 'eLevel') {
      const wetLevel = (clampedVal / 10) * 0.707;
      this.wetGain.gain.setTargetAtTime(wetLevel, now, tc);
    } else if (paramId === 'eq') {
      const eqDb = ((clampedVal - 5.0) / 5.0) * 9.0;
      this.eqFilter.gain.setTargetAtTime(eqDb, now, tc);
    }
  }

  public setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    applyBypassCrossfade(this.bypassWet, this.bypassDry, enabled, this.ctx, 0.015);
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    try {
      this.lfoNode.stop();
      this.lfoNode.disconnect();
      this.lfoGainNode.disconnect();

      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.bypassDry.disconnect();
      this.bypassWet.disconnect();

      this.preHighpass.disconnect();
      this.delayNode.disconnect();
      this.eqFilter.disconnect();
      this.postLowpass.disconnect();

      this.dryGain.disconnect();
      this.wetGain.disconnect();
      this.chorusMixer.disconnect();
      this.dcBlocker.disconnect();
      this.makeupGain.disconnect();
    } catch {
      // AudioNode already disconnected
    }
  }
}
