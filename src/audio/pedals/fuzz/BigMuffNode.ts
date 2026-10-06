import type { AudioPedalNode } from '../../../types/pedal';
import { levelToGain, applyBypassCrossfade, driveDependentTrimDb, createDcBlocker } from '../dspUtils';

/**
 * Output trim (dB) calibrated so Volume=5 is unity loudness at default Sustain=5.
 */
const TRIM_UNITY_DB = -1.0;
const TRIM_SAT_DB = -11.0;

/**
 * Electro-Harmonix Big Muff Pi (USA NYC Reissue)
 * 
 * Authentic analog circuit model of the 4-stage discrete NPN transistor (BC239/2N5088) fuzz/sustainer:
 *   - Stage 1 (Q1): Input buffer with RF filtering (4.8 kHz) and bass coupling (65 Hz).
 *   - Stage 2 (Q2): Sustain-controlled clipping stage with feedback silicon diode pair (1N4148)
 *                   and 470pF miller high-cut (3.2 kHz).
 *   - Stage 3 (Q3): Cascading saturation stage providing creamy violin compression
 *                   and second 470pF miller high-cut (3.4 kHz).
 *   - DC Blocker: Eliminates any diode asymmetry DC bias.
 *   - Stage 4: Authentic bridged-T passive tone stack with deep 1 kHz mid-scoop (-7.5 dB).
 *   - Output Stage (Q4): Recovery stage with 5.2 kHz anti-fizz smooth analog roll-off.
 *   - Linear small-signal transfer avoids idle pickup noise amplification.
 */
