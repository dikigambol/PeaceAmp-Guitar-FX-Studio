/**
 * Hard Diode Clipper Stage for Distortion Pedals (Boss DS-1, ProCo RAT, MXR Distortion+).
 *
 * In contrast to overdrive pedals (which place clipping diodes in the op-amp's negative feedback
 * loop for soft, compressed saturation), distortion pedals use an op-amp gain boost followed
 * by anti-parallel diodes clamped directly to GROUND (shunt clipping).
 *
 * Once signal voltage exceeds the forward threshold of the diodes (~0.60V for silicon 1N4148,
 * ~0.35V for germanium 1N34A, ~1.8V for red LEDs), the diodes clamp the waveform hard to ground,
 * producing rich, aggressive odd and even harmonics.
 */
export type HardClipperDiodeType = 'silicon' | 'germanium' | 'led' | 'custom';

export interface HardClipperConfig {
  /** Diode profile type ('silicon' | 'germanium' | 'led' | 'custom', default: 'silicon'). */
  diodeType?: HardClipperDiodeType;
  /** Positive forward conduction voltage threshold (default: 0.58V for 1N4148 silicon, 0.31V for germanium). */
  vThPos?: number;
  /** Negative forward conduction voltage threshold (default: 0.55V for 1N4148 silicon, 0.33V for germanium). */
  vThNeg?: number;
  /** Forward conduction knee softness (default: 0.12). */
  knee?: number;
  /** Oversampling mode ('2x' | '4x', default: '4x' for anti-aliasing). */
  oversample?: OverSampleType;
}

export const HARD_CLIPPER_PRESETS = {
  SILICON_1N4148: {
    diodeType: 'silicon' as HardClipperDiodeType,
    vThPos: 0.58,
    vThNeg: 0.55,
    knee: 0.12,
    oversample: '4x' as OverSampleType,
  },
  GERMANIUM_1N270: {
    diodeType: 'germanium' as HardClipperDiodeType,
    vThPos: 0.31,
    vThNeg: 0.33,
    knee: 0.20,
    oversample: '4x' as OverSampleType,
  },
  RED_LED: {
    diodeType: 'led' as HardClipperDiodeType,
    vThPos: 1.75,
    vThNeg: 1.75,
    knee: 0.08,
    oversample: '4x' as OverSampleType,
  },
} as const;

export class HardClipperStage {
  public readonly inputNode: GainNode;
  public readonly outputNode: GainNode;

  private ctx: AudioContext;
  private driveGain: GainNode;
  private diodeShaper: WaveShaperNode;
  private cfg: HardClipperConfig;

  constructor(ctx: AudioContext, cfg: HardClipperConfig = {}, initialDrive = 1.0) {
    this.ctx = ctx;
    const basePreset =
      cfg.diodeType === 'germanium'
        ? HARD_CLIPPER_PRESETS.GERMANIUM_1N270
        : cfg.diodeType === 'led'
        ? HARD_CLIPPER_PRESETS.RED_LED
        : HARD_CLIPPER_PRESETS.SILICON_1N4148;

    this.cfg = {
      ...basePreset,
      ...cfg,
    };

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Op-Amp Drive Boost Stage
    this.driveGain = ctx.createGain();
    this.driveGain.gain.setValueAtTime(initialDrive, ctx.currentTime);

    // 2. Shunt-to-Ground Hard Diode WaveShaper (4x oversampled)
    this.diodeShaper = ctx.createWaveShaper();
    this.diodeShaper.oversample = this.cfg.oversample ?? '4x';
    this.diodeShaper.curve = this.createShuntDiodeCurve(8192);

    // inputNode -> driveGain -> diodeShaper -> outputNode
    this.inputNode.connect(this.driveGain);
    this.driveGain.connect(this.diodeShaper);
    this.diodeShaper.connect(this.outputNode);
  }

  /**
   * Generates continuous C-1 smooth transfer curve for anti-parallel shunt diodes to ground.
   * Linear when below forward conduction voltage, smoothly curving into hard flat clamp.
   */
  private createShuntDiodeCurve(samples = 8192): Float32Array<ArrayBuffer> {
    const curve = new Float32Array(samples) as Float32Array<ArrayBuffer>;
    const vThPos = this.cfg.vThPos ?? 0.58;
    const vThNeg = this.cfg.vThNeg ?? 0.55;
    const knee = this.cfg.knee ?? 0.12;

    if (this.cfg.diodeType === 'germanium') {
      // Germanium back-to-back shunt diodes (1N270):
      // Lower forward threshold (~0.31V), soft gradual exponential knee,
      // warm 2nd and 3rd order saturation with slight 5% component asymmetry.
      for (let i = 0; i < samples; i++) {
        const x = (i / (samples - 1)) * 2 - 1; // -1.0 to +1.0
        const sign = x < 0 ? -1 : 1;
        const absX = Math.abs(x);
        const vTh = x >= 0 ? vThPos : vThNeg;
        const norm = absX / vTh;
        const y = (absX / Math.pow(1 + Math.pow(norm, 2.4), 1 / 2.4)) * 1.05;
        curve[i] = sign * y * 1.4;
      }
      return curve;
    }

    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1; // -1.0 to +1.0
      const sign = x < 0 ? -1 : 1;
      const absX = Math.abs(x);
      const vTh = x >= 0 ? vThPos : vThNeg;

      let y: number;
      if (absX < vTh - knee) {
        // Completely linear below diode forward conduction threshold
        y = absX;
      } else {
        // Smooth transition into hard diode clamping
        const delta = absX - (vTh - knee);
        y = (vTh - knee) + knee * Math.tanh(delta / knee) + 0.035 * Math.log1p(delta * 2.0);
      }

      // Normalized output with headroom compensation
      curve[i] = sign * y * 1.35;
    }
    return curve;
  }

  public setDrive(gainMultiplier: number): void {
    const now = this.ctx.currentTime;
    this.driveGain.gain.setTargetAtTime(Math.max(0.1, gainMultiplier), now, 0.015);
  }

  public dispose(): void {
    try {
      this.inputNode.disconnect();
      this.driveGain.disconnect();
      this.diodeShaper.disconnect();
      this.outputNode.disconnect();
    } catch (err) {
      console.warn('HardClipperStage dispose error', err);
    }
  }
}
