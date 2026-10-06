export type EngineStatus = 'uninitialized' | 'suspended' | 'running' | 'error';

/**
 * How a (possibly stereo) audio-interface input is folded down to the mono guitar signal.
 *  - sum:   L+R averaged (mono mics / guitar on both channels)
 *  - left:  Input 1 only (typical guitar-in on a 2ch interface)
 *  - right: Input 2 only
 */
export type InputChannelMode = 'sum' | 'left' | 'right';

export const DEFAULT_NOISE_GATE_ENABLED = true;
export const DEFAULT_NOISE_GATE_THRESHOLD_DB = -62;

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
  groupId: string;
}

export interface MeterData {
  rms: number;        // 0 to 1
  peak: number;       // 0 to 1
  rmsDb: number;      // -Infinity to 0 dB
  peakDb: number;     // -Infinity to 0 dB
  peakHoldDb: number; // Peak hold in dB with smooth decay
  isClipping: boolean;
  clipHold: boolean;  // Holds clip indicator active for 1.2s
}

export interface AudioEngineMetrics {
  sampleRate: number;
  baseLatency: number;
  outputLatency: number;
  totalLatencyMs: number;
  currentTime: number;
}

export interface AudioEngineState {
  status: EngineStatus;
  selectedInputId: string | null;
  inputGain: number;       // Linear gain (e.g., 0.0 to 3.0, default 1.0)
  masterVolume: number;    // Linear gain (0.0 to 1.5, default 0.8)
  isMuted: boolean;
  limiterActive: boolean;
  errorMessage: string | null;
  metrics: AudioEngineMetrics;
}
