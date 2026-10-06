import type { AudioPedalNode, PedalInstance } from '../types/pedal';
import { createPedalAudioNode } from './pedals/registry';

interface ActiveNodeEntry {
  node: AudioPedalNode;
  type: string;
}

export class SignalChain {
  private ctx: AudioContext;
  private inputHook: GainNode;
  private outputHook: GainNode;

  private activeNodes: AudioPedalNode[] = [];
  private activeEntries: Map<string, ActiveNodeEntry> = new Map();

  constructor(ctx: AudioContext, inputHook: GainNode, outputHook: GainNode) {
    this.ctx = ctx;
    this.inputHook = inputHook;
    this.outputHook = outputHook;
  }

  /**
   * Reconstruct the audio graph with the specified list of pedal instances.
   * Reuses existing audio nodes where possible to preserve worklet/filter state
   * and applies a smooth micro-fade to eliminate clicks and pops during rewiring.
   */
  public rebuild(instances: PedalInstance[]): void {
    const now = this.ctx.currentTime;

    // 1. Smooth micro-mute ramp to eliminate pops during rewiring
    if (now > 0) {
      this.inputHook.gain.cancelScheduledValues(now);
      this.inputHook.gain.setValueAtTime(this.inputHook.gain.value, now);
      this.inputHook.gain.linearRampToValueAtTime(0, now + 0.003);
    }

    // 2. Identify nodes no longer present or whose type changed, and dispose them
    const incomingMap = new Map(instances.map((i) => [i.id, i]));
    for (const [id, entry] of this.activeEntries.entries()) {
      const nextInst = incomingMap.get(id);
      if (!nextInst || nextInst.type !== entry.type) {
        entry.node.dispose();
        this.activeEntries.delete(id);
      }
    }

    // 3. Disconnect previous chain connections
    this.inputHook.disconnect();
    for (const entry of this.activeEntries.values()) {
      try {
        entry.node.outputNode.disconnect();
      } catch {
        // Safe ignore if already disconnected
      }
    }

    // 4. If no pedals, direct passthrough
    if (instances.length === 0) {
      this.activeNodes = [];
      this.inputHook.connect(this.outputHook);
      if (now > 0) {
        this.inputHook.gain.setValueAtTime(0, now + 0.004);
        this.inputHook.gain.linearRampToValueAtTime(1.0, now + 0.008);
      } else {
        this.inputHook.gain.setValueAtTime(1.0, 0);
      }
      return;
    }

    // 5. Instantiate new nodes or update parameters on preserved nodes
    const newActiveNodes: AudioPedalNode[] = [];
    for (const inst of instances) {
      let entry = this.activeEntries.get(inst.id);
      if (!entry) {
        const audioNode = createPedalAudioNode(
          inst.type,
          this.ctx,
          inst.id,
          inst.parameters,
          inst.enabled
        );
        entry = { node: audioNode, type: inst.type };
        this.activeEntries.set(inst.id, entry);
      } else {
        // Reuse node: sync enabled state and parameter values
        entry.node.setEnabled(inst.enabled);
        if (inst.parameters) {
          for (const [paramId, val] of Object.entries(inst.parameters)) {
            entry.node.updateParameter(paramId, val);
          }
        }
      }
      newActiveNodes.push(entry.node);
    }
    this.activeNodes = newActiveNodes;

    // 6. Wire the chain in order:
    // inputHook -> node[0] -> node[1] -> ... -> outputHook
    this.inputHook.connect(this.activeNodes[0].inputNode);

    for (let i = 0; i < this.activeNodes.length - 1; i++) {
      this.activeNodes[i].outputNode.connect(this.activeNodes[i + 1].inputNode);
    }

    this.activeNodes[this.activeNodes.length - 1].outputNode.connect(this.outputHook);

    // 7. Micro-ramp input gain back to unity
    if (now > 0) {
      this.inputHook.gain.setValueAtTime(0, now + 0.004);
      this.inputHook.gain.linearRampToValueAtTime(1.0, now + 0.008);
    } else {
      this.inputHook.gain.setValueAtTime(1.0, 0);
    }
  }

  public updateParameter(pedalId: string, paramId: string, value: number): void {
    const entry = this.activeEntries.get(pedalId);
    if (entry) {
      entry.node.updateParameter(paramId, value);
    }
  }

  public setEnabled(pedalId: string, enabled: boolean): void {
    const entry = this.activeEntries.get(pedalId);
    if (entry) {
      entry.node.setEnabled(enabled);
    }
  }

  public dispose(): void {
    this.inputHook.disconnect();
    for (const entry of this.activeEntries.values()) {
      entry.node.dispose();
    }
    this.activeEntries.clear();
    this.activeNodes = [];
  }
}
