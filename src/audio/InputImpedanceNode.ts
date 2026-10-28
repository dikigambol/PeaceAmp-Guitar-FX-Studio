/**
 * Input Impedance / Pickup Voicing & Loading Simulator
 *
 * Simulates both the electrical loading that a passive guitar pickup experiences
 * when connected to a pedal/amp input AND optional pickup character voicing
 * (e.g. Strat Single-Coil, PAF Humbucker, P-90, Burns Tri-Sonic in Series
 * like Brian May's Red Special, or Flat Hi-Z DI).
 *
 * Circuit modeled:
 *   Pickup: series Rp (5-14k) + Lp (2-8H) + Cp (self-capacitance ~100-250pF)
 *   Cable:  Cc (200-300pF/m * 3-5m = 600-1500pF)
 *   Load:   Rload || Cload (amp/pedal input, typically 1M || 50-100pF, or 10k-50k for vintage Ge pedals)
 */

export type PickupVoicingType =
  | 'flat'
  | 'single-coil'
  | 'humbucker'
  | 'p90'
  | 'trisonic-series'
  | 'active';

export interface InputImpedanceConfig {
  /** Pickup voicing / loading preset */
  pickupType: PickupVoicingType;
  /** Cable length in meters (typical 3-6m) */
  cableLengthM: number;
  /** Input impedance of the "amp/pedal" in ohms (10k - 2M) */
  loadResistance: number;
  /** Input capacitance of the amp/pedal in pF (including stray) */
  loadCapacitancePf: number;
  /** Volume pot position (0 = full, 10 = zero) - affects load resistance seen by pickup */
  volumePosition: number;
}

interface PickupPresetSpec {
  Rp: number;
  Lp: number;
  Cp: number;
  /** Base voicing peak gain in dB at 1M load */
  voicingPeakDb: number;
  /** Base lowpass cap (Hz) to prevent harsh ultrasonic interface noise */
  maxLowpassHz: number;
}

const PRESETS: Record<PickupVoicingType, PickupPresetSpec> = {
  'flat': { Rp: 4000, Lp: 1.8, Cp: 80e-12, voicingPeakDb: 0.4, maxLowpassHz: 14000 },
  'single-coil': { Rp: 6200, Lp: 2.6, Cp: 115e-12, voicingPeakDb: 2.0, maxLowpassHz: 9500 },   // Strat/Tele chime (~3.3 kHz peak)
  'p90': { Rp: 7800, Lp: 3.9, Cp: 150e-12, voicingPeakDb: 2.4, maxLowpassHz: 7800 },   // P-90 gritty mid bark (~2.5 kHz peak)
  'humbucker': { Rp: 8600, Lp: 5.0, Cp: 180e-12, voicingPeakDb: 2.2, maxLowpassHz: 6800 },   // PAF Humbucker warm (~2.1 kHz peak)
  'trisonic-series': { Rp: 13800, Lp: 7.8, Cp: 240e-12, voicingPeakDb: 3.6, maxLowpassHz: 5200 },   // Red Special Burns Tri-Sonic in Series (~1.35 kHz vocal honk)
  'active': { Rp: 100, Lp: 0.01, Cp: 10e-12, voicingPeakDb: 0.0, maxLowpassHz: 16000 },  // EMG-style buffered active
};

const CABLE_CAP_PER_METER = 250e-12; // 250 pF/m low-noise studio guitar cable

export class InputImpedanceNode {
  public readonly inputNode: GainNode;
  public readonly outputNode: GainNode;

  private ctx: AudioContext;
  private config: InputImpedanceConfig;

  // Filter nodes forming the RLC response
  private resonantFilter: BiquadFilterNode | null = null;
  private cableLowpass: BiquadFilterNode | null = null;
  private loadHighpass: BiquadFilterNode | null = null; // DC block from load cap
  private gainComp: GainNode | null = null;

  constructor(ctx: AudioContext, config: Partial<InputImpedanceConfig> = {}) {
    this.ctx = ctx;

    // Default to 'flat' so a real guitar isn't artificially over-brightened (+6.5dB hiss),
    // while still modeling natural cable & pedal input impedance loading.
    this.config = {
      pickupType: 'flat',
      cableLengthM: 3,
      loadResistance: 1e6,
      loadCapacitancePf: 80,
      volumePosition: 0,
      ...config,
    };

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    this.buildGraph();
  }

