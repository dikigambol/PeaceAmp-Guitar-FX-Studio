/**
 * Analog Bucket-Brigade Device (BBD) Warmth & Reconstruction Stage.
 *
 * Real BBD delay lines (Matsushita MN3007/MN3207, Reticon SAD1024) rely on:
 * 1. Steep anti-aliasing / reconstruction low-pass filtering:
 *    4-pole (24 dB/octave) active Sallen-Key cascade (around 6.5 kHz - 7.5 kHz)
 *    to aggressively attenuate BBD clock feedthrough (at 30-50 kHz) while
 *    maintaining a warm, musical resonance peak.
 * 2. Compander non-linearity & BBD bucket saturation:
 *    Soft-knee transfer curve (4x oversampled) that rounds off sharp pick transients,
 *    eliminating digital glassiness and giving analog chorus/flanger pedals
 *    their rich, syrupy, organic thickness.
 */
export interface BbdWarmthConfig {
  /** Base lowpass cutoff in Hz (default: 7200 Hz). */
  cutoffFreq?: number;
  /** Saturation depth 0.0 - 1.0 (default: 0.35). */
  saturationAmount?: number;
  /** Oversampling mode ('2x' | '4x', default: '4x'). */
  oversample?: OverSampleType;
}

export class BbdAnalogWarmthStage {
  public readonly inputNode: GainNode;
  public readonly outputNode: GainNode;

  private ctx: AudioContext;
  private saturationShaper: WaveShaperNode;
  private filterStage1: BiquadFilterNode;
  private filterStage2: BiquadFilterNode;
  private makeupGain: GainNode;

  constructor(ctx: AudioContext, config: BbdWarmthConfig = {}) {
    this.ctx = ctx;
    const cutoff = config.cutoffFreq ?? 9200;
    const satAmt = config.saturationAmount ?? 0.35;
    const oversample = config.oversample ?? '4x';

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Soft-knee BBD & Compander Saturation Shaper (4x oversampling)
    this.saturationShaper = ctx.createWaveShaper();
    this.saturationShaper.oversample = oversample;
    this.saturationShaper.curve = this.createBbdTransferCurve(satAmt, 4096);

    // 2. Cascaded 4-Pole (24 dB/oct) Sallen-Key Lowpass Reconstruction Filter
    this.filterStage1 = ctx.createBiquadFilter();
    this.filterStage1.type = 'lowpass';
    this.filterStage1.frequency.setValueAtTime(cutoff, ctx.currentTime);
    this.filterStage1.Q.setValueAtTime(0.85, ctx.currentTime); // Slight analog Chebyshev warmth knee

    this.filterStage2 = ctx.createBiquadFilter();
    this.filterStage2.type = 'lowpass';
    this.filterStage2.frequency.setValueAtTime(cutoff * 1.05, ctx.currentTime);
    this.filterStage2.Q.setValueAtTime(0.707, ctx.currentTime); // Butterworth damping

    // 3. Unity makeup gain
    this.makeupGain = ctx.createGain();
    this.makeupGain.gain.setValueAtTime(1.0, ctx.currentTime);

    // Routing: input -> saturationShaper -> filterStage1 -> filterStage2 -> makeupGain -> output
    this.inputNode.connect(this.saturationShaper);
    this.saturationShaper.connect(this.filterStage1);
    this.filterStage1.connect(this.filterStage2);
    this.filterStage2.connect(this.makeupGain);
    this.makeupGain.connect(this.outputNode);
  }

  private createBbdTransferCurve(amount: number, samples = 4096): Float32Array<ArrayBuffer> {
    const curve = new Float32Array(samples) as Float32Array<ArrayBuffer>;
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1; // -1 to +1
      const absX = Math.abs(x);
      const sign = x < 0 ? -1 : 1;
      let y: number;
      if (absX < 0.45) {
        y = absX;
      } else {
        const excess = absX - 0.45;
        y = 0.45 + (1 - 0.45) * Math.tanh((excess * (1 + amount * 2.0)) / (1 - 0.45));
      }
      curve[i] = sign * y;
    }
    return curve;
  }

  public setCutoff(freqHz: number): void {
    const now = this.ctx.currentTime;
    const clamped = Math.max(1000, Math.min(18000, freqHz));
    this.filterStage1.frequency.setTargetAtTime(clamped, now, 0.015);
    this.filterStage2.frequency.setTargetAtTime(clamped * 1.05, now, 0.015);
  }

  public dispose(): void {
    try {
      this.inputNode.disconnect();
      this.saturationShaper.disconnect();
      this.filterStage1.disconnect();
      this.filterStage2.disconnect();
      this.makeupGain.disconnect();
      this.outputNode.disconnect();
    } catch {
      // Ignore disconnect errors during teardown
    }
  }
}
