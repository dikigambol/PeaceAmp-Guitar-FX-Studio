import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';

/**
 * BOSS GE-7 Equalizer Frequency Bands Specification:
 * - 7 Constant-Q Peaking Gyrator Filter Stages:
 *   100 Hz, 200 Hz, 400 Hz, 800 Hz, 1.6 kHz, 3.2 kHz, 6.4 kHz
 * - Range per band: -15 dB to +15 dB (center detent = 0 dB flat)
 * - Bandwidth Q: ~1.414 (1 octave per band)
 * - Master Level slider: -15 dB to +15 dB overall gain trim/boost
 */
export interface Ge7BandConfig {
  id: string;
  name: string;
  freq: number;
  q: number;
}

export const GE7_BANDS: Ge7BandConfig[] = [
  { id: 'band100', name: '100', freq: 100, q: 1.414 },
  { id: 'band200', name: '200', freq: 200, q: 1.414 },
  { id: 'band400', name: '400', freq: 400, q: 1.414 },
  { id: 'band800', name: '800', freq: 800, q: 1.414 },
  { id: 'band1600', name: '1.6k', freq: 1600, q: 1.414 },
  { id: 'band3200', name: '3.2k', freq: 3200, q: 1.414 },
  { id: 'band6400', name: '6.4k', freq: 6400, q: 1.414 },
];

export class BossGe7Node implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private enabled: boolean;

  // Bypass crossfade
  private bypassDry: GainNode;
  private bypassWet: GainNode;

  // 7 Gyrator Peaking Filters
  private filters: Map<string, BiquadFilterNode> = new Map();

  // Master Level Slider Gain & DC Blocker
  private levelGain: GainNode;
  private dcBlocker: BiquadFilterNode;

  private params: Record<string, number> = {
    band100: 0.0,
    band200: 0.0,
    band400: 0.0,
    band800: 0.0,
    band1600: 0.0,
    band3200: 0.0,
    band6400: 0.0,
    level: 0.0,
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

    // Dry bypass connection
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    // Wet signal routing
    this.inputNode.connect(this.bypassWet);

    // Build the 7 Peaking Filter Stages in series
    let prevNode: AudioNode = this.bypassWet;

    for (const band of GE7_BANDS) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.setValueAtTime(band.freq, ctx.currentTime);
      filter.Q.setValueAtTime(band.q, ctx.currentTime);

      const gainVal = Math.max(-15, Math.min(15, this.params[band.id] ?? 0.0));
      filter.gain.setValueAtTime(gainVal, ctx.currentTime);

      this.filters.set(band.id, filter);

      prevNode.connect(filter);
      prevNode = filter;
    }

    // Master Level Gain Slider (-15 dB to +15 dB)
    this.levelGain = ctx.createGain();
    const initialLevelDb = Math.max(-15, Math.min(15, this.params.level ?? 0.0));
    const initialLinearGain = Math.pow(10, initialLevelDb / 20);
    this.levelGain.gain.setValueAtTime(initialLinearGain, ctx.currentTime);

    prevNode.connect(this.levelGain);

    // Sub-audio DC Blocker to prevent thumps on switching
    this.dcBlocker = createDcBlocker(ctx, 15);
    this.levelGain.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputNode);

    // Apply initial bypass crossfade
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx, 0.001);
  }

  public updateParameter(paramId: string, value: number): void {
    const clampedVal = Math.max(-15, Math.min(15, value));
    this.params[paramId] = clampedVal;

    const now = this.ctx.currentTime;
    const tc = 0.015; // Smooth 15ms transition to prevent zipper noise

    if (paramId === 'level') {
      const linearGain = Math.pow(10, clampedVal / 20);
      this.levelGain.gain.setTargetAtTime(linearGain, now, tc);
    } else {
      const filter = this.filters.get(paramId);
      if (filter) {
        filter.gain.setTargetAtTime(clampedVal, now, tc);
      }
    }
  }

  public setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    applyBypassCrossfade(this.bypassWet, this.bypassDry, enabled, this.ctx, 0.015);
  }

  public dispose(): void {
    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.bypassDry.disconnect();
      this.bypassWet.disconnect();

      for (const filter of this.filters.values()) {
        filter.disconnect();
      }
      this.filters.clear();

      this.levelGain.disconnect();
      this.dcBlocker.disconnect();
    } catch {
      // AudioNode already disconnected
    }
  }
}