export class BigMuffNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;

  // Q1 Input Pre-Conditioning
  private inputHighpass: BiquadFilterNode;
  private inputRfFilter: BiquadFilterNode;
  private q1PreBoost: GainNode;

  // Q2 Stage 1 (Sustain gain + 1st silicon diode clipper + 470pF high-cut)
  private sustainGain: GainNode;
  private clipper1: WaveShaperNode;
  private stage1MillerFilter: BiquadFilterNode;

  // Q3 Stage 2 (Cascading compression + 2nd silicon diode clipper + 470pF high-cut)
  private stage2PreGain: GainNode;
  private clipper2: WaveShaperNode;
  private stage2MillerFilter: BiquadFilterNode;

  // DC Blocker
  private dcBlocker: BiquadFilterNode;

  // Authentic Bridged-T Passive Tone Stack
  private toneLowShelf: BiquadFilterNode;
  private toneHighShelf: BiquadFilterNode;
  private toneMidScoop: BiquadFilterNode;

  // Q4 Recovery & Master Anti-Fizz Low-Pass
  private antiFizzFilter: BiquadFilterNode;
  private postGain: GainNode;

  // Bypass crossfade
  private wetGain: GainNode;
  private dryGain: GainNode;
  private isEnabled = true;

  // Parameters (0 - 10)
  private volumeVal = 5;
  private toneVal = 5;
  private sustainVal = 6;

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.volume !== undefined) this.volumeVal = initialParams.volume;
    if (initialParams?.tone !== undefined) this.toneVal = initialParams.tone;
    if (initialParams?.sustain !== undefined) this.sustainVal = initialParams.sustain;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Q1 Input Stage: 65 Hz bass coupling cap + 4.8 kHz RF noise rejection
    this.inputHighpass = ctx.createBiquadFilter();
    this.inputHighpass.type = 'highpass';
    this.inputHighpass.frequency.setValueAtTime(65, ctx.currentTime);
    this.inputHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    this.inputRfFilter = ctx.createBiquadFilter();
    this.inputRfFilter.type = 'lowpass';
    this.inputRfFilter.frequency.setValueAtTime(4800, ctx.currentTime);
    this.inputRfFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    this.q1PreBoost = ctx.createGain();
    this.q1PreBoost.gain.setValueAtTime(2.2, ctx.currentTime);

    // 2. Q2 Stage 1: Sustain Potentiometer controls drive into 1st diode pair
    this.sustainGain = ctx.createGain();
    this.clipper1 = ctx.createWaveShaper();
    this.clipper1.curve = this.createBigMuffDiodeCurve(8192, 0.65, 0.62) as Float32Array<ArrayBuffer>;
    this.clipper1.oversample = '4x';

    // 470pF miller feedback cap across Q2 diode pair (rolls off above 3.2 kHz)
    this.stage1MillerFilter = ctx.createBiquadFilter();
    this.stage1MillerFilter.type = 'lowpass';
    this.stage1MillerFilter.frequency.setValueAtTime(3200, ctx.currentTime);
    this.stage1MillerFilter.Q.setValueAtTime(0.65, ctx.currentTime);

    // 3. Q3 Stage 2: Second cascading stage producing creamy singing compression
    this.stage2PreGain = ctx.createGain();
    this.stage2PreGain.gain.setValueAtTime(2.2, ctx.currentTime);

    this.clipper2 = ctx.createWaveShaper();
    this.clipper2.curve = this.createBigMuffDiodeCurve(8192, 0.64, 0.64) as Float32Array<ArrayBuffer>;
    this.clipper2.oversample = '4x';

    // 470pF miller feedback cap across Q3 diode pair (rolls off above 3.4 kHz)
    this.stage2MillerFilter = ctx.createBiquadFilter();
    this.stage2MillerFilter.type = 'lowpass';
    this.stage2MillerFilter.frequency.setValueAtTime(3400, ctx.currentTime);
    this.stage2MillerFilter.Q.setValueAtTime(0.65, ctx.currentTime);

    // 4. DC Blocker to strip any asymmetry offset
    this.dcBlocker = createDcBlocker(ctx, 15);

    // 5. Authentic Bridged-T Passive Tone Stack
    // Low-shelf (R8=22k, C9=10nF)
    this.toneLowShelf = ctx.createBiquadFilter();
    this.toneLowShelf.type = 'lowshelf';
    this.toneLowShelf.frequency.setValueAtTime(320, ctx.currentTime);

    // High-shelf (R5=22k, C8=3.9nF)
    this.toneHighShelf = ctx.createBiquadFilter();
    this.toneHighShelf.type = 'highshelf';
    this.toneHighShelf.frequency.setValueAtTime(2200, ctx.currentTime);

    // Signature 1 kHz Mid-Scoop Notch (the iconic Big Muff wall of fuzz notch)
    this.toneMidScoop = ctx.createBiquadFilter();
    this.toneMidScoop.type = 'peaking';
    this.toneMidScoop.frequency.setValueAtTime(1000, ctx.currentTime);
    this.toneMidScoop.Q.setValueAtTime(0.85, ctx.currentTime);
    this.toneMidScoop.gain.setValueAtTime(-7.5, ctx.currentTime);

    // 6. Q4 Recovery Stage Anti-Fizz Filter (5.2 kHz analog ceiling)
    this.antiFizzFilter = ctx.createBiquadFilter();
    this.antiFizzFilter.type = 'lowpass';
    this.antiFizzFilter.frequency.setValueAtTime(5200, ctx.currentTime);
    this.antiFizzFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    this.postGain = ctx.createGain();

    this.applyParameters(true);

    // 7. Click-free True Bypass crossfade nodes
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    const wetTarget = this.isEnabled ? 1 : 0;
    const dryTarget = this.isEnabled ? 0 : 1;
    this.wetGain.gain.setValueAtTime(wetTarget, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(dryTarget, ctx.currentTime);

    // Connect Bypass path:
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Connect Wet Signal Path:
    // Input -> Highpass -> RF Filter -> Q1 Boost -> Sustain Gain -> Clipper 1 -> Miller 1 ->
    // Q2 Boost -> Clipper 2 -> Miller 2 -> DC Blocker -> Tone LowShelf -> Tone HighShelf ->
    // Tone MidScoop -> Anti-Fizz -> PostGain -> WetGain -> Output
    this.inputNode.connect(this.inputHighpass);
    this.inputHighpass.connect(this.inputRfFilter);
    this.inputRfFilter.connect(this.q1PreBoost);
    this.q1PreBoost.connect(this.sustainGain);
    this.sustainGain.connect(this.clipper1);
    this.clipper1.connect(this.stage1MillerFilter);
    this.stage1MillerFilter.connect(this.stage2PreGain);
    this.stage2PreGain.connect(this.clipper2);
    this.clipper2.connect(this.stage2MillerFilter);
    this.stage2MillerFilter.connect(this.dcBlocker);
    this.dcBlocker.connect(this.toneLowShelf);
    this.toneLowShelf.connect(this.toneHighShelf);
    this.toneHighShelf.connect(this.toneMidScoop);
    this.toneMidScoop.connect(this.antiFizzFilter);
    this.antiFizzFilter.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);
  }

  /**
   * Models back-to-back 1N4148 silicon diodes in the transistor feedback loop.
   * Includes small-signal linear behavior below the 0.06V threshold so idle pickup
   * noise and ambient room hiss are NOT amplified, while playing delivers creamy,
   * singing compression and rich harmonic sustain.
   */
  private createBigMuffDiodeCurve(samples: number, vPos = 0.65, vNeg = 0.62): Float32Array {
    const curve = new Float32Array(samples);
    const half = samples / 2;

    for (let i = 0; i < samples; i++) {
      const x = (i - half) / half; // -1.0 to 1.0

      // Linear transparent response below 0.06 suppresses idle noise amplification
      if (Math.abs(x) < 0.06) {
        curve[i] = x * 0.95;
        continue;
      }

      if (x >= 0) {
        const scaled = x / vPos;
        // Smooth soft-knee algebraic diode compression curve
        const compressed = scaled / Math.pow(1 + Math.pow(scaled, 2.2), 1 / 2.2);
        curve[i] = vPos * compressed;
      } else {
        const scaled = Math.abs(x) / vNeg;
        const compressed = scaled / Math.pow(1 + Math.pow(scaled, 2.2), 1 / 2.2);
        curve[i] = -vNeg * compressed;
      }
    }
    return curve;
  }

  private applyParameters(immediate = false): void {
    const now = this.ctx.currentTime;
    const rampTime = immediate ? 0 : 0.02;

    // 1. Sustain Potentiometer:
    // Real Big Muff circuit provides 1.5x up to 12.0x drive into the clipping stage.
    const sustainNorm = Math.max(0, Math.min(10, this.sustainVal)) / 10;
    const stage1Gain = 1.5 + Math.pow(sustainNorm, 1.8) * 10.5;

    if (immediate) {
      this.sustainGain.gain.setValueAtTime(stage1Gain, now);
    } else {
      this.sustainGain.gain.setTargetAtTime(stage1Gain, now, rampTime);
    }

    // 2. Big Muff Bridged-T Tone Stack:
    // Center (5.0): balanced response with -7.5 dB 1 kHz scoop
    // Tone < 5: boost bass (+7 dB), roll off highs (-8 dB) - warm vintage doom fuzz
    // Tone > 5: cut bass (-7 dB), boost highs (+8 dB) - singing, biting lead fuzz
    const toneNorm = Math.max(0, Math.min(10, this.toneVal)) / 10;
    const bassGainDb = 7.0 - toneNorm * 14.0;
    const trebleGainDb = -8.0 + toneNorm * 16.0;

    // Center scoop depth
    const midScoopFactor = 1 - Math.abs(toneNorm - 0.5) * 0.6;
    const midScoopDb = -6.0 - midScoopFactor * 3.0; // -6 dB to -9 dB

    if (immediate) {
      this.toneLowShelf.gain.setValueAtTime(bassGainDb, now);
      this.toneHighShelf.gain.setValueAtTime(trebleGainDb, now);
      this.toneMidScoop.gain.setValueAtTime(midScoopDb, now);
    } else {
      this.toneLowShelf.gain.setTargetAtTime(bassGainDb, now, rampTime);
      this.toneHighShelf.gain.setTargetAtTime(trebleGainDb, now, rampTime);
      this.toneMidScoop.gain.setTargetAtTime(midScoopDb, now, rampTime);
    }

    // 3. Volume Potentiometer with calibrated drive-dependent loudness trim
    const totalDrive = stage1Gain * 2.2;
    const trim = driveDependentTrimDb(totalDrive, TRIM_UNITY_DB, TRIM_SAT_DB, 4.0);
    const volumeGain = levelToGain(this.volumeVal, trim);

    if (immediate) {
      this.postGain.gain.setValueAtTime(volumeGain, now);
    } else {
      this.postGain.gain.setTargetAtTime(volumeGain, now, rampTime);
    }
  }

  public updateParameter(paramId: string, value: number): void {
    switch (paramId) {
      case 'volume':
        this.volumeVal = value;
        break;
      case 'tone':
        this.toneVal = value;
        break;
      case 'sustain':
        this.sustainVal = value;
        break;
      default:
        return;
    }
    this.applyParameters(false);
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    applyBypassCrossfade(this.wetGain, this.dryGain, enabled, this.ctx, 0.012);
  }

  public dispose(): void {
    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.dryGain.disconnect();
      this.wetGain.disconnect();
      this.inputHighpass.disconnect();
      this.inputRfFilter.disconnect();
      this.q1PreBoost.disconnect();
      this.sustainGain.disconnect();
      this.clipper1.disconnect();
      this.stage1MillerFilter.disconnect();
      this.stage2PreGain.disconnect();
      this.clipper2.disconnect();
      this.stage2MillerFilter.disconnect();
      this.dcBlocker.disconnect();
      this.toneLowShelf.disconnect();
      this.toneHighShelf.disconnect();
      this.toneMidScoop.disconnect();
      this.antiFizzFilter.disconnect();
      this.postGain.disconnect();
    } catch {
      // Ignore disconnect errors during teardown
    }
  }
}
