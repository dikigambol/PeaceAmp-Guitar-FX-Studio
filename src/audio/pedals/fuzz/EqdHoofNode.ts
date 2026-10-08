import type { AudioPedalNode } from '../../../types/pedal';
import { levelToGain, applyBypassCrossfade, driveDependentTrimDb, createDcBlocker } from '../dspUtils';

/**
 * Output trim (dB) calibrated so Level=5 delivers authoritative unity loudness
 * with the massive output boost headroom the real Hoof is famous for.
 */
const TRIM_UNITY_DB = 0.0;
const TRIM_SAT_DB = -7.0;

/**
 * EarthQuaker Devices Hoof (2006)
 * 
 * Authentic analog circuit model of the hybrid Germanium / Silicon Green Russian Muff:
 *   - Q1: Input stage with Russian Muff 60 Hz coupling cap and 4.6 kHz RF filter.
 *   - Q2 (Stage 1): Silicon diode pair clipping with 3.2 kHz Miller feedback capacitor.
 *   - Q3 (Stage 2): Hand-matched Germanium saturation stage delivering rich, velvety compression
 *                   and blooming sustain without harsh bee-in-a-jar fizz.
 *   - Tone & Shift Stack:
 *       * TONE: Bridges low-end weight (320 Hz) and treble cut (2.2 kHz).
 *       * SHIFT: Sweeps mid contour from classic Russian deep scoop (-8.5 dB at 1 kHz)
 *                to pronounced punchy mid-boost (+6.5 dB at 820 Hz) to cut through any band mix.
 *   - Anti-Fizz Ceiling: 4.8 kHz smooth analog ceiling replicating vintage transistor recovery.
 *   - Linear small-signal transfer eliminates idle hum/noise amplification when not playing.
 */
