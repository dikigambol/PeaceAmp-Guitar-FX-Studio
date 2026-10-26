/**
 * Input Impedance / Pickup Loading Simulator
 *
 * Simulates the electrical loading that a passive guitar pickup experiences
 * when connected to a pedal/amp input. This is the #1 perceptual difference
 * between "direct-in digital" and "real amp" tone.
 *
 * Circuit modeled:
 *   Pickup: series Rp (5-10k) + Lp (2-8H) + Cp (self-capacitance ~100-200pF)
 *   Cable:  Cc (200-500pF/m * 3-5m = 600-2500pF)
 *   Load:   Rload || Cload (amp/pedal input, typically 1M || 50-100pF)
 *
 * Result: resonant low-pass with peak at 2-5 kHz (depending on pickup + cable),
 * followed by 12 dB/oct roll-off. The peak frequency and Q shift with
 * Rload (volume pot position) and cable length.
 */

export interface InputImpedanceConfig {
  /** Pickup type preset */
  pickupType: 'single-coil' | 'humbucker' | 'p90' | 'active';
  /** Cable length in meters (typical 3-6m) */
  cableLengthM: number;
  /** Input impedance of the "amp/pedal" in ohms (100k - 2M) */
  loadResistance: number;
  /** Input capacitance of the amp/pedal in pF (including stray) */
  loadCapacitancePf: number;
  /** Volume pot position (0 = full, 10 = zero) - affects load resistance seen by pickup */
  volumePosition: number;
}

const PRESETS: Record<InputImpedanceConfig['pickupType'], { Rp: number; Lp: number; Cp: number }> = {
  'single-coil': { Rp: 6500, Lp: 2.8, Cp: 120e-12 },   // Strat/Tele typical
  'humbucker':   { Rp: 8500, Lp: 5.2, Cp: 180e-12 },   // PAF-style
  'p90':         { Rp: 7500, Lp: 3.8, Cp: 150e-12 },   // P-90
  'active':      { Rp: 100,  Lp: 0.01, Cp: 10e-12 },   // EMG-style (buffered)
};

