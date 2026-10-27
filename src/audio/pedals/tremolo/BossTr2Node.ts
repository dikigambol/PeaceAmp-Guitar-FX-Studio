import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';

/**
 * BOSS TR-2 Tremolo
 *
 * Modeled accurately after the classic BOSS TR-2 Tremolo:
 * - RATE: LFO speed from ~1.0 Hz (slow pulse) to ~22.0 Hz (fast stutter).
 * - DEPTH: Modulation depth from 0% (transparent flat gain) to 100% (complete cutoff).
 * - WAVE: Continuous waveform morphing:
 *   - At min (0.0): Smooth triangle / sine wave vintage amp-style tremolo.
 *   - At center (5.0): Classic asymmetric trapezoidal wave.
 *   - At max (10.0): Choppy hard square-wave optical stutter.
 * - Volume compensation stage: Eliminates the vintage volume drop issue of early TR-2 revisions.
 */
export class BossTr2Node implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private enabled: boolean;

  // Bypass crossfade
  private bypassDry: GainNode;
  private bypassWet: GainNode;

  // Audio Path
  private tremoloGain: GainNode;
  private dcBlocker: BiquadFilterNode;
  private makeupGain: GainNode;

  // LFO Engine
  private lfoTriangle: OscillatorNode;
  private lfoSquare: OscillatorNode;
  private lfoTriGain: GainNode;
  private lfoSquareGain: GainNode;
  private lfoMixer: GainNode;
  private lfoDepthGain: GainNode;
  private lfoOffset: ConstantSourceNode;

  private isDisposed = false;

  private params: Record<string, number> = {
    rate: 5.0,  // 0 to 10 (~1.0 Hz to ~22.0 Hz)
    wave: 5.0,  // 0 to 10 (0 = triangle, 5 = trapezoid, 10 = square)
    depth: 7.0, // 0 to 10 (0% to 100% depth)
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

    // 2. Wet audio path
    this.inputNode.connect(this.bypassWet);

    this.tremoloGain = ctx.createGain();
    // Setting intrinsic value to 0.0 ensures ConstantSourceNode offset controls baseline gain
    this.tremoloGain.gain.setValueAtTime(0.0, ctx.currentTime);

    this.dcBlocker = createDcBlocker(ctx, 15);
    this.makeupGain = ctx.createGain();
    // Modern TR-2 internal trim (+1.5 dB compensation)
    this.makeupGain.gain.setValueAtTime(1.18, ctx.currentTime);

    this.bypassWet.connect(this.tremoloGain);
    this.tremoloGain.connect(this.dcBlocker);
    this.dcBlocker.connect(this.makeupGain);
    this.makeupGain.connect(this.outputNode);

    // 3. Dual-LFO Wave Morphing Engine
    this.lfoTriangle = ctx.createOscillator();
    this.lfoTriangle.type = 'triangle';

    this.lfoSquare = ctx.createOscillator();
    this.lfoSquare.type = 'square';

    this.lfoTriGain = ctx.createGain();
    this.lfoSquareGain = ctx.createGain();
    this.lfoMixer = ctx.createGain();
    this.lfoDepthGain = ctx.createGain();

    // Constant offset to keep VCA gain centered between (1 - depth) and 1.0
    this.lfoOffset = ctx.createConstantSource();
    this.lfoOffset.offset.setValueAtTime(1.0, ctx.currentTime);

    // Connect LFO mixer
    this.lfoTriangle.connect(this.lfoTriGain);
    this.lfoSquare.connect(this.lfoSquareGain);
    this.lfoTriGain.connect(this.lfoMixer);
    this.lfoSquareGain.connect(this.lfoMixer);

    // Connect modulation to tremoloGain AudioParam
    this.lfoMixer.connect(this.lfoDepthGain);
    this.lfoDepthGain.connect(this.tremoloGain.gain);
    this.lfoOffset.connect(this.tremoloGain.gain);

    // Start LFOs
    this.lfoTriangle.start();
    this.lfoSquare.start();
    this.lfoOffset.start();

    // Set initial parameters
    this.updateAllParameters();

    // Apply bypass crossfade
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx, 0.001);
  }

  private updateAllParameters(): void {
    if (this.isDisposed) return;
    const now = this.ctx.currentTime;

    const rateParam = this.params.rate ?? 5.0;
    const waveParam = this.params.wave ?? 5.0;
    const depthParam = this.params.depth ?? 7.0;

    // Rate: 0 to 10 -> 0.9 Hz to 22.0 Hz exponential sweep
    const rateHz = 0.9 * Math.pow(22.0 / 0.9, rateParam / 10);
    this.lfoTriangle.frequency.setTargetAtTime(rateHz, now, 0.02);
    this.lfoSquare.frequency.setTargetAtTime(rateHz, now, 0.02);

    // Wave: 0.0 = 100% Triangle, 10.0 = 100% Square
    const waveNorm = Math.max(0, Math.min(10, waveParam)) / 10;
    const triWeight = Math.cos(waveNorm * 0.5 * Math.PI);
    const sqWeight = Math.sin(waveNorm * 0.5 * Math.PI);

    this.lfoTriGain.gain.setTargetAtTime(triWeight, now, 0.02);
    // Square wave scaled to prevent harsh clipping spikes
    this.lfoSquareGain.gain.setTargetAtTime(sqWeight * 0.85, now, 0.02);

    // Depth: 0 to 10 -> 0.0 to 0.5 peak amplitude around center offset
    const depthNorm = Math.max(0, Math.min(10, depthParam)) / 10;
    // When depth = 0: gain is static 1.0. When depth = 1: gain swings between 0.0 and 1.0
    const modDepth = (depthNorm * 0.5);
    this.lfoDepthGain.gain.setTargetAtTime(modDepth, now, 0.02);
    this.lfoOffset.offset.setTargetAtTime(1.0 - modDepth, now, 0.02);
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
      this.lfoTriangle.stop();
      this.lfoSquare.stop();
      this.lfoOffset.stop();

      this.lfoTriangle.disconnect();
      this.lfoSquare.disconnect();
      this.lfoTriGain.disconnect();
      this.lfoSquareGain.disconnect();
      this.lfoMixer.disconnect();
      this.lfoDepthGain.disconnect();
      this.lfoOffset.disconnect();

      this.inputNode.disconnect();
      this.bypassDry.disconnect();
      this.bypassWet.disconnect();
      this.tremoloGain.disconnect();
      this.dcBlocker.disconnect();
      this.makeupGain.disconnect();
      this.outputNode.disconnect();
    } catch {
      // Ignore cleanup errors
    }
  }
}
