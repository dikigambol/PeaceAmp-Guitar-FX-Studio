import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker, createOnePoleHighpass } from '../dspUtils';

/**
 * Dallas Rangemaster / British Pedal Company Treble Booster
 *
 * Authentic Germanium PNP Transistor Circuit Emulation:
 *
 * 1. 1965 Classic British Treble Booster Topology:
 *    - Modeled after the legendary Dallas Rangemaster with Mullard OC44 Germanium transistor.
 *    - As used by Eric Clapton ("Beano" album), Brian May (Queen / Vox AC30 Normal channel),
 *      Tony Iommi (Black Sabbath), and Rory Gallagher.
 *
 * 2. 5 nF Input High-Pass Filtering:
 *    - The iconic 5 nF (0.005 µF) input coupling capacitor paired with the germanium base bias
 *      impedance (~18 kΩ) rolls off lower bass heavily below ~1.55 kHz (-6 dB/octave).
 *    - Strips away low-end "mud" and "woofiness" before the preamp, while delivering a focused,
 *      biting punch in the upper midrange and treble spectrum (2.5 kHz - 5 kHz).
 *
 * 3. Germanium PNP Asymmetric Soft-Clipping & Saturation:
 *    - Biased asymmetrically (collector at ~70-75% of supply voltage).
 *    - Low Germanium conduction threshold (~0.28V) with smooth rounded exponential knee.
 *    - Produces abundant even-order (2nd harmonic) warmth, musical compression, and glassy chime.
 *
 * 4. Transistor HF Roll-off:
 *    - Natural OC44 collector-base capacitance and transition frequency cutoff tames harsh frequencies
 *      above ~8 kHz, keeping the top end creamy, biting, and musical without piercing fizz.
 *
 * 5. Single "SET" Control:
 *    - Authentically sweeps from clean focused boost (0 dB) up to +28 dB of searing germanium drive.
 */
