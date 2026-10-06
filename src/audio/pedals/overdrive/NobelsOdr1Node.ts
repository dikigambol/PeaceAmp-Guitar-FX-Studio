import type { AudioPedalNode } from '../../../types/pedal';
import { createDcBlocker, levelToGain, applyBypassCrossfade } from '../dspUtils';

/** Output trim (dB) calibrated so Level=5 is ~unity loudness. */
const OUTPUT_TRIM_DB = -15.8;

/**
 * Nobels ODR-1 (Natural Overdrive)
 * Famous "Nashville Secret Weapon" beloved for its open, uncompressed overdrive profile
 * without the nasal mid-hump of Tube Screamers. Features the iconic SPECTRUM tone control
 * (simultaneously tailoring bass and treble around 500Hz) and a Bass Cut switch.
 */
export class NobelsOdr1Node implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private bassCutFilter: BiquadFilterNode;
  private driveGain: GainNode;
  private naturalShaper: WaveShaperNode;
  private dcBlocker: BiquadFilterNode;
  private spectrumBassFilter: BiquadFilterNode;
  private spectrumTrebleFilter: BiquadFilterNode;
  private postGain: GainNode;

  private wetGain: GainNode;
  private dryGain: GainNode;
  private isEnabled = true;

  private driveVal = 5;
  private spectrumVal = 5;
  private levelVal = 5;
  private bassCutVal = 0; // 0 = Full Bass (30Hz), 10 = Cut (150Hz)
  private gainBoostVal = 0; // 0 = Normal, 1 = Boosted

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.drive !== undefined) this.driveVal = initialParams.drive;
    if (initialParams?.spectrum !== undefined) this.spectrumVal = initialParams.spectrum;
    if (initialParams?.level !== undefined) this.levelVal = initialParams.level;
    if (initialParams?.bassCut !== undefined) this.bassCutVal = initialParams.bassCut;
    if (initialParams?.gainBoost !== undefined) this.gainBoostVal = initialParams.gainBoost;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // Bass Cut Switch filter (highpass)
    this.bassCutFilter = ctx.createBiquadFilter();
    this.bassCutFilter.type = 'highpass';
    this.bassCutFilter.frequency.setValueAtTime(30, ctx.currentTime);

    this.driveGain = ctx.createGain();

    // Symmetrical Natural Soft-Clipping
    this.naturalShaper = ctx.createWaveShaper();
    this.naturalShaper.curve = this.createNaturalCurve(4096) as Float32Array<ArrayBuffer>;
    this.naturalShaper.oversample = '4x';

    // Clipping an asymmetric guitar waveform leaves DC offset -> block it
    this.dcBlocker = createDcBlocker(ctx);

    // Nobels SPECTRUM: Dual-band filter
    // 1. Low shelf (~120Hz)
    this.spectrumBassFilter = ctx.createBiquadFilter();
    this.spectrumBassFilter.type = 'lowshelf';
    this.spectrumBassFilter.frequency.setValueAtTime(130, ctx.currentTime);

    // 2. High shelf (~3.8kHz)
    this.spectrumTrebleFilter = ctx.createBiquadFilter();
    this.spectrumTrebleFilter.type = 'highshelf';
    this.spectrumTrebleFilter.frequency.setValueAtTime(3800, ctx.currentTime);

    this.postGain = ctx.createGain();

    this.applyParameters();

    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    const wetTarget = this.isEnabled ? 1 : 0;
    const dryTarget = this.isEnabled ? 0 : 1;
    this.wetGain.gain.setValueAtTime(wetTarget, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(dryTarget, ctx.currentTime);

    // Bypass
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // ODR-1 circuit:
    this.inputNode.connect(this.bassCutFilter);
    this.bassCutFilter.connect(this.driveGain);
    this.driveGain.connect(this.naturalShaper);
    this.naturalShaper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.spectrumBassFilter);
    this.spectrumBassFilter.connect(this.spectrumTrebleFilter);
    this.spectrumTrebleFilter.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);
  }

  private createNaturalCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      // Open, dynamic natural compression with broad headroom
      curve[i] = (Math.tanh(1.5 * x) + 0.3 * Math.tanh(3.0 * x)) * 0.77;
    }
    return curve;
  }

  private applyParameters(): void {
    const now = this.ctx.currentTime;
    const driveNorm = Math.max(0, Math.min(10, this.driveVal)) / 10;
    const specNorm = Math.max(0, Math.min(10, this.spectrumVal)) / 10;

    // Bass Cut Pot: Smooth variable highpass from 30Hz (FULL) to 140Hz (CUT)
    // Supports continuous 0-10 or legacy 0/1 binary
    const bassCutNorm = this.bassCutVal <= 1 
      ? (this.bassCutVal >= 0.5 ? 1 : 0)
      : Math.max(0, Math.min(10, this.bassCutVal)) / 10;
    const cutoffHz = 30 + bassCutNorm * 110;
    this.bassCutFilter.frequency.setTargetAtTime(cutoffHz, now, 0.02);

    // Gain Boost: +5dB drive multiplier saturation boost when engaged
    const isBoost = this.gainBoostVal >= 0.5;
    const boostMult = isBoost ? 1.75 : 1.0;

    // Drive Gain: 1.2x to 22x (scaled by boostMult)
    const driveMult = (1.2 + Math.pow(driveNorm, 1.55) * 20.8) * boostMult;
    this.driveGain.gain.setTargetAtTime(driveMult, now, 0.02);

    // SPECTRUM: simultaneously boosts bass and treble around 500Hz pivot
    // At 0: dark/mid-focused (-6dB bass/treble)
    // At 10: scooped hi-fi punch (+7dB bass/treble)
    const specDb = -6 + specNorm * 13;
    this.spectrumBassFilter.gain.setTargetAtTime(specDb, now, 0.02);
    this.spectrumTrebleFilter.gain.setTargetAtTime(specDb * 1.15, now, 0.02);

    // Level: unified taper (unity at noon)
    this.postGain.gain.setTargetAtTime(levelToGain(this.levelVal, OUTPUT_TRIM_DB), now, 0.02);
  }

  public updateParameter(paramId: string, value: number): void {
    if (paramId === 'drive') this.driveVal = value;
    else if (paramId === 'spectrum') this.spectrumVal = value;
    else if (paramId === 'level') this.levelVal = value;
    else if (paramId === 'bassCut') this.bassCutVal = value;
    else if (paramId === 'gainBoost') this.gainBoostVal = value;
    this.applyParameters();
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    applyBypassCrossfade(this.wetGain, this.dryGain, enabled, this.ctx);
  }

  public dispose(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.bassCutFilter.disconnect();
    this.driveGain.disconnect();
    this.naturalShaper.disconnect();
    this.dcBlocker.disconnect();
    this.spectrumBassFilter.disconnect();
    this.spectrumTrebleFilter.disconnect();
    this.postGain.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
  }
}
