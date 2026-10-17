import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';

/**
 * TC Electronic Gauss Tape Echo
 *
 * Full Hardware & Tape Emulation:
 * - Vintage magnetic tape echo emulation (Echoplex / Space Echo character)
 * - Delay time range: 50 ms to 500 ms with slew-damped tape speed transitions
 * - Dynamic Tape Wow & Flutter: Dual LFOs (~1.1 Hz tape wow drift + ~5.2 Hz capstan flutter)
 *   simulating organic speed imperfections of vintage physical tape machines
 * - Magnetic Tape Frequency Profile: High-frequency tape rolloff (~3.4 kHz) & head-gap bass filter (~95 Hz)
 * - Tanh tape saturation in the feedback loop: Produces warm, musical tape compression
 *   and lush oscillating spirals at high SUSTAIN settings (> 9.0)
 * - Clean dry signal: 100% unattenuated unity gain (1.0x)
 */
export class TcGaussTapeEchoNode implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;
  private enabled: boolean;
  private isDisposed = false;

  private bypassDry: GainNode;
  private bypassWet: GainNode;

  // Wet delay path
  private inputBuffer: GainNode;
  private delayNode: DelayNode;
  private tapeFilterLpf: BiquadFilterNode;
  private tapeFilterHpf: BiquadFilterNode;
  private feedbackGain: GainNode;
  private feedbackLimiter: WaveShaperNode;

  // Wow & Flutter (MOD switch)
  private wowOsc: OscillatorNode;
  private flutterOsc: OscillatorNode;
  private wowGain: GainNode;
  private flutterGain: GainNode;
  private modMasterGain: GainNode;

  // Mixers
  private dryGain: GainNode;
  private wetGain: GainNode;
  private delayMixer: GainNode;
  private dcBlocker: BiquadFilterNode;

  private params: Record<string, number> = {
    delay: 4.5,   // ~250 ms (classic tape echo)
    sustain: 4.0, // ~4-5 repeats (0 to 10)
    volume: 5.0,  // 50% wet blend relative to dry
    mod: 0,       // 0 = MOD OFF, 1 = MOD ON
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

    // 2. Wet delay input
    this.inputNode.connect(this.bypassWet);

    // 3. Direct dry guitar through the pedal (Pristine unity gain 1.0)
    this.dryGain = ctx.createGain();
    this.dryGain.gain.setValueAtTime(1.0, ctx.currentTime);

    // 4. Delay Line: 50 ms to 500 ms (max 0.7s)
    this.delayNode = ctx.createDelay(0.7);
    const initialDelay = Math.max(0, Math.min(10, this.params.delay ?? 4.5));
    const delaySec = 0.050 + (initialDelay / 10) * 0.450;
    this.delayNode.delayTime.setValueAtTime(delaySec, ctx.currentTime);

    // 5. Tape Frequency Profile Filtering:
    // Tape LPF: 3.4 kHz (warm tape head roll-off)
    this.tapeFilterLpf = ctx.createBiquadFilter();
    this.tapeFilterLpf.type = 'lowpass';
    this.tapeFilterLpf.frequency.setValueAtTime(3400, ctx.currentTime);
    this.tapeFilterLpf.Q.setValueAtTime(0.707, ctx.currentTime);

    // Tape HPF: 95 Hz (magnetic head-gap bass roll-off, keeps repeats articulate)
    this.tapeFilterHpf = ctx.createBiquadFilter();
    this.tapeFilterHpf.type = 'highpass';
    this.tapeFilterHpf.frequency.setValueAtTime(95, ctx.currentTime);
    this.tapeFilterHpf.Q.setValueAtTime(0.707, ctx.currentTime);

    // 6. Feedback (SUSTAIN) Gain with Musical Taper:
    // At 0: 0.0 (single slap echo)
    // At 5: ~0.48 (4-5 tape repeats)
    // At 8: ~0.76 (ambient tape wash)
    // At 9.2-10: 1.03 (tape self-oscillation runaway)
    this.feedbackGain = ctx.createGain();
    const initialSustain = Math.max(0, Math.min(10, this.params.sustain ?? 4.0));
    const normSustain = initialSustain / 10;
    const fbGain = Math.pow(normSustain, 1.25) * 1.03;
    this.feedbackGain.gain.setValueAtTime(fbGain, ctx.currentTime);

    // 7. Tape Saturation Limiter (smooth tanh curve)
    this.feedbackLimiter = ctx.createWaveShaper();
    this.feedbackLimiter.curve = this.createSoftLimitCurve(4096);
    this.feedbackLimiter.oversample = '4x';

    // 8. Dual Tape Wow & Flutter LFOs (MOD switch)
    // A) Wow: 1.1 Hz sine wave (tape reel eccentricity)
    this.wowOsc = ctx.createOscillator();
    this.wowOsc.type = 'sine';
    this.wowOsc.frequency.setValueAtTime(1.1, ctx.currentTime);

    this.wowGain = ctx.createGain();
    this.wowGain.gain.setValueAtTime(0.0012, ctx.currentTime); // ~1.2 ms
    this.wowOsc.connect(this.wowGain);

    // B) Flutter: 5.2 Hz triangle wave (capstan motor micro-flutter)
    this.flutterOsc = ctx.createOscillator();
    this.flutterOsc.type = 'triangle';
    this.flutterOsc.frequency.setValueAtTime(5.2, ctx.currentTime);

    this.flutterGain = ctx.createGain();
    this.flutterGain.gain.setValueAtTime(0.0006, ctx.currentTime); // ~0.6 ms
    this.flutterOsc.connect(this.flutterGain);

    // C) Master MOD Gain: 1.0 when MOD is ON, 0.0 when OFF
    this.modMasterGain = ctx.createGain();
    const isModOn = (this.params.mod ?? 0) >= 0.5;
    this.modMasterGain.gain.setValueAtTime(isModOn ? 1.0 : 0.0, ctx.currentTime);

    this.wowGain.connect(this.modMasterGain);
    this.flutterGain.connect(this.modMasterGain);
    this.modMasterGain.connect(this.delayNode.delayTime);

    this.wowOsc.start();
    this.flutterOsc.start();

    // 9. VOLUME (Wet Mix Gain)
    this.wetGain = ctx.createGain();
    const initialVolume = Math.max(0, Math.min(10, this.params.volume ?? 5.0));
    const wetLevel = (initialVolume / 10) * 1.0;
    this.wetGain.gain.setValueAtTime(wetLevel, ctx.currentTime);

    this.inputBuffer = ctx.createGain();
    this.delayMixer = ctx.createGain();
    this.dcBlocker = createDcBlocker(ctx, 15);

    // Audio Routing:
    // A) Direct dry guitar
    this.bypassWet.connect(this.dryGain);
    this.dryGain.connect(this.delayMixer);

    // B) Delay line feed
    this.bypassWet.connect(this.inputBuffer);
    this.inputBuffer.connect(this.delayNode);

    // C) Delay output through tape tone filters
    this.delayNode.connect(this.tapeFilterLpf);
    this.tapeFilterLpf.connect(this.tapeFilterHpf);

    // D) Feedback loop: filter -> feedbackGain -> feedbackLimiter -> delayNode
    this.tapeFilterHpf.connect(this.feedbackGain);
    this.feedbackGain.connect(this.feedbackLimiter);
    this.feedbackLimiter.connect(this.delayNode);

    // E) Wet signal to mixer (taken from filtered tape repeats)
    this.tapeFilterHpf.connect(this.wetGain);
    this.wetGain.connect(this.delayMixer);

    // F) Output through DC blocker
    this.delayMixer.connect(this.dcBlocker);
    this.dcBlocker.connect(this.outputNode);

    // Initial bypass crossfade
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx, 0.001);
  }

  /**
   * Tanh saturation curve with unity gain at center (slope = 1.0 at x = 0).
   * Gently compresses tape peaks above ~0.6, giving organic analog tape saturation.
   */
  private createSoftLimitCurve(samples: number): Float32Array<ArrayBuffer> {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1; // -1 to +1
      curve[i] = Math.tanh(x);
    }
    return curve as Float32Array<ArrayBuffer>;
  }

  public updateParameter(paramId: string, value: number): void {
    const now = this.ctx.currentTime;
    const clamped = Math.max(0, Math.min(10, value));
    this.params[paramId] = clamped;

    switch (paramId) {
      case 'delay': {
        // 50 ms to 500 ms with smooth tape speed ramp
        const delaySec = 0.050 + (clamped / 10) * 0.450;
        this.delayNode.delayTime.cancelScheduledValues(now);
        this.delayNode.delayTime.setTargetAtTime(delaySec, now, 0.10);
        break;
      }
      case 'sustain': {
        // Musical feedback taper:
        const norm = clamped / 10;
        const fbGain = Math.pow(norm, 1.25) * 1.03;
        this.feedbackGain.gain.cancelScheduledValues(now);
        this.feedbackGain.gain.setTargetAtTime(fbGain, now, 0.04);
        break;
      }
      case 'volume': {
        // Wet mix: 0 to 1.0
        const wetLevel = (clamped / 10) * 1.0;
        this.wetGain.gain.cancelScheduledValues(now);
        this.wetGain.gain.setTargetAtTime(wetLevel, now, 0.02);
        break;
      }
      case 'mod': {
        // MOD toggle: 0 = OFF, 1 = ON
        const isModOn = clamped >= 0.5;
        this.modMasterGain.gain.cancelScheduledValues(now);
        this.modMasterGain.gain.setTargetAtTime(isModOn ? 1.0 : 0.0, now, 0.03);
        break;
      }
    }
  }

  public setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    applyBypassCrossfade(this.bypassWet, this.bypassDry, enabled, this.ctx, 0.015);
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.bypassDry.disconnect();
      this.bypassWet.disconnect();

      this.dryGain.disconnect();
      this.inputBuffer.disconnect();
      this.delayNode.disconnect();
      this.tapeFilterLpf.disconnect();
      this.tapeFilterHpf.disconnect();
      this.feedbackGain.disconnect();
      this.feedbackLimiter.disconnect();
      this.wetGain.disconnect();

      this.wowOsc.stop();
      this.wowOsc.disconnect();
      this.wowGain.disconnect();
      this.flutterOsc.stop();
      this.flutterOsc.disconnect();
      this.flutterGain.disconnect();
      this.modMasterGain.disconnect();

      this.delayMixer.disconnect();
      this.dcBlocker.disconnect();
    } catch {
      // AudioNode already disconnected
    }
  }
}