export class EqdHoofNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;

  // Q1 Input Pre-Conditioning
  private inputHighpass: BiquadFilterNode;
  private inputRfFilter: BiquadFilterNode;
  private q1PreGain: GainNode;

  // Q2 Stage 1 (Fuzz gain + Silicon diode pair + 3.2 kHz Miller feedback)
  private fuzzGain: GainNode;
  private siliconShaper: WaveShaperNode;
  private stage1MillerFilter: BiquadFilterNode;

  // Q3 Stage 2 (Cascading Germanium hybrid compression + 3.4 kHz Miller feedback)
  private interstageGain: GainNode;
  private germaniumShaper: WaveShaperNode;
  private stage2MillerFilter: BiquadFilterNode;

  // DC Blocker
  private dcBlocker: BiquadFilterNode;

  // Hoof Tone & Shift Stack
  private toneLowShelf: BiquadFilterNode;
  private toneHighShelf: BiquadFilterNode;
  private shiftMidFilter: BiquadFilterNode;

  // Q4 Recovery Stage Anti-Fizz Filter
  private antiFizzFilter: BiquadFilterNode;
  private postGain: GainNode;

  // Bypass crossfade
  private wetGain: GainNode;
  private dryGain: GainNode;
  private isEnabled = true;

  // Parameters (0 - 10)
  private levelVal = 5;
  private fuzzVal = 6;
  private toneVal = 5;
  private shiftVal = 5;

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.level !== undefined) this.levelVal = initialParams.level;
    if (initialParams?.fuzz !== undefined) this.fuzzVal = initialParams.fuzz;
    if (initialParams?.tone !== undefined) this.toneVal = initialParams.tone;
    if (initialParams?.shift !== undefined) this.shiftVal = initialParams.shift;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Q1 Input Stage: 60 Hz coupling cap + 4.6 kHz RF filter + clean transistor buffer boost
    this.inputHighpass = ctx.createBiquadFilter();
    this.inputHighpass.type = 'highpass';
    this.inputHighpass.frequency.setValueAtTime(60, ctx.currentTime);
    this.inputHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    this.inputRfFilter = ctx.createBiquadFilter();
    this.inputRfFilter.type = 'lowpass';
    this.inputRfFilter.frequency.setValueAtTime(4600, ctx.currentTime);
    this.inputRfFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    this.q1PreGain = ctx.createGain();
    this.q1PreGain.gain.setValueAtTime(2.4, ctx.currentTime);

    // 2. Q2 Stage 1: Fuzz pot controls drive into silicon diode clipper
    this.fuzzGain = ctx.createGain();
    this.siliconShaper = ctx.createWaveShaper();
    this.siliconShaper.curve = this.createSiliconDiodeCurve(8192, 0.62, 0.58) as Float32Array<ArrayBuffer>;
    this.siliconShaper.oversample = '4x';

    // 470pF Miller feedback capacitor (smooths high-frequency spikes above 3.2 kHz)
    this.stage1MillerFilter = ctx.createBiquadFilter();
    this.stage1MillerFilter.type = 'lowpass';
    this.stage1MillerFilter.frequency.setValueAtTime(3200, ctx.currentTime);
    this.stage1MillerFilter.Q.setValueAtTime(0.65, ctx.currentTime);

    // 3. Q3 Stage 2: Cascading Germanium hybrid clipping stage (warm, singing, velvety sustain)
    this.interstageGain = ctx.createGain();
    this.interstageGain.gain.setValueAtTime(2.5, ctx.currentTime);

    this.germaniumShaper = ctx.createWaveShaper();
    this.germaniumShaper.curve = this.createGermaniumHybridCurve(8192, 0.48, 0.42) as Float32Array<ArrayBuffer>;
    this.germaniumShaper.oversample = '4x';

    // Second Miller feedback cap (rolls off above 3.4 kHz)
    this.stage2MillerFilter = ctx.createBiquadFilter();
    this.stage2MillerFilter.type = 'lowpass';
    this.stage2MillerFilter.frequency.setValueAtTime(3400, ctx.currentTime);
    this.stage2MillerFilter.Q.setValueAtTime(0.65, ctx.currentTime);

    // 4. DC Blocker
    this.dcBlocker = createDcBlocker(ctx, 16);

    // 5. Authentic Hoof Tone & Shift Stack
    // Low-shelf (320 Hz guitar body & punch)
    this.toneLowShelf = ctx.createBiquadFilter();
    this.toneLowShelf.type = 'lowshelf';
    this.toneLowShelf.frequency.setValueAtTime(320, ctx.currentTime);

    // High-shelf (2200 Hz harmonic bite & clarity)
    this.toneHighShelf = ctx.createBiquadFilter();
    this.toneHighShelf.type = 'highshelf';
    this.toneHighShelf.frequency.setValueAtTime(2200, ctx.currentTime);

    // Shift Mid Filter (820 - 1000 Hz peaking EQ)
    this.shiftMidFilter = ctx.createBiquadFilter();
    this.shiftMidFilter.type = 'peaking';
    this.shiftMidFilter.frequency.setValueAtTime(900, ctx.currentTime);
    this.shiftMidFilter.Q.setValueAtTime(0.95, ctx.currentTime);

    // 6. Q4 Recovery Anti-Fizz Filter (4.8 kHz smooth analog ceiling)
    this.antiFizzFilter = ctx.createBiquadFilter();
    this.antiFizzFilter.type = 'lowpass';
    this.antiFizzFilter.frequency.setValueAtTime(4800, ctx.currentTime);
    this.antiFizzFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    // 7. Output Level
    this.postGain = ctx.createGain();

    // Click-free True Bypass crossfade nodes
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(enabled ? 1.0 : 0.0, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(enabled ? 0.0 : 1.0, ctx.currentTime);

    // Connect Bypass path:
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Connect Wet Signal Path:
    // Input -> Highpass -> RF Filter -> Q1 PreGain -> Fuzz Gain -> Silicon Shaper -> Miller 1 ->
    // Interstage Gain -> Germanium Shaper -> Miller 2 -> DC Blocker -> Tone LowShelf -> Tone HighShelf ->
    // Shift MidFilter -> Anti-Fizz Filter -> PostGain -> WetGain -> Output
    this.inputNode.connect(this.inputHighpass);
    this.inputHighpass.connect(this.inputRfFilter);
    this.inputRfFilter.connect(this.q1PreGain);
    this.q1PreGain.connect(this.fuzzGain);
    this.fuzzGain.connect(this.siliconShaper);
    this.siliconShaper.connect(this.stage1MillerFilter);
    this.stage1MillerFilter.connect(this.interstageGain);
    this.interstageGain.connect(this.germaniumShaper);
    this.germaniumShaper.connect(this.stage2MillerFilter);
    this.stage2MillerFilter.connect(this.dcBlocker);
    this.dcBlocker.connect(this.toneLowShelf);
    this.toneLowShelf.connect(this.toneHighShelf);
    this.toneHighShelf.connect(this.shiftMidFilter);
    this.shiftMidFilter.connect(this.antiFizzFilter);
    this.antiFizzFilter.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);

    this.applyParameters(true);
  }

  /**
   * Stage 1: Fast silicon diode clipping curve (1N4148 pair).
   * Tight, punchy distortion edge with clean small-signal noise floor.
   */
  private createSiliconDiodeCurve(samples: number, vPos = 0.62, vNeg = 0.58): Float32Array {
    const curve = new Float32Array(samples);
    const half = samples / 2;

    for (let i = 0; i < samples; i++) {
      const x = (i - half) / half;

      // Small-signal transparency eliminates background hum & hiss amplification
      if (Math.abs(x) < 0.04) {
        curve[i] = x * 0.95;
        continue;
      }

      if (x >= 0) {
        const scaled = x / vPos;
        const compressed = scaled / Math.pow(1 + Math.pow(scaled, 2.4), 1 / 2.4);
        curve[i] = vPos * compressed;
      } else {
        const scaled = Math.abs(x) / vNeg;
        const compressed = scaled / Math.pow(1 + Math.pow(scaled, 2.4), 1 / 2.4);
        curve[i] = -vNeg * compressed;
      }
    }
    return curve;
  }

  /**
   * Stage 2: Hand-matched Germanium/Silicon hybrid diode curve.
   * Softer knee (exponent 1.8), warm saturation, and singing, blooming sustain.
   */
  private createGermaniumHybridCurve(samples: number, vPos = 0.48, vNeg = 0.42): Float32Array {
    const curve = new Float32Array(samples);
    const half = samples / 2;

    for (let i = 0; i < samples; i++) {
      const x = (i - half) / half;

      if (Math.abs(x) < 0.04) {
        curve[i] = x * 0.95;
        continue;
      }

      if (x >= 0) {
        const scaled = x / vPos;
        // Soft Germanium rounding curve
        const compressed = scaled / Math.pow(1 + Math.pow(scaled, 1.8), 1 / 1.8);
        curve[i] = vPos * compressed;
      } else {
        const scaled = Math.abs(x) / vNeg;
        const compressed = scaled / Math.pow(1 + Math.pow(scaled, 1.7), 1 / 1.7);
        curve[i] = -vNeg * compressed;
      }
    }
    return curve;
  }

  private applyParameters(immediate = false): void {
    const now = this.ctx.currentTime;
    const rampTime = immediate ? 0 : 0.02;

    // 1. Fuzz Potentiometer:
    // Smooth transition from rich, woolly edge up to thunderous, infinite Green Russian fuzz
    const fuzzNorm = Math.max(0, Math.min(10, this.fuzzVal)) / 10;
    const stage1Drive = 1.6 + Math.pow(fuzzNorm, 1.6) * 18.4; // 1.6x up to 20.0x

    if (immediate) {
      this.fuzzGain.gain.setValueAtTime(stage1Drive, now);
    } else {
      this.fuzzGain.gain.setTargetAtTime(stage1Drive, now, rampTime);
    }

    // 2. Tone Tilt:
    // Tone = 0: Thunderous, deep Russian Muff bass (+9 dB at 320 Hz, -9 dB at 2.2 kHz)
    // Tone = 5: Balanced Russian Muff body
    // Tone = 10: Searing, singing harmonic bite (+9 dB at 2.2 kHz, -9 dB at 320 Hz)
    const toneNorm = Math.max(0, Math.min(10, this.toneVal)) / 10;
    const lowGain = (1 - toneNorm) * 18 - 9;
    const highGain = toneNorm * 18 - 9;

    if (immediate) {
      this.toneLowShelf.gain.setValueAtTime(lowGain, now);
      this.toneHighShelf.gain.setValueAtTime(highGain, now);
    } else {
      this.toneLowShelf.gain.setTargetAtTime(lowGain, now, rampTime);
      this.toneHighShelf.gain.setTargetAtTime(highGain, now, rampTime);
    }

    // 3. Signature EQD Shift Control:
    // Shift = 0: Classic Russian Muff deep mid-scoop (-8.5 dB at 1000 Hz)
    // Shift = 5: Musical modern scoop (-2.5 dB at 900 Hz)
    // Shift = 10: Searing, punchy mid-boost (+6.5 dB at 820 Hz) that cuts right through heavy mixes
    const shiftNorm = Math.max(0, Math.min(10, this.shiftVal)) / 10;
    const midFreq = 1000 - shiftNorm * 180; // 1000 Hz down to 820 Hz
    const midGain = -8.5 + shiftNorm * 15.0; // -8.5 dB up to +6.5 dB

    if (immediate) {
      this.shiftMidFilter.frequency.setValueAtTime(midFreq, now);
      this.shiftMidFilter.gain.setValueAtTime(midGain, now);
    } else {
      this.shiftMidFilter.frequency.setTargetAtTime(midFreq, now, rampTime);
      this.shiftMidFilter.gain.setTargetAtTime(midGain, now, rampTime);
    }

    // 4. Master Level:
    // Dynamic output trim preserves clarity and authority without squashing volume
    const trim = driveDependentTrimDb(stage1Drive, TRIM_UNITY_DB, TRIM_SAT_DB, 8);
    const levelGain = levelToGain(this.levelVal, trim);

    if (immediate) {
      this.postGain.gain.setValueAtTime(levelGain, now);
    } else {
      this.postGain.gain.setTargetAtTime(levelGain, now, rampTime);
    }
  }

  public updateParameter(paramId: string, value: number): void {
    if (paramId === 'level') this.levelVal = value;
    else if (paramId === 'fuzz') this.fuzzVal = value;
    else if (paramId === 'tone') this.toneVal = value;
    else if (paramId === 'shift') this.shiftVal = value;

    this.applyParameters(false);
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
      this.inputRfFilter.disconnect();
      this.q1PreGain.disconnect();
      this.fuzzGain.disconnect();
      this.siliconShaper.disconnect();
      this.stage1MillerFilter.disconnect();
      this.interstageGain.disconnect();
      this.germaniumShaper.disconnect();
      this.stage2MillerFilter.disconnect();
      this.dcBlocker.disconnect();
      this.toneLowShelf.disconnect();
      this.toneHighShelf.disconnect();
      this.shiftMidFilter.disconnect();
      this.antiFizzFilter.disconnect();
      this.postGain.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
}
