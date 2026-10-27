import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';
import { PitchEngine } from './PitchEngine';

/**
 * BOSS OC-5 Octave
 *
 * Modeled accurately after the BOSS OC-5 pedal:
 * - VINTAGE mode: Recreates the legendary 1982 BOSS OC-2 circuit with analog flip-flop divider
 *   sub-octaves (-1 OCT and -2 OCT) with warm 2-pole lowpass filtering and fat synthy growl.
 * - POLY mode: High-precision polyphonic tracking across all strings and chords, with +1 OCT,
 *   -1 OCT, and the iconic lowest-note RANGE control allowing you to play chords where only the
 *   lowest bass note gets the sub-octave.
 * - DIRECT LEVEL: independent clean dry pass-through.
 * - +1 OCT LEVEL: shimmering 12-string octave-up overtone.
 * - -1 OCT LEVEL: rich foundation sub-octave.
 * - -2 OCT / RANGE: -2 Octave volume in Vintage mode, or lowest-note frequency range gate in Poly mode.
 */
export class BossOc5Node implements AudioPedalNode {
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
    direct: 5.0,        // DIRECT LEVEL (0 to 10)
    octUp: 0.0,         // +1OCT LEVEL (0 to 10)
    octDown: 5.0,       // -1OCT LEVEL (0 to 10)
    oct2DownRange: 5.0, // -2OCT / RANGE (0 to 10)
    mode: 0.0,          // 0 = POLY, 1 = VINTAGE
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

    // Set initial parameter states
    this.updateAllParameters();

    // Apply bypass crossfade
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx, 0.001);
  }

  private updateAllParameters(): void {
    if (this.isDisposed) return;

    const direct = this.params.direct ?? 5.0;
    const octUp = this.params.octUp ?? 0.0;
    const octDown = this.params.octDown ?? 5.0;
    const oct2DownRange = this.params.oct2DownRange ?? 5.0;
    const isVintage = (this.params.mode ?? 0.0) >= 0.5;

    // Direct level gain (0 to 10 -> smooth gain)
    const directGain = direct <= 0 ? 0 : Math.pow(direct / 10, 1.4) * 1.0;
    this.pitchEngine.setDirectGain(directGain);

    // Voice 1: -1 OCT (ratio = 0.5)
    const octDownGain = octDown <= 0 ? 0 : Math.pow(octDown / 10, 1.3) * 1.25;
    this.pitchEngine.setVoice1(0.5, octDownGain);

    // Voice 2: In Vintage mode, this is -2 OCT (ratio = 0.25).
    // In Poly mode, Voice 2 is muted, but oct2DownRange controls the RANGE cutoff!
    if (isVintage) {
      const oct2DownGain = oct2DownRange <= 0 ? 0 : Math.pow(oct2DownRange / 10, 1.3) * 1.25;
      this.pitchEngine.setVoice2(0.25, oct2DownGain);
      this.pitchEngine.setRangeCutoff(20000); // Wide open in vintage mode
    } else {
      this.pitchEngine.setVoice2(0.25, 0.0);
      // Poly RANGE control: 0 = LOWEST (~130 Hz cutoff, only low E/A strings sub-tracked),
      // 10 = FULL (~15000 Hz cutoff, full poly tracking across entire fretboard)
      const rangeHz = 110 * Math.pow(15000 / 110, oct2DownRange / 10);
      this.pitchEngine.setRangeCutoff(rangeHz);
    }

    // Voice 3: +1 OCT (ratio = 2.0)
    const octUpGain = octUp <= 0 ? 0 : Math.pow(octUp / 10, 1.3) * 1.1;
    this.pitchEngine.setVoice3(2.0, octUpGain);

    // Vintage flip-flop circuit modeling flag
    this.pitchEngine.setVintage(isVintage);

    // Output trim
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
