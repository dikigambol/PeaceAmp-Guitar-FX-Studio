import type { AmpHeadSettings, AmpModelId } from '../../types/amp';
import { createDcBlocker, applyBypassCrossfade } from '../pedals/dspUtils';
import {
  getAmpVoicing,
  makePowerAmpCurve,
  makePreampCurve,
  type AmpVoicingProfile,
} from '../../dsp/amp/ampVoicing';

/**
 * Guitar amp head model.
 *
 * Signal path:
 *   input -> voicing high-pass/peak -> preamp gain -> preamp shaper
 *   -> DC blocker -> bass/mid/treble shelves -> presence -> master gain
 *   -> power-amp shaper -> output
 *
 * The shapers are memoryless synthetic transfer curves and the tone stack is a
 * shelving/peaking approximation of an FMV network. This is a circuit-inspired
 * approximation, not a component-level amp simulation.
 */
export class AmpHeadNode {
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;

  // Bypass crossfaders
  private bypassDry: GainNode;
  private bypassWet: GainNode;

  // Pre-EQ voicing filter (tight high-pass & model character)
  private preHighpass: BiquadFilterNode;
  private preVoicingPeak: BiquadFilterNode;

  // Preamp Gain Stage
  private preampGain: GainNode;
  private tubeShaper: WaveShaperNode;
  private dcBlocker: BiquadFilterNode;

  // 3-Band FMV Tone Stack
  private bassFilter: BiquadFilterNode;
  private midFilter: BiquadFilterNode;
  private trebleFilter: BiquadFilterNode;

  // Power Amp Presence, Dynamic Sag & Master Stage
  private presenceFilter: BiquadFilterNode;
  private tubeSagCompressor: DynamicsCompressorNode;
  private powerAmpGain: GainNode;
  private powerAmpShaper: WaveShaperNode;

  // Curves are regenerated only when the amp model changes.
  private curvePreamp: Float32Array<ArrayBuffer>;
  private curvePowerAmp: Float32Array<ArrayBuffer>;
  private currentAppliedModel: AmpModelId | null = null;

  private settings: AmpHeadSettings = {
    enabled: true,
    model: 'pristine-clean',
    gain: 5.0,
    bass: 5.0,
    mid: 5.0,
    treble: 5.0,
    presence: 5.0,
    master: 6.0,
  };

  constructor(ctx: AudioContext, initialSettings?: Partial<AmpHeadSettings>) {
    this.ctx = ctx;

    if (initialSettings) {
      this.settings = { ...this.settings, ...initialSettings };
    }

    this.curvePreamp = makePreampCurve(this.settings.model, 4096);
    this.curvePowerAmp = makePowerAmpCurve(this.settings.model, 2048);
    this.currentAppliedModel = this.settings.model;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    this.bypassDry = ctx.createGain();
    this.bypassWet = ctx.createGain();

    // 1. Voicing Pre-Filters
    this.preHighpass = ctx.createBiquadFilter();
    this.preHighpass.type = 'highpass';
    this.preHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    this.preVoicingPeak = ctx.createBiquadFilter();
    this.preVoicingPeak.type = 'peaking';

    // 2. Preamp Tube Stage
    this.preampGain = ctx.createGain();
    this.tubeShaper = ctx.createWaveShaper();
    this.tubeShaper.oversample = '4x';
    this.tubeShaper.curve = this.curvePreamp;
    this.dcBlocker = createDcBlocker(ctx, 15);

    // 3. Interactive Tone Stack
    this.bassFilter = ctx.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';

    this.midFilter = ctx.createBiquadFilter();
    this.midFilter.type = 'peaking';

    this.trebleFilter = ctx.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';

    // 4. Power Amp Presence & Master
    this.presenceFilter = ctx.createBiquadFilter();
    this.presenceFilter.type = 'peaking';

    // 5. Dynamic Power Amp Sag Stage (simulates power supply B+ rail sag & capacitor recovery)
    this.tubeSagCompressor = ctx.createDynamicsCompressor();
    this.tubeSagCompressor.knee.setValueAtTime(12, ctx.currentTime);
    this.tubeSagCompressor.attack.setValueAtTime(0.002, ctx.currentTime);

    this.powerAmpGain = ctx.createGain();
    this.powerAmpShaper = ctx.createWaveShaper();
    this.powerAmpShaper.oversample = '2x';
    this.powerAmpShaper.curve = this.curvePowerAmp;

    // Graph Connection:
    // inputNode -> bypassDry -> outputNode
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    // inputNode -> bypassWet -> preHighpass -> preVoicingPeak -> preampGain -> tubeShaper
    // -> dcBlocker -> bassFilter -> midFilter -> trebleFilter -> presenceFilter
    // -> tubeSagCompressor -> powerAmpGain -> powerAmpShaper -> outputNode
    this.inputNode.connect(this.bypassWet);
    this.bypassWet.connect(this.preHighpass);
    this.preHighpass.connect(this.preVoicingPeak);
    this.preVoicingPeak.connect(this.preampGain);
    this.preampGain.connect(this.tubeShaper);
    this.tubeShaper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.bassFilter);
    this.bassFilter.connect(this.midFilter);
    this.midFilter.connect(this.trebleFilter);
    this.trebleFilter.connect(this.presenceFilter);
    this.presenceFilter.connect(this.tubeSagCompressor);
    this.tubeSagCompressor.connect(this.powerAmpGain);
    this.powerAmpGain.connect(this.powerAmpShaper);
    this.powerAmpShaper.connect(this.outputNode);

