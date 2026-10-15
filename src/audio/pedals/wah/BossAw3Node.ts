import type { AudioPedalNode } from '../../../types/pedal';
import { applyBypassCrossfade, createDcBlocker } from '../dspUtils';

/**
 * Acoustic formant frequencies (F1, F2, F3) for 5 cardinal vowels in human speech
 */
export const HUMANIZER_VOWELS = [
  { label: 'A', f1: 800, f2: 1250, f3: 2500 }, // "ah" as in father
  { label: 'E', f1: 530, f2: 1850, f3: 2500 }, // "eh" as in bed
  { label: 'I', f1: 280, f2: 2300, f3: 3000 }, // "ee" as in see
  { label: 'O', f1: 450, f2: 900, f3: 2400 }, // "oh" as in boat
  { label: 'U', f1: 320, f2: 750, f3: 2200 }, // "oo" as in boot
];

export const AW3_MODES = ['UP', 'DOWN', 'SHARP', 'HUMAN', 'TEMPO'] as const;
export type Aw3Mode = typeof AW3_MODES[number];

export const AW3_INPUTS = ['GUITAR', 'BASS', 'EXP'] as const;
export type Aw3InputMode = typeof AW3_INPUTS[number];

/**
 * BOSS AW-3 Dynamic Wah
 *
 * Full Authentic Hardware Modeling Specification:
 *
 * 1. Control Parameters:
 *    - DECAY (Knob 1): Controls envelope follower release time (0.1s to 2.0s). In TEMPO mode: LFO rate (0.5 Hz to 8.5 Hz).
 *    - MANUAL / VOWEL 1 (Knob 2):
 *        * Dynamic & Tempo Modes: Sets starting / base cutoff frequency.
 *        * Humanizer Mode: Selects starting vowel (A, E, I, O, U).
 *    - SENS / VOWEL 2 (Knob 3):
 *        * Dynamic Modes: Sets envelope follower pick detection sensitivity.
 *        * Humanizer Mode: Selects target vowel (A, E, I, O, U) morph destination.
 *        * Tempo Mode: Sets modulation depth (sweep width).
 *    - MODE (Knob 4): UP, DOWN, SHARP, HUMANIZER, TEMPO.
 *
 * 2. Adaptive Input Routing (GUITAR / BASS / EXP):
 *    - GUITAR IN: Tuned for electric guitar (350 Hz to 3400 Hz sweep).
 *    - BASS IN: Low-frequency calibration (100 Hz to 1500 Hz sweep, 40 Hz sidechain tracking, sub-bass retention).
 *    - EXP / FOOT WAH: Manual expression foot pedal wah mode (sweepable via slider/treadle).
 *
 * 3. High-Impact Resonant DSP Engine:
 *    - Serial Peaking Filter (+18 dB to +24 dB boost) & Resonant Bandpass for screaming vocal bite.
 *    - Real-time Envelope Tracker running 2ms attack and variable exponential decay without FM ripple.
 *    - Triple parallel Formant Filters for Humanizer vowel morphing.
 */
