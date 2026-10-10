import type { AudioPedalNode } from '../../../types/pedal';
import { levelToGain, applyBypassCrossfade, createDcBlocker, driveDependentTrimDb } from '../dspUtils';

/**
 * Output trim calibration:
 *   - TRIM_UNITY_DB: Output trim at moderate DRIVE (~unity loudness at noon)
 *   - TRIM_SAT_DB: Output trim when DRIVE is maxed, maintaining punchy perceived loudness.
 */
const TRIM_UNITY_DB = 0.5;
const TRIM_SAT_DB = -7.5;

/**
 * Real-time Dynamic Noise Gate Engine for the Ibanez SM7 VOID circuit.
 * Uses thread-isolated AudioWorklet ('noise-gate-processor') when available,
 * backed by an intelligent dynamic downward expander/gate fallback.
 * 
 * Modes:
 *   - 0 (OFF): 100% True Bypass around gate. Full raw high-gain background hiss & infinite decay.
 *   - 1 (VOID 1): Soft noise gate (-48 dB threshold, 80 ms release). Kills idle hiss while keeping smooth decay.
 *   - 2 (VOID 2): Hard aggressive gate (-28 dB threshold, 12 ms release). Instant staccato clamp for tight chugs.
 */
class VoidGateCore {
  private ctx: AudioContext;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private dryGain: GainNode;
  private wetGain: GainNode;

  private workletNode: AudioWorkletNode | null = null;
  private fallbackInGain: GainNode;
  private fallbackShaper: WaveShaperNode;
  private fallbackOutGain: GainNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();

    // 1. Dry bypass path (when VOID is OFF)
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // 2. Fallback static gate path
    this.fallbackInGain = ctx.createGain();
    this.fallbackShaper = ctx.createWaveShaper();
    this.fallbackShaper.curve = this.createGateCurve(4096) as Float32Array<ArrayBuffer>;
    this.fallbackShaper.oversample = 'none';
    this.fallbackOutGain = ctx.createGain();

    this.fallbackInGain.connect(this.fallbackShaper);
    this.fallbackShaper.connect(this.fallbackOutGain);
    this.fallbackOutGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);

    // Try AudioWorklet initialization
    const workletReady = this.tryInitWorklet();
    if (!workletReady) {
      this.inputNode.connect(this.fallbackInGain);
    }
  }

  private tryInitWorklet(): boolean {
    if (this.workletNode) return true;
    try {
      this.workletNode = new AudioWorkletNode(this.ctx, 'noise-gate-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        channelCount: 1,
        channelCountMode: 'explicit',
        parameterData: {
          threshold: -48,
          release: 0.08,
          hold: 0.03,
        },
      });

      // Disconnect fallback from input and route through worklet
      try {
        this.inputNode.disconnect(this.fallbackInGain);
      } catch {
        // ignore
      }
      this.inputNode.connect(this.workletNode);
      this.workletNode.connect(this.wetGain);
      return true;
    } catch {
      return false;
    }
  }

  private createGateCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    const deadband = 0.055;
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      const absX = Math.abs(x);
      if (absX <= deadband) {
        curve[i] = 0;
      } else {
        const sign = x < 0 ? -1 : 1;
        const norm = (absX - deadband) / (1 - deadband);
        curve[i] = sign * Math.pow(norm, 1.45);
      }
    }
    return curve;
  }

  public setMode(mode: number): void {
    const now = this.ctx.currentTime;
    this.tryInitWorklet();

    if (mode === 0) {
      // 0 = OFF: 100% True Bypass! Raw signal passes untouched with full natural hiss and sustain
      this.dryGain.gain.setTargetAtTime(1.0, now, 0.015);
      this.wetGain.gain.setTargetAtTime(0.0, now, 0.015);
    } else if (mode === 1) {
      // 1 = VOID 1: Soft gate (Threshold -48 dB, smooth 80ms decay)
      this.dryGain.gain.setTargetAtTime(0.0, now, 0.015);
      this.wetGain.gain.setTargetAtTime(1.0, now, 0.015);

      if (this.workletNode) {
        this.workletNode.parameters.get('threshold')?.setTargetAtTime(-48, now, 0.015);
        this.workletNode.parameters.get('release')?.setTargetAtTime(0.08, now, 0.015);
        this.workletNode.parameters.get('hold')?.setTargetAtTime(0.03, now, 0.015);
      } else {
        // Fallback: moderate deadband attenuation
        this.fallbackInGain.gain.setTargetAtTime(0.7, now, 0.015);
        this.fallbackOutGain.gain.setTargetAtTime(1.0, now, 0.015);
      }
    } else {
      // 2 = VOID 2: Hard aggressive gate (Threshold -28 dB, ultra-fast 12ms clamp for tight chugs)
      this.dryGain.gain.setTargetAtTime(0.0, now, 0.015);
      this.wetGain.gain.setTargetAtTime(1.0, now, 0.015);

      if (this.workletNode) {
        this.workletNode.parameters.get('threshold')?.setTargetAtTime(-28, now, 0.015);
        this.workletNode.parameters.get('release')?.setTargetAtTime(0.012, now, 0.015);
        this.workletNode.parameters.get('hold')?.setTargetAtTime(0.005, now, 0.015);
      } else {
        // Fallback: aggressive threshold clamp
        this.fallbackInGain.gain.setTargetAtTime(0.22, now, 0.015);
        this.fallbackOutGain.gain.setTargetAtTime(1.0, now, 0.015);
      }
    }
  }

  public dispose(): void {
    try {
      this.inputNode.disconnect();
      this.dryGain.disconnect();
      this.wetGain.disconnect();
      if (this.workletNode) this.workletNode.disconnect();
      this.fallbackInGain.disconnect();
      this.fallbackShaper.disconnect();
      this.fallbackOutGain.disconnect();
      this.outputNode.disconnect();
    } catch {
      // ignore
    }
  }
}

