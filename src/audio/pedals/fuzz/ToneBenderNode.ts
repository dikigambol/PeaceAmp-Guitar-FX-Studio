import type { AudioPedalNode } from '../../../types/pedal';
import { levelToGain, applyBypassCrossfade, driveDependentTrimDb, createDcBlocker } from '../dspUtils';

/**
 * Output trim (dB) calibrated so Level=5 is ~unity loudness at default Attack=6.
 */
const TRIM_UNITY_DB = -1.5;
const TRIM_SAT_DB = -10.5;

/**
 * Sola Sound / Colorsound Tone Bender Professional MKII (1966)
 * 
 * Authentic analog circuit model of the 3-transistor Germanium (OC75 / OC81D) fuzz:
 *   - Q1 preamplifier stage: boosts guitar signal by +18 dB before hitting the clipping core.
 *   - Tighter low-end coupling (0.1 uF vs 2.2 uF on Fuzz Face), eliminating flub and preserving note punch.
 *   - Cascaded Germanium saturation with razor-sharp harmonic bite and singing sustain (Jimmy Page Led Zeppelin I tone).
 *   - Upper-mid presence peak (~2.2 kHz) giving cutting British treble bite.
 *   - Attack control: sweeps from raspy, spitting vintage breakup to ferocious, violin-like sustaining fuzz.
 */
export class ToneBenderNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;

  // Q1 Preamp Stage
  private inputHighpass: BiquadFilterNode;
  private q1PreampGain: GainNode;

  // Q2 & Q3 Cascaded Germanium Fuzz Core
  private attackGain: GainNode;
  private geShaper1: WaveShaperNode;
  private interStageGain: GainNode;
  private geShaper2: WaveShaperNode;
  private dcBlocker: BiquadFilterNode;

  // Tone Bender Signature Frequency Shaping
  private midBiteFilter: BiquadFilterNode;
  private highCutFilter: BiquadFilterNode;
  private postGain: GainNode;

  // Bypass crossfade
  private wetGain: GainNode;
  private dryGain: GainNode;
  private isEnabled = true;

  // Parameters (0 - 10)
  private levelVal = 5;
  private attackVal = 6;

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.level !== undefined) this.levelVal = initialParams.level;
    if (initialParams?.attack !== undefined) this.attackVal = initialParams.attack;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Input coupling (0.1 uF cap into Q1 base): high-pass around 110 Hz for tight, articulate bass
    this.inputHighpass = ctx.createBiquadFilter();
    this.inputHighpass.type = 'highpass';
    this.inputHighpass.frequency.setValueAtTime(110, ctx.currentTime);
    this.inputHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    // Q1 Preamp Stage (Fixed boost ~14 dB)
    this.q1PreampGain = ctx.createGain();
    this.q1PreampGain.gain.setValueAtTime(4.8, ctx.currentTime);

    // 2. Attack Gain Stage
    this.attackGain = ctx.createGain();

    // 3. Stage 1 Germanium Shaper (Q2 soft saturation)
    this.geShaper1 = ctx.createWaveShaper();
    this.geShaper1.curve = this.createToneBenderCurve(4096, 0.35, 0.28) as Float32Array<ArrayBuffer>;
    this.geShaper1.oversample = '4x';

    // Inter-stage coupling
    this.interStageGain = ctx.createGain();
    this.interStageGain.gain.setValueAtTime(2.2, ctx.currentTime);

    // 4. Stage 2 Germanium Shaper (Q3 heavy clipping)
    this.geShaper2 = ctx.createWaveShaper();
    this.geShaper2.curve = this.createToneBenderCurve(4096, 0.28, 0.22) as Float32Array<ArrayBuffer>;
    this.geShaper2.oversample = '4x';

    // 5. DC Blocker
    this.dcBlocker = createDcBlocker(ctx, 18);

    // 6. British Mid Bite Peaking Filter (~2.2 kHz presence peak)
    this.midBiteFilter = ctx.createBiquadFilter();
    this.midBiteFilter.type = 'peaking';
    this.midBiteFilter.frequency.setValueAtTime(2200, ctx.currentTime);
    this.midBiteFilter.Q.setValueAtTime(1.2, ctx.currentTime);
    this.midBiteFilter.gain.setValueAtTime(3.8, ctx.currentTime);

    // 7. Output High Cut Filter (~5.8 kHz roll-off)
    this.highCutFilter = ctx.createBiquadFilter();
    this.highCutFilter.type = 'lowpass';
    this.highCutFilter.frequency.setValueAtTime(5800, ctx.currentTime);
    this.highCutFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    // 8. Post-Gain / Level
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
    this.inputHighpass.connect(this.q1PreampGain);
    this.q1PreampGain.connect(this.attackGain);
    this.attackGain.connect(this.geShaper1);
    this.geShaper1.connect(this.interStageGain);
    this.interStageGain.connect(this.geShaper2);
    this.geShaper2.connect(this.dcBlocker);
    this.dcBlocker.connect(this.midBiteFilter);
    this.midBiteFilter.connect(this.highCutFilter);
    this.highCutFilter.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);

    this.recalculate();
  }

  private createToneBenderCurve(samples: number, kneePos: number, kneeNeg: number): Float32Array {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      if (x >= 0) {
        const scaled = x / kneePos;
        curve[i] = (kneePos * scaled) / Math.pow(1 + Math.pow(scaled, 2.5), 1 / 2.5);
      } else {
        const scaled = -x / kneeNeg;
        curve[i] = -(kneeNeg * scaled) / Math.pow(1 + Math.pow(scaled, 2.0), 1 / 2.0);
      }
    }
    return curve;
  }

  private recalculate(): void {
    const now = this.ctx.currentTime;

    // Attack control (sweeps drive from 1.0 to 18.0)
    const norm = Math.max(0, Math.min(10, this.attackVal)) / 10;
    const attackMult = 1.0 + 17.0 * Math.pow(norm, 1.8);
    this.attackGain.gain.setTargetAtTime(attackMult, now, 0.02);

    // At high attack, the bite gets more aggressive (+2 dB to +5 dB)
    const biteGain = 2.0 + norm * 3.5;
    this.midBiteFilter.gain.setTargetAtTime(biteGain, now, 0.02);

    // Dynamic output trim and level
    const trim = driveDependentTrimDb(attackMult, TRIM_UNITY_DB, TRIM_SAT_DB, 6);
    const levelGain = levelToGain(this.levelVal, trim);
    this.postGain.gain.setTargetAtTime(levelGain, now, 0.02);
  }

  public updateParameter(paramId: string, value: number): void {
    if (paramId === 'level') {
      this.levelVal = value;
      this.recalculate();
    } else if (paramId === 'attack') {
      this.attackVal = value;
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
      this.q1PreampGain.disconnect();
      this.attackGain.disconnect();
      this.geShaper1.disconnect();
      this.interStageGain.disconnect();
      this.geShaper2.disconnect();
      this.dcBlocker.disconnect();
      this.midBiteFilter.disconnect();
      this.highCutFilter.disconnect();
      this.postGain.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
}