const CABLE_CAP_PER_METER = 300e-12; // 300 pF/m typical guitar cable

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

    // Defaults: typical Strat into 1M pedal with 3m cable
    this.config = {
      pickupType: 'single-coil',
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

  private buildGraph(): void {
    const { pickupType, cableLengthM, loadResistance, loadCapacitancePf, volumePosition } = this.config;
    const preset = PRESETS[pickupType];

    // Effective load resistance seen by pickup (volume pot as voltage divider)
    // At volume=0 (full), load = loadResistance
    // At volume=10 (zero), load ≈ pickup Rp (pot wiper to ground)
    const potFactor = Math.max(0.001, 1 - volumePosition / 10);
    const effectiveRload = loadResistance * potFactor;

    // Total capacitance across pickup: Cp + Ccable + Cload
    const totalC = preset.Cp + cableLengthM * CABLE_CAP_PER_METER + loadCapacitancePf * 1e-12;

    // Resonant frequency: fr = 1 / (2π * sqrt(Lp * Ctotal))
    const fr = 1 / (2 * Math.PI * Math.sqrt(preset.Lp * totalC));

    // Q factor: Q = Rtotal * sqrt(Ctotal / Lp) where Rtotal = Rp || Rload
    const Rtotal = (preset.Rp * effectiveRload) / (preset.Rp + effectiveRload);
    const Q = Rtotal * Math.sqrt(totalC / preset.Lp);

    // Clamp to safe audio range
    const safeFr = Math.max(500, Math.min(8000, fr));
    const safeQ = Math.max(0.3, Math.min(15, Q));

    // Build filter chain: resonant peak (bandpass) + cable lowpass + load highpass (DC block)
    this.resonantFilter = this.ctx.createBiquadFilter();
    this.resonantFilter.type = 'peaking';
    this.resonantFilter.frequency.setValueAtTime(safeFr, this.ctx.currentTime);
    this.resonantFilter.Q.setValueAtTime(safeQ, this.ctx.currentTime);
    // Gain at resonance ≈ 20*log10(Q * Rload/(Rp+Rload)) dB
    const peakGainDb = 20 * Math.log10(safeQ * (effectiveRload / (preset.Rp + effectiveRload)));
    this.resonantFilter.gain.setValueAtTime(Math.max(-6, Math.min(12, peakGainDb)), this.ctx.currentTime);

    // Cable capacitance adds additional low-pass above resonance
    // fc = 1 / (2π * (Rp||Rload) * Ccable)
    const cableFc = 1 / (2 * Math.PI * Rtotal * (cableLengthM * CABLE_CAP_PER_METER));
    this.cableLowpass = this.ctx.createBiquadFilter();
    this.cableLowpass.type = 'lowpass';
    this.cableLowpass.frequency.setValueAtTime(Math.max(2000, Math.min(20000, cableFc)), this.ctx.currentTime);
    this.cableLowpass.Q.setValueAtTime(0.707, this.ctx.currentTime);

    // Load capacitance forms a high-pass with load resistance (blocks DC offset from asymmetric clipping later)
    const loadFc = 1 / (2 * Math.PI * effectiveRload * loadCapacitancePf * 1e-12);
    this.loadHighpass = this.ctx.createBiquadFilter();
    this.loadHighpass.type = 'highpass';
    this.loadHighpass.frequency.setValueAtTime(Math.max(1, Math.min(50, loadFc)), this.ctx.currentTime);
    this.loadHighpass.Q.setValueAtTime(0.707, this.ctx.currentTime);

    // Compensation gain to maintain unity at DC (below resonance)
    // At DC: pickup is just Rp, voltage divider with Rload
    const dcGain = effectiveRload / (preset.Rp + effectiveRload);
    this.gainComp = this.ctx.createGain();
    this.gainComp.gain.setValueAtTime(1 / dcGain, this.ctx.currentTime);

    // Wire: input -> gainComp -> resonantPeak -> cableLowpass -> loadHighpass -> output
    this.inputNode.connect(this.gainComp);
    this.gainComp.connect(this.resonantFilter);
    this.resonantFilter.connect(this.cableLowpass);
    this.cableLowpass.connect(this.loadHighpass);
    this.loadHighpass.connect(this.outputNode);
  }

  /** Update configuration live with click-free parameter transitions */
  public updateConfig(partial: Partial<InputImpedanceConfig>): void {
    this.config = { ...this.config, ...partial };

    const { pickupType, cableLengthM, loadResistance, loadCapacitancePf, volumePosition } = this.config;
    const preset = PRESETS[pickupType];

    const potFactor = Math.max(0.001, 1 - volumePosition / 10);
    const effectiveRload = loadResistance * potFactor;
    const totalC = preset.Cp + cableLengthM * CABLE_CAP_PER_METER + loadCapacitancePf * 1e-12;
    const fr = 1 / (2 * Math.PI * Math.sqrt(preset.Lp * totalC));
    const Rtotal = (preset.Rp * effectiveRload) / (preset.Rp + effectiveRload);
    const Q = Rtotal * Math.sqrt(totalC / preset.Lp);

    const safeFr = Math.max(500, Math.min(8000, fr));
    const safeQ = Math.max(0.3, Math.min(15, Q));
    const peakGainDb = 20 * Math.log10(safeQ * (effectiveRload / (preset.Rp + effectiveRload)));
    const cableFc = 1 / (2 * Math.PI * Rtotal * (cableLengthM * CABLE_CAP_PER_METER));
    const loadFc = 1 / (2 * Math.PI * effectiveRload * loadCapacitancePf * 1e-12);
    const dcGain = effectiveRload / (preset.Rp + effectiveRload);

    // If graph already exists, update AudioParams smoothly without audio pops
    if (this.resonantFilter && this.cableLowpass && this.loadHighpass && this.gainComp) {
      const now = this.ctx.currentTime;
      const tc = 0.02; // Smooth 20ms time constant
      try {
        this.resonantFilter.frequency.setTargetAtTime(safeFr, now, tc);
        this.resonantFilter.Q.setTargetAtTime(safeQ, now, tc);
        this.resonantFilter.gain.setTargetAtTime(Math.max(-6, Math.min(12, peakGainDb)), now, tc);
        this.cableLowpass.frequency.setTargetAtTime(Math.max(2000, Math.min(20000, cableFc)), now, tc);
        this.loadHighpass.frequency.setTargetAtTime(Math.max(1, Math.min(50, loadFc)), now, tc);
        this.gainComp.gain.setTargetAtTime(1 / dcGain, now, tc);
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
  public setPickupType(type: InputImpedanceConfig['pickupType']): void {
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