/**
 * Ibanez SM7 Smash Box (Tone-Lok Series, 2000)
 * 
 * Authentic analog circuit model of the nu-metal distortion icon:
 * 
 * 1. Input Buffering & Pre-Gain Shaping:
 *    - 85 Hz 2nd-order high-pass filter ensuring tight, punchy low-end chugs for drop-tuned
 *      7-string and detuned guitars without mud or flub.
 *    - Mid pre-emphasis bump at 1.4 kHz pushing harmonics hard into saturation.
 * 
 * 2. Cascaded High-Gain Distortion Engine:
 *    - Dual op-amp overdrive with asymmetrical silicon diode clipping.
 *    - 4x oversampling prevents digital aliasing on extreme high-gain settings.
 *    - Post-distortion analog smoothing filter at 5.2 kHz.
 * 
 * 3. EDGE Voicing Filter Switch:
 *    - SHARP (0): High shelf boost at 3.6 kHz (+5.0 dB) for searing harmonic bite and attack.
 *    - SMOOTH (1): High shelf cut at 3.2 kHz (-7.5 dB) for dark, warm, wall-of-sound scooped tone.
 * 
 * 4. Active 2-Band Gyrator EQ:
 *    - LO: Peaking active gyrator filter centered at 95 Hz (±14 dB boost/cut, Q = 1.2).
 *    - HI: Peaking active filter centered at 3.8 kHz (±14 dB boost/cut, Q = 1.3).
 * 
 * 5. VOID Dynamic Noise Gate Circuit:
 *    - OFF (0): Gate 100% bypassed, full open decay & raw high-gain hiss.
 *    - VOID 1 (1): Soft noise gate, cuts idle hiss, smooth note fadeout.
 *    - VOID 2 (2): Hard clamp noise gate, ultra-fast 12ms release for razor-sharp staccato chugging.
 * 
 * 6. Master LEVEL & Clean Click-Free Crossfade Bypass.
 */
export class IbanezSm7Node implements AudioPedalNode {
  public id: string;
  public inputNode: GainNode;
  public outputNode: GainNode;

  private ctx: AudioContext;

  // 1. Input Conditioning & Pre-Emphasis
  private inputHighpass: BiquadFilterNode;
  private inputPreEmphasis: BiquadFilterNode;

  // 2. High-Gain Drive Stage & Asymmetrical Clipper
  private driveGain: GainNode;
  private clipper: WaveShaperNode;
  private dcBlocker: BiquadFilterNode;
  private postDistSmoothing: BiquadFilterNode;

  // 3. EDGE Voicing Switch Filter
  private edgeFilter: BiquadFilterNode;

  // 4. Active 2-Band Gyrator EQ
  private eqLow: BiquadFilterNode;
  private eqHigh: BiquadFilterNode;

  // 5. VOID Dynamic Noise Gate Stage
  private voidGate: VoidGateCore;

  // 6. Post-Recovery Filter & Level
  private postRecoveryFilter: BiquadFilterNode;
  private levelGain: GainNode;

  // Crossfade bypass
  private wetGain: GainNode;
  private dryGain: GainNode;
  private isEnabled = true;

