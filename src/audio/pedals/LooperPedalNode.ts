import type { AudioPedalNode } from '../../types/pedal';

export type LooperState = 'idle' | 'recording' | 'playing' | 'overdubbing' | 'stopped';

export interface LooperTelemetry {
  state: LooperState;
  progress: number;       // 0.0 to 1.0
  durationSec: number;    // loop length in seconds
  canUndo: boolean;
  hasLoop: boolean;
}

export type LooperTelemetryListener = (telemetry: LooperTelemetry) => void;

// Global registry of active looper nodes so UI can subscribe
const activeLoopers = new Map<string, LooperPedalNode>();

export function getActiveLooper(id?: string): LooperPedalNode | undefined {
  if (id) return activeLoopers.get(id);
  // Return the first active looper if no id specified
  const first = activeLoopers.values().next();
  return first.done ? undefined : first.value;
}

export class LooperPedalNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private workletNode: AudioWorkletNode | null = null;
  private fallbackGain: GainNode | null = null;

  // Bypass crossfaders
  private wetGain: GainNode;
  private dryGain: GainNode;

  private isEnabled = true;
  private listeners = new Set<LooperTelemetryListener>();

  private currentTelemetry: LooperTelemetry = {
    state: 'idle',
    progress: 0,
    durationSec: 0,
    canUndo: false,
    hasLoop: false,
  };

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    const level = initialParams?.level ?? 1.0;
    const feedback = initialParams?.feedback ?? 1.0;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();

    const wetTarget = this.isEnabled ? 1 : 0;
    const dryTarget = this.isEnabled ? 0 : 1;
    this.wetGain.gain.setValueAtTime(wetTarget, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(dryTarget, ctx.currentTime);

    // Dry path
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Wet path via Looper AudioWorklet
    try {
      this.workletNode = new AudioWorkletNode(ctx, 'looper-processor');
      this.workletNode.port.onmessage = (e) => {
        if (e.data && e.data.type === 'telemetry') {
          this.currentTelemetry = {
            state: e.data.state,
            progress: e.data.progress,
            durationSec: e.data.durationSec,
            canUndo: e.data.canUndo,
            hasLoop: e.data.hasLoop,
          };
          for (const listener of this.listeners) {
            listener(this.currentTelemetry);
          }
        }
      };

      this.workletNode.port.postMessage({ type: 'setLevel', value: level });
      this.workletNode.port.postMessage({ type: 'setFeedback', value: feedback });

      this.inputNode.connect(this.workletNode);
      this.workletNode.connect(this.wetGain);
      this.wetGain.connect(this.outputNode);
    } catch {
      this.fallbackGain = ctx.createGain();
      this.inputNode.connect(this.fallbackGain);
      this.fallbackGain.connect(this.wetGain);
      this.wetGain.connect(this.outputNode);
    }

    activeLoopers.set(this.id, this);
  }

  public record(): void {
    this.workletNode?.port.postMessage({ type: 'record' });
  }

  public play(): void {
    this.workletNode?.port.postMessage({ type: 'play' });
  }

  public overdub(): void {
    this.workletNode?.port.postMessage({ type: 'overdub' });
  }

  public stop(): void {
    this.workletNode?.port.postMessage({ type: 'stop' });
  }

  public clear(): void {
    this.workletNode?.port.postMessage({ type: 'clear' });
  }

  public undo(): void {
    this.workletNode?.port.postMessage({ type: 'undo' });
  }

  public setSpeed(speed: number): void {
    this.workletNode?.port.postMessage({ type: 'setSpeed', value: speed });
  }

  public setReverse(reverse: boolean): void {
    this.workletNode?.port.postMessage({ type: 'setReverse', value: reverse });
  }

  public subscribe(listener: LooperTelemetryListener): () => void {
    this.listeners.add(listener);
    listener(this.currentTelemetry);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getTelemetry(): LooperTelemetry {
    return this.currentTelemetry;
  }

  public updateParameter(paramId: string, value: number): void {
    if (paramId === 'level') {
      this.workletNode?.port.postMessage({ type: 'setLevel', value });
    } else if (paramId === 'feedback') {
      this.workletNode?.port.postMessage({ type: 'setFeedback', value });
    } else if (paramId === 'speed') {
      this.setSpeed(value);
    } else if (paramId === 'reverse') {
      this.setReverse(value > 0.5);
    }
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    const now = this.ctx.currentTime;
    this.wetGain.gain.setTargetAtTime(enabled ? 1 : 0, now, 0.015);
    this.dryGain.gain.setTargetAtTime(enabled ? 0 : 1, now, 0.015);
  }

  public dispose(): void {
    activeLoopers.delete(this.id);
    this.listeners.clear();
    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      if (this.workletNode) this.workletNode.disconnect();
      if (this.fallbackGain) this.fallbackGain.disconnect();
      this.wetGain.disconnect();
      this.dryGain.disconnect();
    } catch (e) {
      console.warn('LooperPedalNode dispose error', e);
    }
  }
}
