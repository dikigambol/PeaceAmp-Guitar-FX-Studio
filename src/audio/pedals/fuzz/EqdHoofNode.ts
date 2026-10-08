import type { AudioPedalNode } from '../../../types/pedal';
import { levelToGain, applyBypassCrossfade, driveDependentTrimDb, createDcBlocker } from '../dspUtils';

/**
 * Output trim (dB) calibrated so Level=5 is ~unity loudness at default settings.
 */
const TRIM_UNITY_DB = -1.0;
const TRIM_SAT_DB = -11.0;

/**
 * EarthQuaker Devices Hoof (2006)
 * 
 * Authentic analog circuit model of the hybrid Germanium / Silicon Green Russian Muff:
 *   - LEVEL: Master output with massive boost headroom.
 *   - FUZZ: Drive amount through dual-stage hybrid Germanium + Silicon clipping stages.
 *   - TONE: Bass/Treble tilt EQ (counter-clockwise = heavy bass; clockwise = treble bite).
 *   - SHIFT: Signature EQD control! Shifts the mid frequency response:
 *            Counter-clockwise (0) gives deep classic mid-scoop;
 *            Clockwise (10) boosts punchy midrange (+6 dB) to cut through heavy band mixes.
 *   - Hybrid Ge/Si diodes: warmer, more dynamic, less fizzy than standard silicon muffs.
 */
