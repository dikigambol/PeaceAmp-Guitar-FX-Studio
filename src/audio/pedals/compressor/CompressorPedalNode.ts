import type { AudioPedalNode } from '../../../types/pedal';
import { levelToGain } from '../dspUtils';

/**
 * Shared compressor engine for all compressor pedals.
 *
 * Uses a real feed-forward, log-domain compressor running in an AudioWorklet
 * ('compressor-processor'): selectable peak/RMS detector, soft knee, separate attack and release,
 * NO look-ahead (so the pick transient passes the way it does on real OTA/VCA pedals) and
 * NO hidden browser auto-makeup gain. If AudioWorklet is unavailable, it falls back to the
 * built-in DynamicsCompressorNode.
 */
export interface CompressorSettings {
  thresholdDb: number;
  ratio: number;
  attackSec: number;
  releaseSec: number;
  kneeDb: number;
  /** 0 = pure peak detector, 1 = RMS detector */
  rmsMix: number;
}

/** Input level (dBFS) at which auto-makeup restores ~unity gain */
const MAKEUP_REFERENCE_DB = -20;
/** Fraction of the theoretical gain reduction that auto-makeup gives back */
const MAKEUP_AMOUNT = 0.8;

export function autoMakeupDb(s: CompressorSettings): number {
  const overRef = Math.max(0, MAKEUP_REFERENCE_DB - s.thresholdDb);
  return overRef * (1 - 1 / Math.max(1, s.ratio)) * MAKEUP_AMOUNT;
}

class CompressorCore {
  public readonly node: AudioNode;
  private worklet: AudioWorkletNode | null = null;
  private fallback: DynamicsCompressorNode | null = null;
  private ctx: BaseAudioContext;

  constructor(ctx: BaseAudioContext, initial: CompressorSettings) {
    this.ctx = ctx;
    try {
      this.worklet = new AudioWorkletNode(ctx, 'compressor-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        channelCount: 1,
        channelCountMode: 'explicit',
        parameterData: {
          threshold: initial.thresholdDb,
          ratio: initial.ratio,
          attack: initial.attackSec,
          release: initial.releaseSec,
          knee: initial.kneeDb,
          rmsMix: initial.rmsMix,
        },
      });
      this.node = this.worklet;
    } catch (err) {
      console.warn('Compressor worklet unavailable, using DynamicsCompressorNode fallback:', err);
      this.fallback = ctx.createDynamicsCompressor();
      this.node = this.fallback;
      this.update(initial, true);
    }
  }

  public update(s: CompressorSettings, immediate = false): void {
    const now = this.ctx.currentTime;
    const set = (param: AudioParam | undefined, value: number) => {
      if (!param) return;
      if (immediate) param.setValueAtTime(value, now);
      else param.setTargetAtTime(value, now, 0.02);
    };

    if (this.worklet) {
      const p = this.worklet.parameters;
      set(p.get('threshold'), s.thresholdDb);
      set(p.get('ratio'), s.ratio);
      set(p.get('attack'), s.attackSec);
      set(p.get('release'), s.releaseSec);
      set(p.get('knee'), s.kneeDb);
      set(p.get('rmsMix'), s.rmsMix);
    } else if (this.fallback) {
      set(this.fallback.threshold, s.thresholdDb);
      set(this.fallback.ratio, s.ratio);
      set(this.fallback.attack, s.attackSec);
      set(this.fallback.release, s.releaseSec);
      set(this.fallback.knee, s.kneeDb);
    }
  }

  public dispose(): void {
    this.node.disconnect();
  }
}

/** Model specific part of a compressor pedal (extra filters + knob -> DSP mapping). */
export interface CompressorPedalModel {
  /** Nodes placed before the compressor, in order */
  pre: AudioNode[];
  /** Nodes placed after the compressor, in order */
  post: AudioNode[];
  /**
   * Applies pedal-specific nodes (input pad, tone EQ ...) and maps the knobs to
   * compressor settings + the knob that acts as the output level.
   */
  resolve(params: Record<string, number>, now: number): {
    settings: CompressorSettings;
    level: number;
    trimDb: number;
  };
}

export type CompressorPedalFactory = (ctx: BaseAudioContext) => CompressorPedalModel;

export class CompressorPedalNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private core: CompressorCore;
  private model: CompressorPedalModel;
  private makeupGain: GainNode;
  private wetGain: GainNode;
  private dryGain: GainNode;
  private params: Record<string, number>;

  constructor(
    ctx: AudioContext,
    id: string,
    factory: CompressorPedalFactory,
    defaults: Record<string, number>,
    initialParams?: Record<string, number>,
    enabled = true
  ) {
    this.ctx = ctx;
    this.id = id;
    this.params = { ...defaults, ...(initialParams ?? {}) };
    this.model = factory(ctx);

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    this.makeupGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(enabled ? 1 : 0, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(enabled ? 0 : 1, ctx.currentTime);

    const resolved = this.model.resolve(this.params, ctx.currentTime);
    this.core = new CompressorCore(ctx, resolved.settings);
    this.makeupGain.gain.setValueAtTime(this.makeupGainFor(resolved), ctx.currentTime);

    // Bypass
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Wet: input -> pre... -> compressor -> post... -> makeup -> wet -> output
    let tail: AudioNode = this.inputNode;
    for (const n of this.model.pre) {
      tail.connect(n);
      tail = n;
    }
    tail.connect(this.core.node);
    tail = this.core.node;
    for (const n of this.model.post) {
      tail.connect(n);
      tail = n;
    }
    tail.connect(this.makeupGain);
    this.makeupGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);
  }

  private makeupGainFor(r: { settings: CompressorSettings; level: number; trimDb: number }): number {
    return levelToGain(r.level, r.trimDb + autoMakeupDb(r.settings));
  }

  private apply(): void {
    const now = this.ctx.currentTime;
    const resolved = this.model.resolve(this.params, now);
    this.core.update(resolved.settings);
    this.makeupGain.gain.setTargetAtTime(this.makeupGainFor(resolved), now, 0.02);
  }

  public updateParameter(paramId: string, value: number): void {
    this.params[paramId] = value;
    this.apply();
  }

  public setEnabled(enabled: boolean): void {
    const now = this.ctx.currentTime;
    this.wetGain.gain.setTargetAtTime(enabled ? 1 : 0, now, 0.015);
    this.dryGain.gain.setTargetAtTime(enabled ? 0 : 1, now, 0.015);
  }

  public dispose(): void {
    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.model.pre.forEach((n) => n.disconnect());
      this.core.dispose();
      this.model.post.forEach((n) => n.disconnect());
      this.makeupGain.disconnect();
      this.wetGain.disconnect();
      this.dryGain.disconnect();
    } catch (e) {
      console.warn('CompressorPedalNode dispose error', e);
    }
  }
}
