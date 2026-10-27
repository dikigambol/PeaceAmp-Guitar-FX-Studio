import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';
import { BbdAnalogWarmthStage } from './BbdAnalogWarmthStage';

/**
 * BOSS CE-2 Chorus (1979 - 1990)
 *
 * Full Authentic Analog BBD Hardware Modeling:
 * - Matsushita MN3007 1024-stage BBD bucket-brigade analog delay line clocked by MN3101
 * - Base analog delay time: ~6.0 ms
 * - Low-frequency oscillator (LFO): smooth quasi-sinusoidal wave
 *   Rate: 0.3 Hz (slow lush ocean swirl) to 3.5 Hz (fast rotary shimmer)
 * - Modulation depth: sweeps delay variation between ±0.0 ms and ±2.2 ms
 * - Authentic 4-pole Sallen-Key analog reconstruction filtering & compander non-linearity via BbdAnalogWarmthStage,
 *   giving the CE-2 its warm, rich, legendary vintage chorus voicing without digital harshness
 * - Analog 1:1 dry/wet mixing creating authentic constructive & destructive comb filtering
 */
export class BossCe2Node implements AudioPedalNode {
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
    rate: 4.5,   // 0 to 10 (~0.3 Hz to ~3.5 Hz)
    depth: 6.0,  // 0 to 10 (0.0 ms to 2.2 ms width)
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

    // 3. Pre-BBD Filtering:
    // Sub-bass rumble filter to keep modulation clean and tight
    this.preHighpass = ctx.createBiquadFilter();
    this.preHighpass.type = 'highpass';
    this.preHighpass.frequency.setValueAtTime(35, ctx.currentTime);
    this.preHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    // Pre-emphasis high-shelf filter (typical of analog compander/BBD circuits)
    this.preEmphasis = ctx.createBiquadFilter();
    this.preEmphasis.type = 'peaking';
    this.preEmphasis.frequency.setValueAtTime(2800, ctx.currentTime);
    this.preEmphasis.Q.setValueAtTime(0.7, ctx.currentTime);
    this.preEmphasis.gain.setValueAtTime(2.5, ctx.currentTime);

    // 4. MN3007 Bucket-Brigade Delay Line
    // Base delay is 6.0 ms (center of CE-2 delay range)
    this.delayNode = ctx.createDelay(0.05);
    const baseDelaySec = 0.006;
    this.delayNode.delayTime.setValueAtTime(baseDelaySec, ctx.currentTime);

    // 5. Analog LFO Oscillator & Depth Driver
    // Uses smooth sine modulation connected directly to the AudioParam
    this.lfoNode = ctx.createOscillator();
    this.lfoNode.type = 'sine';

    const rateVal = Math.max(0, Math.min(10, this.params.rate ?? 4.5));
    const rateHz = 0.3 + Math.pow(rateVal / 10, 1.8) * 3.2;
    this.lfoNode.frequency.setValueAtTime(rateHz, ctx.currentTime);

    this.lfoGainNode = ctx.createGain();
    const depthVal = Math.max(0, Math.min(10, this.params.depth ?? 6.0));
    const depthSec = (depthVal / 10) * 0.0022; // up to ±2.2 ms delay excursion
    this.lfoGainNode.gain.setValueAtTime(depthSec, ctx.currentTime);

    // Connect LFO into DelayTime AudioParam (real-time sample-accurate audio rate modulation)
    this.lfoNode.connect(this.lfoGainNode);
    this.lfoGainNode.connect(this.delayNode.delayTime);

    // 6. Post-BBD Reconstruction & Analog Anti-Aliasing Filters:
    // Authentic 4-pole (24 dB/oct) Sallen-Key lowpass cascade & compander saturation
    this.bbdWarmth = new BbdAnalogWarmthStage(ctx, {
      cutoffFreq: 8800,
      saturationAmount: 0.35,
      oversample: '4x',
    });

    // Matching de-emphasis filter
    this.deEmphasis = ctx.createBiquadFilter();
    this.deEmphasis.type = 'peaking';
    this.deEmphasis.frequency.setValueAtTime(2800, ctx.currentTime);
    this.deEmphasis.Q.setValueAtTime(0.7, ctx.currentTime);
    this.deEmphasis.gain.setValueAtTime(-2.5, ctx.currentTime);

    // 7. Analog 50/50 Dry/Wet Summing Network
    this.dryGain = ctx.createGain();
    this.dryGain.gain.setValueAtTime(0.707, ctx.currentTime);

    this.wetGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(0.707, ctx.currentTime);

    this.chorusMixer = ctx.createGain();
    this.dcBlocker = createDcBlocker(ctx, 15);
    this.makeupGain = ctx.createGain();
    this.makeupGain.gain.setValueAtTime(1.05, ctx.currentTime);

    // Connect audio signal graph:
    // A) Direct dry path to mixer
    this.bypassWet.connect(this.dryGain);
    this.dryGain.connect(this.chorusMixer);

    // B) Delayed modulated wet path with BBD warmth & 4-pole reconstruction
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
    const clampedVal = Math.max(0, Math.min(10, value));
    this.params[paramId] = clampedVal;

    const now = this.ctx.currentTime;
    const tc = 0.02; // Smooth 20ms transition

    if (paramId === 'rate') {
      const rateHz = 0.3 + Math.pow(clampedVal / 10, 1.8) * 3.2;
      this.lfoNode.frequency.setTargetAtTime(rateHz, now, tc);
    } else if (paramId === 'depth') {
      const depthSec = (clampedVal / 10) * 0.0022;
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
