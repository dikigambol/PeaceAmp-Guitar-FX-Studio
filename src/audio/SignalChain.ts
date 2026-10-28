import type { AudioPedalNode, PedalInstance } from '../types/pedal';
import { createPedalAudioNode } from './pedals/registry';
import { CabinetNode } from './cabinet/CabinetNode';

interface ActiveNodeEntry {
  node: AudioPedalNode;
  type: string;
  enabled: boolean;
}

export interface SignalEdge {
  fromNodeId: string;
  toNodeId: string;
}

export class SignalChain {
  private ctx: AudioContext;
  private inputHook: GainNode;
  private outputHook: GainNode;

  private activeNodes: AudioPedalNode[] = [];
  private activeEntries: Map<string, ActiveNodeEntry> = new Map();
  private customIrCache: Map<string, { buffer: AudioBuffer; name: string }> = new Map();
  private currentTopologyKey = '__UNINITIALIZED__';

  constructor(ctx: AudioContext, inputHook: GainNode, outputHook: GainNode) {
    this.ctx = ctx;
    this.inputHook = inputHook;
    this.outputHook = outputHook;
  }

  /**
   * Reconstruct the audio graph with the specified list of active pedal/amp/cab instances
   * and optional DAG patch connections (supporting both serial chains and parallel multi-amp splits).
   * Reuses existing audio nodes where possible to preserve worklet/filter/IR state
   * and applies a smooth micro-fade to eliminate clicks and pops during rewiring.
   */
  public rebuild(instances: PedalInstance[], connections?: SignalEdge[]): void {
    const edges: SignalEdge[] =
      connections && connections.length > 0
        ? connections
        : instances.length > 0
          ? [
            { fromNodeId: 'BOARD_INPUT', toNodeId: instances[0].id },
            ...instances.slice(0, -1).map((inst, idx) => ({
              fromNodeId: inst.id,
              toNodeId: instances[idx + 1].id,
            })),
            { fromNodeId: instances[instances.length - 1].id, toNodeId: 'BOARD_OUTPUT' },
          ]
          : [];

    const nodesKey = instances.map((i) => `${i.id}:${i.type}`).join(',');
    const edgesKey = edges.map((e) => `${e.fromNodeId}->${e.toNodeId}`).join(',');
    const nextKey = `${nodesKey}|${edgesKey}`;

    // Fast-path: If the graph topology (nodes + edges) has not changed,
    // update node bypass/params directly without rewiring or muting!
    if (nextKey === this.currentTopologyKey) {
      for (const inst of instances) {
        const entry = this.activeEntries.get(inst.id);
        if (entry) {
          if (entry.enabled !== inst.enabled) {
            entry.node.setEnabled(inst.enabled);
            entry.enabled = inst.enabled;
          }
          if (inst.parameters) {
            for (const [paramId, val] of Object.entries(inst.parameters)) {
              entry.node.updateParameter(paramId, val);
            }
          }
        }
      }
      return;
    }

    this.currentTopologyKey = nextKey;
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

    // 4. If no active nodes or no active edges, direct passthrough
    if (instances.length === 0 || edges.length === 0) {
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
        // Restore cached custom IR if this is a cabinet-ir node
        const cachedIr = this.customIrCache.get(inst.id);
        if (cachedIr && audioNode instanceof CabinetNode) {
          audioNode.setCustomIR(cachedIr.buffer, cachedIr.name);
        }
        entry = { node: audioNode, type: inst.type, enabled: inst.enabled };
        this.activeEntries.set(inst.id, entry);
      } else {
        if (entry.enabled !== inst.enabled) {
          entry.node.setEnabled(inst.enabled);
          entry.enabled = inst.enabled;
        }
        if (inst.parameters) {
          for (const [paramId, val] of Object.entries(inst.parameters)) {
            entry.node.updateParameter(paramId, val);
          }
        }
      }
      newActiveNodes.push(entry.node);
    }
    this.activeNodes = newActiveNodes;

    // 6. Wire the DAG edges (supports serial chains, Y-splits, and parallel multi-amp summing)
    const connectedPairs = new Set<string>();
    for (const edge of edges) {
      const pairKey = `${edge.fromNodeId}->${edge.toNodeId}`;
      if (connectedPairs.has(pairKey)) continue;
      connectedPairs.add(pairKey);

      const sourceNode: AudioNode | undefined =
        edge.fromNodeId === 'BOARD_INPUT'
          ? this.inputHook
          : this.activeEntries.get(edge.fromNodeId)?.node.outputNode;

      const targetNode: AudioNode | undefined =
        edge.toNodeId === 'BOARD_OUTPUT'
          ? this.outputHook
          : this.activeEntries.get(edge.toNodeId)?.node.inputNode;

      if (sourceNode && targetNode) {
        sourceNode.connect(targetNode);
      }
    }

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
    if (entry && entry.enabled !== enabled) {
      entry.node.setEnabled(enabled);
      entry.enabled = enabled;
    }
  }

  public async loadCustomIRForPedal(pedalId: string, file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const decoded = await this.ctx.decodeAudioData(arrayBuffer);
    this.customIrCache.set(pedalId, { buffer: decoded, name: file.name });

    const entry = this.activeEntries.get(pedalId);
    if (entry && entry.node instanceof CabinetNode) {
      entry.node.setCustomIR(decoded, file.name);
    }
    return file.name;
  }

  public getActiveNodes(): AudioPedalNode[] {
    return this.activeNodes;
  }

  public dispose(): void {
    this.currentTopologyKey = '__UNINITIALIZED__';
    this.inputHook.disconnect();
    for (const entry of this.activeEntries.values()) {
      entry.node.dispose();
    }
    this.activeEntries.clear();
    this.activeNodes = [];
  }
}
