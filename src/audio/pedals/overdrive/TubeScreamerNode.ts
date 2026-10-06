import type { AudioPedalNode } from '../../../types/pedal';
import { createDcBlocker, levelToGain } from '../dspUtils';

/**
 * Tube Screamer family core (TS808 / TS9 / TS Mini).
 *
 * Models the actual op-amp topology instead of a "high-pass + clipper":
 *
 *   gain(f) = 1 + (Rf / Rg) * highpass_720Hz(f)      Rg = 4.7k + 47nF, Rf = 51k + DRIVE (500k audio taper)
 *
 *   - Below ~720 Hz the stage has UNITY gain, so the bass/body of the guitar passes straight
 *     through (this is what a real TS does - the mid-hump is a gain shelf, not a bass cut).
 *   - Above ~720 Hz gain rises to 21..41 dB depending on DRIVE.
 *   - Rf is shunted by 51 pF, so the drive-dependent feedback low-pass sits at 61 kHz (drive 0)
 *     down to 5.7 kHz (drive 10).
 *   - The 1N914 / 1S1588 diode pair lives in the feedback loop: soft, symmetrical clipping.
 *   - Tone: passive low-pass sweeping ~0.72 kHz .. 3.2 kHz.
 */
export interface TubeScreamerConfig {
  /** Parameter id of the drive knob ('overdrive' on 808/Mini, 'drive' on TS9) */
  driveParamId: 'overdrive' | 'drive';
  /** Hump corner: 1 / (2*pi*Rg*Cg). 4.7k * 47nF = 720 Hz */
  humpHz: number;
  /** Diode knee in shaper domain (full scale = +-1) */
  clipKnee: number;
  /** Knee sharpness (2 = tanh-like, higher = harder) */
  clipSharpness: number;
  /** Drive pot taper exponent (audio taper ~3) */
  potExponent: number;
  /** Tone sweep (Hz) */
  toneMinHz: number;
  toneMaxHz: number;
  /** Optional extra presence lift of the output stage (dB @ ~3.4 kHz) */
  presenceDb: number;
  /** Calibrated output trim (dB) so Level=5 is ~unity loudness */
  outputTrimDb: number;
}

const RG = 4.7e3;
const RF_MIN = 51e3;
const POT_MAX = 500e3;
const CF = 51e-12;
/** Guitar level -> shaper domain (full scale == 2 V of op-amp swing) */
const SHAPER_INPUT_SCALE = 0.5;

