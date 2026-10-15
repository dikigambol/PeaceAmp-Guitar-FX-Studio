import type { AmpHeadSettings, AmpModelId } from '../../types/amp';
import { createDcBlocker, applyBypassCrossfade } from '../pedals/dspUtils';

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

  // Power Amp Presence & Master Stage
  private presenceFilter: BiquadFilterNode;
  private powerAmpGain: GainNode;
  private powerAmpShaper: WaveShaperNode;

  // Pre-computed Shaper Curves
  private curvePristinePreamp: Float32Array<ArrayBuffer>;
  private curveTweedPreamp: Float32Array<ArrayBuffer>;
  private curveStandardTubePreamp: Float32Array<ArrayBuffer>;
  private curveHighGainPreamp: Float32Array<ArrayBuffer>;
  private curvePristinePowerAmp: Float32Array<ArrayBuffer>;
  private curveTubePowerAmp: Float32Array<ArrayBuffer>;
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

    // Pre-calculate specialized shaper curves
    this.curvePristinePreamp = this.createPristineCleanCurve(4096) as Float32Array<ArrayBuffer>;
    this.curveTweedPreamp = this.createTweedCurve(4096) as Float32Array<ArrayBuffer>;
    this.curveStandardTubePreamp = this.create12Ax7Curve(4096) as Float32Array<ArrayBuffer>;
    this.curveHighGainPreamp = this.createHighGainCurve(4096) as Float32Array<ArrayBuffer>;
    this.curvePristinePowerAmp = this.createPristinePowerAmpCurve(2048) as Float32Array<ArrayBuffer>;
    this.curveTubePowerAmp = this.createPowerTubeCurve(2048) as Float32Array<ArrayBuffer>;

    if (initialSettings) {
      this.settings = { ...this.settings, ...initialSettings };
    }

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
    this.dcBlocker = createDcBlocker(ctx, 15);

    // 3. Interactive Tone Stack
    this.bassFilter = ctx.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.setValueAtTime(110, ctx.currentTime);

    this.midFilter = ctx.createBiquadFilter();
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.setValueAtTime(650, ctx.currentTime);
    this.midFilter.Q.setValueAtTime(0.8, ctx.currentTime);

    this.trebleFilter = ctx.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.setValueAtTime(3200, ctx.currentTime);

    // 4. Power Amp Presence & Master
    this.presenceFilter = ctx.createBiquadFilter();
    this.presenceFilter.type = 'peaking';
    this.presenceFilter.frequency.setValueAtTime(4800, ctx.currentTime);
    this.presenceFilter.Q.setValueAtTime(1.1, ctx.currentTime);

    this.powerAmpGain = ctx.createGain();
    this.powerAmpShaper = ctx.createWaveShaper();
    this.powerAmpShaper.oversample = '2x';

    // Graph Connection:
    // inputNode -> bypassDry -> outputNode
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    // inputNode -> bypassWet -> preHighpass -> preVoicingPeak -> preampGain -> tubeShaper
    // -> dcBlocker -> bassFilter -> midFilter -> trebleFilter -> presenceFilter
    // -> powerAmpGain -> powerAmpShaper -> outputNode
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
    this.presenceFilter.connect(this.powerAmpGain);
    this.powerAmpGain.connect(this.powerAmpShaper);
    this.powerAmpShaper.connect(this.outputNode);

    this.applySettings(true);
  }

  /**
   * Ultra-High Headroom Pristine Clean Preamp Curve.
   * Completely linear across the full musical range with transparent soft-clip protection
   * only at extreme signal overshoots (>0.90), ensuring 100% distortion-free pristine reproduction.
   */
  private createPristineCleanCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / (samples - 1) - 1; // -1 to +1
      if (Math.abs(x) <= 0.90) {
        curve[i] = x;
      } else {
        const sign = Math.sign(x);
        const over = Math.abs(x) - 0.90;
        curve[i] = sign * (0.90 + 0.08 * Math.tanh(over / 0.08));
      }
    }
    return curve;
  }

  /**
   * Vintage Tweed & Touch-Sensitive Bloom Preamp Curve:
   * Clean and clear at light pick dynamics (|x| < 0.25), smoothly transitioning into
   * warm organic 12AX7 even-order tube compression on heavy strikes.
   */
  private createTweedCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / (samples - 1) - 1;
      if (Math.abs(x) < 0.25) {
        curve[i] = x;
      } else if (x >= 0.25) {
        const xOff = x - 0.25;
        curve[i] = 0.25 + Math.tanh(1.5 * xOff) * 0.70;
      } else {
        const xOff = Math.abs(x) - 0.25;
        curve[i] = -(0.25 + Math.tanh(2.1 * xOff) * 0.65);
      }
    }
    return curve;
  }

  /**
   * 12AX7 Asymmetrical Dual-Triode pre-amplification curve.
   * Produces rich even-order 2nd harmonics and aggressive tube saturation for Crunch/Classic Rock/Lead.
   */
  private create12Ax7Curve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / (samples - 1) - 1;
      if (x >= 0) {
        curve[i] = Math.tanh(1.8 * x) * 0.95;
      } else {
        curve[i] = Math.tanh(2.6 * x) * 0.78;
      }
    }
    return curve;
  }

  /**
   * Modern High-Gain Cascade Triode curve.
   * Tighter asymmetrical clipping with enhanced harmonic density and articulation for heavy metal chugs.
   */
  private createHighGainCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / (samples - 1) - 1;
      if (x >= 0) {
        curve[i] = Math.tanh(2.6 * x) * 0.94;
      } else {
        curve[i] = Math.tanh(3.5 * x) * 0.76;
      }
    }
    return curve;
  }

  /**
   * Pristine Power Amp Curve:
   * Pure transparent linear response for pristine clean amplification.
   */
  private createPristinePowerAmpCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / (samples - 1) - 1;
      if (Math.abs(x) <= 0.95) {
        curve[i] = x;
      } else {
        curve[i] = Math.sign(x) * (0.95 + 0.04 * Math.tanh((Math.abs(x) - 0.95) / 0.04));
      }
    }
    return curve;
  }

  /**
   * EL34 / 6L6 Power Tube Output Transformer saturation curve.
   * Gentle soft knee adding warm power-stage sag when Master is cranked.
   */
  private createPowerTubeCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / (samples - 1) - 1;
      curve[i] = (Math.atan(1.4 * x) / Math.atan(1.4)) * 0.98;
    }
    return curve;
  }

  private updateCurvesForModel(model: AmpModelId): void {
    if (this.currentAppliedModel === model) return;
    this.currentAppliedModel = model;

    switch (model) {
      case 'pristine-clean':
      case 'fender-twin':
        this.tubeShaper.curve = this.curvePristinePreamp;
        this.powerAmpShaper.curve = this.curvePristinePowerAmp;
        break;

      case 'clean-tweed':
      case 'fender-deluxe':
      case 'dumble-ods':
      case 'mesa-lonestar':
        this.tubeShaper.curve = this.curveTweedPreamp;
        this.powerAmpShaper.curve = this.curveTubePowerAmp;
        break;

      case 'evh-5150':
      case 'modern-djent':
      case 'lead-recto':
      case 'engl-powerball':
        this.tubeShaper.curve = this.curveHighGainPreamp;
        this.powerAmpShaper.curve = this.curveTubePowerAmp;
        break;

      default:
        // Plexi, JCM800, Silver Jubilee, AC30, Rockerverb, Mark, Soldano, Bogner
        this.tubeShaper.curve = this.curveStandardTubePreamp;
        this.powerAmpShaper.curve = this.curveTubePowerAmp;
        break;
    }
  }

  private applySettings(immediate = false): void {
    const now = this.ctx.currentTime;
    const tc = immediate ? 0.001 : 0.02;

    const set = (param: AudioParam, val: number) => {
      if (immediate) param.setValueAtTime(val, now);
      else param.setTargetAtTime(val, now, tc);
    };

    // 0. Update Shaper Curves if model changed
    this.updateCurvesForModel(this.settings.model);

    // 1. Voicing Configuration by Amp Model
    this.configureVoicing(this.settings.model, set);

    // 2. Preamp Gain calculation
    const gainNorm = Math.max(0, Math.min(10, this.settings.gain)) / 10;
    let gainMult: number;
    switch (this.settings.model) {
      // Roland & Clean Fender
      case 'pristine-clean':
        gainMult = 0.9 + Math.pow(gainNorm, 1.2) * 1.1; // 0.9x to 2.0x
        break;
      case 'fender-twin':
        gainMult = 0.85 + Math.pow(gainNorm, 1.3) * 1.8; // 0.85x to 2.65x
        break;
      case 'clean-tweed':
        gainMult = 0.75 + Math.pow(gainNorm, 1.5) * 3.8; // 0.75x to 4.55x
        break;
      case 'fender-deluxe':
        gainMult = 0.8 + Math.pow(gainNorm, 1.4) * 4.6; // 0.8x to 5.4x
        break;

      // Vox
      case 'chime-ac30':
        gainMult = 1.1 + Math.pow(gainNorm, 1.45) * 8.5; // 1.1x to 9.6x
        break;

      // Marshall
      case 'crunch-plexi':
        gainMult = 1.2 + Math.pow(gainNorm, 1.5) * 12.0; // 1.2x to 13.2x
        break;
      case 'marshall-jcm800':
        gainMult = 1.3 + Math.pow(gainNorm, 1.5) * 15.0; // 1.3x to 16.3x
        break;
      case 'marshall-silver-jubilee':
        gainMult = 1.4 + Math.pow(gainNorm, 1.55) * 18.0; // 1.4x to 19.4x
        break;

      // Orange
      case 'orange-rockerverb':
        gainMult = 1.4 + Math.pow(gainNorm, 1.5) * 17.0; // 1.4x to 18.4x
        break;

      // Boutique Blues / Dynamic
      case 'dumble-ods':
        gainMult = 0.9 + Math.pow(gainNorm, 1.4) * 7.5; // 0.9x to 8.4x
        break;
      case 'mesa-lonestar':
        gainMult = 0.85 + Math.pow(gainNorm, 1.4) * 6.5; // 0.85x to 7.35x
        break;

      // High Gain Titans
      case 'mesa-mark':
        gainMult = 1.5 + Math.pow(gainNorm, 1.6) * 20.0; // 1.5x to 21.5x
        break;
      case 'lead-recto':
        gainMult = 1.5 + Math.pow(gainNorm, 1.6) * 22.0; // 1.5x to 23.5x
        break;
      case 'soldano-slo100':
        gainMult = 1.6 + Math.pow(gainNorm, 1.6) * 23.5; // 1.6x to 25.1x
        break;
      case 'bogner-ecstasy':
        gainMult = 1.5 + Math.pow(gainNorm, 1.55) * 21.0; // 1.5x to 22.5x
        break;
      case 'evh-5150':
        gainMult = 1.8 + Math.pow(gainNorm, 1.65) * 26.5; // 1.8x to 28.3x
        break;
      case 'modern-djent':
        gainMult = 2.0 + Math.pow(gainNorm, 1.65) * 26.0; // 2.0x to 28.0x
        break;
      case 'engl-powerball':
        gainMult = 1.9 + Math.pow(gainNorm, 1.65) * 27.5; // 1.9x to 29.4x
        break;

      default:
        gainMult = 1.2 + Math.pow(gainNorm, 1.5) * 10.0;
        break;
    }
    set(this.preampGain.gain, gainMult);

    // 3. FMV Tonestack calculation (BASS: -12 to +12 dB, MID: -10 to +10 dB, TREBLE: -12 to +12 dB)
    const bassDb = -12 + (Math.max(0, Math.min(10, this.settings.bass)) / 10) * 24;
    const midDb = -10 + (Math.max(0, Math.min(10, this.settings.mid)) / 10) * 20;
    const trebleDb = -12 + (Math.max(0, Math.min(10, this.settings.treble)) / 10) * 24;
    set(this.bassFilter.gain, bassDb);
    set(this.midFilter.gain, midDb);
    set(this.trebleFilter.gain, trebleDb);

    // 4. Presence calculation (-9 to +9 dB)
    const presDb = -9 + (Math.max(0, Math.min(10, this.settings.presence)) / 10) * 18;
    set(this.presenceFilter.gain, presDb);

    // 5. Master Output calculation (normalized volume scale with headroom compensation)
    const masterNorm = Math.max(0, Math.min(10, this.settings.master)) / 10;
    const isClean = this.settings.model === 'pristine-clean' || this.settings.model === 'fender-twin';
    const masterGainLinear = Math.pow(masterNorm, 1.3) * (isClean ? 1.4 : 1.5);
    set(this.powerAmpGain.gain, masterGainLinear);

    // 6. Bypass State Crossfade
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.settings.enabled, this.ctx, 0.015);
  }

  private configureVoicing(
    model: AmpModelId,
    set: (param: AudioParam, val: number) => void
  ): void {
    switch (model) {
      case 'pristine-clean':
        set(this.preHighpass.frequency, 40); // Deep, unrestricted low-end headroom
        set(this.preVoicingPeak.frequency, 1200);
        set(this.preVoicingPeak.Q, 0.7);
        set(this.preVoicingPeak.gain, 0.0); // Completely flat, pristine studio response
        break;

      case 'fender-twin':
        set(this.preHighpass.frequency, 45);
        set(this.preVoicingPeak.frequency, 2400);
        set(this.preVoicingPeak.Q, 0.85);
        set(this.preVoicingPeak.gain, 1.8); // Sparkling glass top-end
        break;

      case 'clean-tweed':
        set(this.preHighpass.frequency, 65);
        set(this.preVoicingPeak.frequency, 450);
        set(this.preVoicingPeak.Q, 0.9);
        set(this.preVoicingPeak.gain, 1.5); // Warm lower midrange
        break;

      case 'fender-deluxe':
        set(this.preHighpass.frequency, 60);
        set(this.preVoicingPeak.frequency, 850);
        set(this.preVoicingPeak.Q, 0.8);
        set(this.preVoicingPeak.gain, -1.2); // Sweet mid-scoop blues dynamic
        break;

      case 'chime-ac30':
        set(this.preHighpass.frequency, 85);
        set(this.preVoicingPeak.frequency, 2600);
        set(this.preVoicingPeak.Q, 1.2);
        set(this.preVoicingPeak.gain, 4.0); // Chimey top-boost bite
        break;

      case 'crunch-plexi':
        set(this.preHighpass.frequency, 95);
        set(this.preVoicingPeak.frequency, 1400);
        set(this.preVoicingPeak.Q, 1.0);
        set(this.preVoicingPeak.gain, 3.2); // Signature Marshall bark
        break;

      case 'marshall-jcm800':
        set(this.preHighpass.frequency, 110);
        set(this.preVoicingPeak.frequency, 1750);
        set(this.preVoicingPeak.Q, 1.15);
        set(this.preVoicingPeak.gain, 3.8); // 80s hard rock cutting punch
        break;

      case 'marshall-silver-jubilee':
        set(this.preHighpass.frequency, 115);
        set(this.preVoicingPeak.frequency, 1300);
        set(this.preVoicingPeak.Q, 1.1);
        set(this.preVoicingPeak.gain, 2.8); // Thicker singing lead midrange
        break;

      case 'orange-rockerverb':
        set(this.preHighpass.frequency, 80);
        set(this.preVoicingPeak.frequency, 680);
        set(this.preVoicingPeak.Q, 1.05);
        set(this.preVoicingPeak.gain, 3.4); // Fat Orange mid growl & fuzz bite
        break;

      case 'dumble-ods':
        set(this.preHighpass.frequency, 75);
        set(this.preVoicingPeak.frequency, 1100);
        set(this.preVoicingPeak.Q, 1.3);
        set(this.preVoicingPeak.gain, 2.6); // Vocal saxophone bloom & sustain
        break;

      case 'mesa-lonestar':
        set(this.preHighpass.frequency, 70);
        set(this.preVoicingPeak.frequency, 550);
        set(this.preVoicingPeak.Q, 0.95);
        set(this.preVoicingPeak.gain, 1.8); // Rich warm Texas blues bloom
        break;

      case 'mesa-mark':
        set(this.preHighpass.frequency, 130);
        set(this.preVoicingPeak.frequency, 750);
        set(this.preVoicingPeak.Q, 1.3);
        set(this.preVoicingPeak.gain, -3.2); // Classic Boogie graphic EQ V-curve
        break;

      case 'lead-recto':
        set(this.preHighpass.frequency, 120); // Tighten sub-bass flub
        set(this.preVoicingPeak.frequency, 720);
        set(this.preVoicingPeak.Q, 1.2);
        set(this.preVoicingPeak.gain, -2.5); // Classic scooped mid lead
        break;

      case 'soldano-slo100':
        set(this.preHighpass.frequency, 125);
        set(this.preVoicingPeak.frequency, 1600);
        set(this.preVoicingPeak.Q, 1.25);
        set(this.preVoicingPeak.gain, 3.6); // Signature SLO overtone sizzle
        break;

      case 'bogner-ecstasy':
        set(this.preHighpass.frequency, 110);
        set(this.preVoicingPeak.frequency, 1200);
        set(this.preVoicingPeak.Q, 1.05);
        set(this.preVoicingPeak.gain, 2.2); // Velvety boutique sustain
        break;

      case 'evh-5150':
        set(this.preHighpass.frequency, 140);
        set(this.preVoicingPeak.frequency, 1900);
        set(this.preVoicingPeak.Q, 1.35);
        set(this.preVoicingPeak.gain, 4.2); // Aggressive 5150 crunch bite & sizzle
        break;

      case 'modern-djent':
        set(this.preHighpass.frequency, 155); // Ultra-tight modern bottom cut
        set(this.preVoicingPeak.frequency, 1800);
        set(this.preVoicingPeak.Q, 1.4);
        set(this.preVoicingPeak.gain, 4.5); // Aggressive pick-attack transient
        break;

      case 'engl-powerball':
        set(this.preHighpass.frequency, 150);
        set(this.preVoicingPeak.frequency, 2100);
        set(this.preVoicingPeak.Q, 1.4);
        set(this.preVoicingPeak.gain, 4.0); // Razor-sharp German attack
        break;
    }
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
