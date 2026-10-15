import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';

/**
 * TC Electronic Spark Mini Booster
 *
 * Authentic Discrete Analog Circuit Emulation:
 *
 * 1. 100% Discrete Analog Circuit Topology:
 *    - Modeled after TC Electronic's discrete transistor (FET/BJT) boost design.
 *    - Unlike standard op-amp boosters, discrete transistor gain stages preserve the organic,
 *      open dynamics of guitar pickups with zero sterile digital or op-amp slew coloration.
 *
 * 2. +20 dB Clean Discrete Gain:
 *    - Continuous boost from 0 dB (unity gain) at minimum up to +20 dB of transparent,
 *      punchy boost at maximum.
 *    - Gives extra body, punch, and presence to clean tones, or pushes tube amps and overdrive
 *      pedals into glorious harmonic bloom.
 *
 * 3. Extended Bandwidth with Signature "Spark" Air & Clarity:
 *    - Full-range bass response down to 20 Hz ensures low-end punch without loss of tightness.
 *    - Subtle airy high-shelf (~5.5 kHz, +1.2 dB) replicates the crisp pick attack and sparkle
 *      that makes the Spark Mini famous.
 *
 * 4. Discrete Transistor Soft-Saturation:
 *    - Pristinely clean with vast headroom at low-to-moderate levels.
 *    - Smooth, musical soft-knee analog saturation on high-output transients when cranked,
 *      producing natural analog compression.
 */
export class TcSparkMiniNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;

  // Bypass crossfaders
  private bypassDry: GainNode;
  private bypassWet: GainNode;

  // Signal conditioning & Spark Voicing
  private subCut: BiquadFilterNode;
  private sparkleAirShelf: BiquadFilterNode;
  private hfCeiling: BiquadFilterNode;

  // Discrete Gain & Saturation
  private boostGain: GainNode;
  private discreteShaper: WaveShaperNode;
  private dcBlocker: BiquadFilterNode;

  private params: Record<string, number> = {
    level: 5.0, // 0 to 10 (0 dB to +20 dB boost)
  };

  private enabled: boolean;

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

    // 1. Transparent Sub-Cut (20 Hz, Butterworth Q=0.707)
    this.subCut = ctx.createBiquadFilter();
    this.subCut.type = 'highpass';
    this.subCut.frequency.setValueAtTime(20, ctx.currentTime);
    this.subCut.Q.setValueAtTime(0.707, ctx.currentTime);

    // 2. Signature "Spark" Air High-Shelf (5500 Hz, +1.2 dB)
    this.sparkleAirShelf = ctx.createBiquadFilter();
    this.sparkleAirShelf.type = 'highshelf';
    this.sparkleAirShelf.frequency.setValueAtTime(5500, ctx.currentTime);
    this.sparkleAirShelf.gain.setValueAtTime(1.2, ctx.currentTime);

    // 3. Ultrasonic RF Filter (24 kHz)
    this.hfCeiling = ctx.createBiquadFilter();
    this.hfCeiling.type = 'lowpass';
    this.hfCeiling.frequency.setValueAtTime(24000, ctx.currentTime);
    this.hfCeiling.Q.setValueAtTime(0.707, ctx.currentTime);

    // 4. Discrete Boost Gain Stage (LEVEL pot: 0 to +20 dB)
    this.boostGain = ctx.createGain();

    // 5. Discrete Analog Transistor Headroom & Soft-Saturation
    this.discreteShaper = ctx.createWaveShaper();
    this.discreteShaper.oversample = '4x';
    this.discreteShaper.curve = this.createDiscreteSaturationCurve(4096) as Float32Array<ArrayBuffer>;

    // 6. DC Blocker
    this.dcBlocker = createDcBlocker(ctx, 15);

    // Audio Graph Wiring:
    // Dry Path
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    // Wet Path:
    // inputNode -> bypassWet -> subCut -> sparkleAirShelf -> hfCeiling -> boostGain -> discreteShaper -> dcBlocker -> outputNode
    this.inputNode.connect(this.bypassWet);
    this.bypassWet.connect(this.subCut);
    this.subCut.connect(this.sparkleAirShelf);
    this.sparkleAirShelf.connect(this.hfCeiling);
    this.hfCeiling.connect(this.boostGain);
    this.boostGain.connect(this.discreteShaper);
    this.discreteShaper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputNode);

    this.applyParams(true);
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx, 0.001);
  }

  /**
   * Discrete Transistor Headroom Saturation Curve:
   * 100% linear within ±0.78 headroom margin.
   * As signal approaches supply rail limits under high boost settings,
   * smooth soft-clipping with gentle transistor knee provides singing analog sustain.
   */
  private createDiscreteSaturationCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    const threshold = 0.78;

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / (samples - 1) - 1; // -1 to +1

      if (Math.abs(x) <= threshold) {
        curve[i] = x;
      } else {
        const sign = Math.sign(x);
        const over = Math.abs(x) - threshold;
        // Soft transistor compression
        curve[i] = sign * (threshold + 0.18 * Math.tanh(over / 0.18));
      }
    }
    return curve;
  }

  private applyParams(immediate = false): void {
    const now = this.ctx.currentTime;
    const tc = immediate ? 0.001 : 0.015;

    // LEVEL: 0 to 10 -> 0 dB to +20 dB boost
    const rawVal = this.params.level ?? 5.0;
    const norm = Math.max(0, Math.min(10, rawVal)) / 10;

    // Logarithmic potentiometer curve
    const gainDb = Math.pow(norm, 1.25) * 20.0;
    const linearGain = Math.pow(10, gainDb / 20);

    if (immediate) {
      this.boostGain.gain.setValueAtTime(linearGain, now);
    } else {
      this.boostGain.gain.setTargetAtTime(linearGain, now, tc);
    }
  }

  public updateParameter(paramId: string, value: number): void {
    this.params[paramId] = value;
    this.applyParams();
  }

  public setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    applyBypassCrossfade(this.bypassWet, this.bypassDry, enabled, this.ctx, 0.015);
  }

  public dispose(): void {
    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.bypassDry.disconnect();
      this.bypassWet.disconnect();
      this.subCut.disconnect();
      this.sparkleAirShelf.disconnect();
      this.hfCeiling.disconnect();
      this.boostGain.disconnect();
      this.discreteShaper.disconnect();
      this.dcBlocker.disconnect();
    } catch {
      // AudioNode already disconnected
    }
  }
}
