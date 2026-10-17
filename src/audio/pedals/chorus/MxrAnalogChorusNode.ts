import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';

/**
 * MXR M234 ANALOG CHORUS
 *
 * Full Authentic Analog BBD Hardware Modeling:
 * - Bucket-Brigade Device (BBD) delay line (MN3207 / V3207 architecture)
 * - Base delay time: ~6.5 ms
 * - Dual dedicated tone-shaping filters on the wet chorus path:
 *   - LOW (Low Cut): Rolls off low frequencies (from CUT at ~450 Hz up to FLAT at ~35 Hz)
 *     to keep bass tight, prevent low-end mud, and retain punch on guitar chords and bass
 *   - HIGH (High Cut): Variable high-frequency damping (from CUT at ~1.5 kHz up to FLAT at ~7.5 kHz)
 *     to tame treble sparkle or dial in dark, vintage warm chorus
 * - LEVEL: Wet signal mix level (from completely dry up to 50/50 lush comb filtering)
 * - RATE: Smooth analog LFO from 0.2 Hz (slow dimensional shimmer) to 5.0 Hz (fast Leslie vibrato)
 * - DEPTH: Delay modulation width from 0 ms up to ±2.0 ms
 * - Unattenuated direct Dry signal for full clarity and dynamic impact
 */
