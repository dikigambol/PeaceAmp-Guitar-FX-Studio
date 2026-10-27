import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';
import { PitchEngine } from './PitchEngine';

export const PITCH_FORK_INTERVALS = [
  { id: 'd', name: 'D', label: 'Detune (+17c)', semitones: 17 / 100 },
  { id: 'm2', name: 'm2', label: 'Minor 2nd (+1)', semitones: 1 },
  { id: 'M2', name: 'M2', label: 'Major 2nd (+2)', semitones: 2 },
  { id: 'M3', name: 'M3', label: 'Major 3rd (+4)', semitones: 4 },
  { id: 'P4', name: 'P4', label: 'Perfect 4th (+5)', semitones: 5 },
  { id: 'P5', name: 'P5', label: 'Perfect 5th (+7)', semitones: 7 },
  { id: 'M6', name: 'M6', label: 'Major 6th (+9)', semitones: 9 },
  { id: 'm7', name: 'm7', label: 'Minor 7th (+10)', semitones: 10 },
  { id: '1', name: '1', label: '1 Octave (+12)', semitones: 12 },
  { id: '2', name: '2', label: '2 Octaves (+24)', semitones: 24 },
  { id: '3', name: '3', label: '3 Octaves (+36)', semitones: 36 },
];

/**
 * ELECTRO-HARMONIX PITCH FORK
 *
 * Polyphonic Pitch Shifter / Harmony Pedal
 * - BLEND knob: Sweeps from 100% dry to 100% wet pitch shifted harmony
 * - 11-position SHIFT selector: Detune (17 cents), Minor 2nd, Major 2nd, Major 3rd,
 *   Perfect 4th, Perfect 5th, Major 6th, Minor 7th, 1 Octave, 2 Octaves, 3 Octaves.
 * - 3-position toggle switch:
 *   - UP (▲): Transposes pitch up
 *   - DUAL: Transposes simultaneously in both UP and DOWN directions
 *   - DOWN (▼): Transposes pitch down
 * - LATCH switch: Latching stompbox mode vs Momentary expressive mode.
 */
export class EhxPitchForkNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private enabled: boolean;

  // Bypass crossfade
  private bypassDry: GainNode;
  private bypassWet: GainNode;

  // Pitch Engine Core
  private pitchEngine: PitchEngine;
  private dcBlocker: BiquadFilterNode;
  private outputMaster: GainNode;

  private isDisposed = false;

  private params: Record<string, number> = {
    blend: 5.0,     // BLEND (0 to 10: 0=dry, 5=50/50, 10=wet)
    shift: 8.0,     // 0 to 10 (default 8 = 1 Octave)
    direction: 0.0, // 0 = UP, 1 = DUAL, 2 = DOWN
    latch: 1.0,     // 1 = Latch, 0 = Momentary
  };

  constructor(
    ctx: AudioContext,
    id: string,
    initialParams?: Record<string, number>,
    enabled = true
  ) {
    this.ctx = ctx;
    this.id = id;
    this.enabled = enabled;

    if (initialParams) {
      this.params = { ...this.params, ...initialParams };
    }

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    this.bypassDry = ctx.createGain();
    this.bypassWet = ctx.createGain();

    // 1. Dry bypass signal path
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    // 2. Wet signal path
    this.inputNode.connect(this.bypassWet);

    this.pitchEngine = new PitchEngine(ctx);
    this.bypassWet.connect(this.pitchEngine.inputNode);

    this.dcBlocker = createDcBlocker(ctx, 20);
    this.outputMaster = ctx.createGain();

    this.pitchEngine.outputNode.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputMaster);
    this.outputMaster.connect(this.outputNode);

    // Apply parameter states
    this.updateAllParameters();

    // Apply bypass crossfade
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx, 0.001);
  }

  private updateAllParameters(): void {
    if (this.isDisposed) return;

    const blend = this.params.blend ?? 5.0;
    const shiftIdx = Math.max(0, Math.min(10, Math.round(this.params.shift ?? 8.0)));
    const direction = Math.max(0, Math.min(2, Math.round(this.params.direction ?? 0.0)));

    const intervalDef = PITCH_FORK_INTERVALS[shiftIdx] || PITCH_FORK_INTERVALS[8];
    const semitones = intervalDef.semitones;

    // Equal-power crossfade between Dry and Wet:
    // blend = 0: dryGain = 1.0, wetGain = 0.0
    // blend = 5: dryGain = 0.707, wetGain = 0.707
    // blend = 10: dryGain = 0.0, wetGain = 1.0
    const blendNorm = blend / 10.0;
    const directGain = Math.cos(blendNorm * 0.5 * Math.PI);
    const wetGain = Math.sin(blendNorm * 0.5 * Math.PI);

    this.pitchEngine.setDirectGain(directGain);
    this.pitchEngine.setVintage(false);
    this.pitchEngine.setRangeCutoff(20000);

    const upRatio = Math.pow(2.0, semitones / 12.0);
    const downRatio = Math.pow(2.0, -semitones / 12.0);

    if (direction === 0) {
      // UP (▲)
      this.pitchEngine.setVoice1(upRatio, wetGain);
      this.pitchEngine.setVoice2(1.0, 0.0);
      this.pitchEngine.setVoice3(1.0, 0.0);
    } else if (direction === 2) {
      // DOWN (▼)
      this.pitchEngine.setVoice1(downRatio, wetGain);
      this.pitchEngine.setVoice2(1.0, 0.0);
      this.pitchEngine.setVoice3(1.0, 0.0);
    } else {
      // DUAL: both UP and DOWN pitch voices simultaneously
      const dualGain = wetGain * 0.707;
      this.pitchEngine.setVoice1(upRatio, dualGain);
      this.pitchEngine.setVoice2(downRatio, dualGain);
      this.pitchEngine.setVoice3(1.0, 0.0);
    }

    this.outputMaster.gain.setValueAtTime(1.0, this.ctx.currentTime);
  }

  public updateParameter(paramId: string, value: number): void {
    this.params[paramId] = value;
    this.updateAllParameters();
  }

  public setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx);
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    try {
      this.pitchEngine.dispose();
      this.inputNode.disconnect();
      this.bypassDry.disconnect();
      this.bypassWet.disconnect();
      this.dcBlocker.disconnect();
      this.outputMaster.disconnect();
      this.outputNode.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
}
