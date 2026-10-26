import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';

/**
 * BOSS CH-1 Super Chorus (1989 - Present)
 *
 * Bright, modern stereo chorus:
 * - Two short BBD-style delay lines (~4.5 ms base) modulated in anti-phase by one
 *   LFO, then merged to true stereo L/R (ChannelMerger).
 * - E. LEVEL: blends the modulated wet chorus voice (0% to 100%).
 * - EQ: active peaking tone control on the chorus voice (-9 dB .. +9 dB @ 3.6 kHz).
 * - RATE: 0.2 Hz to 4.5 Hz. DEPTH: 0 to ±1.8 ms delay excursion.
 *
 * Note: the pedal input is mono (as on the real pedal); stereo comes from the two
 * out-of-phase modulated delay lines, not from processing a stereo input.
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

  // Mono input sum -> two anti-phase modulated delay lines -> stereo merger
  private monoSum: GainNode;
  private preHighpass: BiquadFilterNode;
  private delayLeft: DelayNode;
  private delayRight: DelayNode;
  private merger: ChannelMergerNode;
  private eqFilter: BiquadFilterNode;
  private postLowpass: BiquadFilterNode;

  // LFO Modulation Core
  private lfoNode: OscillatorNode;
  private lfoGainLeft: GainNode;
  private lfoGainRight: GainNode;

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

    // 2. Wet chorus input (mono sum; the chain is mono)
    this.inputNode.connect(this.bypassWet);
    this.monoSum = ctx.createGain();
    this.monoSum.channelCount = 1;
    this.monoSum.channelCountMode = 'explicit';
    this.monoSum.channelInterpretation = 'speakers';
    this.bypassWet.connect(this.monoSum);

    // 3. Pre-filtering: 40 Hz highpass to eliminate sub-audio mud
    this.preHighpass = ctx.createBiquadFilter();
    this.preHighpass.type = 'highpass';
    this.preHighpass.frequency.setValueAtTime(40, ctx.currentTime);
    this.preHighpass.Q.setValueAtTime(0.707, ctx.currentTime);
    this.monoSum.connect(this.preHighpass);

    // 4. Two short analog delay lines (~4.5 ms base delay for crisp Super Chorus chime)
    const baseDelaySec = 0.0045;
    this.delayLeft = ctx.createDelay(0.05);
    this.delayLeft.delayTime.setValueAtTime(baseDelaySec, ctx.currentTime);
    this.delayRight = ctx.createDelay(0.05);
    this.delayRight.delayTime.setValueAtTime(baseDelaySec, ctx.currentTime);

    // 5. Analog LFO Oscillator & anti-phase depth drivers (true stereo)
    this.lfoNode = ctx.createOscillator();
    this.lfoNode.type = 'sine';

    const rateVal = Math.max(0, Math.min(10, this.params.rate ?? 5.0));
    const rateHz = 0.2 + Math.pow(rateVal / 10, 1.8) * 4.3;
    this.lfoNode.frequency.setValueAtTime(rateHz, ctx.currentTime);

    const depthVal = Math.max(0, Math.min(10, this.params.depth ?? 6.0));
    const depthSec = (depthVal / 10) * 0.0018; // up to ±1.8 ms delay excursion
    this.lfoGainLeft = ctx.createGain();
    this.lfoGainLeft.gain.setValueAtTime(depthSec, ctx.currentTime);
    this.lfoGainRight = ctx.createGain();
    this.lfoGainRight.gain.setValueAtTime(-depthSec, ctx.currentTime);

    this.lfoNode.connect(this.lfoGainLeft);
    this.lfoNode.connect(this.lfoGainRight);
    this.lfoGainLeft.connect(this.delayLeft.delayTime);
    this.lfoGainRight.connect(this.delayRight.delayTime);

    // 6. Signature CH-1 EQ filter (active peaking, 3.6 kHz)
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

    // 7. Merge the two modulated lines into true stereo L/R
    this.merger = ctx.createChannelMerger(2);

    // 8. Dry & Wet Mixing Network
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
    // A) Direct dry path (mono, upmixed by the stereo mixer)
    this.monoSum.connect(this.dryGain);
    this.dryGain.connect(this.chorusMixer);

    // B) Anti-phase modulated wet paths -> stereo merge
    this.preHighpass.connect(this.delayLeft);
    this.preHighpass.connect(this.delayRight);
    this.delayLeft.connect(this.merger, 0, 0);
    this.delayRight.connect(this.merger, 0, 1);
    this.merger.connect(this.eqFilter);
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
      this.lfoGainLeft.gain.setTargetAtTime(depthSec, now, tc);
      this.lfoGainRight.gain.setTargetAtTime(-depthSec, now, tc);
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
      this.lfoGainLeft.disconnect();
      this.lfoGainRight.disconnect();

      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.bypassDry.disconnect();
      this.bypassWet.disconnect();

      this.monoSum.disconnect();
      this.preHighpass.disconnect();
      this.delayLeft.disconnect();
      this.delayRight.disconnect();
      this.merger.disconnect();
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
