import type { AudioPedalNode, PedalInstance } from '../types/pedal';
import { createPedalAudioNode } from './pedals/registry';

export class SignalChain {
  private ctx: AudioContext;
  private inputHook: GainNode;
  private outputHook: GainNode;

  private activeNodes: AudioPedalNode[] = [];

  constructor(ctx: AudioContext, inputHook: GainNode, outputHook: GainNode) {
    this.ctx = ctx;
    this.inputHook = inputHook;
    this.outputHook = outputHook;
  }

  /**
   * Reconstruct the audio graph with the specified list of pedal instances.
   */
  public rebuild(instances: PedalInstance[]): void {
    // 1. Disconnect current connections
    this.inputHook.disconnect();
    for (const node of this.activeNodes) {
      node.dispose();
    }
    this.activeNodes = [];

    // 2. If no pedals, direct passthrough
    if (instances.length === 0) {
      this.inputHook.connect(this.outputHook);
      return;
    }

    // 3. Instantiate audio nodes
    for (const inst of instances) {
      const audioNode = createPedalAudioNode(
        inst.type,
        this.ctx,
        inst.id,
        inst.parameters,
        inst.enabled
      );
      this.activeNodes.push(audioNode);
    }

    // 4. Wire the chain
    // inputHook -> node[0] -> node[1] -> ... -> outputHook
    this.inputHook.connect(this.activeNodes[0].inputNode);

    for (let i = 0; i < this.activeNodes.length - 1; i++) {
      this.activeNodes[i].outputNode.connect(this.activeNodes[i + 1].inputNode);
    }

    this.activeNodes[this.activeNodes.length - 1].outputNode.connect(this.outputHook);
  }

  public updateParameter(pedalId: string, paramId: string, value: number): void {
    const node = this.activeNodes.find((n) => n.id === pedalId);
    if (node) {
      node.updateParameter(paramId, value);
    }
  }

  public setEnabled(pedalId: string, enabled: boolean): void {
    const node = this.activeNodes.find((n) => n.id === pedalId);
    if (node) {
      node.setEnabled(enabled);
    }
  }

  public dispose(): void {
    this.inputHook.disconnect();
    for (const node of this.activeNodes) {
      node.dispose();
    }
    this.activeNodes = [];
  }
}
