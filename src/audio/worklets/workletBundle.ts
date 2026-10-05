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
    this.gain = 1.0;
    this.holdCounter = 0;
    this.sampleRate = 48000;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || input.length === 0 || !output || output.length === 0) return true;

    const inputL = input[0];
    const inputR = input.length > 1 ? input[1] : input[0];
    const outputL = output[0];
    const outputR = output.length > 1 ? output[1] : output[0];

    const thresholdDb = parameters.threshold.length > 1 ? parameters.threshold[0] : parameters.threshold[0];
    const releaseTime = parameters.release.length > 1 ? parameters.release[0] : parameters.release[0];
    const holdTime = parameters.hold.length > 1 ? parameters.hold[0] : parameters.hold[0];

    // Convert threshold dB to linear amplitude
    const thresholdLinear = Math.pow(10, thresholdDb / 20);
    const hysteresisLinear = thresholdLinear * 1.35; // 2.6 dB higher to close

    const releaseSamples = Math.max(1, releaseTime * 48000);
    const holdSamples = holdTime * 48000;
    const releaseCoeff = Math.exp(-1.0 / releaseSamples);
    const attackCoeff = 0.85; // fast attack

    for (let i = 0; i < inputL.length; i++) {
      const sL = inputL[i];
      const sR = inputR[i];
      const peak = Math.max(Math.abs(sL), Math.abs(sR));

      // Fast RMS/Peak tracker
      this.envelope = Math.max(peak, this.envelope * 0.99);

      let targetGain = 0.0;
      if (this.envelope > thresholdLinear) {
        targetGain = 1.0;
        this.holdCounter = holdSamples;
      } else if (this.holdCounter > 0) {
        targetGain = 1.0;
        this.holdCounter--;
      } else {
        targetGain = 0.0;
      }

      if (targetGain > this.gain) {
        this.gain += (targetGain - this.gain) * attackCoeff;
      } else {
        this.gain *= releaseCoeff;
        if (this.gain < 0.0001) this.gain = 0;
      }

      outputL[i] = sL * this.gain;
      outputR[i] = sR * this.gain;
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

registerProcessor('noise-gate-processor', NoiseGateProcessor);
registerProcessor('looper-processor', LooperProcessor);
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
