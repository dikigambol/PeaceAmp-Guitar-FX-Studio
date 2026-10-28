import type { AudioPedalNode } from '../../../types/pedal';

/**
 * MXR M135 Smart Gate — Studio Intelligent Noise Gate DSP Node
 *
 * Models the Douglas R. Scholz / MXR M135 Smart Gate circuit:
 *  - TRIGGER LEVEL (0..10): Sets the precise threshold where the gate opens/closes.
 *  - HI TRIGGER RANGE (0 = Normal, 1 = Hi Range): Shifts threshold sensitivity up by +14 dB
 *    for high-output pickups, post-overdrive chains, or amp FX Loop operation.
 *  - 3-Way Mode Switch (0 = HISS, 1 = MID, 2 = FULL):
 *      • HISS (0): High-frequency de-hisser (gates hiss > 1.65 kHz while preserving note sustain)
 *      • MID  (1): Mid/High gate (gates buzz & hum > 340 Hz while preserving warm fundamental tail)
 *      • FULL (2): Full-bandwidth studio gate (complete silence across all frequencies between notes)
 */
export class MxrSmartGateNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private enabled: boolean;

  private dryGain: GainNode;
  private wetGain: GainNode;

  // Gate worklet + frequency-selective keep-alive path for HISS / MID modes
  private gateWorklet: AudioWorkletNode | null = null;
  private keepLowpass: BiquadFilterNode;
  private keepGain: GainNode;
  private wetSum: GainNode;

  private triggerVal = 4.5; // 0..10
  private rangeVal = 0;     // 0 = Normal, 1 = Hi Trigger Range
  private modeVal = 2;      // 0 = HISS, 1 = MID, 2 = FULL

  constructor(
    ctx: AudioContext,
    id: string,
    initialParams: Record<string, number> = {},
    enabled = true
  ) {
    this.ctx = ctx;
    this.id = id;
    this.enabled = enabled;

    this.triggerVal = initialParams['trigger'] ?? 4.5;
    this.rangeVal = Math.round(initialParams['range'] ?? 0);
    this.modeVal = Math.round(initialParams['mode'] ?? 2);

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.wetSum = ctx.createGain();

    // Frequency-selective sustain path for HISS and MID modes
    this.keepLowpass = ctx.createBiquadFilter();
    this.keepLowpass.type = 'lowpass';
    this.keepLowpass.Q.value = 0.707;
    this.keepGain = ctx.createGain();

    // Bypass routing
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Wet routing
    try {
      this.gateWorklet = new AudioWorkletNode(ctx, 'noise-gate-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        channelCount: 1,
        channelCountMode: 'explicit',
        parameterData: {
          threshold: this.computeThresholdDb(),
          release: 0.065,
          hold: 0.022,
        },
      });
      this.inputNode.connect(this.gateWorklet);
      this.gateWorklet.connect(this.wetSum);
      this.gateWorklet.port.onmessage = (e: MessageEvent<{ isOpen?: boolean }>) => {
        if (typeof document === 'undefined') return;
        const ledEl = document.querySelector(`[data-smartgate-led="${this.id}"]`);
        if (!ledEl) return;
        const isClamping = this.enabled && e.data?.isOpen === false;
        ledEl.classList.toggle('is-lit', isClamping);
      };
    } catch {
      // Fallback if worklet not yet registered
      this.gateWorklet = null;
      this.inputNode.connect(this.wetSum);
    }

    // Parallel frequency-selective path (active in HISS and MID modes)
    this.inputNode.connect(this.keepLowpass);
    this.keepLowpass.connect(this.keepGain);
    this.keepGain.connect(this.wetSum);

    this.wetSum.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);

    this.applyGateParameters(true);
    this.applyBypassState(true);
  }

  private computeThresholdDb(): number {
    const norm = Math.max(0, Math.min(10, this.triggerVal)) / 10;
    // Normal range: -62 dB (min) to -20 dB (max) — catches real-world USB interface & pickup hum
    // Hi Trigger Range (+14 dB): -48 dB (min) to -8 dB (max) — for post-boost or high-gain chains
    const minDb = this.rangeVal >= 1 ? -48 : -62;
    const maxDb = this.rangeVal >= 1 ? -8 : -20;
    return minDb + norm * (maxDb - minDb);
  }

  private applyGateParameters(immediate = false): void {
    const now = this.ctx.currentTime;
    const tc = immediate ? 0.001 : 0.015;
    const thresholdDb = this.computeThresholdDb();

    const thresholdParam = this.gateWorklet?.parameters.get('threshold');
    const releaseParam = this.gateWorklet?.parameters.get('release');
    if (thresholdParam) {
      thresholdParam.setTargetAtTime(thresholdDb, now, tc);
    }
    if (releaseParam) {
      // HISS mode uses faster release, FULL uses smooth musical decay
      const releaseSec = this.modeVal === 0 ? 0.045 : this.modeVal === 1 ? 0.055 : 0.065;
      releaseParam.setTargetAtTime(releaseSec, now, tc);
    }

    // Configure HISS (0), MID (1), or FULL (2) filter bypass:
    // Keep bleed very low so hum/noise never leaks around the closed gate
    let lpFreq: number;
    let keepLevel: number;
    if (this.modeVal === 0) {
      // HISS mode: subtle low fundamental warmth (< 850 Hz)
      lpFreq = 850;
      keepLevel = 0.08;
    } else if (this.modeVal === 1) {
      // MID mode: minimal fundamental tail (< 280 Hz)
      lpFreq = 280;
      keepLevel = 0.04;
    } else {
      // FULL mode: 100% full-bandwidth clamping (0 bleed)
      lpFreq = 120;
      keepLevel = 0.0;
    }

    this.keepLowpass.frequency.setTargetAtTime(lpFreq, now, tc);
    this.keepGain.gain.setTargetAtTime(keepLevel, now, tc);
  }

  private applyBypassState(immediate = false): void {
    const now = this.ctx.currentTime;
    const tc = immediate ? 0.001 : 0.012;
    this.dryGain.gain.setTargetAtTime(this.enabled ? 0 : 1, now, tc);
    this.wetGain.gain.setTargetAtTime(this.enabled ? 1 : 0, now, tc);
  }

  public updateParameter(paramId: string, value: number): void {
    if (paramId === 'trigger') {
      this.triggerVal = Math.max(0, Math.min(10, value));
    } else if (paramId === 'range') {
      this.rangeVal = value >= 0.5 ? 1 : 0;
    } else if (paramId === 'mode') {
      this.modeVal = Math.max(0, Math.min(2, Math.round(value)));
    }
    this.applyGateParameters(false);
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.applyBypassState(false);
    if (typeof document !== 'undefined') {
      const ledEl = document.querySelector(`[data-smartgate-led="${this.id}"]`);
      if (ledEl && !enabled) {
        ledEl.classList.remove('is-lit');
      }
    }
  }

  public dispose(): void {
    try {
      this.inputNode.disconnect();
      this.dryGain.disconnect();
      this.gateWorklet?.disconnect();
      this.keepLowpass.disconnect();
      this.keepGain.disconnect();
      this.wetSum.disconnect();
      this.wetGain.disconnect();
      this.outputNode.disconnect();
    } catch {
      // Ignore already disconnected nodes
    }
  }
}