export class TubeScreamerNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private cfg: TubeScreamerConfig;

  private unityPath: GainNode;
  private humpFilter: IIRFilterNode;
  private driveGain: GainNode;
  private feedbackLowpass: BiquadFilterNode;
  private summing: GainNode;
  private shaperScale: GainNode;
  private shaper: WaveShaperNode;
  private dcBlocker: BiquadFilterNode;
  private toneFilter: BiquadFilterNode;
  private presenceFilter: BiquadFilterNode | null = null;
  private postGain: GainNode;

  private wetGain: GainNode;
  private dryGain: GainNode;
  private isEnabled = true;

  private driveVal = 5;
  private toneVal = 5;
  private levelVal = 5;

  constructor(
    ctx: AudioContext,
    id: string,
    cfg: TubeScreamerConfig,
    initialParams?: Record<string, number>,
    enabled = true
  ) {
    this.ctx = ctx;
    this.id = id;
    this.cfg = cfg;
    this.isEnabled = enabled;

    if (initialParams?.[cfg.driveParamId] !== undefined) this.driveVal = initialParams[cfg.driveParamId];
    if (initialParams?.tone !== undefined) this.toneVal = initialParams.tone;
    if (initialParams?.level !== undefined) this.levelVal = initialParams.level;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // Unity (bass / body) path of the non-inverting op-amp
    this.unityPath = ctx.createGain();

    // First-order high-pass (Rg * Cg) feeding the gain-setting path
    this.humpFilter = ctx.createIIRFilter(...TubeScreamerNode.firstOrderHighpass(cfg.humpHz, ctx.sampleRate));
    this.driveGain = ctx.createGain();

    // Rf || 51pF -> drive dependent low-pass on the gain path
    this.feedbackLowpass = ctx.createBiquadFilter();
    this.feedbackLowpass.type = 'lowpass';
    this.feedbackLowpass.Q.setValueAtTime(0.5, ctx.currentTime);

    this.summing = ctx.createGain();

    // Diode pair in the feedback loop: soft symmetrical clipping
    this.shaperScale = ctx.createGain();
    this.shaperScale.gain.setValueAtTime(SHAPER_INPUT_SCALE, ctx.currentTime);
    this.shaper = ctx.createWaveShaper();
    this.shaper.curve = this.createDiodeCurve(8192) as Float32Array<ArrayBuffer>;
    this.shaper.oversample = '4x';

    // Symmetric clipping of an asymmetric guitar waveform still leaves a little DC
    this.dcBlocker = createDcBlocker(ctx);

    // Passive tone low-pass
    this.toneFilter = ctx.createBiquadFilter();
    this.toneFilter.type = 'lowpass';
    this.toneFilter.Q.setValueAtTime(0.5, ctx.currentTime);

    if (cfg.presenceDb !== 0) {
      this.presenceFilter = ctx.createBiquadFilter();
      this.presenceFilter.type = 'peaking';
      this.presenceFilter.frequency.setValueAtTime(3400, ctx.currentTime);
      this.presenceFilter.Q.setValueAtTime(1.0, ctx.currentTime);
      this.presenceFilter.gain.setValueAtTime(cfg.presenceDb, ctx.currentTime);
    }

    this.postGain = ctx.createGain();

    this.applyParameters(true);

    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(this.isEnabled ? 1 : 0, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(this.isEnabled ? 0 : 1, ctx.currentTime);

    // Bypass
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Op-amp: unity + (hump-filtered * drive gain)
    this.inputNode.connect(this.unityPath);
    this.unityPath.connect(this.summing);
    this.inputNode.connect(this.humpFilter);
    this.humpFilter.connect(this.driveGain);
    this.driveGain.connect(this.feedbackLowpass);
    this.feedbackLowpass.connect(this.summing);

    // Clipping -> DC -> tone -> (presence) -> level
    this.summing.connect(this.shaperScale);
    this.shaperScale.connect(this.shaper);
    this.shaper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.toneFilter);
    if (this.presenceFilter) {
      this.toneFilter.connect(this.presenceFilter);
      this.presenceFilter.connect(this.postGain);
    } else {
      this.toneFilter.connect(this.postGain);
    }
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);
  }

  /** H(z) = (1+a)/2 * (1 - z^-1) / (1 - a z^-1),  a = exp(-2*pi*fc/fs) */
  private static firstOrderHighpass(fc: number, fs: number): [number[], number[]] {
    const a = Math.exp((-2 * Math.PI * fc) / fs);
    const k = (1 + a) / 2;
    return [[k, -k], [1, -a]];
  }

  /** Soft diode-pair clipper: y = x / (1 + (|x|/knee)^p)^(1/p) */
  private createDiodeCurve(samples: number): Float32Array {
    const { clipKnee, clipSharpness } = this.cfg;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / (samples - 1) - 1;
      curve[i] = x / Math.pow(1 + Math.pow(Math.abs(x) / clipKnee, clipSharpness), 1 / clipSharpness);
    }
    return curve;
  }

  private applyParameters(immediate = false): void {
    const now = this.ctx.currentTime;
    const set = (param: AudioParam, value: number, tc = 0.02) => {
      if (immediate) param.setValueAtTime(value, now);
      else param.setTargetAtTime(value, now, tc);
    };

    const drivePos = Math.max(0, Math.min(10, this.driveVal)) / 10;
    const tonePos = Math.max(0, Math.min(10, this.toneVal)) / 10;

    // Rf = 51k + DRIVE pot (audio taper); gain-path gain = Rf / Rg
    const rf = RF_MIN + POT_MAX * Math.pow(drivePos, this.cfg.potExponent);
    set(this.driveGain.gain, rf / RG);
    const feedbackCutoff = Math.min(20000, 1 / (2 * Math.PI * rf * CF));
    set(this.feedbackLowpass.frequency, feedbackCutoff);

    // Tone: geometric sweep between min / max cutoff
    const toneCutoff = this.cfg.toneMinHz * Math.pow(this.cfg.toneMaxHz / this.cfg.toneMinHz, tonePos);
    set(this.toneFilter.frequency, toneCutoff);

    set(this.postGain.gain, levelToGain(this.levelVal, this.cfg.outputTrimDb));
  }

  public updateParameter(paramId: string, value: number): void {
    if (paramId === this.cfg.driveParamId) this.driveVal = value;
    else if (paramId === 'tone') this.toneVal = value;
    else if (paramId === 'level') this.levelVal = value;
    this.applyParameters();
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    const now = this.ctx.currentTime;
    this.wetGain.gain.setTargetAtTime(enabled ? 1 : 0, now, 0.015);
    this.dryGain.gain.setTargetAtTime(enabled ? 0 : 1, now, 0.015);
  }

  public dispose(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.unityPath.disconnect();
    this.humpFilter.disconnect();
    this.driveGain.disconnect();
    this.feedbackLowpass.disconnect();
    this.summing.disconnect();
    this.shaperScale.disconnect();
    this.shaper.disconnect();
    this.dcBlocker.disconnect();
    this.toneFilter.disconnect();
    this.presenceFilter?.disconnect();
    this.postGain.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
  }
}