  private computeFilterTargets() {
    const { pickupType, cableLengthM, loadResistance, loadCapacitancePf, volumePosition } = this.config;
    const preset = PRESETS[pickupType] ?? PRESETS['flat'];

    const potFactor = Math.max(0.001, 1 - volumePosition / 10);
    const effectiveRload = loadResistance * potFactor;

    const totalC = preset.Cp + cableLengthM * CABLE_CAP_PER_METER + loadCapacitancePf * 1e-12;
    const fr = 1 / (2 * Math.PI * Math.sqrt(preset.Lp * totalC));

    const omega0 = 2 * Math.PI * fr;
    const damping = (1 / (effectiveRload * totalC)) + (preset.Rp / preset.Lp);
    const Q = damping > 0 ? omega0 / damping : 1.5;

    const safeFr = Math.max(950, Math.min(6000, fr));
    const safeQ = Math.max(0.707, Math.min(3.2, Q * 0.65));

    // When loaded down by a low-impedance vintage pedal (e.g., Fuzz Face / Rangemaster ~10k-50k),
    // the resonant peak damps out naturally just like a real passive pickup.
    const loadDampingFactor = Math.min(1.0, effectiveRload / 250000);
    const peakGainDb = preset.voicingPeakDb * loadDampingFactor;

    const rParallel = (preset.Rp * effectiveRload) / (preset.Rp + effectiveRload);
    const rawCableFc = 1 / (2 * Math.PI * rParallel * (cableLengthM * CABLE_CAP_PER_METER));
    const cableFc = Math.max(1800, Math.min(preset.maxLowpassHz, rawCableFc));

    // Gentle low-cut for mud/DC prevention (especially helpful on series pickups)
    const baseHighpassHz = pickupType === 'trisonic-series' ? 85 : 35;
    const loadFc = Math.max(baseHighpassHz, Math.min(120, 1 / (2 * Math.PI * effectiveRload * loadCapacitancePf * 1e-12)));

    // Keep DC gain compensation bounded so low-Z loads don't boost noise floor wildly
    const rawDcGain = effectiveRload / (preset.Rp + effectiveRload);
    const compGain = Math.min(1.25, 1 / Math.max(0.5, rawDcGain));

    return { safeFr, safeQ, peakGainDb, cableFc, loadFc, compGain };
  }

  private buildGraph(): void {
    const { safeFr, safeQ, peakGainDb, cableFc, loadFc, compGain } = this.computeFilterTargets();

    this.resonantFilter = this.ctx.createBiquadFilter();
    this.resonantFilter.type = 'peaking';
    this.resonantFilter.frequency.setValueAtTime(safeFr, this.ctx.currentTime);
    this.resonantFilter.Q.setValueAtTime(safeQ, this.ctx.currentTime);
    this.resonantFilter.gain.setValueAtTime(peakGainDb, this.ctx.currentTime);

    this.cableLowpass = this.ctx.createBiquadFilter();
    this.cableLowpass.type = 'lowpass';
    this.cableLowpass.frequency.setValueAtTime(cableFc, this.ctx.currentTime);
    this.cableLowpass.Q.setValueAtTime(0.707, this.ctx.currentTime);

    this.loadHighpass = this.ctx.createBiquadFilter();
    this.loadHighpass.type = 'highpass';
    this.loadHighpass.frequency.setValueAtTime(loadFc, this.ctx.currentTime);
    this.loadHighpass.Q.setValueAtTime(0.707, this.ctx.currentTime);

    this.gainComp = this.ctx.createGain();
    this.gainComp.gain.setValueAtTime(compGain, this.ctx.currentTime);

    this.inputNode.connect(this.gainComp);
    this.gainComp.connect(this.resonantFilter);
    this.resonantFilter.connect(this.cableLowpass);
    this.cableLowpass.connect(this.loadHighpass);
    this.loadHighpass.connect(this.outputNode);
  }

  /** Update configuration live with click-free parameter transitions */
  public updateConfig(partial: Partial<InputImpedanceConfig>): void {
    this.config = { ...this.config, ...partial };
    const { safeFr, safeQ, peakGainDb, cableFc, loadFc, compGain } = this.computeFilterTargets();

    if (this.resonantFilter && this.cableLowpass && this.loadHighpass && this.gainComp) {
      const now = this.ctx.currentTime;
      const tc = 0.02;
      try {
        this.resonantFilter.frequency.setTargetAtTime(safeFr, now, tc);
        this.resonantFilter.Q.setTargetAtTime(safeQ, now, tc);
        this.resonantFilter.gain.setTargetAtTime(peakGainDb, now, tc);
        this.cableLowpass.frequency.setTargetAtTime(cableFc, now, tc);
        this.loadHighpass.frequency.setTargetAtTime(loadFc, now, tc);
        this.gainComp.gain.setTargetAtTime(compGain, now, tc);
        return;
      } catch {
        // Fallback to rebuild if scheduling fails
      }
    }

    this.disposeGraph();
    this.buildGraph();
  }

  /** Get current config */
  public getConfig(): InputImpedanceConfig {
    return { ...this.config };
  }

  /** Preset helpers */
  public setPickupType(type: PickupVoicingType): void {
    this.updateConfig({ pickupType: type });
  }

  public setCableLength(meters: number): void {
    this.updateConfig({ cableLengthM: Math.max(0.5, Math.min(10, meters)) });
  }

  public setLoadResistance(ohms: number): void {
    this.updateConfig({ loadResistance: Math.max(5e3, Math.min(5e6, ohms)) });
  }

  public setVolumePosition(pos: number): void {
    this.updateConfig({ volumePosition: Math.max(0, Math.min(10, pos)) });
  }

  private disposeGraph(): void {
    try {
      this.resonantFilter?.disconnect();
      this.cableLowpass?.disconnect();
      this.loadHighpass?.disconnect();
      this.gainComp?.disconnect();
    } catch { /* ignore */ }
    this.resonantFilter = null;
    this.cableLowpass = null;
    this.loadHighpass = null;
    this.gainComp = null;
  }

  public dispose(): void {
    this.disposeGraph();
    this.inputNode.disconnect();
    this.outputNode.disconnect();
  }
}
