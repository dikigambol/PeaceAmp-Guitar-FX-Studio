import type { AudioPedalNode } from '../../../types/pedal';
import { levelToGain, applyBypassCrossfade, driveDependentTrimDb, createDcBlocker } from '../dspUtils';

/**
 * Output trim (dB) calibrated so Volume=5 is ~unity loudness at default Fuzz=6.
 */
const TRIM_UNITY_DB = -1.2;
const TRIM_SAT_DB = -9.8;

/**
 * Arbiter / Dunlop Germanium Fuzz Face (1966)
 * 
 * Authentic analog circuit model of the 2-transistor Germanium PNP (NKT275 / AC128) fuzz:
 *   - Input loading is approximated by a fixed ~4.5 kHz low-pass; the real ~10 kΩ input
 *     impedance and its interaction with the guitar pickup are not modeled.
 *   - Reverse-log 1 kΩ Fuzz pot: gentle overdrive at 0-6, transitioning into thick, saturated singing fuzz at 8-10.
 *   - Germanium soft-knee asymmetric transfer curve (Vf ~0.28V) with smooth compression and rich harmonic bloom.
 *   - No dynamic bias model: guitar-volume cleanup is only the natural reduction of clipping
 *     as the input level drops, not the bias/input-impedance shift of the real circuit.
 */
