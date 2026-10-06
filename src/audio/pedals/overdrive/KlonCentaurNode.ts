import type { AudioPedalNode } from '../../../types/pedal';
import { createDcBlocker, levelToGain, applyBypassCrossfade } from '../dspUtils';

/** Output trim (dB) calibrated so Output=5 is ~unity loudness. */
const OUTPUT_TRIM_DB = -2.3;

/**
 * Klon Centaur Professional Overdrive (1994)
 * Legendary transparent overdrive featuring an internal 18V charge-pump headroom,
 * dual-ganged potentiometer blending clean boost with germanium diode clipping,
 * and an active peaking Treble circuit.
 */
export class KlonCentaurNode implements AudioPedalNode {
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

  private gainVal = 5;    // 0 - 10
  private trebleVal = 5;  // 0 - 10
  private outputVal = 5;  // 0 - 10

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.gain !== undefined) this.gainVal = initialParams.gain;
    if (initialParams?.treble !== undefined) this.trebleVal = initialParams.treble;
    if (initialParams?.output !== undefined) this.outputVal = initialParams.output;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Clean Path (dual-gang pot clean blend)
    this.cleanPathGain = ctx.createGain();

    // 2. Overdrive Path: Pre-filter (bass roll-off into clipping stage)
    this.drivePreFilter = ctx.createBiquadFilter();
    this.drivePreFilter.type = 'highpass';
    this.drivePreFilter.frequency.setValueAtTime(420, ctx.currentTime);

    this.drivePreGain = ctx.createGain();

    // Germanium diode clipping (smooth compression with low forward voltage)
    this.geShaper = ctx.createWaveShaper();
    this.geShaper.curve = this.createGermaniumCurve(4096) as Float32Array<ArrayBuffer>;
    this.geShaper.oversample = '4x';

    // Clipping an asymmetric guitar waveform leaves DC offset -> block it
    this.dcBlocker = createDcBlocker(ctx);

    this.drivePostGain = ctx.createGain();

    // 3. Summing stage
    this.summingGain = ctx.createGain();

    // 4. Active Treble Control: high shelf around 3.2kHz (+/-10dB), as in the original
    this.trebleFilter = ctx.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.setValueAtTime(3200, ctx.currentTime);

    this.outputMasterGain = ctx.createGain();

    this.applyParameters();

    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    const wetTarget = this.isEnabled ? 1 : 0;
    const dryTarget = this.isEnabled ? 0 : 1;
    this.wetGain.gain.setValueAtTime(wetTarget, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(dryTarget, ctx.currentTime);

    // Bypass route
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Clean branch:
    this.inputNode.connect(this.cleanPathGain);
    this.cleanPathGain.connect(this.summingGain);

    // Drive branch:
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

  private createGermaniumCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    // Antiparallel 1N34A germanium pair to ground: low forward voltage, very soft knee.
    // y = x / (1 + (|x|/k)^p)^(1/p)  (smooth all the way, no hard edge at full scale)
    const k = 0.35;
    const p = 1.5;
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

    // Dual-gang blend:
    // Low gain = mostly clean boost
    // High gain = mostly saturated germanium drive
    const cleanLevel = Math.max(0.1, 1.1 * (1 - gainNorm * 0.75));
    const driveLevel = Math.min(1.2, 0.2 + gainNorm * 1.0);
    this.cleanPathGain.gain.setTargetAtTime(cleanLevel, now, 0.02);
    this.drivePostGain.gain.setTargetAtTime(driveLevel, now, 0.02);

    // Drive Pre Gain: 1.0x to 16x
    const drivePre = 1.0 + Math.pow(gainNorm, 1.5) * 15.0;
    this.drivePreGain.gain.setTargetAtTime(drivePre, now, 0.02);

    // Active Treble: -10dB to +10dB
    const trebleDb = -10 + trebleNorm * 20;
    this.trebleFilter.gain.setTargetAtTime(trebleDb, now, 0.02);

    // Output: unified taper (unity at noon)
    this.outputMasterGain.gain.setTargetAtTime(levelToGain(this.outputVal, OUTPUT_TRIM_DB), now, 0.02);
  }

  public updateParameter(paramId: string, value: number): void {
    if (paramId === 'gain') this.gainVal = value;
    else if (paramId === 'treble') this.trebleVal = value;
    else if (paramId === 'output') this.outputVal = value;
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
