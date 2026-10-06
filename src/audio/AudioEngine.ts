import type { AudioDeviceInfo, AudioEngineMetrics, EngineStatus, InputChannelMode, MeterData } from '../types/audio';
import { DEFAULT_NOISE_GATE_ENABLED, DEFAULT_NOISE_GATE_THRESHOLD_DB } from '../types/audio';
import { createDcBlocker } from './pedals/dspUtils';
import type { PedalInstance } from '../types/pedal';
import { SignalChain } from './SignalChain';
import { AmpHeadNode } from './amp/AmpHeadNode';
import type { AmpHeadSettings } from '../types/amp';
import { CabinetNode } from './cabinet/CabinetNode';
import type { CabinetSettings } from '../types/cabinet';
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

  // Input conditioning: mono fold-down -> 30 Hz rumble/DC high-pass -> input gain -> noise gate
  private inputSumNode: GainNode | null = null;
  private inputSplitter: ChannelSplitterNode | null = null;
  private inputLeftGain: GainNode | null = null;
  private inputRightGain: GainNode | null = null;
  private inputMonoBus: GainNode | null = null;
  private inputHighpass: BiquadFilterNode | null = null;
  private inputChannelMode: InputChannelMode = 'sum';

  // Noise gate (AudioWorklet) with clean crossfade bypass
  private noiseGateNode: AudioWorkletNode | null = null;
  private gateOnGain: GainNode | null = null;
  private gateBypassGain: GainNode | null = null;
  private gateOutGain: GainNode | null = null;
  private noiseGateEnabled = DEFAULT_NOISE_GATE_ENABLED;
  private noiseGateThresholdDb = DEFAULT_NOISE_GATE_THRESHOLD_DB;

  // Safety DC blocker at the end of the pedal chain (before cabinet)
  private chainDcBlocker: BiquadFilterNode | null = null;
  
  // Chain hooks: between chainInputNode and chainOutputNode pedals will be connected
  private chainInputNode: GainNode | null = null;
  private chainOutputNode: GainNode | null = null;
  private signalChain: SignalChain | null = null;
  private pedalInstances: PedalInstance[] = [];

  // Dedicated Guitar Amp Head Simulator (positioned between pedals and cabinet)
  private ampHeadNode: AmpHeadNode | null = null;
  private ampHeadSettings: AmpHeadSettings = {
    enabled: true,
    model: 'clean-tweed',
    gain: 5.0,
    bass: 5.0,
    mid: 5.0,
    treble: 5.0,
    presence: 5.0,
    master: 6.0,
  };

  // Dedicated Cabinet IR Convolver at the end of the chain
  private cabinetNode: CabinetNode | null = null;
  private cabinetSettings: CabinetSettings = {
    enabled: true,
    model: '4x12-closed',
    mic: 'sm57',
    position: 0.5,
    mix: 0.5,
    level: 0,
  };

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
        .filter((d) => d.kind === 'audioinput' && d.deviceId !== 'communications')
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
   * Prompts the user for microphone access if needed and returns the full device list with hardware labels
   */
  public async requestDeviceAccess(): Promise<AudioDeviceInfo[]> {
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach((track) => track.stop());
      }
    } catch (err) {
      console.warn('Microphone permission request dismissed or failed:', err);
    }
    return this.getAudioDevices();
  }

  public getSelectedInputId(): string | null {
    return this.selectedInputId;
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

      if (this.ampHeadNode) {
        this.ampHeadNode.dispose();
        this.ampHeadNode = null;
      }

      if (this.cabinetNode) {
        this.cabinetNode.dispose();
        this.cabinetNode = null;
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

    // Input gain (mono)
    this.inputGainNode = this.ctx.createGain();
    this.inputGainNode.channelCount = 1;
    this.inputGainNode.channelCountMode = 'explicit';
    this.inputGainNode.gain.setValueAtTime(this.inputGainValue, this.ctx.currentTime);

    // Mono fold-down: whichever channel the guitar is plugged into ends up as one clean mono signal
    this.inputSumNode = this.ctx.createGain();
    this.inputSumNode.channelCount = 1;
    this.inputSumNode.channelCountMode = 'explicit';
    this.inputSumNode.channelInterpretation = 'speakers';
    this.inputSplitter = this.ctx.createChannelSplitter(2);
    this.inputLeftGain = this.ctx.createGain();
    this.inputRightGain = this.ctx.createGain();
    this.inputMonoBus = this.ctx.createGain();
    this.inputMonoBus.channelCount = 1;
    this.inputMonoBus.channelCountMode = 'explicit';
    this.inputSumNode.connect(this.inputMonoBus);
    this.inputSplitter.connect(this.inputLeftGain, 0);
    this.inputSplitter.connect(this.inputRightGain, 1);
    this.inputLeftGain.connect(this.inputMonoBus);
    this.inputRightGain.connect(this.inputMonoBus);
    this.applyInputChannelMode();

    // 30 Hz Butterworth high-pass: removes interface DC offset, mains rumble and handling thumps
    this.inputHighpass = this.ctx.createBiquadFilter();
    this.inputHighpass.type = 'highpass';
    this.inputHighpass.frequency.setValueAtTime(30, this.ctx.currentTime);
    this.inputHighpass.Q.setValueAtTime(0.707, this.ctx.currentTime);
    this.inputMonoBus.connect(this.inputHighpass);
    this.inputHighpass.connect(this.inputGainNode);

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

    // Noise gate stage (post input gain, pre pedals) with click-free crossfade bypass
    this.gateOutGain = this.ctx.createGain();
    this.gateBypassGain = this.ctx.createGain();
    this.gateOnGain = this.ctx.createGain();
    this.inputGainNode.connect(this.gateBypassGain);
    this.gateBypassGain.connect(this.gateOutGain);
    try {
      this.noiseGateNode = new AudioWorkletNode(this.ctx, 'noise-gate-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        channelCount: 1,
        channelCountMode: 'explicit',
        parameterData: {
          threshold: this.noiseGateThresholdDb,
          release: 0.12,
          hold: 0.04,
        },
      });
      this.inputGainNode.connect(this.noiseGateNode);
      this.noiseGateNode.connect(this.gateOnGain);
      this.gateOnGain.connect(this.gateOutGain);
    } catch (gateErr) {
      console.warn('Noise gate unavailable, running without it:', gateErr);
      this.noiseGateNode = null;
    }
    this.applyNoiseGateState(true);
    this.gateOutGain.connect(this.chainInputNode);

    // Guitar Amp Head & Cabinet Simulator positioned at the end of the pedal chain
    // (safety DC blocker first so asymmetric clipping offsets never reach the amp/cabinet models)
    this.chainDcBlocker = createDcBlocker(this.ctx, 15);
    this.ampHeadNode = new AmpHeadNode(this.ctx, this.ampHeadSettings);
    this.cabinetNode = new CabinetNode(this.ctx, this.cabinetSettings);

    this.chainOutputNode.connect(this.chainDcBlocker);
    this.chainDcBlocker.connect(this.ampHeadNode.inputNode);
    this.ampHeadNode.outputNode.connect(this.cabinetNode.inputNode);
    this.cabinetNode.outputNode.connect(this.masterGainNode);

    this.masterGainNode.connect(this.safetyLimiter);
    this.safetyLimiter.connect(this.outputAnalyser);
    this.outputAnalyser.connect(this.ctx.destination);
  }

  /**
   * Acquire media stream with guitar-optimized constraints and resilient fallback.
   * Uses { exact: deviceId } when a specific hardware device is selected so the browser
   * directly binds to the chosen physical/virtual audio input (e.g. VB-Cable, Audio Interface)
   * without falling back to the browser's default microphone.
   */
  private async connectInputStream(deviceId: string | null): Promise<void> {
    if (!this.ctx) return;

    let stream: MediaStream | null = null;
    const targetId = deviceId && deviceId.trim() !== '' ? deviceId.trim() : null;

    // 1. Try with user-selected device
    if (targetId && targetId !== 'default') {
      // Attempt 1A: Exact hardware device with studio guitar constraints (unprocessed stereo)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: { exact: targetId },
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            channelCount: { ideal: 2 },
          },
          video: false,
        });
      } catch (err1) {
        console.warn(`[AudioEngine] Exact deviceId with stereo constraints failed for "${targetId}", trying without channelCount:`, err1);
        // Attempt 1B: Exact hardware device with studio constraints (no channelCount restriction)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: { exact: targetId },
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
            video: false,
          });
        } catch (err2) {
          console.warn(`[AudioEngine] Exact deviceId with studio constraints failed, trying exact with raw audio:`, err2);
          // Attempt 1C: Exact hardware device with minimal constraints
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                deviceId: { exact: targetId },
              },
              video: false,
            });
          } catch (err3) {
            console.warn(`[AudioEngine] Exact deviceId failed completely (${err3}), falling back to ideal preference:`, err3);
            // Attempt 1D: Soft ideal constraint fallback
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                  deviceId: { ideal: targetId },
                  echoCancellation: false,
                  noiseSuppression: false,
                  autoGainControl: false,
                },
                video: false,
              });
            } catch (err4) {
              console.warn(`[AudioEngine] Ideal constraint also failed:`, err4);
            }
          }
        }
      }
    }

    // 2. Fallback to default audio input with studio constraints (when targetId is null or 'default')
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            channelCount: { ideal: 2 },
          },
          video: false,
        });
      } catch (e) {
        console.warn('[AudioEngine] Default device with studio constraints failed, attempting basic stream:', e);
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
          throw new Error('Perangkat input audio tidak ditemukan. Pastikan soundcard, microphone, atau Virtual Cable terhubung.');
        } else if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
          throw new Error('Izin mikrofon ditolak oleh browser. Klik ikon gembok di address bar browser untuk mengizinkan akses audio.');
        } else {
          throw new Error(err instanceof Error ? err.message : 'Gagal mengakses perangkat input audio.');
        }
      }
    }

    // 4. Safely detach and release previous stream now that new stream is verified
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // ignore
      }
      this.sourceNode = null;
    }
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
      this.mediaStream = null;
    }

    // 5. Connect new media stream to input graph
    this.mediaStream = stream;
    this.sourceNode = this.ctx.createMediaStreamSource(this.mediaStream);

    if (this.inputSumNode && this.inputSplitter) {
      this.sourceNode.connect(this.inputSumNode);
      this.sourceNode.connect(this.inputSplitter);
    }

    // 6. Record active device info
    const activeTrack = stream.getAudioTracks()[0];
    const reportedDeviceId = activeTrack?.getSettings?.().deviceId;
    if (reportedDeviceId) {
      this.selectedInputId = reportedDeviceId;
    } else if (targetId) {
      this.selectedInputId = targetId;
    }
    console.log(`[AudioEngine] Connected to audio input: "${activeTrack?.label || 'Unnamed device'}" (id: ${this.selectedInputId})`);
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
   * Select how the audio-interface input is folded to mono (L+R, Input 1 only, Input 2 only)
   */
  public setInputChannelMode(mode: InputChannelMode): void {
    this.inputChannelMode = mode;
    this.applyInputChannelMode();
  }

  private applyInputChannelMode(): void {
    if (!this.ctx || !this.inputSumNode || !this.inputLeftGain || !this.inputRightGain) return;
    const now = this.ctx.currentTime;
    const mode = this.inputChannelMode;
    this.inputSumNode.gain.setTargetAtTime(mode === 'sum' ? 1 : 0, now, 0.01);
    this.inputLeftGain.gain.setTargetAtTime(mode === 'left' ? 1 : 0, now, 0.01);
    this.inputRightGain.gain.setTargetAtTime(mode === 'right' ? 1 : 0, now, 0.01);
  }

  /**
   * Noise gate: enable/disable and threshold in dB (-80 .. -30)
   */
  public setNoiseGate(enabled: boolean, thresholdDb: number): void {
    this.noiseGateEnabled = enabled;
    this.noiseGateThresholdDb = Math.max(-90, Math.min(-10, thresholdDb));
    this.applyNoiseGateState(false);
  }

  private applyNoiseGateState(immediate: boolean): void {
    if (!this.ctx || !this.gateOnGain || !this.gateBypassGain) return;
    const now = this.ctx.currentTime;
    const useGate = this.noiseGateEnabled && this.noiseGateNode !== null;
    const onTarget = useGate ? 1 : 0;
    const bypassTarget = useGate ? 0 : 1;
    if (immediate) {
      this.gateOnGain.gain.setValueAtTime(onTarget, now);
      this.gateBypassGain.gain.setValueAtTime(bypassTarget, now);
    } else {
      this.gateOnGain.gain.setTargetAtTime(onTarget, now, 0.02);
      this.gateBypassGain.gain.setTargetAtTime(bypassTarget, now, 0.02);
    }
    const thresholdParam = this.noiseGateNode?.parameters.get('threshold');
    if (thresholdParam) {
      thresholdParam.setTargetAtTime(this.noiseGateThresholdDb, now, 0.02);
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
    this.pedalInstances = this.pedalInstances.map((p) =>
      p.id === pedalId ? { ...p, parameters: { ...p.parameters, [paramId]: value } } : p
    );
    if (this.signalChain) {
      this.signalChain.updateParameter(pedalId, paramId, value);
    }
  }

  /**
   * Toggle bypass / enabled state for a pedal
   */
  public setPedalEnabled(pedalId: string, enabled: boolean): void {
    this.pedalInstances = this.pedalInstances.map((p) =>
      p.id === pedalId ? { ...p, enabled } : p
    );
    if (this.signalChain) {
      this.signalChain.setEnabled(pedalId, enabled);
    }
  }

  /**
   * Guitar Amp Head Simulator Configuration & Real-Time Parameter Updates
   */
  public updateAmpHeadSettings(settings: Partial<AmpHeadSettings>): void {
    this.ampHeadSettings = { ...this.ampHeadSettings, ...settings };
    this.ampHeadNode?.updateSettings(settings);
  }

  public getAmpHeadSettings(): AmpHeadSettings {
    return this.ampHeadNode ? this.ampHeadNode.getSettings() : this.ampHeadSettings;
  }

  /**
   * Cabinet Simulator Configuration & Real-Time Parameter Updates
   */
  public updateCabinetSettings(settings: Partial<CabinetSettings>): void {
    this.cabinetSettings = { ...this.cabinetSettings, ...settings };
    this.cabinetNode?.updateSettings(settings);
  }

  public setCabinetCustomIR(buffer: AudioBuffer, name: string): void {
    this.cabinetSettings = {
      ...this.cabinetSettings,
      model: 'custom',
      customIrName: name,
    };
    this.cabinetNode?.setCustomIR(buffer, name);
  }

  public getCabinetSettings(): CabinetSettings {
    return this.cabinetNode ? this.cabinetNode.getSettings() : this.cabinetSettings;
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
