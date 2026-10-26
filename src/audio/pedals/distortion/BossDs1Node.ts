import type { AudioPedalNode } from '../../../types/pedal';
import { levelToGain, applyBypassCrossfade, createDcBlocker, driveDependentTrimDb, createOnePoleLowpass, createOnePoleHighpass } from '../dspUtils';
import { HardClipperStage } from './HardClipperStage';

/**
 * Output trim calibration:
 *   - TRIM_UNITY_DB: Output trim when DIST is low (~unity loudness at noon)
 *   - TRIM_SAT_DB: Output trim when DIST is maxed, maintaining punchy perceived loudness
 *     without elevating the idle noise floor.
 */
const TRIM_UNITY_DB = 1.0;
const TRIM_SAT_DB = -5.5;

/**
 * Boss DS-1 Distortion (1978)
 * 
 * Authentic analog circuit model derived from schematic:
 * 
 * 1. Input Buffer & Q2 Transistor Booster.
 * 2. Op-amp distortion drive into 1N4148 shunt-to-ground hard diode clipping.
 * 3. Authentic Passive DS-1 Tone Stack.
 */
export class BossDs1Node implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;

  // 1. Input Stage
  private inputHighpass: BiquadFilterNode;
  private inputPreEmphasis: BiquadFilterNode;
  private preBoostGain: GainNode;

  // 2. Drive Stage (Op-amp drive into shunt diodes to ground)
  private driveStage: HardClipperStage;
  private diodeSmoothingFilter: BiquadFilterNode;

  // 3. Tone Stack
  private toneLpf: IIRFilterNode;
  private toneHpf: IIRFilterNode;
  private toneLpfGain: GainNode;
  private toneHpfGain: GainNode;
  private toneSum: GainNode;

  // 4. Recovery
  private postRecoveryFilter: BiquadFilterNode;
  private levelGain: GainNode;
  
  // ... (rest of class structure)

  // Bypass crossfade
  private wetGain: GainNode;
  private dryGain: GainNode;
  private isEnabled = true;

  // Parameters (0 - 10)
  private distVal = 6;
  private toneVal = 5;
  private levelVal = 5;

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.dist !== undefined) this.distVal = initialParams.dist;
    if (initialParams?.tone !== undefined) this.toneVal = initialParams.tone;
    if (initialParams?.level !== undefined) this.levelVal = initialParams.level;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Input Stage:
    // 72 Hz highpass cuts sub-audio bass mud
    this.inputHighpass = ctx.createBiquadFilter();
    this.inputHighpass.type = 'highpass';
    this.inputHighpass.frequency.setValueAtTime(72, ctx.currentTime);
    this.inputHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    // Q2 Transistor pre-emphasis: C3 (0.47 µF) across R8 (470 Ω) boosts upper-mids above 720 Hz
    this.inputPreEmphasis = ctx.createBiquadFilter();
    this.inputPreEmphasis.type = 'highshelf';
    this.inputPreEmphasis.frequency.setValueAtTime(720, ctx.currentTime);
    this.inputPreEmphasis.gain.setValueAtTime(8.0, ctx.currentTime);

    // Q2 common-emitter transistor stage clean booster (~11 dB gain = 3.6x)
    this.preBoostGain = ctx.createGain();
    this.preBoostGain.gain.setValueAtTime(3.6, ctx.currentTime);

    // 2. Op-Amp Distortion Drive & Shunt Diode Hard Clipper (1N4148 to ground)
    this.driveStage = new HardClipperStage(
      ctx,
      {
        vThPos: 0.58,
        vThNeg: 0.55,
        knee: 0.12,
        oversample: '4x',
      },
      1.5
    );

    // C10 parallel capacitor low-pass filter (7.2 kHz) after the clipper
    this.diodeSmoothingFilter = ctx.createBiquadFilter();
    this.diodeSmoothingFilter.type = 'lowpass';
    this.diodeSmoothingFilter.frequency.setValueAtTime(7200, ctx.currentTime);
    this.diodeSmoothingFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    // DC Blocker (15 Hz)
    const dcBlocker = createDcBlocker(ctx, 15);

    // 3. Authentic Passive DS-1 Tone Stack:
    // Branch 1: 234 Hz one-pole low-pass (true 6 dB/oct)
    this.toneLpf = createOnePoleLowpass(ctx, 234);

    // Branch 2: 1063 Hz one-pole high-pass (true 6 dB/oct)
    this.toneHpf = createOnePoleHighpass(ctx, 1063);

    this.toneLpfGain = ctx.createGain();
    this.toneHpfGain = ctx.createGain();
    this.toneSum = ctx.createGain();

    // 5. Recovery Post-Lowpass (6.0 kHz analog ceiling filter)
    this.postRecoveryFilter = ctx.createBiquadFilter();
    this.postRecoveryFilter.type = 'lowpass';
    this.postRecoveryFilter.frequency.setValueAtTime(6000, ctx.currentTime);
    this.postRecoveryFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    // 6. Level Output Stage
    this.levelGain = ctx.createGain();

    // 7. Wet / Dry routing for pop-free bypass
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();

    this.wetGain.gain.setValueAtTime(this.isEnabled ? 1 : 0, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(this.isEnabled ? 0 : 1, ctx.currentTime);

    // Connect Wet Signal Path:
    // Input -> inputHighpass -> inputPreEmphasis -> preBoostGain -> driveStage
    //       -> diodeSmoothingFilter -> dcBlocker
    this.inputNode.connect(this.inputHighpass);
    this.inputHighpass.connect(this.inputPreEmphasis);
    this.inputPreEmphasis.connect(this.preBoostGain);
    this.preBoostGain.connect(this.driveStage.inputNode);
    this.driveStage.outputNode.connect(this.diodeSmoothingFilter);
    this.diodeSmoothingFilter.connect(dcBlocker);

    // Split into 2-branch Tone Stack:
    dcBlocker.connect(this.toneLpf);
    dcBlocker.connect(this.toneHpf);
    this.toneLpf.connect(this.toneLpfGain);
    this.toneHpf.connect(this.toneHpfGain);
    this.toneLpfGain.connect(this.toneSum);
    this.toneHpfGain.connect(this.toneSum);

    // ToneSum -> postRecoveryFilter -> levelGain -> wetGain -> outputNode
    this.toneSum.connect(this.postRecoveryFilter);
    this.postRecoveryFilter.connect(this.levelGain);
    this.levelGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);

    // Connect Dry Bypass Path:
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Apply initial parameter settings immediately
    this.applyParameters(true);
  }



  private applyParameters(immediate = false): void {
    const now = this.ctx.currentTime;
    const rampTime = 0.015;

    // 1. Distortion Drive:
    const distNorm = Math.max(0, Math.min(10, this.distVal)) / 10;
    const driveMult = 1.5 + 30.5 * Math.pow(distNorm, 1.7);
    const totalDrive = 3.6 * driveMult;
    
    this.driveStage.setDrive(driveMult);

    // 2. Dual-branch Passive Tone Stack blending:
    const toneNorm = Math.max(0, Math.min(10, this.toneVal)) / 10;
    const lpfGainVal = Math.cos(toneNorm * Math.PI * 0.5) * 1.25;
    const hpfGainVal = Math.sin(toneNorm * Math.PI * 0.5) * 1.25;

    // 3. Dynamic output trim:
    const trim = driveDependentTrimDb(totalDrive, TRIM_UNITY_DB, TRIM_SAT_DB, 8.0);
    const outGain = levelToGain(this.levelVal, trim);

    if (immediate) {
      this.toneLpfGain.gain.setValueAtTime(lpfGainVal, now);
      this.toneHpfGain.gain.setValueAtTime(hpfGainVal, now);
      this.levelGain.gain.setValueAtTime(outGain, now);
    } else {
      this.toneLpfGain.gain.setTargetAtTime(lpfGainVal, now, rampTime);
      this.toneHpfGain.gain.setTargetAtTime(hpfGainVal, now, rampTime);
      this.levelGain.gain.setTargetAtTime(outGain, now, rampTime);
    }
  }

  public updateParameter(paramId: string, value: number): void {
    if (paramId === 'dist') this.distVal = value;
    else if (paramId === 'tone') this.toneVal = value;
    else if (paramId === 'level') this.levelVal = value;
    this.applyParameters(false);
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    applyBypassCrossfade(this.wetGain, this.dryGain, enabled, this.ctx);
  }

  public dispose(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.driveStage.dispose();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
  }
}