export class MxrAnalogChorusNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private enabled: boolean;

  // Bypass crossfade
  private bypassDry: GainNode;
  private bypassWet: GainNode;

  // Wet Chorus Path Nodes
  private preHighpass: BiquadFilterNode;
  private lowCutFilter: BiquadFilterNode;
  private highCutFilter: BiquadFilterNode;
  private delayNode: DelayNode;
  private postReconstruction: BiquadFilterNode;

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
    level: 6.0,  // 0 to 10 (Wet blend)
    rate: 4.5,   // 0 to 10 (~0.2 Hz to ~5.0 Hz)
    depth: 6.5,  // 0 to 10 (0 ms to ±2.0 ms excursion)
    low: 8.0,    // 0 to 10 (0 = CUT bass below 450Hz, 10 = FLAT down to 35Hz)
    high: 8.0,   // 0 to 10 (0 = CUT highs above 1.5kHz, 10 = FLAT up to 7.5kHz)
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

    // 3. Pre-BBD Sub-Bass filter
    this.preHighpass = ctx.createBiquadFilter();
    this.preHighpass.type = 'highpass';
    this.preHighpass.frequency.setValueAtTime(30, ctx.currentTime);
    this.preHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    // 4. LOW (Low-Cut Shelf Filter on Wet Path)
    // At 10 (FLAT): cutoff is ~35 Hz (passes full bass)
    // At 0 (CUT): cutoff is ~480 Hz (cuts bass from wet chorus)
    this.lowCutFilter = ctx.createBiquadFilter();
    this.lowCutFilter.type = 'highpass';
    const lowVal = Math.max(0, Math.min(10, this.params.low ?? 8.0));
    const lowFreq = 480 - (lowVal / 10) * 445; // 480Hz down to 35Hz
    this.lowCutFilter.frequency.setValueAtTime(lowFreq, ctx.currentTime);
    this.lowCutFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    // 5. HIGH (High-Cut Filter on Wet Path)
    // At 10 (FLAT): cutoff is ~7500 Hz (bright, full analog bandwidth)
    // At 0 (CUT): cutoff is ~1400 Hz (warm, dark, vintage bucket brigade sound)
    this.highCutFilter = ctx.createBiquadFilter();
    this.highCutFilter.type = 'lowpass';
    const highVal = Math.max(0, Math.min(10, this.params.high ?? 8.0));
    const highFreq = 1400 + Math.pow(highVal / 10, 1.4) * 6100; // 1400Hz to 7500Hz
    this.highCutFilter.frequency.setValueAtTime(highFreq, ctx.currentTime);
    this.highCutFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    // 6. BBD Delay Line (~6.5 ms center delay)
    this.delayNode = ctx.createDelay(0.05);
    const baseDelaySec = 0.0065;
    this.delayNode.delayTime.setValueAtTime(baseDelaySec, ctx.currentTime);

    // 7. LFO Modulation Oscillator & Depth Driver
    // Uses smooth sine modulation directly linked to the delayTime AudioParam
    this.lfoNode = ctx.createOscillator();
    this.lfoNode.type = 'sine';

    const rateVal = Math.max(0, Math.min(10, this.params.rate ?? 4.5));
    const rateHz = 0.2 + Math.pow(rateVal / 10, 1.8) * 4.8; // ~0.2 Hz to ~5.0 Hz
    this.lfoNode.frequency.setValueAtTime(rateHz, ctx.currentTime);

    this.lfoGainNode = ctx.createGain();
    const depthVal = Math.max(0, Math.min(10, this.params.depth ?? 6.5));
    const depthSec = (depthVal / 10) * 0.0020; // up to ±2.0 ms
    this.lfoGainNode.gain.setValueAtTime(depthSec, ctx.currentTime);

    this.lfoNode.connect(this.lfoGainNode);
    this.lfoGainNode.connect(this.delayNode.delayTime);

    // 8. Post-BBD Reconstruction Lowpass Filter (7.5 kHz 2-pole)
    this.postReconstruction = ctx.createBiquadFilter();
    this.postReconstruction.type = 'lowpass';
    this.postReconstruction.frequency.setValueAtTime(7500, ctx.currentTime);
    this.postReconstruction.Q.setValueAtTime(0.707, ctx.currentTime);

    // 9. Wet / Dry Mix Summing
    this.dryGain = ctx.createGain();
    this.dryGain.gain.setValueAtTime(1.0, ctx.currentTime); // unattenuated direct guitar

    this.wetGain = ctx.createGain();
    const levelVal = Math.max(0, Math.min(10, this.params.level ?? 6.0));
    const wetLevel = (levelVal / 10) * 0.95; // 0 to 0.95
    this.wetGain.gain.setValueAtTime(wetLevel, ctx.currentTime);

    this.chorusMixer = ctx.createGain();
    this.dcBlocker = createDcBlocker(ctx, 15);
    this.makeupGain = ctx.createGain();
    this.makeupGain.gain.setValueAtTime(0.78, ctx.currentTime);

    // Audio Routing:
    // A) Direct dry path
    this.bypassWet.connect(this.dryGain);
    this.dryGain.connect(this.chorusMixer);

    // B) Wet chorus path with dual tone controls
    this.bypassWet.connect(this.preHighpass);
    this.preHighpass.connect(this.lowCutFilter);
    this.lowCutFilter.connect(this.highCutFilter);
    this.highCutFilter.connect(this.delayNode);
    this.delayNode.connect(this.postReconstruction);
    this.postReconstruction.connect(this.wetGain);
    this.wetGain.connect(this.chorusMixer);

    // C) Master wet output
    this.chorusMixer.connect(this.dcBlocker);
    this.dcBlocker.connect(this.makeupGain);
    this.makeupGain.connect(this.outputNode);

    // Start LFO
    this.lfoNode.start();

    // Initial bypass crossfade
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx, 0.001);
  }

  public updateParameter(paramId: string, value: number): void {
    const now = this.ctx.currentTime;
    const tc = 0.02;

    switch (paramId) {
      case 'level': {
        const clamped = Math.max(0, Math.min(10, value));
        this.params[paramId] = clamped;
        const wetLevel = (clamped / 10) * 0.95;
        this.wetGain.gain.setTargetAtTime(wetLevel, now, tc);
        break;
      }
      case 'rate': {
        const clamped = Math.max(0, Math.min(10, value));
        this.params[paramId] = clamped;
        const rateHz = 0.2 + Math.pow(clamped / 10, 1.8) * 4.8;
        this.lfoNode.frequency.setTargetAtTime(rateHz, now, tc);
        break;
      }
      case 'depth': {
        const clamped = Math.max(0, Math.min(10, value));
        this.params[paramId] = clamped;
        const depthSec = (clamped / 10) * 0.0020;
        this.lfoGainNode.gain.setTargetAtTime(depthSec, now, tc);
        break;
      }
      case 'low': {
        const clamped = Math.max(0, Math.min(10, value));
        this.params[paramId] = clamped;
        // 0 (CUT) -> 480 Hz, 10 (FLAT) -> 35 Hz
        const lowFreq = 480 - (clamped / 10) * 445;
        this.lowCutFilter.frequency.setTargetAtTime(lowFreq, now, tc);
        break;
      }
      case 'high': {
        const clamped = Math.max(0, Math.min(10, value));
        this.params[paramId] = clamped;
        // 0 (CUT) -> 1400 Hz, 10 (FLAT) -> 7500 Hz
        const highFreq = 1400 + Math.pow(clamped / 10, 1.4) * 6100;
        this.highCutFilter.frequency.setTargetAtTime(highFreq, now, tc);
        break;
      }
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
      this.lowCutFilter.disconnect();
      this.highCutFilter.disconnect();
      this.delayNode.disconnect();
      this.postReconstruction.disconnect();

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