  // Parameters
  private driveVal = 6;
  private loVal = 5;
  private hiVal = 5;
  private levelVal = 5;
  private voidVal = 1; // 0 = OFF, 1 = VOID 1, 2 = VOID 2
  private edgeVal = 0; // 0 = SHARP, 1 = SMOOTH

  constructor(ctx: AudioContext, id: string, initialParams?: Record<string, number>, enabled = true) {
    this.ctx = ctx;
    this.id = id;
    this.isEnabled = enabled;

    if (initialParams?.drive !== undefined) this.driveVal = initialParams.drive;
    if (initialParams?.lo !== undefined) this.loVal = initialParams.lo;
    if (initialParams?.hi !== undefined) this.hiVal = initialParams.hi;
    if (initialParams?.level !== undefined) this.levelVal = initialParams.level;
    if (initialParams?.void !== undefined) this.voidVal = initialParams.void;
    if (initialParams?.edge !== undefined) this.edgeVal = initialParams.edge;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // Crossfade wet/dry gains
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(this.isEnabled ? 1.0 : 0.0, ctx.currentTime);
    this.dryGain.gain.setValueAtTime(this.isEnabled ? 0.0 : 1.0, ctx.currentTime);

    // Dry path
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // 1. Input High-Pass & Pre-Emphasis
    this.inputHighpass = ctx.createBiquadFilter();
    this.inputHighpass.type = 'highpass';
    this.inputHighpass.frequency.setValueAtTime(85, ctx.currentTime);
    this.inputHighpass.Q.setValueAtTime(0.707, ctx.currentTime);

    this.inputPreEmphasis = ctx.createBiquadFilter();
    this.inputPreEmphasis.type = 'peaking';
    this.inputPreEmphasis.frequency.setValueAtTime(1400, ctx.currentTime);
    this.inputPreEmphasis.Q.setValueAtTime(1.0, ctx.currentTime);
    this.inputPreEmphasis.gain.setValueAtTime(4.5, ctx.currentTime);

    // 2. High-Gain Drive & Clipper
    this.driveGain = ctx.createGain();

    this.clipper = ctx.createWaveShaper();
    this.clipper.curve = this.createSmashClippingCurve(4096) as Float32Array<ArrayBuffer>;
    this.clipper.oversample = '4x';

    this.dcBlocker = createDcBlocker(ctx, 15);

    this.postDistSmoothing = ctx.createBiquadFilter();
    this.postDistSmoothing.type = 'lowpass';
    this.postDistSmoothing.frequency.setValueAtTime(5200, ctx.currentTime);
    this.postDistSmoothing.Q.setValueAtTime(0.707, ctx.currentTime);

    // 3. EDGE Voicing Filter (High Shelf for dramatic voicing contrast)
    this.edgeFilter = ctx.createBiquadFilter();
    this.edgeFilter.type = 'highshelf';
    this.edgeFilter.frequency.setValueAtTime(3400, ctx.currentTime);

    // 4. Active 2-Band Gyrator EQ
    this.eqLow = ctx.createBiquadFilter();
    this.eqLow.type = 'peaking';
    this.eqLow.frequency.setValueAtTime(95, ctx.currentTime);
    this.eqLow.Q.setValueAtTime(1.2, ctx.currentTime);

    this.eqHigh = ctx.createBiquadFilter();
    this.eqHigh.type = 'peaking';
    this.eqHigh.frequency.setValueAtTime(3800, ctx.currentTime);
    this.eqHigh.Q.setValueAtTime(1.3, ctx.currentTime);

    // 5. VOID Dynamic Noise Gate Engine
    this.voidGate = new VoidGateCore(ctx);

    // 6. Post-Recovery Filter & Level
    this.postRecoveryFilter = ctx.createBiquadFilter();
    this.postRecoveryFilter.type = 'lowpass';
    this.postRecoveryFilter.frequency.setValueAtTime(6200, ctx.currentTime);
    this.postRecoveryFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    this.levelGain = ctx.createGain();

    // Signal Routing:
    // inputNode -> inputHighpass -> inputPreEmphasis -> driveGain -> clipper -> dcBlocker
    // -> postDistSmoothing -> edgeFilter -> eqLow -> eqHigh -> voidGate -> postRecoveryFilter
    // -> levelGain -> wetGain -> outputNode
    this.inputNode.connect(this.inputHighpass);
    this.inputHighpass.connect(this.inputPreEmphasis);
    this.inputPreEmphasis.connect(this.driveGain);
    this.driveGain.connect(this.clipper);
    this.clipper.connect(this.dcBlocker);
    this.dcBlocker.connect(this.postDistSmoothing);
    this.postDistSmoothing.connect(this.edgeFilter);
    this.edgeFilter.connect(this.eqLow);
    this.eqLow.connect(this.eqHigh);
    this.eqHigh.connect(this.voidGate.inputNode);
    this.voidGate.outputNode.connect(this.postRecoveryFilter);
    this.postRecoveryFilter.connect(this.levelGain);
    this.levelGain.connect(this.wetGain);
    this.wetGain.connect(this.outputNode);

    // Apply initial parameter state
    this.updateDrive();
    this.updateEq();
    this.updateEdge();
    this.updateVoid();
    this.updateLevel();
  }