export class EqdHoofNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;

  // Q1 Input Buffer
  private inputHighpass: BiquadFilterNode;
  private inputPreGain: GainNode;

  // Q2 Stage 1 (Silicon clipper with Miller roll-off)
  private fuzzGain: GainNode;
  private siliconShaper: WaveShaperNode;
  private stage1Miller: BiquadFilterNode;

  // Q3 Stage 2 (Germanium clipper with soft compression)
  private interstageGain: GainNode;
  private germaniumShaper: WaveShaperNode;
  private stage2Miller: BiquadFilterNode;

  // DC Blocker
  private dcBlocker: BiquadFilterNode;

  // Hoof Tone & Shift EQ Stack
  private toneLowShelf: BiquadFilterNode;
  private toneHighShelf: BiquadFilterNode;
  private shiftMidFilter: BiquadFilterNode;

  // Output Recovery & Level
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

    // 1. Input Buffer: Russian Muff coupling (70 Hz HPF)
    this.inputHighpass = ctx.createBiquadFilter();
    this.inputHighpass.type = 'highpass';
    this.inputHighpass.frequency.setValueAtTime(70, ctx.currentTime);
    this.inputHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    this.inputPreGain = ctx.createGain();
    this.inputPreGain.gain.setValueAtTime(2.2, ctx.currentTime);

    // 2. Fuzz Gain Stage
    this.fuzzGain = ctx.createGain();

    // 3. Stage 1 Silicon Shaper
    this.siliconShaper = ctx.createWaveShaper();
    this.siliconShaper.curve = this.createSiliconCurve(4096) as Float32Array<ArrayBuffer>;
    this.siliconShaper.oversample = '4x';

    this.stage1Miller = ctx.createBiquadFilter();
    this.stage1Miller.type = 'lowpass';
    this.stage1Miller.frequency.setValueAtTime(4200, ctx.currentTime);

    // 4. Stage 2 Germanium Shaper
    this.interstageGain = ctx.createGain();
    this.interstageGain.gain.setValueAtTime(2.6, ctx.currentTime);

    this.germaniumShaper = ctx.createWaveShaper();
    this.germaniumShaper.curve = this.createGermaniumCurve(4096) as Float32Array<ArrayBuffer>;
    this.germaniumShaper.oversample = '4x';

    this.stage2Miller = ctx.createBiquadFilter();
    this.stage2Miller.type = 'lowpass';
    this.stage2Miller.frequency.setValueAtTime(4500, ctx.currentTime);

    // 5. DC Blocker
    this.dcBlocker = createDcBlocker(ctx, 16);

    // 6. Hoof Tone Stack:
    // Low Shelf (120 Hz)
    this.toneLowShelf = ctx.createBiquadFilter();
    this.toneLowShelf.type = 'lowshelf';
    this.toneLowShelf.frequency.setValueAtTime(120, ctx.currentTime);

    // High Shelf (2800 Hz)
    this.toneHighShelf = ctx.createBiquadFilter();
    this.toneHighShelf.type = 'highshelf';
    this.toneHighShelf.frequency.setValueAtTime(2800, ctx.currentTime);

    // Shift Mid Filter (850 - 1050 Hz peaking EQ)
    this.shiftMidFilter = ctx.createBiquadFilter();
    this.shiftMidFilter.type = 'peaking';
    this.shiftMidFilter.frequency.setValueAtTime(900, ctx.currentTime);
    this.shiftMidFilter.Q.setValueAtTime(1.1, ctx.currentTime);

    // 7. Post Gain / Level
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
    this.inputHighpass.connect(this.inputPreGain);
    this.inputPreGain.connect(this.fuzzGain);
    this.fuzzGain.connect(this.siliconShaper);
    this.siliconShaper.connect(this.stage1Miller);
    this.stage1Miller.connect(this.interstageGain);
    this.interstageGain.connect(this.germaniumShaper);
    this.germaniumShaper.connect(this.stage2Miller);
    this.stage2Miller.connect(this.dcBlocker);
    this.dcBlocker.connect(this.toneLowShelf);
    this.toneLowShelf.connect(this.toneHighShelf);
    this.toneHighShelf.connect(this.shiftMidFilter);
    this.shiftMidFilter.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);

    this.recalculate();
  }

  private createSiliconCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    const knee = 0.42;
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      const scaled = x / knee;
      curve[i] = (knee * scaled) / Math.pow(1 + Math.pow(Math.abs(scaled), 2.8), 1 / 2.8);
    }
    return curve;
  }

  private createGermaniumCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    const kneePos = 0.32;
    const kneeNeg = 0.25;
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      if (x >= 0) {
        const scaled = x / kneePos;
        curve[i] = (kneePos * scaled) / Math.pow(1 + Math.pow(scaled, 2.0), 1 / 2.0);
      } else {
        const scaled = -x / kneeNeg;
        curve[i] = -(kneeNeg * scaled) / Math.pow(1 + Math.pow(scaled, 1.7), 1 / 1.7);
      }
    }
    return curve;
  }

  private recalculate(): void {
    const now = this.ctx.currentTime;

    // Fuzz Gain (1.2x to 38x)
    const fuzzNorm = Math.max(0, Math.min(10, this.fuzzVal)) / 10;
    const fuzzMult = 1.2 + 36.8 * Math.pow(fuzzNorm, 2.1);
    this.fuzzGain.gain.setTargetAtTime(fuzzMult, now, 0.02);

    // Tone Tilt EQ:
    // When tone = 0: Lows +8 dB, Highs -8 dB
    // When tone = 10: Lows -8 dB, Highs +8 dB
    const toneNorm = Math.max(0, Math.min(10, this.toneVal)) / 10;
    const lowGain = (1 - toneNorm) * 16 - 8;
    const highGain = toneNorm * 16 - 8;
    this.toneLowShelf.gain.setTargetAtTime(lowGain, now, 0.02);
    this.toneHighShelf.gain.setTargetAtTime(highGain, now, 0.02);

    // Shift Mid EQ:
    // 0: Deep scoop (-9 dB at 1050 Hz)
    // 5: Neutral scoop (-1.5 dB at 920 Hz)
    // 10: Aggressive mid boost (+6 dB at 820 Hz)
    const shiftNorm = Math.max(0, Math.min(10, this.shiftVal)) / 10;
    const midFreq = 1050 - shiftNorm * 230; // 1050 Hz down to 820 Hz
    const midGain = -9.0 + shiftNorm * 15.0; // -9 dB up to +6 dB
    this.shiftMidFilter.frequency.setTargetAtTime(midFreq, now, 0.02);
    this.shiftMidFilter.gain.setTargetAtTime(midGain, now, 0.02);

    // Dynamic output trim and level
    const trim = driveDependentTrimDb(fuzzMult, TRIM_UNITY_DB, TRIM_SAT_DB, 10);
    const levelGain = levelToGain(this.levelVal, trim);
    this.postGain.gain.setTargetAtTime(levelGain, now, 0.02);
  }

  public updateParameter(paramId: string, value: number): void {
    if (paramId === 'level') this.levelVal = value;
    else if (paramId === 'fuzz') this.fuzzVal = value;
    else if (paramId === 'tone') this.toneVal = value;
    else if (paramId === 'shift') this.shiftVal = value;

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
      this.inputHighpass.disconnect();
      this.inputPreGain.disconnect();
      this.fuzzGain.disconnect();
      this.siliconShaper.disconnect();
      this.stage1Miller.disconnect();
      this.interstageGain.disconnect();
      this.germaniumShaper.disconnect();
      this.stage2Miller.disconnect();
      this.dcBlocker.disconnect();
      this.toneLowShelf.disconnect();
      this.toneHighShelf.disconnect();
      this.shiftMidFilter.disconnect();
      this.postGain.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
}
