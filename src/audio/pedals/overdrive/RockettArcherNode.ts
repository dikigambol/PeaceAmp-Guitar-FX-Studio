import type { AudioPedalNode } from '../../../types/pedal';
import { createDcBlocker, levelToGain, applyBypassCrossfade } from '../dspUtils';

/** Output trim (dB) calibrated so Output=5 is ~unity loudness. */
const OUTPUT_TRIM_DB = -2.3;

/**
 * J. Rockett Audio Designs Archer (Tour Series)
 * Boutique recreation of the mythical Klon Centaur circuit with NOS germanium diodes,
 * pristine clean buffer, dual-ganged clean blend potentiometer, and active Treble circuit.
 */
export class RockettArcherNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private cleanPathGain: GainNode;
  private drivePreFilter: BiquadFilterNode;
  private drivePreGain: GainNode;
  private geShaper: WaveShaperNode;
  private dcBlocker: BiquadFilterNode;
  private drivePostGain: GainNode;
  private summingGain: GainNode;
  private trebleFilter: BiquadFilterNode;
  private outputMasterGain: GainNode;

  private wetGain: GainNode;
  private dryGain: GainNode;
  private isEnabled = true;

  private outputVal = 5;  // 0 - 10
  private trebleVal = 5;  // 0 - 10
  private gainVal = 5;    // 0 - 10

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.output !== undefined) this.outputVal = initialParams.output;
    if (initialParams?.treble !== undefined) this.trebleVal = initialParams.treble;
    if (initialParams?.gain !== undefined) this.gainVal = initialParams.gain;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    this.cleanPathGain = ctx.createGain();

    this.drivePreFilter = ctx.createBiquadFilter();
    this.drivePreFilter.type = 'highpass';
    this.drivePreFilter.frequency.setValueAtTime(450, ctx.currentTime);

    this.drivePreGain = ctx.createGain();

    // NOS Germanium diode clipping curve (slightly warmer knee for Archer)
    this.geShaper = ctx.createWaveShaper();
    this.geShaper.curve = this.createArcherCurve(4096) as Float32Array<ArrayBuffer>;
    this.geShaper.oversample = '4x';

    // Clipping an asymmetric guitar waveform leaves DC offset -> block it
    this.dcBlocker = createDcBlocker(ctx);

    this.drivePostGain = ctx.createGain();
    this.summingGain = ctx.createGain();

    // Treble: high shelf (~3.8kHz, +/-12dB) - slightly brighter / more open than the Klon
    this.trebleFilter = ctx.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.setValueAtTime(3800, ctx.currentTime);

    this.outputMasterGain = ctx.createGain();

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

    // Clean branch
    this.inputNode.connect(this.cleanPathGain);
    this.cleanPathGain.connect(this.summingGain);

    // Drive branch
    this.inputNode.connect(this.drivePreFilter);
    this.drivePreFilter.connect(this.drivePreGain);
    this.drivePreGain.connect(this.geShaper);
    this.geShaper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.drivePostGain);
    this.drivePostGain.connect(this.summingGain);

    // Summing -> Treble -> Output -> Wet
    this.summingGain.connect(this.trebleFilter);
    this.trebleFilter.connect(this.outputMasterGain);
    this.outputMasterGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);
  }

  private createArcherCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    // NOS germanium pair: tighter knee than the Klon-style curve, slightly more open top end
    const k = 0.33;
    const p = 1.8;
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / (samples - 1) - 1;
      curve[i] = x / Math.pow(1 + Math.pow(Math.abs(x) / k, p), 1 / p);
    }
    return curve;
  }

  private applyParameters(): void {
    const now = this.ctx.currentTime;
    const gainNorm = Math.max(0, Math.min(10, this.gainVal)) / 10;
    const trebleNorm = Math.max(0, Math.min(10, this.trebleVal)) / 10;

    const cleanLevel = Math.max(0.12, 1.15 * (1 - gainNorm * 0.72));
    const driveLevel = Math.min(1.25, 0.22 + gainNorm * 1.03);
    this.cleanPathGain.gain.setTargetAtTime(cleanLevel, now, 0.02);
    this.drivePostGain.gain.setTargetAtTime(driveLevel, now, 0.02);

    const drivePre = 1.0 + Math.pow(gainNorm, 1.5) * 16.0;
    this.drivePreGain.gain.setTargetAtTime(drivePre, now, 0.02);

    const trebleDb = -12 + trebleNorm * 24;
    this.trebleFilter.gain.setTargetAtTime(trebleDb, now, 0.02);

    this.outputMasterGain.gain.setTargetAtTime(levelToGain(this.outputVal, OUTPUT_TRIM_DB), now, 0.02);
  }

  public updateParameter(paramId: string, value: number): void {
    if (paramId === 'output') this.outputVal = value;
    else if (paramId === 'treble') this.trebleVal = value;
    else if (paramId === 'gain') this.gainVal = value;
    this.applyParameters();
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    applyBypassCrossfade(this.wetGain, this.dryGain, enabled, this.ctx);
  }

  public dispose(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.cleanPathGain.disconnect();
    this.drivePreFilter.disconnect();
    this.drivePreGain.disconnect();
    this.geShaper.disconnect();
    this.dcBlocker.disconnect();
    this.drivePostGain.disconnect();
    this.summingGain.disconnect();
    this.trebleFilter.disconnect();
    this.outputMasterGain.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
  }
}
