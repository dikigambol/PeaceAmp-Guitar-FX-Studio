import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';

/**
 * BOSS VB-2 Vibrato
 *
 * Authentic Bucket Brigade Device (BBD MN3207 / MN3102) pitch vibrato modeling:
 * - 100% wet pitch-modulated delay line (Doppler pitch modulation without dry signal).
 * - RATE: LFO frequency from ~1.5 Hz (slow lush sea-sick pitch wave) to ~14.0 Hz (fast Leslie-like warble).
 * - DEPTH: Modulation depth controlling pitch deviation width (up to ±75 cents).
 * - RISE TIME: Rise time envelope swell (0.05s to 3.5s) for smooth vibrato entry.
 * - MODE:
 *   - 0 = LATCH: Standard latching footswitch on/off.
 *   - 1 = BYPASS: Pure analog clean dry bypass.
 *   - 2 = UNLATCH: Momentary engagement (vibrato swells while footswitch is held down).
 * - Analog BBD anti-aliasing and reconstruction low-pass filtering at ~7.2 kHz.
 */
export class BossVb2Node implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private enabled: boolean;

  // Bypass crossfade
  private bypassDry: GainNode;
  private bypassWet: GainNode;

  // Audio path (BBD Delay Line)
  private bbdPreFilter: BiquadFilterNode;
  private delayNode: DelayNode;
  private bbdPostFilter: BiquadFilterNode;
  private dcBlocker: BiquadFilterNode;

  // LFO & Modulation Engine
  private lfoOsc: OscillatorNode;
  private lfoDepthGain: GainNode;
  private lfoEnvelopeGain: GainNode;
  private delayOffset: ConstantSourceNode;

  private isDisposed = false;

  private params: Record<string, number> = {
    rate: 5.0,     // 0 to 10 (~1.5 Hz to ~14.0 Hz)
    depth: 7.0,    // 0 to 10 (0 to ±3.5 ms delay swing)
    riseTime: 3.0, // 0 to 10 (~0.05s to ~3.5s swell)
    mode: 0.0,     // 0 = LATCH, 1 = BYPASS, 2 = UNLATCH
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

    // 2. Wet audio path: BBD Pitch Vibrato (100% delay, 0% dry)
    this.inputNode.connect(this.bypassWet);

    // BBD Anti-aliasing input filter (Sallen-Key 2-pole lowpass at 7.2 kHz)
    this.bbdPreFilter = ctx.createBiquadFilter();
    this.bbdPreFilter.type = 'lowpass';
    this.bbdPreFilter.frequency.setValueAtTime(7200, ctx.currentTime);
    this.bbdPreFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    // BBD Modulated Delay Line
    // Max delay = 0.05s; nominal center delay = 0.0075s (7.5 ms)
    this.delayNode = ctx.createDelay(0.05);
    this.delayNode.delayTime.setValueAtTime(0.0, ctx.currentTime);

    // BBD Reconstruction output filter
    this.bbdPostFilter = ctx.createBiquadFilter();
    this.bbdPostFilter.type = 'lowpass';
    this.bbdPostFilter.frequency.setValueAtTime(7200, ctx.currentTime);
    this.bbdPostFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    this.dcBlocker = createDcBlocker(ctx, 15);

    // Connect wet path
    this.bypassWet.connect(this.bbdPreFilter);
    this.bbdPreFilter.connect(this.delayNode);
    this.delayNode.connect(this.bbdPostFilter);
    this.bbdPostFilter.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputNode);

    // 3. Modulation & Rise Time Envelope Engine
    this.lfoOsc = ctx.createOscillator();
    this.lfoOsc.type = 'sine';

    this.lfoDepthGain = ctx.createGain();
    this.lfoEnvelopeGain = ctx.createGain();
    this.lfoEnvelopeGain.gain.setValueAtTime(1.0, ctx.currentTime);

    // Center delay baseline: 7.5 ms (0.0075 s)
    this.delayOffset = ctx.createConstantSource();
    this.delayOffset.offset.setValueAtTime(0.0075, ctx.currentTime);

    // Routing: lfoOsc -> lfoDepthGain -> lfoEnvelopeGain -> delayNode.delayTime
    // delayOffset -> delayNode.delayTime
    this.lfoOsc.connect(this.lfoDepthGain);
    this.lfoDepthGain.connect(this.lfoEnvelopeGain);
    this.lfoEnvelopeGain.connect(this.delayNode.delayTime);
    this.delayOffset.connect(this.delayNode.delayTime);

    this.lfoOsc.start();
    this.delayOffset.start();

    // Initialize all parameters
    this.updateAllParameters();

    // Apply bypass crossfade
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.isEffectiveEnabled(), this.ctx, 0.001);
  }

  private isEffectiveEnabled(): boolean {
    return this.enabled;
  }

  private updateAllParameters(): void {
    if (this.isDisposed) return;
    const now = this.ctx.currentTime;

    const rateParam = this.params.rate ?? 5.0;
    const depthParam = this.params.depth ?? 7.0;
    const mode = Math.round(this.params.mode ?? 0);

    // Rate: 0 to 10 -> 1.5 Hz to 14.0 Hz exponential sweep
    const rateHz = 1.5 * Math.pow(14.0 / 1.5, rateParam / 10);
    this.lfoOsc.frequency.setTargetAtTime(rateHz, now, 0.02);

    // Depth:
    // Mode 0 (LATCH) & Mode 2 (UNLATCH): standard depth up to ±3.5ms
    // Mode 1 (WARM BBD): subtle vintage depth up to ±2.5ms
    const depthNorm = Math.max(0, Math.min(10, depthParam)) / 10;
    const maxDelaySwing = (mode === 1 ? depthNorm * 0.0025 : depthNorm * 0.0035);
    this.lfoDepthGain.gain.setTargetAtTime(maxDelaySwing, now, 0.02);

    // Filter coloring:
    // Mode 1: Warmer vintage BBD lowpass (5.5 kHz)
    // Mode 0 & 2: Standard VB-2 lowpass (7.2 kHz)
    const cutoffHz = mode === 1 ? 5500 : 7200;
    this.bbdPreFilter.frequency.setTargetAtTime(cutoffHz, now, 0.02);
    this.bbdPostFilter.frequency.setTargetAtTime(cutoffHz, now, 0.02);

    // When not in UNLATCH mode, ensure LFO envelope gain is fully open (1.0)
    if (mode !== 2) {
      this.lfoEnvelopeGain.gain.setTargetAtTime(1.0, now, 0.02);
    }

    // Always keep audio bypass state synchronized with this.enabled
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx, 0.02);
  }

  public updateParameter(paramId: string, value: number): void {
    this.params[paramId] = value;
    this.updateAllParameters();
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    const mode = Math.round(this.params.mode ?? 0);
    if (mode === 2) {
      // In UNLATCH mode, engage/disengage with envelope swell
      this.setMomentaryPressed(enabled);
    } else {
      applyBypassCrossfade(this.bypassWet, this.bypassDry, enabled, this.ctx);
    }
  }

  /**
   * Handle Unlatch (Momentary) Press / Release with Rise Time Envelope Swell
   */
  public setMomentaryPressed(pressed: boolean): void {
    const now = this.ctx.currentTime;
    const mode = Math.round(this.params.mode ?? 0);

    if (mode === 2) {
      const riseParam = this.params.riseTime ?? 3.0;
      // Rise time: 0.05s (instant) to 3.5s (gradual swell)
      const riseTimeSec = 0.05 + (riseParam / 10) * 3.45;

      if (pressed) {
        // Smoothly ramp up envelope according to RISE TIME knob
        this.lfoEnvelopeGain.gain.cancelScheduledValues(now);
        this.lfoEnvelopeGain.gain.setValueAtTime(0.0, now);
        this.lfoEnvelopeGain.gain.setTargetAtTime(1.0, now, riseTimeSec / 3);
        applyBypassCrossfade(this.bypassWet, this.bypassDry, true, this.ctx, 0.02);
      } else {
        // Quick release ramp down
        this.lfoEnvelopeGain.gain.cancelScheduledValues(now);
        this.lfoEnvelopeGain.gain.setTargetAtTime(0.0, now, 0.04);
        applyBypassCrossfade(this.bypassWet, this.bypassDry, false, this.ctx, 0.04);
      }
    } else {
      applyBypassCrossfade(this.bypassWet, this.bypassDry, this.isEffectiveEnabled(), this.ctx);
    }
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    try {
      this.lfoOsc.stop();
      this.delayOffset.stop();

      this.lfoOsc.disconnect();
      this.lfoDepthGain.disconnect();
      this.lfoEnvelopeGain.disconnect();
      this.delayOffset.disconnect();

      this.inputNode.disconnect();
      this.bypassDry.disconnect();
      this.bypassWet.disconnect();
      this.bbdPreFilter.disconnect();
      this.delayNode.disconnect();
      this.bbdPostFilter.disconnect();
      this.dcBlocker.disconnect();
      this.outputNode.disconnect();
    } catch {
      // Ignore cleanup errors
    }
  }
}