    this.applySettings(true);
  }

  /**
   * Regenerates the preamp and power-amp transfer curves for a model. Each amp
   * has its own drive, positive/negative asymmetry and bias, so the 18 models
   * no longer share four fixed curves.
   */
  private updateCurvesForModel(model: AmpModelId): void {
    if (this.currentAppliedModel === model) return;
    this.currentAppliedModel = model;

    this.curvePreamp = makePreampCurve(model, 4096);
    this.curvePowerAmp = makePowerAmpCurve(model, 2048);
    this.tubeShaper.curve = this.curvePreamp;
    this.powerAmpShaper.curve = this.curvePowerAmp;
  }

  private applySettings(immediate = false): void {
    const now = this.ctx.currentTime;
    const tc = immediate ? 0.001 : 0.02;

    const set = (param: AudioParam, val: number) => {
      if (immediate) param.setValueAtTime(val, now);
      else param.setTargetAtTime(val, now, tc);
    };

    const profile = getAmpVoicing(this.settings.model);

    // 0. Update Shaper Curves if model changed
    this.updateCurvesForModel(this.settings.model);

    // 1. Voicing Configuration by Amp Model
    this.configureVoicing(profile, set);

    // 2. Per-model preamp gain mapping
    const gainNorm = Math.max(0, Math.min(10, this.settings.gain)) / 10;
    const gainMult =
      profile.gainMin + Math.pow(gainNorm, profile.gainExponent) * profile.gainRange;
    set(this.preampGain.gain, gainMult);

    // 3. Interactive FMV Tonestack calculation (BASS: -12 to +12 dB, MID: -10 to +10 dB, TREBLE: -12 to +12 dB)
    // Emulates passive FMV (Fender/Marshall/Vox) network cross-coupling:
    // Treble pot shifts the mid notch center frequency up or down, and bass loads the mid notch.
    const bassNorm = Math.max(0, Math.min(10, this.settings.bass)) / 10;
    const midNorm = Math.max(0, Math.min(10, this.settings.mid)) / 10;
    const trebleNorm = Math.max(0, Math.min(10, this.settings.treble)) / 10;

    const interactiveMidHz = profile.toneStackMidHz * (0.82 + 0.36 * trebleNorm);
    const midInteractiveDb = (-10 + midNorm * 20) - (bassNorm * 2.2 * (1 - midNorm));
    const bassDb = -12 + bassNorm * 24;
    const trebleDb = -12 + trebleNorm * 24;

    set(this.bassFilter.frequency, profile.toneStackBassHz);
    set(this.midFilter.frequency, interactiveMidHz);
    set(this.midFilter.Q, profile.toneStackMidQ * (0.9 + 0.2 * bassNorm));
    set(this.trebleFilter.frequency, profile.toneStackTrebleHz);
    set(this.bassFilter.gain, bassDb);
    set(this.midFilter.gain, midInteractiveDb);
    set(this.trebleFilter.gain, trebleDb);

    // 4. Presence calculation (-9 to +9 dB)
    const presDb = -9 + (Math.max(0, Math.min(10, this.settings.presence)) / 10) * 18;
    set(this.presenceFilter.frequency, profile.presenceHz);
    set(this.presenceFilter.Q, profile.presenceQ);
    set(this.presenceFilter.gain, presDb);

    // 5. Master Output calculation (normalized volume scale with headroom compensation)
    const masterNorm = Math.max(0, Math.min(10, this.settings.master)) / 10;
    const masterGainLinear = Math.pow(masterNorm, 1.3) * profile.masterScale;
    set(this.powerAmpGain.gain, masterGainLinear);

    // 6. Dynamic Power Amp Sag (touch-sensitive B+ power rail compression & bloom)
    const sagRatio = profile.sagRatio ?? (profile.powerAmpCurve.kind === 'clean' ? 1.0 : 1.9);
    const sagThreshold = profile.sagThresholdDb ?? -15;
    const sagRelease = profile.sagReleaseSec ?? 0.055;
    set(this.tubeSagCompressor.ratio, sagRatio);
    set(this.tubeSagCompressor.threshold, sagThreshold);
    set(this.tubeSagCompressor.release, sagRelease);

    // 7. Bypass State Crossfade
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.settings.enabled, this.ctx, 0.015);
  }

  private configureVoicing(
    profile: AmpVoicingProfile,
    set: (param: AudioParam, val: number) => void
  ): void {
    set(this.preHighpass.frequency, profile.preampHighpassHz);
    set(this.preVoicingPeak.frequency, profile.preampPeakHz);
    set(this.preVoicingPeak.Q, profile.preampPeakQ);
    set(this.preVoicingPeak.gain, profile.preampPeakGainDb);
  }

  public updateSettings(newSettings: Partial<AmpHeadSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.applySettings();
  }

  public setEnabled(enabled: boolean): void {
    this.settings.enabled = enabled;
    applyBypassCrossfade(this.bypassWet, this.bypassDry, enabled, this.ctx, 0.015);
  }

  public getSettings(): AmpHeadSettings {
    return { ...this.settings };
  }

  public dispose(): void {
    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.bypassDry.disconnect();
      this.bypassWet.disconnect();
      this.preHighpass.disconnect();
      this.preVoicingPeak.disconnect();
      this.preampGain.disconnect();
      this.tubeShaper.disconnect();
      this.dcBlocker.disconnect();
      this.bassFilter.disconnect();
      this.midFilter.disconnect();
      this.trebleFilter.disconnect();
      this.presenceFilter.disconnect();
      this.powerAmpGain.disconnect();
      this.powerAmpShaper.disconnect();
    } catch (e) {
      console.warn('AmpHeadNode dispose error', e);
    }
  }
}