  /**
   * Asymmetrical silicon hard clipper transfer curve:
   * Generates aggressive odd & even harmonics for massive modern nu-metal crunch.
   */
  private createSmashClippingCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    const mid = (samples - 1) / 2;

    for (let i = 0; i < samples; i++) {
      const x = (i - mid) / mid; // -1 to +1

      if (x >= 0) {
        // Positive half: tight hard saturation
        curve[i] = Math.tanh(x * 4.8) * 0.82;
      } else {
        // Negative half: asymmetrical knee with earlier soft saturation
        const absX = Math.abs(x);
        curve[i] = -Math.tanh(absX * 3.9) * 0.78;
      }
    }

    return curve;
  }

  private updateDrive(): void {
    const t = Math.max(0, Math.min(10, this.driveVal)) / 10;
    // Logarithmic drive range: 8x to 180x gain
    const driveLin = 8.0 * Math.pow(22.5, t);
    this.driveGain.gain.setTargetAtTime(driveLin, this.ctx.currentTime, 0.015);
    this.updateLevel();
  }

  private updateEq(): void {
    const now = this.ctx.currentTime;

    // LO: -14 dB to +14 dB (noon = 0 dB)
    const tLo = Math.max(0, Math.min(10, this.loVal)) / 10;
    const loDb = -14 + tLo * 28;
    this.eqLow.gain.setTargetAtTime(loDb, now, 0.015);

    // HI: -14 dB to +14 dB (noon = 0 dB)
    const tHi = Math.max(0, Math.min(10, this.hiVal)) / 10;
    const hiDb = -14 + tHi * 28;
    this.eqHigh.gain.setTargetAtTime(hiDb, now, 0.015);
  }

  private updateEdge(): void {
    const now = this.ctx.currentTime;
    if (this.edgeVal === 0) {
      // SHARP: aggressive bite (+5.0 dB shelf at 3.4 kHz)
      this.edgeFilter.gain.setTargetAtTime(5.0, now, 0.015);
    } else {
      // SMOOTH: high cut (-7.5 dB shelf at 3.4 kHz)
      this.edgeFilter.gain.setTargetAtTime(-7.5, now, 0.015);
    }
  }

  private updateVoid(): void {
    this.voidGate.setMode(this.voidVal);
  }

  private updateLevel(): void {
    const t = Math.max(0, Math.min(10, this.driveVal)) / 10;
    const driveGainEstimate = 8.0 * Math.pow(22.5, t);
    const trimDb = driveDependentTrimDb(driveGainEstimate, TRIM_UNITY_DB, TRIM_SAT_DB);
    const gain = levelToGain(this.levelVal, trimDb);
    this.levelGain.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.015);
  }

  public updateParameter(paramId: string, value: number): void {
    switch (paramId) {
      case 'drive':
        this.driveVal = value;
        this.updateDrive();
        break;
      case 'lo':
        this.loVal = value;
        this.updateEq();
        break;
      case 'hi':
        this.hiVal = value;
        this.updateEq();
        break;
      case 'level':
        this.levelVal = value;
        this.updateLevel();
        break;
      case 'void':
        this.voidVal = Math.round(value);
        this.updateVoid();
        break;
      case 'edge':
        this.edgeVal = Math.round(value);
        this.updateEdge();
        break;
    }
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    applyBypassCrossfade(this.wetGain, this.dryGain, enabled, this.ctx);
  }

  public dispose(): void {
    try {
      this.inputNode.disconnect();
      this.dryGain.disconnect();
      this.wetGain.disconnect();
      this.inputHighpass.disconnect();
      this.inputPreEmphasis.disconnect();
      this.driveGain.disconnect();
      this.clipper.disconnect();
      this.dcBlocker.disconnect();
      this.postDistSmoothing.disconnect();
      this.edgeFilter.disconnect();
      this.eqLow.disconnect();
      this.eqHigh.disconnect();
      this.voidGate.dispose();
      this.postRecoveryFilter.disconnect();
      this.levelGain.disconnect();
      this.outputNode.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
}
