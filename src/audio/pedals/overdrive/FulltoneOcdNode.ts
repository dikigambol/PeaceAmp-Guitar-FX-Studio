import type { AudioPedalNode } from '../../../types/pedal';
import { createDcBlocker, levelToGain } from '../dspUtils';

/** Output trim (dB) calibrated so Volume=5 is ~unity loudness. */
const OUTPUT_TRIM_DB = -16.0;

/**
 * Fulltone OCD (Obsessive Compulsive Drive)
 * MOSFET-based overdrive circuit recreating cranked tube amp power sag and dynamic response.
 * Features HP/LP (High Peak / Low Peak) voicing switch for transparent punch or aggressive British crunch.
 */
export class FulltoneOcdNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private preHpBoost: BiquadFilterNode;
  private driveGain: GainNode;
  private mosfetShaper: WaveShaperNode;
  private dcBlocker: BiquadFilterNode;
  private toneFilter: BiquadFilterNode;
  private postGain: GainNode;

  private wetGain: GainNode;
  private dryGain: GainNode;
  private isEnabled = true;

  private volumeVal = 5;
  private toneVal = 5;
  private driveVal = 5;
  private modeVal = 1; // 0 = LP (Low Peak), 1 = HP (High Peak)

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.volume !== undefined) this.volumeVal = initialParams.volume;
    if (initialParams?.tone !== undefined) this.toneVal = initialParams.tone;
    if (initialParams?.drive !== undefined) this.driveVal = initialParams.drive;
    if (initialParams?.mode !== undefined) this.modeVal = initialParams.mode;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // HP Mode Peaking Boost Filter
    this.preHpBoost = ctx.createBiquadFilter();
    this.preHpBoost.type = 'peaking';
    this.preHpBoost.frequency.setValueAtTime(3200, ctx.currentTime);
    this.preHpBoost.Q.setValueAtTime(1.0, ctx.currentTime);

    this.driveGain = ctx.createGain();

    // MOSFET Overdrive Waveshaping
    this.mosfetShaper = ctx.createWaveShaper();
    this.mosfetShaper.curve = this.createMosfetCurve(4096) as Float32Array<ArrayBuffer>;
    this.mosfetShaper.oversample = '4x';

    // Asymmetric MOSFET clipping creates DC offset -> block it
    this.dcBlocker = createDcBlocker(ctx);

    // Tone Lowpass
    this.toneFilter = ctx.createBiquadFilter();
    this.toneFilter.type = 'lowpass';

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

    // OCD Circuit:
    this.inputNode.connect(this.preHpBoost);
    this.preHpBoost.connect(this.driveGain);
    this.driveGain.connect(this.mosfetShaper);
    this.mosfetShaper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.toneFilter);
    this.toneFilter.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);
  }

  private createMosfetCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      // MOSFET asymmetric soft-saturation with warm sag
      if (x >= 0) {
        curve[i] = (Math.atan(2.2 * x) / Math.atan(2.2)) * 0.95;
      } else {
        curve[i] = (Math.atan(2.8 * x) / Math.atan(2.8)) * 0.90;
      }
    }
    return curve;
  }

  private applyParameters(): void {
    const now = this.ctx.currentTime;
    const driveNorm = Math.max(0, Math.min(10, this.driveVal)) / 10;
    const toneNorm = Math.max(0, Math.min(10, this.toneVal)) / 10;
    const isHp = this.modeVal >= 0.5;

    // HP adds boost and upper mid bite; LP is uncolored and flatter
    const hpGainBoost = isHp ? 5.5 : 0;
    this.preHpBoost.gain.setTargetAtTime(hpGainBoost, now, 0.02);

    const baseGain = isHp ? 1.6 : 1.2;
    const totalDrive = baseGain + Math.pow(driveNorm, 1.6) * (isHp ? 26.0 : 20.0);
    this.driveGain.gain.setTargetAtTime(totalDrive, now, 0.02);

    // Tone: 1200Hz to 6500Hz
    const cutoff = 1200 + Math.pow(toneNorm, 1.3) * 5300;
    this.toneFilter.frequency.setTargetAtTime(cutoff, now, 0.02);

    // Volume: unified taper (unity at noon). HP voicing is louder by nature.
    const voicingTrimDb = isHp ? 0 : 1.5;
    this.postGain.gain.setTargetAtTime(
      levelToGain(this.volumeVal, OUTPUT_TRIM_DB + voicingTrimDb),
      now,
      0.02
    );
  }

  public updateParameter(paramId: string, value: number): void {
    if (paramId === 'volume') this.volumeVal = value;
    else if (paramId === 'tone') this.toneVal = value;
    else if (paramId === 'drive') this.driveVal = value;
    else if (paramId === 'mode') this.modeVal = value;
    this.applyParameters();
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    const now = this.ctx.currentTime;
    if (enabled) {
      this.dryGain.gain.setTargetAtTime(0, now, 0.015);
      this.wetGain.gain.setTargetAtTime(1, now, 0.015);
    } else {
      this.wetGain.gain.setTargetAtTime(0, now, 0.015);
      this.dryGain.gain.setTargetAtTime(1, now, 0.015);
    }
  }

  public dispose(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.preHpBoost.disconnect();
    this.driveGain.disconnect();
    this.mosfetShaper.disconnect();
    this.dcBlocker.disconnect();
    this.toneFilter.disconnect();
    this.postGain.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
  }
}
