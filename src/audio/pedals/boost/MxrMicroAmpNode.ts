import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';

/**
 * MXR Micro Amp (M133)
 *
 * Authentic analog circuit model directly derived from the classic 1970s MXR schematic:
 *
 * 1. High-Impedance Non-Inverting Op-Amp Architecture:
 *    - Uses a low-noise single op-amp (TL061/LM741) in non-inverting feedback topology.
 *    - 10 MΩ input bias resistor provides massive input impedance, preserving high-frequency
 *      guitar pickup sparkle and eliminating cable load losses (acting as an ideal line buffer).
 *    - Input coupling (0.1 µF) gives ultra-wide, flat bandwidth down to 15 Hz.
 *
 * 2. +26 dB Clean Gain Stage:
 *    - 500k reverse-audio potentiometer in negative feedback loop.
 *    - Continuous gain range from 0 dB (unity gain) at minimum to +26 dB of pristine clean boost
 *      at maximum.
 *
 * 3. Op-Amp Power Supply Rail Headroom & Saturation:
 *    - Powered by 9V DC (±4.5V virtual rails).
 *    - Ultra-clean and transparent at low-to-moderate levels (|x| < 0.85).
 *    - Smooth soft-saturation curve at extreme signal swings when cranked, adding rich organic
 *      harmonics and natural analog compression.
 *    - Bandwidth cap (47 pF feedback) tames ultrasonic radio-frequency hiss above 22 kHz.
 */
export class MxrMicroAmpNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;

  // Bypass crossfaders
  private bypassDry: GainNode;
  private bypassWet: GainNode;

  // Signal conditioning
  private inputSubCut: BiquadFilterNode;
  private hfRollOff: BiquadFilterNode;

  // Gain & Op-Amp Saturation
  private boostGain: GainNode;
  private railShaper: WaveShaperNode;
  private dcBlocker: BiquadFilterNode;

  private params: Record<string, number> = {
    gain: 5.0, // 0 to 10 (0 dB to +26 dB)
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

    // 1. Transparent Sub-Cut (15 Hz) & Ultrasonic Bandwidth Limiter (22 kHz)
    this.inputSubCut = ctx.createBiquadFilter();
    this.inputSubCut.type = 'highpass';
    this.inputSubCut.frequency.setValueAtTime(15, ctx.currentTime);
    this.inputSubCut.Q.setValueAtTime(0.707, ctx.currentTime);

    this.hfRollOff = ctx.createBiquadFilter();
    this.hfRollOff.type = 'lowpass';
    this.hfRollOff.frequency.setValueAtTime(22000, ctx.currentTime);
    this.hfRollOff.Q.setValueAtTime(0.707, ctx.currentTime);

    // 2. Op-Amp Boost Stage
    this.boostGain = ctx.createGain();

    // 3. 9V Op-Amp Rail Soft-Saturation Curve
    this.railShaper = ctx.createWaveShaper();
    this.railShaper.oversample = '4x';
    this.railShaper.curve = this.createOpAmpRailCurve(4096) as Float32Array<ArrayBuffer>;

    this.dcBlocker = createDcBlocker(ctx, 15);

    // Wiring Audio Graph:
    // inputNode -> bypassDry -> outputNode
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    // inputNode -> bypassWet -> inputSubCut -> hfRollOff -> boostGain -> railShaper -> dcBlocker -> outputNode
    this.inputNode.connect(this.bypassWet);
    this.bypassWet.connect(this.inputSubCut);
    this.inputSubCut.connect(this.hfRollOff);
    this.hfRollOff.connect(this.boostGain);
    this.boostGain.connect(this.railShaper);
    this.railShaper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputNode);

    this.applyParams(true);
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx, 0.001);
  }

  /**
   * 9V Op-Amp Rail Saturation Curve:
   * 100% linear for signals within ±0.82 headroom boundary.
   * Smooth, musical soft-knee transition as signal hits the supply rails.
   */
  private createOpAmpRailCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    const threshold = 0.82;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / (samples - 1) - 1; // -1 to +1
      if (Math.abs(x) <= threshold) {
        curve[i] = x;
      } else {
        const sign = Math.sign(x);
        const over = Math.abs(x) - threshold;
        curve[i] = sign * (threshold + 0.16 * Math.tanh(over / 0.16));
      }
    }
    return curve;
  }

  private applyParams(immediate = false): void {
    const now = this.ctx.currentTime;
    const tc = immediate ? 0.001 : 0.015;

    // GAIN: 0 to 10 -> 0 dB to +26 dB
    const gainNorm = Math.max(0, Math.min(10, this.params.gain ?? 5.0)) / 10;
    // Authentic C-Taper (Reverse-Log) 500k potentiometer: produces a linear dB progression
    const gainDb = gainNorm * 26.0;
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
      this.inputSubCut.disconnect();
      this.hfRollOff.disconnect();
      this.boostGain.disconnect();
      this.railShaper.disconnect();
      this.dcBlocker.disconnect();
    } catch (e) {
      console.warn('MxrMicroAmpNode dispose error', e);
    }
  }
}