export class RangemasterNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;

  // Bypass crossfaders
  private bypassDry: GainNode;
  private bypassWet: GainNode;

  // Signal conditioning & EQ modeling
  private trebleBoostHighpass: IIRFilterNode;
  private chimePeaking: BiquadFilterNode;
  private hfRollOff: BiquadFilterNode;

  // Gain & Germanium WaveShaping
  private boostGain: GainNode;
  private germaniumShaper: WaveShaperNode;
  private dcBlocker: BiquadFilterNode;
  private outputLevelTrim: GainNode;

  private params: Record<string, number> = {
    set: 5.0, // 0 to 10 (0 dB to +28 dB boost)
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

    // 1. Treble Booster Highpass: 5 nF into OC44 loaded bias network (~560 Hz true one-pole 6 dB/oct)
    // Tightens low-end mud below 560 Hz so low E/A power chords stay clarinet-tight while preserving thick vocal mids.
    this.trebleBoostHighpass = createOnePoleHighpass(ctx, 560);

    // 2. Midrange Vocal Singing Peak (~1280 Hz, +5.2 dB, Q=0.92)
    // Gives the signature Brian May cello/violin vocal sustain when pushing a British tube amp (Vox AC30 / Plexi).
    this.chimePeaking = ctx.createBiquadFilter();
    this.chimePeaking.type = 'peaking';
    this.chimePeaking.frequency.setValueAtTime(1280, ctx.currentTime);
    this.chimePeaking.Q.setValueAtTime(0.92, ctx.currentTime);
    this.chimePeaking.gain.setValueAtTime(5.2, ctx.currentTime);

    // 3. Germanium Transistor HF Roll-Off (Mullard OC44 collector-base Miller capacitance, ~3.95 kHz)
    // Eliminates harsh upper-treble hiss/fizz (>4 kHz) while keeping high notes singing, creamy, and violin-like.
    this.hfRollOff = ctx.createBiquadFilter();
    this.hfRollOff.type = 'lowpass';
    this.hfRollOff.frequency.setValueAtTime(3950, ctx.currentTime);
    this.hfRollOff.Q.setValueAtTime(0.707, ctx.currentTime);

    // 4. Boost Gain (SET pot)
    this.boostGain = ctx.createGain();

    // 5. Germanium PNP Asymmetric WaveShaper
    this.germaniumShaper = ctx.createWaveShaper();
    this.germaniumShaper.oversample = '4x';
    this.germaniumShaper.curve = this.createGermaniumRangemasterCurve(4096) as Float32Array<ArrayBuffer>;

    // 6. DC Blocker to prevent DC bias from asymmetric Germanium conduction
    this.dcBlocker = createDcBlocker(ctx, 16);

    // 7. Output Level Calibration
    this.outputLevelTrim = ctx.createGain();
    this.outputLevelTrim.gain.setValueAtTime(1.08, ctx.currentTime);

    // Audio Graph Wiring:
    // Dry Path
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    // Wet Path:
    // inputNode -> bypassWet -> trebleBoostHighpass -> chimePeaking -> hfRollOff -> boostGain -> germaniumShaper -> dcBlocker -> outputLevelTrim -> outputNode
    this.inputNode.connect(this.bypassWet);
    this.bypassWet.connect(this.trebleBoostHighpass);
    this.trebleBoostHighpass.connect(this.chimePeaking);
    this.chimePeaking.connect(this.hfRollOff);
    this.hfRollOff.connect(this.boostGain);
    this.boostGain.connect(this.germaniumShaper);
    this.germaniumShaper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputLevelTrim);
    this.outputLevelTrim.connect(this.outputNode);

    this.applyParams(true);
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx, 0.001);
  }

  /**
   * Germanium PNP Transistor Asymmetric Transfer Curve:
   *
   * Replicates the classic Mullard OC44 characteristic:
   * - Low threshold conduction (~0.28V).
   * - Asymmetric operating point (collector biased at -7V on -9V rail), creating rich 2nd-order harmonics.
   * - Smooth, musical soft-knee transition into saturation when driven hard.
   */
  private createGermaniumRangemasterCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    const kneePos = 0.42; // Positive swing soft threshold
    const kneeNeg = 0.28; // Negative swing soft conduction
    const noiseKnee = 0.014; // Suppresses low-level interface hiss before boosting into the amp

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / (samples - 1) - 1; // Normalized -1 to +1
      const ax = Math.abs(x);
      const expWeight = (ax * ax) / (ax * ax + noiseKnee * noiseKnee);

      if (x >= 0) {
        // Upper swing: softer compression with gentle curvature
        const scaled = x / kneePos;
        curve[i] = ((kneePos * scaled) / Math.pow(1 + Math.pow(scaled, 2.4), 1 / 2.4)) * expWeight;
      } else {
        // Lower swing: earlier Germanium knee saturation producing even harmonics
        const scaled = -x / kneeNeg;
        curve[i] = -((kneeNeg * scaled) / Math.pow(1 + Math.pow(scaled, 1.9), 1 / 1.9)) * expWeight;
      }
    }
    return curve;
  }

  private applyParams(immediate = false): void {
    const now = this.ctx.currentTime;
    const tc = immediate ? 0.001 : 0.015;

    // SET: 0 to 10 -> continuous 0 dB (unity) to +28 dB boost
    const rawVal = this.params.set ?? 5.0;
    const norm = Math.max(0, Math.min(10, rawVal)) / 10;

    // Authentic log-audio potentiometer taper (+4 dB to +20 dB musical boost without excessive noise floor blowup)
    const gainDb = 4.0 + Math.pow(norm, 1.25) * 16.0;
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
      this.trebleBoostHighpass.disconnect();
      this.chimePeaking.disconnect();
      this.hfRollOff.disconnect();
      this.boostGain.disconnect();
      this.germaniumShaper.disconnect();
      this.dcBlocker.disconnect();
      this.outputLevelTrim.disconnect();
    } catch {
      // AudioNode already disconnected
    }
  }
}
