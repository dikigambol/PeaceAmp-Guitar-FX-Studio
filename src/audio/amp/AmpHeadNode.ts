import type { AmpHeadSettings, AmpModelId } from '../../types/amp';
import { indexToAmpModel } from '../../types/amp';
import type { AudioPedalNode } from '../../types/pedal';
import { createDcBlocker, applyBypassCrossfade } from '../pedals/dspUtils';
import {
  getAmpVoicing,
  makeInputGridLimiterCurve,
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
export class AmpHeadNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;

  // Bypass crossfaders
  private bypassDry: GainNode;
  private bypassWet: GainNode;

  // V1A Input 68k Grid-Stopper, Built-in Preamp De-Hisser & Grid-Current Soft Limiter
  private inputGridStopperLp: BiquadFilterNode;
  private preampDeHisser: AudioWorkletNode | null = null;
  private inputGridShaper: WaveShaperNode;

  // Pre-EQ voicing filter (tight high-pass & model character)
  private preHighpass: BiquadFilterNode;
  private preVoicingPeak: BiquadFilterNode;

  // Preamp Gain Stage
  private preampGain: GainNode;
  private tubeShaper: WaveShaperNode;
  private postPreampLowpass: BiquadFilterNode;
  private dcBlocker: BiquadFilterNode;

  // 3-Band FMV Tone Stack
  private bassFilter: BiquadFilterNode;
  private midFilter: BiquadFilterNode;
  private trebleFilter: BiquadFilterNode;

  // Power Amp Presence & Master Stage
  private presenceFilter: BiquadFilterNode;
  private powerAmpGain: GainNode;
  private powerAmpShaper: WaveShaperNode;
  private outputTransformerLowpass: BiquadFilterNode;

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
    powerMode: 1,
    inputSensitivity: 1,
  };

  constructor(
    ctx: AudioContext,
    idOrSettings?: string | Partial<AmpHeadSettings>,
    initialParams?: Record<string, number>,
    enabled = true
  ) {
    this.ctx = ctx;

    if (typeof idOrSettings === 'string') {
      this.id = idOrSettings;
      this.settings.enabled = enabled;
      if (initialParams) {
        if (initialParams.model !== undefined) {
          this.settings.model = indexToAmpModel(initialParams.model);
        }
        if (initialParams.gain !== undefined) this.settings.gain = initialParams.gain;
        if (initialParams.bass !== undefined) this.settings.bass = initialParams.bass;
        if (initialParams.mid !== undefined) this.settings.mid = initialParams.mid;
        if (initialParams.treble !== undefined) this.settings.treble = initialParams.treble;
        if (initialParams.presence !== undefined) this.settings.presence = initialParams.presence;
        if (initialParams.master !== undefined) this.settings.master = initialParams.master;
        if (initialParams.powerMode !== undefined) this.settings.powerMode = initialParams.powerMode;
        if (initialParams.inputSensitivity !== undefined) this.settings.inputSensitivity = initialParams.inputSensitivity;
      }
    } else {
      this.id = 'amp-head-default';
      if (idOrSettings) {
        this.settings = { ...this.settings, ...idOrSettings };
      }
    }

    this.curvePreamp = makePreampCurve(this.settings.model, 4096);
    this.curvePowerAmp = makePowerAmpCurve(this.settings.model, 2048);
    this.currentAppliedModel = this.settings.model;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    this.bypassDry = ctx.createGain();
    this.bypassWet = ctx.createGain();

    // 0. V1A Input 68kΩ Grid-Stopper + Miller Capacitance & Grid-Current Soft Limiter
    // Strips ultrasonic/high-frequency pedal hiss (>5.4 kHz) before preamp amplification
    // and smoothly compresses boosted pedal peaks like a real 12AX7 input grid.
    this.inputGridStopperLp = ctx.createBiquadFilter();
    this.inputGridStopperLp.type = 'lowpass';
    this.inputGridStopperLp.frequency.setValueAtTime(5200, ctx.currentTime);
    this.inputGridStopperLp.Q.setValueAtTime(0.65, ctx.currentTime);

    try {
      this.preampDeHisser = new AudioWorkletNode(ctx, 'noise-gate-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        channelCount: 1,
        channelCountMode: 'explicit',
        parameterData: {
          threshold: -46,
          release: 0.055,
          hold: 0.02,
        },
      });
    } catch {
      this.preampDeHisser = null;
    }

    this.inputGridShaper = ctx.createWaveShaper();
    this.inputGridShaper.oversample = '2x';
    this.inputGridShaper.curve = makeInputGridLimiterCurve(2048);

    // 1. Voicing Pre-Filters
    this.preHighpass = ctx.createBiquadFilter();
    this.preHighpass.type = 'highpass';
    this.preHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    this.preVoicingPeak = ctx.createBiquadFilter();
    this.preVoicingPeak.type = 'peaking';

    // 2. Preamp Tube Stage + Plate Snubber / Miller Anti-Fizz Lowpass
    this.preampGain = ctx.createGain();
    this.tubeShaper = ctx.createWaveShaper();
    this.tubeShaper.oversample = '4x';
    this.tubeShaper.curve = this.curvePreamp;
    this.postPreampLowpass = ctx.createBiquadFilter();
    this.postPreampLowpass.type = 'lowpass';
    this.postPreampLowpass.frequency.setValueAtTime(5200, ctx.currentTime);
    this.postPreampLowpass.Q.setValueAtTime(0.65, ctx.currentTime);
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

    this.powerAmpGain = ctx.createGain();
    this.powerAmpShaper = ctx.createWaveShaper();
    this.powerAmpShaper.oversample = '2x';
    this.powerAmpShaper.curve = this.curvePowerAmp;

    // 6. Output Transformer High-Frequency Roll-Off (eliminates harsh digital harmonics above speaker band)
    this.outputTransformerLowpass = ctx.createBiquadFilter();
    this.outputTransformerLowpass.type = 'lowpass';
    this.outputTransformerLowpass.frequency.setValueAtTime(6200, ctx.currentTime);
    this.outputTransformerLowpass.Q.setValueAtTime(0.707, ctx.currentTime);

    // Graph Connection:
    // inputNode -> bypassDry -> outputNode
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    // inputNode -> bypassWet -> inputGridStopperLp -> [preampDeHisser] -> inputGridShaper
    // -> preHighpass -> preVoicingPeak -> preampGain -> tubeShaper -> postPreampLowpass
    // -> dcBlocker -> bassFilter -> midFilter -> trebleFilter -> presenceFilter
    // -> powerAmpGain -> powerAmpShaper -> outputTransformerLowpass -> outputNode
    this.inputNode.connect(this.bypassWet);
    this.bypassWet.connect(this.inputGridStopperLp);
    if (this.preampDeHisser) {
      this.inputGridStopperLp.connect(this.preampDeHisser);
      this.preampDeHisser.connect(this.inputGridShaper);
    } else {
      this.inputGridStopperLp.connect(this.inputGridShaper);
    }
    this.inputGridShaper.connect(this.preHighpass);
    this.preHighpass.connect(this.preVoicingPeak);
    this.preVoicingPeak.connect(this.preampGain);
    this.preampGain.connect(this.tubeShaper);
    this.tubeShaper.connect(this.postPreampLowpass);
    this.postPreampLowpass.connect(this.dcBlocker);
    this.dcBlocker.connect(this.bassFilter);
    this.bassFilter.connect(this.midFilter);
    this.midFilter.connect(this.trebleFilter);
    this.trebleFilter.connect(this.presenceFilter);
    this.presenceFilter.connect(this.powerAmpGain);
    this.powerAmpGain.connect(this.powerAmpShaper);
    this.powerAmpShaper.connect(this.outputTransformerLowpass);
    this.outputTransformerLowpass.connect(this.outputNode);

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

    // 2. Per-model preamp gain mapping + Input Sensitivity Jack (HIGH = 1.0x cascaded, LOW = 0.48x -6dB cleaner pad)
    const isHighSens = (this.settings.inputSensitivity ?? 1) >= 0.5;
    const sensScale = isHighSens ? 1.0 : 0.48;
    const gainNorm = Math.max(0, Math.min(10, this.settings.gain)) / 10;
    const gainMult =
      (profile.gainMin + Math.pow(gainNorm, profile.gainExponent) * profile.gainRange) * sensScale;
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

    // 5. Master Output & Power Mode (HIGH 20W/100W vs LOW 5W Studio Mode)
    const isHighPower = (this.settings.powerMode ?? 1) >= 0.5;
    const powerScale = isHighPower ? 1.0 : 0.76;
    const masterNorm = Math.max(0, Math.min(10, this.settings.master)) / 10;
    const masterGainLinear = Math.pow(masterNorm, 1.3) * profile.masterScale * powerScale;
    set(this.powerAmpGain.gain, masterGainLinear);

    // 6. Built-in Preamp Front-End Noise Suppressor & Dynamic De-Hisser
    // Automatically scales threshold slightly higher on high-gain models so boosted pedals stay dead-silent
    const deHisserThreshParam = this.preampDeHisser?.parameters.get('threshold');
    if (deHisserThreshParam) {
      const baseThresh = profile.preampCurve.kind === 'clean' ? -54 : -48 + gainNorm * 6;
      set(deHisserThreshParam, baseThresh);
    }

    // 7. Preamp Snubber & Output Transformer HF Roll-Off
    const defaultPreLp = profile.preampCurve.kind === 'clean' ? 9500 : profile.preampCurve.drive > 4.2 ? 4900 : 5400;
    const defaultOutLp = profile.powerAmpCurve.kind === 'clean' ? 11000 : 6200;
    const outLpScale = isHighPower ? 1.0 : 0.9;
    set(this.postPreampLowpass.frequency, profile.postPreampLowpassHz ?? defaultPreLp);
    set(this.outputTransformerLowpass.frequency, (profile.outputLowpassHz ?? defaultOutLp) * outLpScale);

    // 8. Bypass State Crossfade
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

  public updateParameter(paramId: string, value: number): void {
    switch (paramId) {
      case 'model':
        this.settings.model = indexToAmpModel(value);
        break;
      case 'gain':
        this.settings.gain = value;
        break;
      case 'bass':
        this.settings.bass = value;
        break;
      case 'mid':
        this.settings.mid = value;
        break;
      case 'treble':
        this.settings.treble = value;
        break;
      case 'presence':
        this.settings.presence = value;
        break;
      case 'master':
        this.settings.master = value;
        break;
      case 'powerMode':
        this.settings.powerMode = value;
        break;
      case 'inputSensitivity':
        this.settings.inputSensitivity = value;
        break;
      default:
        return;
    }
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
      this.inputGridStopperLp.disconnect();
      this.preampDeHisser?.disconnect();
      this.inputGridShaper.disconnect();
      this.preHighpass.disconnect();
      this.preVoicingPeak.disconnect();
      this.preampGain.disconnect();
      this.tubeShaper.disconnect();
      this.postPreampLowpass.disconnect();
      this.dcBlocker.disconnect();
      this.bassFilter.disconnect();
      this.midFilter.disconnect();
      this.midFilter.disconnect();
      this.trebleFilter.disconnect();
      this.presenceFilter.disconnect();
      this.powerAmpGain.disconnect();
      this.powerAmpShaper.disconnect();
      this.outputTransformerLowpass.disconnect();
    } catch (e) {
      console.warn('AmpHeadNode dispose error', e);
    }
  }
}
