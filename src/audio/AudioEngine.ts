import type { AudioDeviceInfo, AudioEngineMetrics, EngineStatus, InputChannelMode, MeterData } from '../types/audio';
import { createDcBlocker } from './pedals/dspUtils';
import type { PedalInstance } from '../types/pedal';
import { SignalChain, type SignalEdge } from './SignalChain';
import { InputImpedanceNode, type PickupVoicingType } from './InputImpedanceNode';
import { detectPitch, type TunerResult } from '../dsp/tuner/pitchDetector';
import { ensureWorkletsRegistered } from './worklets/workletBundle';

export type StateChangeCallback = (status: EngineStatus, error: string | null) => void;

/**
 * Check whether the browser exposes AudioContext.setSinkId for output routing.
 * Kept as a standalone helper so UI can detect support without an engine instance.
 */
export function detectOutputSelectionSupport(): boolean {
  return typeof AudioContext !== 'undefined' && 'setSinkId' in AudioContext.prototype;
}

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

  // Input conditioning: discrete channel splitter -> 72 Hz sub-cut -> 50/60/100 Hz AC hum notch -> 5.4 kHz RF low-pass -> input gain -> studio input gate
  private inputSplitter: ChannelSplitterNode | null = null;
  private inputLeftGain: GainNode | null = null;
  private inputRightGain: GainNode | null = null;
  private inputMonoBus: GainNode | null = null;
  private inputHighpass: BiquadFilterNode | null = null;
  private humNotch50Hz: BiquadFilterNode | null = null;
  private humNotch60Hz: BiquadFilterNode | null = null;
  private humNotch100Hz: BiquadFilterNode | null = null;
  private inputRfLowpass: BiquadFilterNode | null = null;
  private inputStudioGate: AudioWorkletNode | null = null;
  private inputChannelMode: InputChannelMode = 'left';
  private detectedInputChannels = 2;

  // Input Impedance / Pickup Loading Simulator (first in chain, right after source)
  private inputImpedanceNode: InputImpedanceNode | null = null;
  private pickupVoicing: PickupVoicingType = 'flat';

  // Safety DC blocker at the end of the pedal chain (before master output)
  private chainDcBlocker: BiquadFilterNode | null = null;

  // Chain hooks: between chainInputNode and chainOutputNode pedals/amps/cabs will be connected
  private chainInputNode: GainNode | null = null;
  private chainOutputNode: GainNode | null = null;
  private signalChain: SignalChain | null = null;
  private pedalInstances: PedalInstance[] = [];
  private pedalConnections: SignalEdge[] = [];

  private masterGainNode: GainNode | null = null;
  private safetyLimiter: WaveShaperNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;

  // Pre-allocated arrays for zero-GC metering
  private inputBuffer: Float32Array<ArrayBuffer> | null = null;
  private outputBuffer: Float32Array<ArrayBuffer> | null = null;

  // State
  private status: EngineStatus = 'uninitialized';
  private selectedInputId: string | null = null;
  private selectedOutputId: string | null = null;
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

  /**
   * Enumerate available speaker / headphone / audio interface output devices
   */
  public async getAudioOutputDevices(): Promise<AudioDeviceInfo[]> {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((d) => d.kind === 'audiooutput' && d.deviceId !== 'communications')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Audio Output ${index + 1}`,
          groupId: d.groupId,
        }));
    } catch (err) {
      console.error('Failed to enumerate audio output devices', err);
      return [];
    }
  }

  /**
   * Check if the browser supports AudioContext.setSinkId for hardware output routing
   */
  public isOutputSelectionSupported(): boolean {
    return detectOutputSelectionSupport() || (this.ctx !== null && 'setSinkId' in this.ctx);
  }

  public getSelectedInputId(): string | null {
    return this.selectedInputId;
  }

  public getSelectedOutputId(): string | null {
    return this.selectedOutputId;
  }

  /**
   * Switch output device dynamically (via AudioContext.setSinkId)
   */
  public async setOutputDevice(deviceId: string): Promise<boolean> {
    this.selectedOutputId = deviceId;
    if (this.ctx && 'setSinkId' in this.ctx) {
      try {
        const targetSink = deviceId && deviceId !== 'default' ? deviceId : '';
        await (this.ctx as unknown as { setSinkId: (sink: string) => Promise<void> }).setSinkId(targetSink);
        return true;
      } catch (err) {
        console.warn('Failed to switch audio output device:', err);
        return false;
      }
    }
    return false;
  }

  /**
   * Initializes and starts the audio engine
   */
  public async start(deviceId?: string, outputDeviceId?: string): Promise<void> {
    try {
      if (deviceId) {
        this.selectedInputId = deviceId;
      }
      if (outputDeviceId) {
        this.selectedOutputId = outputDeviceId;
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

      // Apply output sink if configured and supported
      if (this.selectedOutputId && 'setSinkId' in this.ctx) {
        try {
          const targetSink = this.selectedOutputId !== 'default' ? this.selectedOutputId : '';
          await (this.ctx as unknown as { setSinkId: (sink: string) => Promise<void> }).setSinkId(targetSink);
        } catch (sinkErr) {
          console.warn('Initial output sinkId assignment failed:', sinkErr);
        }
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

      if (this.inputImpedanceNode) {
        this.inputImpedanceNode.dispose();
        this.inputImpedanceNode = null;
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
   *   └─> chainInputNode (hook for modular pedals/amps/cabs) ──> chainOutputNode
   *         ──> masterGainNode ──> safetyLimiter ──> outputAnalyser ──> destination
   */
  private setupNodes(): void {
    if (!this.ctx) return;

    // Input gain (mono)
    this.inputGainNode = this.ctx.createGain();
    this.inputGainNode.channelCount = 1;
    this.inputGainNode.channelCountMode = 'explicit';
    this.inputGainNode.gain.setValueAtTime(this.inputGainValue, this.ctx.currentTime);

    // Discrete Channel Splitter: separates Hardware Input 1 (Left / Ch 0) and Input 2 (Right / Ch 1).
    // Using 'discrete' interpretation prevents Web Audio from auto-upmixing mono to duplicate onto In 2.
    this.inputSplitter = this.ctx.createChannelSplitter(2);
    this.inputSplitter.channelCountMode = 'explicit';
    this.inputSplitter.channelCount = 2;
    this.inputSplitter.channelInterpretation = 'discrete';

    this.inputLeftGain = this.ctx.createGain();
    this.inputRightGain = this.ctx.createGain();
    this.inputMonoBus = this.ctx.createGain();
    this.inputMonoBus.channelCount = 1;
    this.inputMonoBus.channelCountMode = 'explicit';

    // Channel 0 (Input 1 / Left) -> Left Gain -> Mono Bus
    this.inputSplitter.connect(this.inputLeftGain, 0);
    // Channel 1 (Input 2 / Right) -> Right Gain -> Mono Bus
    this.inputSplitter.connect(this.inputRightGain, 1);

    this.inputLeftGain.connect(this.inputMonoBus);
    this.inputRightGain.connect(this.inputMonoBus);
    this.applyInputChannelMode();

    // Input Impedance / Pickup Loading Simulator (mono, before 30 Hz HPF)
    this.inputImpedanceNode = new InputImpedanceNode(this.ctx, {
      pickupType: this.pickupVoicing,
      cableLengthM: 3,
      loadResistance: 1e6,
      loadCapacitancePf: 80,
      volumePosition: 0,
    });
    this.updateAutoInputImpedance();

    // 1. 72 Hz Butterworth high-pass: removes DC offset, 50/60 Hz mains rumble and handling thumps below E2 (82.4 Hz)
    this.inputHighpass = this.ctx.createBiquadFilter();
    this.inputHighpass.type = 'highpass';
    this.inputHighpass.frequency.setValueAtTime(72, this.ctx.currentTime);
    this.inputHighpass.Q.setValueAtTime(0.707, this.ctx.currentTime);

    // 2. Surgical AC Power-Line Hum Notch Filters (50 Hz, 60 Hz & 100 Hz 2nd-harmonic rectifier buzz)
    this.humNotch50Hz = this.ctx.createBiquadFilter();
    this.humNotch50Hz.type = 'notch';
    this.humNotch50Hz.frequency.setValueAtTime(50, this.ctx.currentTime);
    this.humNotch50Hz.Q.setValueAtTime(10, this.ctx.currentTime);

    this.humNotch60Hz = this.ctx.createBiquadFilter();
    this.humNotch60Hz.type = 'notch';
    this.humNotch60Hz.frequency.setValueAtTime(60, this.ctx.currentTime);
    this.humNotch60Hz.Q.setValueAtTime(10, this.ctx.currentTime);

    this.humNotch100Hz = this.ctx.createBiquadFilter();
    this.humNotch100Hz.type = 'notch';
    this.humNotch100Hz.frequency.setValueAtTime(100, this.ctx.currentTime);
    this.humNotch100Hz.Q.setValueAtTime(14, this.ctx.currentTime);

    // 3. 5.4 kHz Butterworth RF / ADC Hiss Low-Pass: strips soundcard white hiss above passive pickup band
    this.inputRfLowpass = this.ctx.createBiquadFilter();
    this.inputRfLowpass.type = 'lowpass';
    this.inputRfLowpass.frequency.setValueAtTime(5400, this.ctx.currentTime);
    this.inputRfLowpass.Q.setValueAtTime(0.707, this.ctx.currentTime);

    this.inputMonoBus.connect(this.inputImpedanceNode.inputNode);
    this.inputImpedanceNode.outputNode.connect(this.inputHighpass);
    this.inputHighpass.connect(this.humNotch50Hz);
    this.humNotch50Hz.connect(this.humNotch60Hz);
    this.humNotch60Hz.connect(this.humNotch100Hz);
    this.humNotch100Hz.connect(this.inputRfLowpass);
    this.inputRfLowpass.connect(this.inputGainNode);

    // Input Analyser (2048 samples for accurate low E2 guitar pitch detection)
    this.inputAnalyser = this.ctx.createAnalyser();
    this.inputAnalyser.fftSize = 2048;
    this.inputAnalyser.smoothingTimeConstant = 0.3;
    this.inputBuffer = new Float32Array(this.inputAnalyser.fftSize);

    // Passthrough chain nodes (entry & exit points for modular pedals/amps/cabinets)
    this.chainInputNode = this.ctx.createGain();
    this.chainOutputNode = this.ctx.createGain();

    // 4. Built-in Studio Input Gate & De-Hisser before modular chain (clamps idle cable buzz automatically)
    try {
      this.inputStudioGate = new AudioWorkletNode(this.ctx, 'noise-gate-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        channelCount: 1,
        channelCountMode: 'explicit',
        parameterData: {
          threshold: -48,
          release: 0.055,
          hold: 0.022,
        },
      });
    } catch {
      this.inputStudioGate = null;
    }

    // Setup modular signal chain (pedals, amp heads, and cabinet IRs)
    this.signalChain = new SignalChain(this.ctx, this.chainInputNode, this.chainOutputNode);
    this.signalChain.rebuild(this.pedalInstances, this.pedalConnections);

    // Master Gain
    this.masterGainNode = this.ctx.createGain();
    const effectiveMaster = this.isMuted ? 0 : this.masterVolumeValue;
    this.masterGainNode.gain.setValueAtTime(effectiveMaster, this.ctx.currentTime);

    // Zero-Makeup-Gain Transparent Brickwall Safety Limiter (prevents digital clipping without boosting noise floor)
    this.safetyLimiter = this.ctx.createWaveShaper();
    const limSamples = 2048;
    const limCurve = new Float32Array(new ArrayBuffer(limSamples * Float32Array.BYTES_PER_ELEMENT));
    const limThresh = 0.88;
    const limCeil = 0.98;
    for (let i = 0; i < limSamples; i++) {
      const x = (i * 2) / (limSamples - 1) - 1;
      const ax = Math.abs(x);
      if (ax <= limThresh) {
        limCurve[i] = x;
      } else {
        const over = (ax - limThresh) / (1 - limThresh);
        limCurve[i] = Math.sign(x) * (limThresh + (limCeil - limThresh) * Math.tanh(over * 1.5));
      }
    }
    this.safetyLimiter.curve = limCurve;

    // Output Analyser
    this.outputAnalyser = this.ctx.createAnalyser();
    this.outputAnalyser.fftSize = 1024;
    this.outputAnalyser.smoothingTimeConstant = 0.3;
    this.outputBuffer = new Float32Array(this.outputAnalyser.fftSize);

    // Connect downstream graph: inputGainNode -> inputAnalyser (for tuner) & inputStudioGate -> chainInputNode
    this.inputGainNode.connect(this.inputAnalyser);
    if (this.inputStudioGate) {
      this.inputGainNode.connect(this.inputStudioGate);
      this.inputStudioGate.connect(this.chainInputNode);
    } else {
      this.inputGainNode.connect(this.chainInputNode);
    }

    // Safety DC blocker at the end of the modular rig chain before Master Output
    this.chainDcBlocker = createDcBlocker(this.ctx, 15);

    this.chainOutputNode.connect(this.chainDcBlocker);
    this.chainDcBlocker.connect(this.masterGainNode);

    this.masterGainNode.connect(this.safetyLimiter);
    this.safetyLimiter.connect(this.outputAnalyser);
    this.outputAnalyser.connect(this.ctx.destination);
  }

  /**
   * Acquire media stream with guitar-optimized constraints and resilient fallback.
   */
  private async connectInputStream(deviceId: string | null): Promise<void> {
    if (!this.ctx) return;

    let stream: MediaStream | null = null;
    const targetId = deviceId && deviceId.trim() !== '' ? deviceId.trim() : null;

    if (targetId && targetId !== 'default') {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: { exact: targetId },
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            channelCount: 2,
          },
          video: false,
        });
      } catch (err1) {
        console.warn(`[AudioEngine] Exact deviceId with stereo constraints failed for "${targetId}", trying without channelCount:`, err1);
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
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                deviceId: { exact: targetId },
              },
              video: false,
            });
          } catch (err3) {
            console.warn(`[AudioEngine] Exact deviceId failed completely (${err3}), falling back to ideal preference:`, err3);
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                  deviceId: { ideal: targetId },
                  echoCancellation: false,
                  noiseSuppression: false,
                  autoGainControl: false,
                  channelCount: 2,
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

    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            channelCount: 2,
          },
          video: false,
        });
      } catch (e) {
        console.warn('[AudioEngine] Default device with studio constraints failed, attempting basic stream:', e);
      }
    }

    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
      } catch (err: unknown) {
        const errorName = err instanceof Error ? err.name : '';
        if (errorName === 'NotFoundError' || errorName === 'OverconstrainedError' || String(err).includes('not found')) {
          throw new Error('Perangkat input audio tidak ditemukan. Pastikan soundcard, microphone, atau Virtual Cable terhubung.', { cause: err });
        } else if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
          throw new Error('Izin mikrofon ditolak oleh browser. Klik ikon gembok di address bar browser untuk mengizinkan akses audio.', { cause: err });
        } else {
          throw new Error(err instanceof Error ? err.message : 'Gagal mengakses perangkat input audio.', { cause: err });
        }
      }
    }

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

    this.mediaStream = stream;
    this.sourceNode = this.ctx.createMediaStreamSource(this.mediaStream);
    this.sourceNode.channelInterpretation = 'discrete';

    if (this.inputSplitter) {
      this.sourceNode.connect(this.inputSplitter);
    }

    const activeTrack = stream.getAudioTracks()[0];
    const reportedSettings = activeTrack?.getSettings?.();
    this.detectedInputChannels = reportedSettings?.channelCount || 1;
    const reportedDeviceId = reportedSettings?.deviceId;
    if (reportedDeviceId) {
      this.selectedInputId = reportedDeviceId;
    } else if (targetId) {
      this.selectedInputId = targetId;
    }

    console.log(
      `[AudioEngine] Connected to audio input: "${activeTrack?.label || 'Unnamed device'}" (id: ${this.selectedInputId}) - Detected channels: ${this.detectedInputChannels} (${this.detectedInputChannels >= 2 ? 'Stereo / Dual-Channel' : 'Mono'})`
    );

    this.applyInputChannelMode();
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
    if (!this.ctx || !this.inputLeftGain || !this.inputRightGain) return;
    const now = this.ctx.currentTime;
    const mode = this.inputChannelMode;

    switch (mode) {
      case 'left':
        this.inputLeftGain.gain.setTargetAtTime(1.0, now, 0.01);
        this.inputRightGain.gain.setTargetAtTime(0.0, now, 0.01);
        break;
      case 'right':
        this.inputLeftGain.gain.setTargetAtTime(0.0, now, 0.01);
        this.inputRightGain.gain.setTargetAtTime(1.0, now, 0.01);
        break;
      case 'sum':
      default:
        this.inputLeftGain.gain.setTargetAtTime(1.0, now, 0.01);
        this.inputRightGain.gain.setTargetAtTime(1.0, now, 0.01);
        break;
    }
  }

  /**
   * Configure Input Impedance / Pickup Loading Simulator
   */
  public setInputImpedance(config: {
    pickupType?: PickupVoicingType;
    cableLengthM?: number;
    loadResistance?: number;
    loadCapacitancePf?: number;
    volumePosition?: number;
  }): void {
    if (config.pickupType) {
      this.pickupVoicing = config.pickupType;
    }
    this.inputImpedanceNode?.updateConfig(config);
  }

  public getInputImpedanceConfig() {
    return this.inputImpedanceNode?.getConfig() ?? null;
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
   * Set or update pedal/amp/cabinet instances and DAG connections in the signal chain
   */
  public setPedalInstances(instances: PedalInstance[], connections?: SignalEdge[]): void {
    this.pedalInstances = instances;
    if (connections !== undefined) {
      this.pedalConnections = connections;
    }
    if (this.signalChain) {
      this.signalChain.rebuild(this.pedalInstances, this.pedalConnections);
    }
    this.updateAutoInputImpedance();
  }

  /**
   * Load a custom .wav IR file into a specific cabinet-ir instance on the board
   */
  public async loadCustomIRForPedal(pedalId: string, file: File): Promise<string> {
    if (!this.ctx || !this.signalChain) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass({ latencyHint: 'interactive' });
      this.setupNodes();
    }
    return this.signalChain!.loadCustomIRForPedal(pedalId, file);
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
    this.updateAutoInputImpedance();
  }

  /**
   * Auto-Z (Dynamic Variable Pickup Input Impedance):
   * Inspects the first active pedal connected directly to the guitar pickups.
   */
  private updateAutoInputImpedance(): void {
    if (!this.inputImpedanceNode) return;

    const firstActive = this.pedalInstances.find((p) => p.enabled);
    if (!firstActive) {
      this.inputImpedanceNode.setLoadResistance(1_000_000);
      return;
    }

    const type = firstActive.type.toLowerCase();
    let loadR: number;

    if (type.includes('fuzzface') || type.includes('fuzz-face')) {
      loadR = 10_000;
    } else if (type.includes('tonebender') || type.includes('tone-bender')) {
      loadR = 15_000;
    } else if (type.includes('fuzzfactory') || type.includes('fuzz-factory')) {
      loadR = 12_000;
    } else if (type.includes('rangemaster')) {
      loadR = 22_000;
    } else if (type.includes('wah')) {
      loadR = 68_000;
    } else if (type.includes('bigmuff') || type.includes('big-muff') || type.includes('hoof') || type.includes('flatiron')) {
      loadR = 100_000;
    } else {
      loadR = 1_000_000;
    }

    this.inputImpedanceNode.setLoadResistance(loadR);
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
      totalLatencyMs: totalMs > 0 ? totalMs : (256 / this.ctx.sampleRate) * 1000 * 2,
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
