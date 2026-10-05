import type { AudioDeviceInfo, AudioEngineMetrics, EngineStatus, MeterData } from '../types/audio';
import type { PedalInstance } from '../types/pedal';
import { SignalChain } from './SignalChain';
import { detectPitch, type TunerResult } from '../dsp/tuner/pitchDetector';
import { ensureWorkletsRegistered } from './worklets/workletBundle';

export type StateChangeCallback = (status: EngineStatus, error: string | null) => void;

/**
 * AudioEngine manages Web Audio API lifecycle, input media stream,
 * gain stages, safety limiter, and metering nodes.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  // Audio Nodes
  private inputGainNode: GainNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  
  // Chain hooks: between chainInputNode and chainOutputNode pedals will be connected
  private chainInputNode: GainNode | null = null;
  private chainOutputNode: GainNode | null = null;
  private signalChain: SignalChain | null = null;
  private pedalInstances: PedalInstance[] = [];

  private masterGainNode: GainNode | null = null;
  private safetyLimiter: DynamicsCompressorNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;

  // Pre-allocated arrays for zero-GC metering
  private inputBuffer: Float32Array<ArrayBuffer> | null = null;
  private outputBuffer: Float32Array<ArrayBuffer> | null = null;

  // State
  private status: EngineStatus = 'uninitialized';
  private selectedInputId: string | null = null;
  private inputGainValue = 1.0;
  private masterVolumeValue = 0.8;
  private isMuted = false;
  private errorMessage: string | null = null;

  // Peak hold and clip hold tracking
  private inputPeakHoldDb = -100;
  private outputPeakHoldDb = -100;
  private inputClipHoldUntil = 0;
  private outputClipHoldUntil = 0;
  private lastInputMeterTime = performance.now();
  private lastOutputMeterTime = performance.now();

  private onStateChange: StateChangeCallback | null = null;

  constructor(callback?: StateChangeCallback) {
    if (callback) {
      this.onStateChange = callback;
    }
  }

  public setStateCallback(callback: StateChangeCallback) {
    this.onStateChange = callback;
  }

  private notifyState(newStatus: EngineStatus, error: string | null = null) {
    this.status = newStatus;
    this.errorMessage = error;
    if (this.onStateChange) {
      this.onStateChange(this.status, this.errorMessage);
    }
  }

  /**
   * Enumerate available microphone / audio interface devices
   */
  public async getAudioDevices(): Promise<AudioDeviceInfo[]> {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((d) => d.kind === 'audioinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Audio Input ${index + 1}`,
          groupId: d.groupId,
        }));
    } catch (err) {
      console.error('Failed to enumerate audio devices', err);
      return [];
    }
  }

  /**
   * Initializes and starts the audio engine
   */
  public async start(deviceId?: string): Promise<void> {
    try {
      if (deviceId) {
        this.selectedInputId = deviceId;
      }

      // 1. Create or resume AudioContext
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtxClass({
          latencyHint: 'interactive',
        });
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      // Register real-time AudioWorklets (Noise Gate, Looper)
      try {
        await ensureWorkletsRegistered(this.ctx);
      } catch (workletErr) {
        console.warn('AudioWorklet registration warning:', workletErr);
      }

      // 2. Setup internal nodes graph
      this.setupNodes();

      // 3. Request audio stream
      await this.connectInputStream(this.selectedInputId);

      this.notifyState('running', null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start audio engine';
      console.error('AudioEngine start error:', err);
      this.notifyState('error', msg);
      throw err;
    }
  }

  /**
   * Stops audio processing and releases media stream
   */
  public async stop(): Promise<void> {
    try {
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop());
        this.mediaStream = null;
      }

      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }

      if (this.ctx && this.ctx.state !== 'closed') {
        await this.ctx.suspend();
      }

      if (this.signalChain) {
        this.signalChain.dispose();
      }

      this.notifyState('suspended', null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error stopping audio';
      this.notifyState('error', msg);
    }
  }

  /**
   * Switch input device dynamically
   */
  public async setInputDevice(deviceId: string): Promise<void> {
    this.selectedInputId = deviceId;
    if (this.status === 'running') {
      await this.connectInputStream(deviceId);
    }
  }

  /**
   * Configures node topology
   * Graph:
   * InputSource
   *   ├─> inputGainNode ──> inputAnalyser
   *   └─> chainInputNode (hook for pedals) ──> chainOutputNode
   *         ──> masterGainNode ──> safetyLimiter ──> outputAnalyser ──> destination
   */
  private setupNodes(): void {
    if (!this.ctx) return;

    // Input gain
    this.inputGainNode = this.ctx.createGain();
    this.inputGainNode.gain.setValueAtTime(this.inputGainValue, this.ctx.currentTime);

    // Input Analyser (2048 samples for accurate low E2 guitar pitch detection)
    this.inputAnalyser = this.ctx.createAnalyser();
    this.inputAnalyser.fftSize = 2048;
    this.inputAnalyser.smoothingTimeConstant = 0.3;
    this.inputBuffer = new Float32Array(this.inputAnalyser.fftSize);

    // Passthrough chain nodes (entry & exit points for modular pedals)
    this.chainInputNode = this.ctx.createGain();
    this.chainOutputNode = this.ctx.createGain();

    // Setup modular signal chain
    this.signalChain = new SignalChain(this.ctx, this.chainInputNode, this.chainOutputNode);
    this.signalChain.rebuild(this.pedalInstances);

    // Master Gain
    this.masterGainNode = this.ctx.createGain();
    const effectiveMaster = this.isMuted ? 0 : this.masterVolumeValue;
    this.masterGainNode.gain.setValueAtTime(effectiveMaster, this.ctx.currentTime);

    // Safety Limiter (prevents harsh digital clipping)
    this.safetyLimiter = this.ctx.createDynamicsCompressor();
    this.safetyLimiter.threshold.setValueAtTime(-0.5, this.ctx.currentTime);
    this.safetyLimiter.knee.setValueAtTime(0, this.ctx.currentTime);
    this.safetyLimiter.ratio.setValueAtTime(20, this.ctx.currentTime);
    this.safetyLimiter.attack.setValueAtTime(0.001, this.ctx.currentTime);
    this.safetyLimiter.release.setValueAtTime(0.05, this.ctx.currentTime);

    // Output Analyser
    this.outputAnalyser = this.ctx.createAnalyser();
    this.outputAnalyser.fftSize = 1024;
    this.outputAnalyser.smoothingTimeConstant = 0.3;
    this.outputBuffer = new Float32Array(this.outputAnalyser.fftSize);

    // Connect downstream graph
    this.inputGainNode.connect(this.inputAnalyser);
    this.inputGainNode.connect(this.chainInputNode);

    this.chainOutputNode.connect(this.masterGainNode);
    this.masterGainNode.connect(this.safetyLimiter);
    this.safetyLimiter.connect(this.outputAnalyser);
    this.outputAnalyser.connect(this.ctx.destination);
  }

  /**
   * Acquire media stream with guitar-optimized constraints and resilient fallback
   */
  private async connectInputStream(deviceId: string | null): Promise<void> {
    if (!this.ctx) return;

    // Disconnect previous stream
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    let stream: MediaStream | null = null;

    // 1. Try with user-selected device (using ideal instead of exact to avoid OverconstrainedError)
    if (deviceId && deviceId.trim() !== '') {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: { ideal: deviceId },
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            channelCount: { ideal: 2 },
          },
          video: false,
        });
      } catch (e) {
        console.warn('Could not connect to requested deviceId, attempting default audio device:', e);
      }
    }

    // 2. Fallback to default audio input with studio constraints
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
          video: false,
        });
      } catch (e) {
        console.warn('Studio constraints failed, attempting basic audio stream:', e);
      }
    }

    // 3. Final fallback to raw basic audio input
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
      } catch (err: unknown) {
        const errorName = err instanceof Error ? err.name : '';
        if (errorName === 'NotFoundError' || errorName === 'OverconstrainedError' || String(err).includes('not found')) {
          throw new Error('No active microphone or audio interface detected. Please plug in headphones, a microphone, or an audio interface to begin.');
        } else if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
          throw new Error('Microphone permission was denied. Please click the site settings / lock icon in your browser address bar to allow microphone access.');
        } else {
          throw new Error(err instanceof Error ? err.message : 'Failed to access audio input device.');
        }
      }
    }

    this.mediaStream = stream;
    this.sourceNode = this.ctx.createMediaStreamSource(this.mediaStream);

    if (this.inputGainNode) {
      this.sourceNode.connect(this.inputGainNode);
    }
  }

  /**
   * Control Input Gain (linear 0.0 to 3.0)
   */
  public setInputGain(val: number): void {
    this.inputGainValue = Math.max(0, Math.min(val, 4.0));
    if (this.ctx && this.inputGainNode) {
      this.inputGainNode.gain.setTargetAtTime(this.inputGainValue, this.ctx.currentTime, 0.015);
    }
  }

  /**
   * Control Master Volume (linear 0.0 to 1.5)
   */
  public setMasterVolume(val: number): void {
    this.masterVolumeValue = Math.max(0, Math.min(val, 2.0));
    if (this.ctx && this.masterGainNode && !this.isMuted) {
      this.masterGainNode.gain.setTargetAtTime(this.masterVolumeValue, this.ctx.currentTime, 0.015);
    }
  }

  /**
   * Toggle Mute
   */
  public setMute(muted: boolean): void {
    this.isMuted = muted;
    if (this.ctx && this.masterGainNode) {
      const target = muted ? 0 : this.masterVolumeValue;
      this.masterGainNode.gain.setTargetAtTime(target, this.ctx.currentTime, 0.015);
    }
  }

  /**
   * Get Hook Nodes for inserting guitar effect chain
   */
  public getChainHooks(): { input: GainNode | null; output: GainNode | null } {
    return {
      input: this.chainInputNode,
      output: this.chainOutputNode,
    };
  }

  /**
   * Set or update pedal instances in the signal chain
   */
  public setPedalInstances(instances: PedalInstance[]): void {
    this.pedalInstances = instances;
    if (this.signalChain) {
      this.signalChain.rebuild(this.pedalInstances);
    }
  }

  /**
   * Update a specific parameter on an active pedal
   */
  public updatePedalParameter(pedalId: string, paramId: string, value: number): void {
    const inst = this.pedalInstances.find((p) => p.id === pedalId);
    if (inst) {
      inst.parameters[paramId] = value;
    }
    if (this.signalChain) {
      this.signalChain.updateParameter(pedalId, paramId, value);
    }
  }

  /**
   * Toggle bypass / enabled state for a pedal
   */
  public setPedalEnabled(pedalId: string, enabled: boolean): void {
    const inst = this.pedalInstances.find((p) => p.id === pedalId);
    if (inst) {
      inst.enabled = enabled;
    }
    if (this.signalChain) {
      this.signalChain.setEnabled(pedalId, enabled);
    }
  }

  /**
   * Get current AudioContext metrics
   */
  public getMetrics(): AudioEngineMetrics {
    if (!this.ctx) {
      return {
        sampleRate: 0,
        baseLatency: 0,
        outputLatency: 0,
        totalLatencyMs: 0,
        currentTime: 0,
      };
    }

    const baseLat = this.ctx.baseLatency || 0;
    const outLat = (this.ctx as AudioContext & { outputLatency?: number }).outputLatency || 0;
    const totalMs = (baseLat + outLat) * 1000;

    return {
      sampleRate: this.ctx.sampleRate,
      baseLatency: baseLat,
      outputLatency: outLat,
      totalLatencyMs: totalMs > 0 ? totalMs : (256 / this.ctx.sampleRate) * 1000 * 2, // fallback approximation
      currentTime: this.ctx.currentTime,
    };
  }

  /**
   * Zero-allocation meter calculation for peak and RMS in dB
   */
  public getMeterData(type: 'input' | 'output'): MeterData {
    const analyser = type === 'input' ? this.inputAnalyser : this.outputAnalyser;
    const buffer = type === 'input' ? this.inputBuffer : this.outputBuffer;

    if (!analyser || !buffer || this.status !== 'running') {
      return {
        rms: 0,
        peak: 0,
        rmsDb: -100,
        peakDb: -100,
        peakHoldDb: -100,
        isClipping: false,
        clipHold: false,
      };
    }

    analyser.getFloatTimeDomainData(buffer);

    let sumSquares = 0;
    let peak = 0;

    for (let i = 0; i < buffer.length; i++) {
      const sample = Math.abs(buffer[i]);
      if (sample > peak) {
        peak = sample;
      }
      sumSquares += sample * sample;
    }

    const rms = Math.sqrt(sumSquares / buffer.length);
    const rawPeakDb = peak > 0.00001 ? 20 * Math.log10(peak) : -100;
    const rawRmsDb = rms > 0.00001 ? 20 * Math.log10(rms) : -100;

    const peakDb = Math.max(-100, rawPeakDb);
    const rmsDb = Math.max(-100, rawRmsDb);
    const isClipping = peak >= 0.99;

    const now = performance.now();
    const isInput = type === 'input';
    const lastTime = isInput ? this.lastInputMeterTime : this.lastOutputMeterTime;
    const dt = Math.min(0.2, (now - lastTime) / 1000);
    if (isInput) {
      this.lastInputMeterTime = now;
    } else {
      this.lastOutputMeterTime = now;
    }

    // Decay peak hold at 25 dB per second
    let currentPeakHold = isInput ? this.inputPeakHoldDb : this.outputPeakHoldDb;
    currentPeakHold = Math.max(-100, currentPeakHold - 25 * dt);

    if (peakDb > currentPeakHold) {
      currentPeakHold = peakDb;
    }

    if (isInput) {
      this.inputPeakHoldDb = currentPeakHold;
      if (isClipping) this.inputClipHoldUntil = now + 1200;
    } else {
      this.outputPeakHoldDb = currentPeakHold;
      if (isClipping) this.outputClipHoldUntil = now + 1200;
    }

    const clipHoldUntil = isInput ? this.inputClipHoldUntil : this.outputClipHoldUntil;

    return {
      rms,
      peak,
      rmsDb,
      peakDb,
      peakHoldDb: currentPeakHold,
      isClipping,
      clipHold: now < clipHoldUntil,
    };
  }

  public getStatus(): EngineStatus {
    return this.status;
  }

  public detectTunerPitch(): TunerResult | null {
    if (!this.inputAnalyser || !this.inputBuffer || !this.ctx || this.status !== 'running') {
      return null;
    }
    this.inputAnalyser.getFloatTimeDomainData(this.inputBuffer);
    return detectPitch(this.inputBuffer, this.ctx.sampleRate);
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }
}
