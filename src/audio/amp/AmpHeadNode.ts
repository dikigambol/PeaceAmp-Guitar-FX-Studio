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

  private settings: AmpHeadSettings = {
    enabled: true,
    model: 'crunch-plexi',
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

    // 2. Preamp Tube Stage (12AX7)
    this.preampGain = ctx.createGain();
    this.tubeShaper = ctx.createWaveShaper();
    this.tubeShaper.oversample = '4x';
    this.tubeShaper.curve = this.create12Ax7Curve(4096) as Float32Array<ArrayBuffer>;
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
    this.powerAmpShaper.curve = this.createPowerTubeCurve(2048) as Float32Array<ArrayBuffer>;

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
   * 12AX7 Asymmetrical Dual-Triode pre-amplification curve.
   * Produces rich even-order 2nd harmonics on light pick attack,
   * transitioning into saturated tube compression at higher signal levels.
   */
  private create12Ax7Curve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / (samples - 1) - 1;
      if (x >= 0) {
        // Positive swing: soft tube saturation
        curve[i] = Math.tanh(1.8 * x) * 0.95;
      } else {
        // Negative swing: grid-conduction soft compression
        curve[i] = Math.tanh(2.6 * x) * 0.78;
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

  private applySettings(immediate = false): void {
    const now = this.ctx.currentTime;
    const tc = immediate ? 0.001 : 0.02;

    const set = (param: AudioParam, val: number) => {
      if (immediate) param.setValueAtTime(val, now);
      else param.setTargetAtTime(val, now, tc);
    };

    // 1. Voicing Configuration by Amp Model
    this.configureVoicing(this.settings.model, set);

    // 2. Preamp Gain calculation
    const gainNorm = Math.max(0, Math.min(10, this.settings.gain)) / 10;
    let gainMult: number;
    switch (this.settings.model) {
      case 'clean-tweed':
        gainMult = 1.0 + Math.pow(gainNorm, 1.4) * 4.5;
        break;
      case 'crunch-plexi':
        gainMult = 1.2 + Math.pow(gainNorm, 1.5) * 12.0;
        break;
      case 'chime-ac30':
        gainMult = 1.1 + Math.pow(gainNorm, 1.45) * 8.5;
        break;
      case 'lead-recto':
        gainMult = 1.5 + Math.pow(gainNorm, 1.6) * 22.0;
        break;
      case 'modern-djent':
        gainMult = 2.0 + Math.pow(gainNorm, 1.65) * 26.0;
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
    const masterGainLinear = Math.pow(masterNorm, 1.3) * 1.5;
    set(this.powerAmpGain.gain, masterGainLinear);

    // 6. Bypass State Crossfade
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.settings.enabled, this.ctx, 0.015);
  }

  private configureVoicing(
    model: AmpModelId,
    set: (param: AudioParam, val: number) => void
  ): void {
    switch (model) {
      case 'clean-tweed':
        set(this.preHighpass.frequency, 65);
        set(this.preVoicingPeak.frequency, 450);
        set(this.preVoicingPeak.Q, 0.9);
        set(this.preVoicingPeak.gain, 1.5); // Warm lower midrange
        break;

      case 'crunch-plexi':
        set(this.preHighpass.frequency, 95);
        set(this.preVoicingPeak.frequency, 1400);
        set(this.preVoicingPeak.Q, 1.0);
        set(this.preVoicingPeak.gain, 3.2); // Signature Marshall bark
        break;

      case 'chime-ac30':
        set(this.preHighpass.frequency, 85);
        set(this.preVoicingPeak.frequency, 2600);
        set(this.preVoicingPeak.Q, 1.2);
        set(this.preVoicingPeak.gain, 4.0); // Chimey top-boost bite
        break;

      case 'lead-recto':
        set(this.preHighpass.frequency, 120); // Tighten sub-bass flub
        set(this.preVoicingPeak.frequency, 720);
        set(this.preVoicingPeak.Q, 1.2);
        set(this.preVoicingPeak.gain, -2.5); // Classic scooped mid lead
        break;

      case 'modern-djent':
        set(this.preHighpass.frequency, 150); // Ultra-tight modern bottom cut
        set(this.preVoicingPeak.frequency, 1800);
        set(this.preVoicingPeak.Q, 1.4);
        set(this.preVoicingPeak.gain, 4.5); // Aggressive pick-attack transient
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
