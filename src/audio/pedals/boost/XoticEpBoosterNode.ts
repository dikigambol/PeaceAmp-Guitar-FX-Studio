import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';

/**
 * Xotic EP Booster
 *
 * Authentic Discrete JFET Preamp Circuit Emulation:
 *
 * 1. Legendary Echoplex EP-3 Tape Delay Preamp Heritage:
 *    - Modeled after the discrete Field Effect Transistor (JFET) preamp from the vintage
 *      Maestro Echoplex EP-3, famously used by Eddie Van Halen, Jimmy Page, and Eric Johnson
 *      to sweeten their guitar tone and add addictive harmonic depth.
 *
 * 2. Signature "Secret Sauce" Tone Sweetening:
 *    - Warm low-end body bump (~95 Hz, +2.5 dB) provides authority, punch, and girth to single notes.
 *    - Silky high-mid sparkle (~3.6 kHz, +2.0 dB) brings out articulate pick attack without harshness.
 *    - Natural smooth ultrasonic rolloff above 18 kHz.
 *
 * 3. Discrete JFET Dynamic Response & Soft Compression:
 *    - JFET square-law transfer characteristics produce rich 2nd-order harmonics and tube-like
 *      dynamic feel when digging into strings.
 *
 * 4. Gain Staging (+3 dB to +20 dB):
 *    - Like the physical pedal, provides +3 dB of sweet analog pre-buffering even at minimum,
 *      sweeping up to +20 dB of massive lead boost at maximum.
 */
export class XoticEpBoosterNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;

  // Bypass crossfaders
  private bypassDry: GainNode;
  private bypassWet: GainNode;

  // EP-3 Voicing filters
  private subCut: BiquadFilterNode;
  private ep3BodyPeak: BiquadFilterNode;
  private ep3SparklePeak: BiquadFilterNode;
  private hfCeiling: BiquadFilterNode;

  // JFET Gain & Saturation
  private boostGain: GainNode;
  private jfetShaper: WaveShaperNode;
  private dcBlocker: BiquadFilterNode;

  private params: Record<string, number> = {
    gain: 5.0, // 0 to 10 (+3 dB to +20 dB boost)
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

    // 1. Transparent Sub-Cut (18 Hz)
    this.subCut = ctx.createBiquadFilter();
    this.subCut.type = 'highpass';
    this.subCut.frequency.setValueAtTime(18, ctx.currentTime);
    this.subCut.Q.setValueAtTime(0.707, ctx.currentTime);

    // 2. Echoplex EP-3 Low-End Body Peak (~95 Hz, +2.5 dB, Q=0.8)
    this.ep3BodyPeak = ctx.createBiquadFilter();
    this.ep3BodyPeak.type = 'peaking';
    this.ep3BodyPeak.frequency.setValueAtTime(95, ctx.currentTime);
    this.ep3BodyPeak.Q.setValueAtTime(0.8, ctx.currentTime);
    this.ep3BodyPeak.gain.setValueAtTime(2.5, ctx.currentTime);

    // 3. EP-3 High-Mid Presence & Sparkle (~3600 Hz, +2.0 dB, Q=1.0)
    this.ep3SparklePeak = ctx.createBiquadFilter();
    this.ep3SparklePeak.type = 'peaking';
    this.ep3SparklePeak.frequency.setValueAtTime(3600, ctx.currentTime);
    this.ep3SparklePeak.Q.setValueAtTime(1.0, ctx.currentTime);
    this.ep3SparklePeak.gain.setValueAtTime(2.0, ctx.currentTime);

    // 4. Smooth HF Taming Filter (18 kHz)
    this.hfCeiling = ctx.createBiquadFilter();
    this.hfCeiling.type = 'lowpass';
    this.hfCeiling.frequency.setValueAtTime(18000, ctx.currentTime);
    this.hfCeiling.Q.setValueAtTime(0.707, ctx.currentTime);

    // 5. JFET Boost Gain (+3 dB to +20 dB)
    this.boostGain = ctx.createGain();

    // 6. Discrete JFET Asymmetric Saturation Curve
    this.jfetShaper = ctx.createWaveShaper();
    this.jfetShaper.oversample = '4x';
    this.jfetShaper.curve = this.createJfetSaturationCurve(4096) as Float32Array<ArrayBuffer>;

    // 7. DC Blocker
    this.dcBlocker = createDcBlocker(ctx, 16);

    // Audio Graph:
    // Dry Path
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    // Wet Path:
    // inputNode -> bypassWet -> subCut -> ep3BodyPeak -> ep3SparklePeak -> hfCeiling -> boostGain -> jfetShaper -> dcBlocker -> outputNode
    this.inputNode.connect(this.bypassWet);
    this.bypassWet.connect(this.subCut);
    this.subCut.connect(this.ep3BodyPeak);
    this.ep3BodyPeak.connect(this.ep3SparklePeak);
    this.ep3SparklePeak.connect(this.hfCeiling);
    this.hfCeiling.connect(this.boostGain);
    this.boostGain.connect(this.jfetShaper);
    this.jfetShaper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputNode);

    this.applyParams(true);
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx, 0.001);
  }

  /**
   * JFET Discrete Preamp Asymmetric Saturation:
   * JFET transistors conduct with quadratic (square-law) curvature,
   * producing musical second-order harmonic richness and warm dynamic compression.
   */
  private createJfetSaturationCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    const posKnee = 0.82;
    const negKnee = 0.65; // Asymmetric headroom producing 2nd harmonic warmth

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / (samples - 1) - 1; // -1 to +1

      if (x >= 0) {
        if (x <= posKnee) {
          curve[i] = x;
        } else {
          const over = x - posKnee;
          curve[i] = posKnee + 0.16 * Math.tanh(over / 0.16);
        }
      } else {
        const absX = -x;
        if (absX <= negKnee) {
          curve[i] = x;
        } else {
          const over = absX - negKnee;
          curve[i] = -(negKnee + 0.22 * Math.tanh(over / 0.22));
        }
      }
    }
    return curve;
  }

  private applyParams(immediate = false): void {
    const now = this.ctx.currentTime;
    const tc = immediate ? 0.001 : 0.015;

    // GAIN: 0 to 10 -> +3 dB to +20 dB boost
    const rawVal = this.params.gain ?? 5.0;
    const norm = Math.max(0, Math.min(10, rawVal)) / 10;

    // Authentic Echoplex EP-3 sweep: +3 dB baseline up to +20 dB
    const gainDb = 3.0 + Math.pow(norm, 1.2) * 17.0;
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
      this.ep3BodyPeak.disconnect();
      this.ep3SparklePeak.disconnect();
      this.hfCeiling.disconnect();
      this.boostGain.disconnect();
      this.jfetShaper.disconnect();
      this.dcBlocker.disconnect();
    } catch {
      // AudioNode already disconnected
    }
  }
}
