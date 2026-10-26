import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';
import { BbdAnalogWarmthStage } from './BbdAnalogWarmthStage';

/**
 * ELECTRO-HARMONIX Small Clone (EH 4600 Full-Chorus)
 *
 * Full Authentic Analog BBD Hardware Modeling:
 * - Matsushita MN3007 1024-stage BBD bucket-brigade analog delay line clocked by 4047 multivibrator
 * - Base analog delay time: ~5.8 ms
 * - Signature 2-position DEPTH Slide Switch:
 *   - DOWN (Subtle): Shallows modulation width (±0.8 ms) for warm acoustic-style spatial shimmer
 *   - UP (Deep): Full wide modulation excursion (±2.8 ms) for the legendary Kurt Cobain "Come As You Are"
 *     watery, liquid, sea-sick detuned grunge swirl
 * - RATE Knob: Smooth analog LFO from 0.5 Hz (slow hypnotic ocean swell) to 7.0 Hz (fast Leslie vibrato)
 * - Authentic 4-pole Sallen-Key analog reconstruction filtering & compander non-linearity via BbdAnalogWarmthStage
 * - Analog 50/50 dry/wet summing creating authentic deep comb filtering notches
 */
export class EhxSmallCloneNode implements AudioPedalNode {
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
  private preEmphasis: BiquadFilterNode;
  private delayNode: DelayNode;
  private bbdWarmth: BbdAnalogWarmthStage;
  private deEmphasis: BiquadFilterNode;

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
    rate: 4.0,   // 0 to 10 (~0.5 Hz to ~7.0 Hz)
    depth: 1.0,  // 0 (Subtle) or 1 (Deep)
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

    // 3. Pre-BBD Conditioning Filter (keeps sub-bass tight and removes ultrasonic noise)
    this.preHighpass = ctx.createBiquadFilter();
    this.preHighpass.type = 'highpass';
    this.preHighpass.frequency.setValueAtTime(30, ctx.currentTime);
    this.preHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    this.preEmphasis = ctx.createBiquadFilter();
    this.preEmphasis.type = 'lowpass';
    this.preEmphasis.frequency.setValueAtTime(7500, ctx.currentTime);
    this.preEmphasis.Q.setValueAtTime(0.707, ctx.currentTime);

    // 4. MN3007 Bucket-Brigade Delay Line
    // Authentic Small Clone specs: center delay ~9.6 ms (sweep range ~8.2 ms to 11.0 ms)
    this.delayNode = ctx.createDelay(0.05);
    const baseDelaySec = 0.0096;
    this.delayNode.delayTime.setValueAtTime(baseDelaySec, ctx.currentTime);

    // 5. Triangle Wave LFO Oscillator & Depth Switch Driver
    // Authentic Small Clone uses an LM358 relaxation triangle oscillator (NOT a sine wave).
    // The linear slope of the triangle wave produces a steady, musical pitch detuning.
    this.lfoNode = ctx.createOscillator();
    this.lfoNode.type = 'triangle';

    const rateVal = Math.max(0, Math.min(10, this.params.rate ?? 4.0));
    const rateHz = 0.5 + Math.pow(rateVal / 10, 1.7) * 5.8; // ~0.5 Hz to ~6.3 Hz
    this.lfoNode.frequency.setValueAtTime(rateHz, ctx.currentTime);

    this.lfoGainNode = ctx.createGain();
    const isDeep = (this.params.depth ?? 1.0) >= 0.5;
    // Authentic sweep: Deep ±1.4 ms (grunge swirl), Subtle ±0.45 ms (airy shimmer)
    const depthSec = isDeep ? 0.0014 : 0.00045;
    this.lfoGainNode.gain.setValueAtTime(depthSec, ctx.currentTime);

    // Connect Triangle LFO into delayTime AudioParam
    this.lfoNode.connect(this.lfoGainNode);
    this.lfoGainNode.connect(this.delayNode.delayTime);

    // 6. Post-BBD Reconstruction & Analog Anti-Aliasing Filters:
    // Authentic 4-pole Sallen-Key lowpass cascade (~5.8 kHz) and BBD compander non-linearity
    this.bbdWarmth = new BbdAnalogWarmthStage(ctx, {
      cutoffFreq: 5800,
      saturationAmount: 0.38,
      oversample: '4x',
    });

    this.deEmphasis = ctx.createBiquadFilter();
    this.deEmphasis.type = 'lowshelf';
    this.deEmphasis.frequency.setValueAtTime(300, ctx.currentTime);
    this.deEmphasis.gain.setValueAtTime(1.0, ctx.currentTime); // gentle analog body warmth

    // 7. Small Clone Analog Summing Network:
    // In real Small Clone, direct guitar Dry signal passes through at full unity (gain 1.0),
    // and the wet delay line is blended in at ~0.95 for deep, lush comb-filtering
    this.dryGain = ctx.createGain();
    this.dryGain.gain.setValueAtTime(1.0, ctx.currentTime);

    this.wetGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(0.95, ctx.currentTime);

    this.chorusMixer = ctx.createGain();
    this.dcBlocker = createDcBlocker(ctx, 15);
    this.makeupGain = ctx.createGain();
    this.makeupGain.gain.setValueAtTime(0.72, ctx.currentTime); // Normalizes overall summed output to unity bypass level

    // Audio Routing:
    // A) Direct dry path (full clarity & punch)
    this.bypassWet.connect(this.dryGain);
    this.dryGain.connect(this.chorusMixer);

    // B) Modulated wet path with BBD warmth & 4-pole reconstruction
    this.bypassWet.connect(this.preHighpass);
    this.preHighpass.connect(this.preEmphasis);
    this.preEmphasis.connect(this.delayNode);
    this.delayNode.connect(this.bbdWarmth.inputNode);
    this.bbdWarmth.outputNode.connect(this.deEmphasis);
    this.deEmphasis.connect(this.wetGain);
    this.wetGain.connect(this.chorusMixer);

    // C) Master wet output with DC blocking
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

    if (paramId === 'rate') {
      const clampedVal = Math.max(0, Math.min(10, value));
      this.params[paramId] = clampedVal;
      const rateHz = 0.5 + Math.pow(clampedVal / 10, 1.7) * 5.8;
      this.lfoNode.frequency.setTargetAtTime(rateHz, now, tc);
    } else if (paramId === 'depth') {
      const isDeep = value >= 0.5;
      this.params[paramId] = isDeep ? 1.0 : 0.0;
      const depthSec = isDeep ? 0.0014 : 0.00045;
      this.lfoGainNode.gain.setTargetAtTime(depthSec, now, tc);
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
      this.preEmphasis.disconnect();
      this.delayNode.disconnect();
      this.bbdWarmth.dispose();
      this.deEmphasis.disconnect();

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
