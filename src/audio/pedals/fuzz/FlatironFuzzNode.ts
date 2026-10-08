import type { AudioPedalNode } from '../../../types/pedal';
import { levelToGain, applyBypassCrossfade, driveDependentTrimDb, createDcBlocker } from '../dspUtils';

/**
 * Output trim (dB) calibrated so Vol=5 is ~unity loudness at default settings.
 */
const TRIM_UNITY_DB = -1.5;
const TRIM_SAT_DB = -12.5;

/**
 * Electro-Harmonix Flatiron Fuzz (2018)
 * 
 * Authentic analog circuit model of the classic op-amp (LM308/OP07) hard-clipping fuzz-distortion:
 *   - VOL: Controls master output loudness.
 *   - DRIVE: Non-inverting op-amp gain with twin frequency-dependent feedback paths (60 Hz & 1.5 kHz)
 *            ensuring tight, punchy low-end and high-gain sustain.
 *   - FILTER: Signature reverse low-pass filter!
 *             Counter-clockwise (0) is wide open and bright; turning clockwise (10) rolls off highs
 *             for warm, creamy, vintage woolly lead tones.
 *   - Hard symmetrical silicon diode clipping to ground (Vf ~0.65V), squaring the wave for aggressive fuzz edge.
 */
export class FlatironFuzzNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;

  // Pre-filtering (op-amp twin RC feedback network)
  private bassRollOff: BiquadFilterNode;
  private midTighten: BiquadFilterNode;
  private driveGain: GainNode;

  // Hard Silicon Diode Shaper
  private diodeShaper: WaveShaperNode;
  private dcBlocker: BiquadFilterNode;

  // Reverse Low-Pass Filter
  private reverseFilter: BiquadFilterNode;
  private postGain: GainNode;

  // Bypass crossfade
  private wetGain: GainNode;
  private dryGain: GainNode;
  private isEnabled = true;

  // Parameters (0 - 10)
  private volVal = 5;
  private filterVal = 5;
  private driveVal = 6;

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.vol !== undefined) this.volVal = initialParams.vol;
    if (initialParams?.filter !== undefined) this.filterVal = initialParams.filter;
    if (initialParams?.drive !== undefined) this.driveVal = initialParams.drive;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. High-pass network ahead of clipper (tightens bottom end)
    this.bassRollOff = ctx.createBiquadFilter();
    this.bassRollOff.type = 'highpass';
    this.bassRollOff.frequency.setValueAtTime(60, ctx.currentTime);
    this.bassRollOff.Q.setValueAtTime(0.707, ctx.currentTime);

    this.midTighten = ctx.createBiquadFilter();
    this.midTighten.type = 'highpass';
    this.midTighten.frequency.setValueAtTime(560, ctx.currentTime);
    this.midTighten.Q.setValueAtTime(0.707, ctx.currentTime);

    // 2. Drive Gain Stage
    this.driveGain = ctx.createGain();

    // 3. Symmetrical Hard Silicon Diode Shaper
    this.diodeShaper = ctx.createWaveShaper();
    this.diodeShaper.curve = this.createHardDiodeCurve(4096) as Float32Array<ArrayBuffer>;
    this.diodeShaper.oversample = '4x';

    // 4. DC Blocker
    this.dcBlocker = createDcBlocker(ctx, 16);

    // 5. Signature Reverse Low-Pass Filter (650 Hz to 8500 Hz sweep)
    this.reverseFilter = ctx.createBiquadFilter();
    this.reverseFilter.type = 'lowpass';
    this.reverseFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    // 6. Post Gain / Volume
    this.postGain = ctx.createGain();

    // Wet / Dry for seamless click-free true bypass
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(enabled ? 1.0 : 0.0, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(enabled ? 0.0 : 1.0, ctx.currentTime);

    // Graph Wiring
    // Dry Path
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Wet Path
    this.inputNode.connect(this.bassRollOff);
    this.bassRollOff.connect(this.midTighten);
    this.midTighten.connect(this.driveGain);
    this.driveGain.connect(this.diodeShaper);
    this.diodeShaper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.reverseFilter);
    this.reverseFilter.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);

    this.recalculate();
  }

  /**
   * Symmetrical hard silicon diode clipping curve (Vf ~0.65V).
   * Generates pronounced odd-order harmonics and square-wave fuzzy sustain.
   */
  private createHardDiodeCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    const knee = 0.45;
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      const absX = Math.abs(x);
      const sign = x < 0 ? -1 : 1;
      // Harder knee than germanium (sharp threshold)
      const clipped = (absX / knee) / Math.pow(1 + Math.pow(absX / knee, 3.8), 1 / 3.8);
      curve[i] = sign * Math.min(1.0, clipped * knee * 1.5);
    }
    return curve;
  }

  private recalculate(): void {
    const now = this.ctx.currentTime;

    // Drive Gain (1.5x up to 48x)
    const driveNorm = Math.max(0, Math.min(10, this.driveVal)) / 10;
    const driveMult = 1.5 + 46.5 * Math.pow(driveNorm, 1.9);
    this.driveGain.gain.setTargetAtTime(driveMult, now, 0.02);

    // Filter knob is REVERSE: 0 is wide open (brightest), 10 is dark
    const filterNorm = Math.max(0, Math.min(10, this.filterVal)) / 10;
    // Exponential sweep from 8500 Hz down to 650 Hz
    const cutoffHz = 8500 * Math.pow(650 / 8500, filterNorm);
    this.reverseFilter.frequency.setTargetAtTime(cutoffHz, now, 0.02);

    // Dynamic output trim and volume
    const trim = driveDependentTrimDb(driveMult, TRIM_UNITY_DB, TRIM_SAT_DB, 10);
    const volGain = levelToGain(this.volVal, trim);
    this.postGain.gain.setTargetAtTime(volGain, now, 0.02);
  }

  public updateParameter(paramId: string, value: number): void {
    if (paramId === 'vol') this.volVal = value;
    else if (paramId === 'filter') this.filterVal = value;
    else if (paramId === 'drive') this.driveVal = value;

    this.recalculate();
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
      this.bassRollOff.disconnect();
      this.midTighten.disconnect();
      this.driveGain.disconnect();
      this.diodeShaper.disconnect();
      this.dcBlocker.disconnect();
      this.reverseFilter.disconnect();
      this.postGain.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
}
