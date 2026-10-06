/**
 * Inlined AudioWorklet processor code for zero-latency, thread-isolated
 * Noise Gate and Infinite Layer Looper.
 * 
 * Inlined via Blob URL to avoid Vite path resolution and MIME-type issues
 * across production bundles, PWA offline caches, and dev servers.
 */

export const WORKLET_CODE = `
class NoiseGateProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'threshold', defaultValue: -50, minValue: -90, maxValue: -10 },
      { name: 'release', defaultValue: 0.05, minValue: 0.005, maxValue: 0.5 },
      { name: 'hold', defaultValue: 0.02, minValue: 0.0, maxValue: 0.2 },
    ];
  }

  constructor() {
    super();
    this.envelope = 0;
    this.gain = 0.0;
    this.isOpen = false;
    this.holdCounter = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || input.length === 0 || !output || output.length === 0) return true;

    const inputL = input[0];
    const inputR = input.length > 1 ? input[1] : input[0];
    const outputL = output[0];
    const outputR = output.length > 1 ? output[1] : output[0];

    const thresholdDb = parameters.threshold[0];
    const releaseTime = parameters.release[0];
    const holdTime = parameters.hold[0];

    // 'sampleRate' is the AudioWorkletGlobalScope sample rate (44.1k / 48k / 96k ...)
    const openThreshold = Math.pow(10, thresholdDb / 20);
    const closeThreshold = openThreshold * 0.74; // ~2.6 dB hysteresis to stop chatter

    const holdSamples = holdTime * sampleRate;
    const releaseCoeff = Math.exp(-1.0 / Math.max(1, releaseTime * sampleRate));
    const attackCoeff = 1.0 - Math.exp(-1.0 / (0.001 * sampleRate)); // ~1 ms, click-free
    // Peak envelope with ~40 ms decay: rides through low-note zero crossings
    const envDecay = Math.exp(-1.0 / (0.04 * sampleRate));

    for (let i = 0; i < inputL.length; i++) {
      const sL = inputL[i];
      const sR = inputR[i];
      const peak = Math.max(Math.abs(sL), Math.abs(sR));

      this.envelope = Math.max(peak, this.envelope * envDecay);

      if (!this.isOpen) {
        if (this.envelope > openThreshold) {
          this.isOpen = true;
          this.holdCounter = holdSamples;
        }
      } else if (this.envelope > closeThreshold) {
        this.holdCounter = holdSamples;
      } else if (this.holdCounter > 0) {
        this.holdCounter--;
      } else {
        this.isOpen = false;
      }

      if (this.isOpen) {
        this.gain += (1.0 - this.gain) * attackCoeff;
      } else {
        this.gain *= releaseCoeff;
        if (this.gain < 0.0001) this.gain = 0;
      }

      outputL[i] = sL * this.gain;
      if (outputR !== outputL) outputR[i] = sR * this.gain;
    }

    return true;
  }
}

class LooperProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Max 180 seconds loop at 48kHz
    this.maxSamples = 48000 * 180;
    this.bufferL = new Float32Array(this.maxSamples);
    this.bufferR = new Float32Array(this.maxSamples);
    this.undoBufferL = null;
    this.undoBufferR = null;

    this.state = 'idle'; // 'idle', 'recording', 'playing', 'overdubbing', 'stopped'
    this.loopLength = 0;
    this.playhead = 0;
    this.level = 1.0;
    this.feedback = 1.0;
    this.speed = 1.0;
    this.reverse = false;
    this.hasLoop = false;
    this.canUndo = false;
    this.sampleRate = 48000;

    this.msgInterval = 0;

    this.port.onmessage = (e) => {
      const data = e.data;
      switch (data.type) {
        case 'record':
          this.startRecord();
          break;
        case 'play':
          this.startPlay();
          break;
        case 'overdub':
          this.startOverdub();
          break;
        case 'stop':
          this.stopLoop();
          break;
        case 'clear':
          this.clearLoop();
          break;
        case 'undo':
          this.undoLastOverdub();
          break;
        case 'setLevel':
          this.level = Math.max(0, Math.min(2.0, data.value));
          break;
        case 'setFeedback':
          this.feedback = Math.max(0, Math.min(1.0, data.value));
          break;
        case 'setSpeed':
          this.speed = data.value;
          break;
        case 'setReverse':
          this.reverse = !!data.value;
          break;
      }
    };
  }

  startRecord() {
    this.state = 'recording';
    this.loopLength = 0;
    this.playhead = 0;
    this.hasLoop = false;
    this.canUndo = false;
    this.undoBufferL = null;
    this.undoBufferR = null;
  }

  startPlay() {
    if (this.state === 'recording') {
      // Finished initial recording
      this.loopLength = Math.max(128, this.playhead);
      this.hasLoop = true;
      this.playhead = 0;
      this.applyCrossfade();
    }
    if (this.hasLoop) {
      this.state = 'playing';
    }
  }

  startOverdub() {
    if (!this.hasLoop) {
      this.startRecord();
      return;
    }
    // Save current loop state into undo buffer
    if (!this.undoBufferL || this.undoBufferL.length < this.loopLength) {
      this.undoBufferL = new Float32Array(this.loopLength);
      this.undoBufferR = new Float32Array(this.loopLength);
    }
    this.undoBufferL.set(this.bufferL.subarray(0, this.loopLength));
    this.undoBufferR.set(this.bufferR.subarray(0, this.loopLength));
    this.canUndo = true;
    this.state = 'overdubbing';
  }

  stopLoop() {
    if (this.state === 'recording') {
      this.loopLength = Math.max(128, this.playhead);
      this.hasLoop = true;
      this.applyCrossfade();
    }
    this.state = 'stopped';
    this.playhead = 0;
  }

  clearLoop() {
    this.state = 'idle';
    this.loopLength = 0;
    this.playhead = 0;
    this.hasLoop = false;
    this.canUndo = false;
    this.undoBufferL = null;
    this.undoBufferR = null;
    this.bufferL.fill(0);
    this.bufferR.fill(0);
  }

  undoLastOverdub() {
    if (!this.canUndo || !this.undoBufferL) return;
    this.bufferL.set(this.undoBufferL.subarray(0, this.loopLength));
    this.bufferR.set(this.undoBufferR.subarray(0, this.loopLength));
    this.canUndo = false;
  }

  applyCrossfade() {
    // 5ms smooth cosine crossfade at the seam to eliminate seam clicks
    const xFadeSamples = Math.min(Math.floor(48000 * 0.006), Math.floor(this.loopLength / 4));
    for (let i = 0; i < xFadeSamples; i++) {
      const w = 0.5 * (1 - Math.cos((Math.PI * i) / xFadeSamples));
      const headIdx = i;
      const tailIdx = this.loopLength - xFadeSamples + i;
      const mixedL = this.bufferL[headIdx] * w + this.bufferL[tailIdx] * (1 - w);
      const mixedR = this.bufferR[headIdx] * w + this.bufferR[tailIdx] * (1 - w);
      this.bufferL[headIdx] = mixedL;
      this.bufferR[headIdx] = mixedR;
    }
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const inL = (input && input.length > 0) ? input[0] : null;
    const inR = (input && input.length > 1) ? input[1] : inL;
    const outL = output[0];
    const outR = output.length > 1 ? output[1] : output[0];

    const blockLen = outL.length;

    for (let i = 0; i < blockLen; i++) {
      const dryL = inL ? inL[i] : 0;
      const dryR = inR ? inR[i] : 0;

      let loopSampleL = 0;
      let loopSampleR = 0;

      if (this.state === 'recording') {
        if (this.playhead < this.maxSamples) {
          this.bufferL[this.playhead] = dryL;
          this.bufferR[this.playhead] = dryR;
          this.playhead++;
        } else {
          // Reached max buffer limit, auto-transition to play
          this.startPlay();
        }
      } else if (this.state === 'playing' || this.state === 'overdubbing') {
        if (this.loopLength > 0) {
          let readPos = this.reverse ? (this.loopLength - 1 - Math.floor(this.playhead)) : Math.floor(this.playhead);
          readPos = Math.max(0, Math.min(this.loopLength - 1, readPos));

          loopSampleL = this.bufferL[readPos];
          loopSampleR = this.bufferR[readPos];

          if (this.state === 'overdubbing') {
            // Sound-on-sound mix
            this.bufferL[readPos] = this.bufferL[readPos] * this.feedback + dryL;
            this.bufferR[readPos] = this.bufferR[readPos] * this.feedback + dryR;
          }

          this.playhead += this.speed;
          if (this.playhead >= this.loopLength) {
            this.playhead = this.playhead % this.loopLength;
          } else if (this.playhead < 0) {
            this.playhead = 0;
          }
        }
      }

      // Output dry guitar signal + looper playback
      outL[i] = dryL + loopSampleL * this.level;
      outR[i] = dryR + loopSampleR * this.level;
    }

    // Throttle UI telemetry to ~30Hz
    this.msgInterval++;
    if (this.msgInterval >= 12) {
      this.msgInterval = 0;
      const progress = this.loopLength > 0 ? (this.playhead / this.loopLength) : 0;
      const durationSec = this.loopLength / 48000;
      this.port.postMessage({
        type: 'telemetry',
        state: this.state,
        progress,
        durationSec,
        canUndo: this.canUndo,
        hasLoop: this.hasLoop,
      });
    }

    return true;
  }
}

class CompressorProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'threshold', defaultValue: -24, minValue: -90, maxValue: 0, automationRate: 'k-rate' },
      { name: 'ratio', defaultValue: 4, minValue: 1, maxValue: 40, automationRate: 'k-rate' },
      { name: 'attack', defaultValue: 0.01, minValue: 0.0001, maxValue: 0.5, automationRate: 'k-rate' },
      { name: 'release', defaultValue: 0.2, minValue: 0.01, maxValue: 3, automationRate: 'k-rate' },
      { name: 'knee', defaultValue: 6, minValue: 0, maxValue: 30, automationRate: 'k-rate' },
      { name: 'rmsMix', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
    ];
  }

  constructor() {
    super();
    this.grDb = 0;
    this.rmsSq = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || input.length === 0 || !output || output.length === 0) return true;

    const channels = Math.min(input.length, output.length);
    const len = input[0].length;

    const thr = parameters.threshold[0];
    const ratio = Math.max(1, parameters.ratio[0]);
    const knee = parameters.knee[0];
    const rmsMix = parameters.rmsMix[0];
    const atkC = Math.exp(-1.0 / (parameters.attack[0] * sampleRate));
    const relC = Math.exp(-1.0 / (parameters.release[0] * sampleRate));
    const rmsC = Math.exp(-1.0 / (0.012 * sampleRate));
    const slope = 1.0 / ratio - 1.0;

    for (let i = 0; i < len; i++) {
      let peak = 0;
      for (let ch = 0; ch < channels; ch++) {
        const a = Math.abs(input[ch][i]);
        if (a > peak) peak = a;
      }

      // Level detector: peak, blended towards RMS (sine RMS * sqrt2 == peak)
      this.rmsSq = rmsC * this.rmsSq + (1.0 - rmsC) * peak * peak;
      const det = (1.0 - rmsMix) * peak + rmsMix * Math.sqrt(this.rmsSq) * 1.41421356;
      const levelDb = 20.0 * Math.log10(det + 1e-9);

      // Static gain computer with soft knee (gain reduction in dB, <= 0)
      const over = levelDb - thr;
      let targetGr = 0.0;
      if (knee < 0.1) {
        if (over > 0) targetGr = slope * over;
      } else if (2.0 * over > knee) {
        targetGr = slope * over;
      } else if (2.0 * over > -knee) {
        const t = over + knee / 2.0;
        targetGr = (slope * t * t) / (2.0 * knee);
      }

      // Smooth the gain reduction itself (log domain): attack when reducing more, else release
      const c = targetGr < this.grDb ? atkC : relC;
      this.grDb = c * this.grDb + (1.0 - c) * targetGr;
      const g = Math.pow(10.0, this.grDb / 20.0);

      for (let ch = 0; ch < channels; ch++) {
        output[ch][i] = input[ch][i] * g;
      }
    }

    return true;
  }
}

registerProcessor('noise-gate-processor', NoiseGateProcessor);
registerProcessor('looper-processor', LooperProcessor);
registerProcessor('compressor-processor', CompressorProcessor);
`;

let workletModuleUrl: string | null = null;
let workletRegistrationPromise: Promise<void> | null = null;

export async function ensureWorkletsRegistered(ctx: AudioContext): Promise<void> {
  if (!ctx.audioWorklet) {
    console.warn('AudioWorklet is not supported in this browser context');
    return;
  }

  if (workletRegistrationPromise) {
    return workletRegistrationPromise;
  }

  workletRegistrationPromise = (async () => {
    if (!workletModuleUrl) {
      const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
      workletModuleUrl = URL.createObjectURL(blob);
    }
    try {
      await ctx.audioWorklet.addModule(workletModuleUrl);
    } catch (err) {
      console.error('Failed to register audio worklet module:', err);
      throw err;
    }
  })();

  return workletRegistrationPromise;
}