export class FuzzFaceNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;

  // Input coupling and loading
  private inputHighpass: BiquadFilterNode;
  private pickupLoadingFilter: BiquadFilterNode;
  private inputPreGain: GainNode;

  // Q1 & Q2 Germanium Fuzz Core
  private fuzzGain: GainNode;
  private geShaper: WaveShaperNode;
  private dcBlocker: BiquadFilterNode;

  // Vintage Germanium Miller warmth roll-off
  private warmthLowpass: BiquadFilterNode;
  private postGain: GainNode;

  // Bypass crossfade
  private wetGain: GainNode;
  private dryGain: GainNode;
  private isEnabled = true;

  // Parameters (0 - 10)
  private volumeVal = 5;
  private fuzzVal = 6;

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.volume !== undefined) this.volumeVal = initialParams.volume;
    if (initialParams?.fuzz !== undefined) this.fuzzVal = initialParams.fuzz;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Input coupling (2.2 uF cap): high-pass around 35 Hz to preserve woolly bottom-end
    this.inputHighpass = ctx.createBiquadFilter();
    this.inputHighpass.type = 'highpass';
    this.inputHighpass.frequency.setValueAtTime(35, ctx.currentTime);
    this.inputHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    // 2. Fixed pickup-loading approximation (4.5 kHz low-pass, not a real impedance model)
    this.pickupLoadingFilter = ctx.createBiquadFilter();
    this.pickupLoadingFilter.type = 'lowpass';
    this.pickupLoadingFilter.frequency.setValueAtTime(4500, ctx.currentTime);
    this.pickupLoadingFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    this.inputPreGain = ctx.createGain();
    this.inputPreGain.gain.setValueAtTime(1.8, ctx.currentTime);

    // 3. Fuzz Gain stage
    this.fuzzGain = ctx.createGain();

    // 4. Germanium Asymmetric Shaper
    this.geShaper = ctx.createWaveShaper();
    this.geShaper.curve = this.createGermaniumFuzzCurve(4096) as Float32Array<ArrayBuffer>;
    this.geShaper.oversample = '4x';

    // 5. DC Blocker
    this.dcBlocker = createDcBlocker(ctx, 16);

    // 6. Warmth low-pass (Germanium transistor collector-base capacitance)
    this.warmthLowpass = ctx.createBiquadFilter();
    this.warmthLowpass.type = 'lowpass';
    this.warmthLowpass.frequency.setValueAtTime(4200, ctx.currentTime);
    this.warmthLowpass.Q.setValueAtTime(0.707, ctx.currentTime);

    // 7. Post-Gain / Level
    this.postGain = ctx.createGain();

    // Wet / Dry for seamless click-free true bypass
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(enabled ? 1.0 : 0.0, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(enabled ? 0.0 : 1.0, ctx.currentTime);

    // Audio Graph Wiring
    // Dry Path
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Wet Path
    this.inputNode.connect(this.inputHighpass);
    this.inputHighpass.connect(this.pickupLoadingFilter);
    this.pickupLoadingFilter.connect(this.inputPreGain);
    this.inputPreGain.connect(this.fuzzGain);
    this.fuzzGain.connect(this.geShaper);
    this.geShaper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.warmthLowpass);
    this.warmthLowpass.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);

    this.recalculate();
  }

  /**
   * Germanium transistor transfer curve:
   * Dynamic asymmetric PNP operating point bias, soft saturation knee, and glassy cleanup.
   */
  private createGermaniumFuzzCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    const kneePos = 0.30;
    const kneeNeg = 0.22;
    // Asymmetric PNP operating point bias (-0.035V baseline DC offset)
    const biasShift = -0.035;

    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1; // -1 to +1
      const xBiased = x + biasShift * (1 - Math.exp(-Math.abs(x) * 3.5));

      if (xBiased >= 0) {
        // Positive half-wave: soft Germanium saturation with gradual knee
        const scaled = xBiased / kneePos;
        curve[i] = (kneePos * scaled) / Math.pow(1 + Math.pow(scaled, 2.3), 1 / 2.3);
      } else {
        // Negative half-wave: earlier conduction into hard cutoff
        const scaled = -xBiased / kneeNeg;
        curve[i] = -(kneeNeg * scaled) / Math.pow(1 + Math.pow(scaled, 1.7), 1 / 1.7);
      }
    }
    return curve;
  }

  private recalculate(): void {
    const now = this.ctx.currentTime;

    // Fuzz pot (1k reverse audio taper: most of the gain is bunched at 7-10)
    const norm = Math.max(0, Math.min(10, this.fuzzVal)) / 10;
    // Reverse-log curve emulation: 1.2x at 0 up to 48x at 10
    const fuzzMult = 1.2 + 46.8 * Math.pow(norm, 2.6);
    this.fuzzGain.gain.setTargetAtTime(fuzzMult, now, 0.02);

    // As fuzz increases, Miller feedback narrows bandwidth; at low fuzz / volume roll-off,
    // the treble opens wide up to ~7.5 kHz for the legendary crystalline glassy clean chime.
    const warmthHz = 7500 - norm * 3700; // 7.5 kHz down to 3.8 kHz
    this.warmthLowpass.frequency.setTargetAtTime(warmthHz, now, 0.02);

    // Dynamic output trim and volume
    const trim = driveDependentTrimDb(fuzzMult, TRIM_UNITY_DB, TRIM_SAT_DB, 12);
    const volumeGain = levelToGain(this.volumeVal, trim);
    this.postGain.gain.setTargetAtTime(volumeGain, now, 0.02);
  }

  public updateParameter(paramId: string, value: number): void {
    if (paramId === 'volume') {
      this.volumeVal = value;
      this.recalculate();
    } else if (paramId === 'fuzz') {
      this.fuzzVal = value;
      this.recalculate();
    }
  }

  public setEnabled(enabled: boolean): void {
    if (this.isEnabled === enabled) return;
    this.isEnabled = enabled;
    applyBypassCrossfade(this.wetGain, this.dryGain, enabled, this.ctx);
  }

  public dispose(): void {
    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.dryGain.disconnect();
      this.wetGain.disconnect();
      this.inputHighpass.disconnect();
      this.pickupLoadingFilter.disconnect();
      this.inputPreGain.disconnect();
      this.fuzzGain.disconnect();
      this.geShaper.disconnect();
      this.dcBlocker.disconnect();
      this.warmthLowpass.disconnect();
      this.postGain.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
}