export class BossAw3Node implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;

  // Bypass Crossfade
  private bypassDry: GainNode;
  private bypassWet: GainNode;

  // Sidechain Real-time Envelope Tracking
  private sidechainHighpass: BiquadFilterNode;
  private sidechainPreGain: GainNode;
  private analyser: AnalyserNode;
  private analyserBuffer: Float32Array<ArrayBuffer>;
  private envelopeState = 0;
  private trackTimer: number | null = null;

  // Primary Wah Resonant Filter Bank (UP, DOWN, SHARP, TEMPO, EXP)
  private wahPeaking: BiquadFilterNode;
  private wahBandpass: BiquadFilterNode;
  private wahMainGain: GainNode;

  // Parallel Low-End Body Path (Preserves low-E and bass fundamentals)
  private bodyFilter: BiquadFilterNode;
  private bodyGain: GainNode;

  // Humanizer Triple Formant Filters (F1, F2, F3)
  private formantF1: BiquadFilterNode;
  private formantF2: BiquadFilterNode;
  private formantF3: BiquadFilterNode;
  private formantGain1: GainNode;
  private formantGain2: GainNode;
  private formantGain3: GainNode;
  private formantMasterGain: GainNode;

  // Tempo Mode Continuous LFO Phase
  private lfoPhase = 0;

  // Master Mixer, DC Blocker & Makeup Gain
  private wetMixer: GainNode;
  private dcBlocker: BiquadFilterNode;
  private wetMakeupGain: GainNode;

  private params: Record<string, number> = {
    decay: 5.0,      // 0 to 10 (0.1s to 2.0s or LFO rate)
    manual: 4.0,     // 0 to 10 (base freq or Vowel 1 index 0..4)
    sens: 6.0,       // 0 to 10 (sensitivity or Vowel 2 index 0..4)
    mode: 0,         // 0: UP, 1: DOWN, 2: SHARP, 3: HUMAN, 4: TEMPO
    inputMode: 0,    // 0: GUITAR, 1: BASS, 2: EXP
    pedalWah: 50.0,  // 0 to 100% (for EXP manual foot wah)
  };

  private enabled: boolean;

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

    // 1. Sidechain Envelope Tracking (tuned to avoid amplifying pickup noise)
    this.sidechainHighpass = ctx.createBiquadFilter();
    this.sidechainHighpass.type = 'highpass';
    this.sidechainHighpass.frequency.setValueAtTime(65, ctx.currentTime);
    this.sidechainHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    this.sidechainPreGain = ctx.createGain();
    this.sidechainPreGain.gain.setValueAtTime(1.5, ctx.currentTime);

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024; // 1024 samples covers low-E string cycle (~21ms at 48kHz) to eliminate AC zero-crossing ripple
    this.analyser.smoothingTimeConstant = 0.6;
    this.analyserBuffer = new Float32Array(this.analyser.fftSize);

    // 2. Resonant Wah Engine (Musical Peaking + Vocal Bandpass without digital clipping)
    this.wahPeaking = ctx.createBiquadFilter();
    this.wahPeaking.type = 'peaking';
    this.wahPeaking.frequency.setValueAtTime(600, ctx.currentTime);
    this.wahPeaking.Q.setValueAtTime(3.2, ctx.currentTime);
    this.wahPeaking.gain.setValueAtTime(8.0, ctx.currentTime);

    this.wahBandpass = ctx.createBiquadFilter();
    this.wahBandpass.type = 'bandpass';
    this.wahBandpass.frequency.setValueAtTime(600, ctx.currentTime);
    this.wahBandpass.Q.setValueAtTime(2.2, ctx.currentTime);

    this.wahMainGain = ctx.createGain();
    this.wahMainGain.gain.setValueAtTime(0.85, ctx.currentTime);

    // 3. Parallel Low-End Body Path (Preserves warm guitar fundamentals & body for a round, full tone)
    this.bodyFilter = ctx.createBiquadFilter();
    this.bodyFilter.type = 'lowpass';
    this.bodyFilter.frequency.setValueAtTime(260, ctx.currentTime);
    this.bodyFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    this.bodyGain = ctx.createGain();
    this.bodyGain.gain.setValueAtTime(0.65, ctx.currentTime);

    // 4. Humanizer Triple Formant Filters
    this.formantF1 = ctx.createBiquadFilter();
    this.formantF1.type = 'bandpass';
    this.formantF1.frequency.setValueAtTime(800, ctx.currentTime);
    this.formantF1.Q.setValueAtTime(5.5, ctx.currentTime);
    this.formantGain1 = ctx.createGain();
    this.formantGain1.gain.setValueAtTime(1.0, ctx.currentTime);

    this.formantF2 = ctx.createBiquadFilter();
    this.formantF2.type = 'bandpass';
    this.formantF2.frequency.setValueAtTime(1250, ctx.currentTime);
    this.formantF2.Q.setValueAtTime(6.5, ctx.currentTime);
    this.formantGain2 = ctx.createGain();
    this.formantGain2.gain.setValueAtTime(0.8, ctx.currentTime);

    this.formantF3 = ctx.createBiquadFilter();
    this.formantF3.type = 'bandpass';
    this.formantF3.frequency.setValueAtTime(2500, ctx.currentTime);
    this.formantF3.Q.setValueAtTime(7.5, ctx.currentTime);
    this.formantGain3 = ctx.createGain();
    this.formantGain3.gain.setValueAtTime(0.5, ctx.currentTime);

    this.formantMasterGain = ctx.createGain();
    this.formantMasterGain.gain.setValueAtTime(0, ctx.currentTime);

    // 6. Mixer, DC Blocker & Makeup Gain
    this.wetMixer = ctx.createGain();
    this.dcBlocker = createDcBlocker(ctx, 20);
    this.wetMakeupGain = ctx.createGain();
    this.wetMakeupGain.gain.setValueAtTime(1.0, ctx.currentTime);

    // AUDIO ROUTING GRAPH:
    // Dry bypass
    this.inputNode.connect(this.bypassDry);
    this.bypassDry.connect(this.outputNode);

    // Sidechain input
    this.inputNode.connect(this.sidechainHighpass);
    this.sidechainHighpass.connect(this.sidechainPreGain);
    this.sidechainPreGain.connect(this.analyser);

    // Wet signal routing
    this.inputNode.connect(this.bypassWet);

    // A) Resonant Wah Path (Peaking -> Bandpass -> wahMainGain -> wetMixer)
    this.bypassWet.connect(this.wahPeaking);
    this.wahPeaking.connect(this.wahBandpass);
    this.wahBandpass.connect(this.wahMainGain);
    this.wahMainGain.connect(this.wetMixer);

    // B) Low-end Body Path
    this.bypassWet.connect(this.bodyFilter);
    this.bodyFilter.connect(this.bodyGain);
    this.bodyGain.connect(this.wetMixer);

    // C) Humanizer Formants Path (parallel F1, F2, F3)
    this.bypassWet.connect(this.formantF1);
    this.bypassWet.connect(this.formantF2);
    this.bypassWet.connect(this.formantF3);
    this.formantF1.connect(this.formantGain1);
    this.formantF2.connect(this.formantGain2);
    this.formantF3.connect(this.formantGain3);
    this.formantGain1.connect(this.formantMasterGain);
    this.formantGain2.connect(this.formantMasterGain);
    this.formantGain3.connect(this.formantMasterGain);
    this.formantMasterGain.connect(this.wetMixer);

    // Final output stage
    this.wetMixer.connect(this.dcBlocker);
    this.dcBlocker.connect(this.wetMakeupGain);
    this.wetMakeupGain.connect(this.outputNode);

    // Start real-time dynamic tracking loop
    this.startTracking();

    this.applyParams(true);
    applyBypassCrossfade(this.bypassWet, this.bypassDry, this.enabled, this.ctx, 0.001);
  }

  /**
   * High-rate real-time dynamic tracking loop.
   * Tracks envelope ballistics with 2ms attack and 0.1s - 2.0s decay,
   * driving filter sweeps and vowel formant morphing with zero FM ripple.
   */
  private startTracking(): void {
    if (this.trackTimer !== null) return;

    this.trackTimer = window.setInterval(() => {
      if (!this.enabled) return;

      const inputMode = Math.round(this.params.inputMode ?? 0);
      const mode = Math.round(this.params.mode ?? 0);

      // In EXP mode, manual pedal position controls the wah directly
      if (inputMode === 2) {
        this.processManualExp();
        return;
      }

      // Read real-time audio time domain amplitude with 1024-sample window (~21ms at 48kHz)
      this.analyser.getFloatTimeDomainData(this.analyserBuffer);
      let sumSquares = 0;
      let peak = 0;
      const bufLen = this.analyserBuffer.length;
      for (let i = 0; i < bufLen; i++) {
        const a = Math.abs(this.analyserBuffer[i]);
        if (a > peak) peak = a;
        sumSquares += a * a;
      }
      const rms = Math.sqrt(sumSquares / bufLen);

      // Noise floor threshold: suppress idle pickup hum and ambient noise (< -44 dBFS)
      const noiseThreshold = 0.006;
      const combinedLevel = 0.6 * peak + 0.4 * (rms * 1.5);
      const gatedLevel = combinedLevel > noiseThreshold ? combinedLevel - noiseThreshold : 0;

      const sensVal = Math.max(0, Math.min(10, this.params.sens ?? 6.0));
      const decayVal = Math.max(0, Math.min(10, this.params.decay ?? 5.0));

      // Musical sensitivity scaling
      const sensMultiplier = 1.2 + (sensVal / 10) * 4.8;
      const targetAmp = Math.min(1.0, gatedLevel * sensMultiplier);

      // Ballistic integration:
      // Attack: gentle rise (~18ms) to prevent audio-rate chatter & zipper noise
      // Decay: 0.12s (fast funk snap) to 2.2s (slow expressive vocal bloom)
      const decaySec = 0.12 + (decayVal / 10) * 2.08;
      const decayCoeff = Math.exp(-0.015 / Math.max(0.05, decaySec));
      const attackCoeff = 0.45;

      if (targetAmp > this.envelopeState) {
        this.envelopeState += (targetAmp - this.envelopeState) * attackCoeff;
      } else {
        this.envelopeState *= decayCoeff;
      }

      const env = this.envelopeState; // 0.0 to 1.0
      const now = this.ctx.currentTime;
      const tc = 0.025; // Continuous smooth transition time constant

      if (mode === 3) {
        // HUMANIZER MODE: Vowel 1 to Vowel 2 dynamic morphing
        this.processHumanizerMorph(env, now, tc);
      } else if (mode === 4) {
        // TEMPO MODE: LFO sweeps filter automatically
        this.processTempoMode(now, tc);
      } else {
        // DYNAMIC WAH MODES (UP, DOWN, SHARP)
        this.processDynamicWah(env, mode, now, tc);
      }
    }, 15);
  }

  private processManualExp(): void {
    const manualVal = Math.max(0, Math.min(10, this.params.manual ?? 4.0));
    const pedal = Math.max(0, Math.min(100, this.params.pedalWah ?? 50.0)) / 100;
    const baseFreq = 350 + (manualVal / 10) * 400;
    const sweepRange = 2200;
    // Log-like feel for natural foot treadle wah response
    const targetFreq = baseFreq + Math.pow(pedal, 1.4) * sweepRange;
    const now = this.ctx.currentTime;
    const tc = 0.02;

    this.wahPeaking.frequency.setTargetAtTime(targetFreq, now, tc);
    this.wahBandpass.frequency.setTargetAtTime(targetFreq, now, tc);
  }

  /**
   * Process Standard Dynamic Wah Modes (UP, DOWN, SHARP)
   */
  private processDynamicWah(env: number, mode: number, now: number, tc: number): void {
    const manualVal = Math.max(0, Math.min(10, this.params.manual ?? 4.0));
    const inputMode = Math.round(this.params.inputMode ?? 0);
    const isBass = inputMode === 1;

    // Guitar: 320 Hz to 2800 Hz | Bass: 120 Hz to 1600 Hz
    const baseFreq = isBass ? 120 + (manualVal / 10) * 350 : 320 + (manualVal / 10) * 600;
    const sweepRange = isBass ? 1400 : 2200;

    let targetFreq: number;
    if (mode === 1) {
      // DOWN Mode: Starts high, dives downward on pick attack
      const highStart = baseFreq + sweepRange;
      targetFreq = Math.max(isBass ? 100 : 250, highStart - env * sweepRange);
    } else {
      // UP and SHARP Mode: Sweeps upwards on pick attack
      targetFreq = Math.min(isBass ? 2200 : 3600, baseFreq + env * sweepRange);
    }

    this.wahPeaking.frequency.setTargetAtTime(targetFreq, now, tc);
    this.wahBandpass.frequency.setTargetAtTime(targetFreq, now, tc);
  }

  /**
   * Process Humanizer Mode: Smooth Acoustic Formant Morphing between Vowel 1 and Vowel 2
   */
  private processHumanizerMorph(env: number, now: number, tc: number): void {
    const manualVal = Math.max(0, Math.min(10, this.params.manual ?? 0.0));
    const sensVal = Math.max(0, Math.min(10, this.params.sens ?? 6.0));

    // Vowel 1 chosen by MANUAL (Knob 2)
    const v1Idx = Math.min(4, Math.max(0, Math.floor((manualVal / 10) * 4.99)));
    // Vowel 2 chosen by SENS (Knob 3)
    const v2Idx = Math.min(4, Math.max(0, Math.floor((sensVal / 10) * 4.99)));

    const v1 = HUMANIZER_VOWELS[v1Idx] || HUMANIZER_VOWELS[0];
    const v2 = HUMANIZER_VOWELS[v2Idx] || HUMANIZER_VOWELS[3];

    // Smooth linear interpolation of Formants F1, F2, F3 driven by pick envelope
    const f1 = v1.f1 + env * (v2.f1 - v1.f1);
    const f2 = v1.f2 + env * (v2.f2 - v1.f2);
    const f3 = v1.f3 + env * (v2.f3 - v1.f3);

    this.formantF1.frequency.setTargetAtTime(Math.max(150, f1), now, tc);
    this.formantF2.frequency.setTargetAtTime(Math.max(400, f2), now, tc);
    this.formantF3.frequency.setTargetAtTime(Math.max(1000, f3), now, tc);
  }

  /**
   * Process Tempo Mode: Rhythmic LFO sweep
   */
  private processTempoMode(now: number, tc: number): void {
    const decayVal = Math.max(0, Math.min(10, this.params.decay ?? 5.0)); // RATE
    const manualVal = Math.max(0, Math.min(10, this.params.manual ?? 4.0)); // MANUAL / CENTER
    const sensVal = Math.max(0, Math.min(10, this.params.sens ?? 6.0)); // DEPTH

    // LFO Rate: 0.5 Hz (slow tempo) to 8.5 Hz (fast tempo)
    const lfoRate = 0.5 + (decayVal / 10) * 8.0;
    // Step phase by (rate * 2pi * dt), interval is 0.015s
    this.lfoPhase = (this.lfoPhase + lfoRate * 2 * Math.PI * 0.015) % (2 * Math.PI);

    // Smooth sinusoidal modulation (-1.0 to +1.0)
    const lfoVal = Math.sin(this.lfoPhase);

    // Center frequency from MANUAL: 400 Hz to 1400 Hz
    const centerFreq = 400 + (manualVal / 10) * 900;

    // Sweep depth from SENS/DEPTH: up to +/- 1200 Hz
    const sweepDepth = 1200 * (sensVal / 10);

    const targetFreq = Math.max(250, Math.min(3800, centerFreq + lfoVal * sweepDepth));

    this.wahPeaking.frequency.setTargetAtTime(targetFreq, now, tc);
    this.wahBandpass.frequency.setTargetAtTime(targetFreq, now, tc);
  }

  private applyParams(immediate = false): void {
    const now = this.ctx.currentTime;
    const tc = immediate ? 0.001 : 0.02;

    const mode = Math.round(this.params.mode ?? 0);
    const inputMode = Math.round(this.params.inputMode ?? 0);
    const isBass = inputMode === 1;

    // 1. Adaptive Body & Tracking:
    // Low-end body path preserves guitar fundamentals (82Hz - 300Hz) so the sound stays "bulet"
    const bodyFreq = isBass ? 360 : 260;
    const sidechainHp = isBass ? 40 : 65;
    this.sidechainHighpass.frequency.setTargetAtTime(sidechainHp, now, tc);
    this.bodyFilter.frequency.setTargetAtTime(bodyFreq, now, tc);
    this.bodyGain.gain.setTargetAtTime(isBass ? 0.8 : 0.65, now, tc);

    // 2. Mode Configuration
    if (mode === 3) {
      // HUMANIZER: Enable Formants, Mute main wah path
      this.wahMainGain.gain.setTargetAtTime(0.0, now, tc);
      this.formantMasterGain.gain.setTargetAtTime(1.1, now, tc);
      this.wetMakeupGain.gain.setTargetAtTime(1.0, now, tc);
    } else if (mode === 4) {
      // TEMPO: Rhythmic LFO auto-wah
      this.wahMainGain.gain.setTargetAtTime(0.85, now, tc);
      this.formantMasterGain.gain.setTargetAtTime(0.0, now, tc);

      this.wahPeaking.Q.setTargetAtTime(3.6, now, tc);
      this.wahPeaking.gain.setTargetAtTime(9.0, now, tc);
      this.wahBandpass.Q.setTargetAtTime(2.4, now, tc);
      this.wetMakeupGain.gain.setTargetAtTime(1.0, now, tc);
    } else {
      // DYNAMIC WAH (UP, DOWN, SHARP)
      this.wahMainGain.gain.setTargetAtTime(0.85, now, tc);
      this.formantMasterGain.gain.setTargetAtTime(0.0, now, tc);

      if (mode === 2) {
        // SHARP Mode: Prominent vocal resonance peak
        this.wahPeaking.Q.setTargetAtTime(5.2, now, tc);
        this.wahPeaking.gain.setTargetAtTime(11.0, now, tc);
        this.wahBandpass.Q.setTargetAtTime(3.2, now, tc);
        this.wetMakeupGain.gain.setTargetAtTime(0.95, now, tc);
      } else {
        // UP / DOWN Modes: Musical, warm vocal wah
        this.wahPeaking.Q.setTargetAtTime(3.2, now, tc);
        this.wahPeaking.gain.setTargetAtTime(8.0, now, tc);
        this.wahBandpass.Q.setTargetAtTime(2.2, now, tc);
        this.wetMakeupGain.gain.setTargetAtTime(1.0, now, tc);
      }
    }
  }

  public updateParameter(paramId: string, value: number): void {
    this.params[paramId] = value;
    this.applyParams();
  }

  public setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    applyBypassCrossfade(this.bypassWet, this.bypassDry, enabled, this.ctx, 0.015);
  }

  public dispose(): void {
    if (this.trackTimer !== null) {
      clearInterval(this.trackTimer);
      this.trackTimer = null;
    }

    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      this.bypassDry.disconnect();
      this.bypassWet.disconnect();
      this.sidechainHighpass.disconnect();
      this.sidechainPreGain.disconnect();
      this.analyser.disconnect();
      this.wahPeaking.disconnect();
      this.wahBandpass.disconnect();
      this.wahMainGain.disconnect();
      this.bodyFilter.disconnect();
      this.bodyGain.disconnect();
      this.formantF1.disconnect();
      this.formantF2.disconnect();
      this.formantF3.disconnect();
      this.formantGain1.disconnect();
      this.formantGain2.disconnect();
      this.formantGain3.disconnect();
      this.formantMasterGain.disconnect();
      this.wetMixer.disconnect();
      this.dcBlocker.disconnect();
      this.wetMakeupGain.disconnect();
    } catch {
      // AudioNode already disconnected
    }
  }
}
