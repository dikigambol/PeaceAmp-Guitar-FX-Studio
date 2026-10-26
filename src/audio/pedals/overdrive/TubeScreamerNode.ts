import type { AudioPedalNode } from '../../../types/pedal';
import { createDcBlocker, levelToGain, applyBypassCrossfade } from '../dspUtils';
import { FeedbackClipperStage } from './FeedbackClipperStage';

/**
 * Tube Screamer family core (TS808 / TS9 / TS Mini / SD-1).
 *
 * Op-amp topology:
 *
 *   gain(f) = 1 + (Rf / Rg) * highpass_720Hz(f)      Rg = 4.7k + 47nF, Rf = 51k + DRIVE (500k audio taper)
 *
 *   - Below ~720 Hz the stage has UNITY gain, so the bass/body of the guitar passes straight
 *     through (this is what a real TS does - the mid-hump is a gain shelf, not a bass cut).
 *   - Above ~720 Hz gain rises to ~21..41 dB depending on DRIVE.
 *   - Rf is shunted by 51 pF, so the drive-dependent feedback low-pass sits at 61 kHz (drive 0)
 *     down to 5.7 kHz.
 *   - The 1N914 / 1S1588 diode pair sits in the op-amp feedback loop in the real circuit.
 *     The drive stage is an AudioWorklet feedback clipper (FeedbackClipperStage): the diode
 *     nonlinearity lives inside a filtered feedback loop instead of a memoryless series
 *     shaper, so the knee compresses dynamically. It remains a behavioural model, not a
 *     component-level SPICE netlist. Contexts without AudioWorklet fall back to the older
 *     memoryless series clipper.
 *   - Tone: passive low-pass sweeping ~0.72 kHz .. 3.2 kHz.
 */
export interface TubeScreamerConfig {
  /** Parameter id of the drive knob ('overdrive' on 808/Mini, 'drive' on TS9) */
  driveParamId: 'overdrive' | 'drive';
  /** Hump corner: 1 / (2*pi*Rg*Cg). 4.7k * 47nF = 720 Hz */
  humpHz: number;
  /** Diode knee in shaper domain (full scale = +-1) */
  clipKnee: number;
  /** Optional knee for the negative half (asymmetric clipping, e.g. SD-1). Defaults to clipKnee. */
  clipKneeNeg?: number;
  /** Knee sharpness (2 = tanh-like, higher = harder) */
  clipSharpness: number;
  /** Normalized feedback amount for the worklet loop (0..0.95). Defaults to 0.6. */
  loopFeedback?: number;
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

export class TubeScreamerNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private cfg: TubeScreamerConfig;

  private driveStage: FeedbackClipperStage;
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

    // Op-amp drive stage: unity + high-passed gain path with the diodes in a
    // filtered feedback loop (worklet) or a memoryless fallback.
    this.driveStage = new FeedbackClipperStage(
      ctx,
      {
        humpHz: cfg.humpHz,
        clipKnee: cfg.clipKnee,
        clipKneeNeg: cfg.clipKneeNeg,
        clipSharpness: cfg.clipSharpness,
        feedback: cfg.loopFeedback ?? 0.6,
      },
      RF_MIN / RG
    );

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

    // Drive stage -> DC -> tone -> (presence) -> level
    this.inputNode.connect(this.driveStage.inputNode);
    this.driveStage.outputNode.connect(this.dcBlocker);
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
    this.driveStage.setDrive(rf / RG);
    this.driveStage.setFeedback(0.1 + drivePos * 0.7);
    const feedbackCutoff = Math.min(20000, 1 / (2 * Math.PI * rf * CF));
    this.driveStage.setFeedbackCutoff(feedbackCutoff);

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
    applyBypassCrossfade(this.wetGain, this.dryGain, enabled, this.ctx);
  }

  public dispose(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.driveStage.dispose();
    this.dcBlocker.disconnect();
    this.toneFilter.disconnect();
    this.presenceFilter?.disconnect();
    this.postGain.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
  }
}
