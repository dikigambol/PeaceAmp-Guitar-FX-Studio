/**
 * Inlined AudioWorklet processor code for zero-latency, thread-isolated
 * Noise Gate, Infinite Layer Looper, Compressor and Phaser cores.
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
    // Fast peak envelope with ~18 ms decay: tracks guitar palm-mutes & hand-stops quickly
    const envDecay = Math.exp(-1.0 / (0.018 * sampleRate));

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

/**
 * 4-stage first-order all-pass phaser (4 poles, 2 notches when mixed with dry).
 *
 * The whole phase-shift core lives in one processor because a native Web Audio
 * feedback cycle without a DelayNode is muted; here the feedback path is
 * sample-accurate and the LFO modulates the all-pass cutoff per sample.
 * Varying the cutoff inside the loop is what produces the analog "sweep" instead
 * of a control-rate stepped filter.
 */
class PhaserProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'rate', defaultValue: 0.6, minValue: 0.01, maxValue: 12, automationRate: 'k-rate' },
      { name: 'center', defaultValue: 900, minValue: 40, maxValue: 8000, automationRate: 'k-rate' },
      { name: 'sweep', defaultValue: 600, minValue: 0, maxValue: 7000, automationRate: 'k-rate' },
      { name: 'feedback', defaultValue: 0, minValue: 0, maxValue: 0.9, automationRate: 'k-rate' },
    ];
  }

  constructor() {
    super();
    this.phase = 0;
    this.fb = [0, 0];
    this.hist = [];
    for (let s = 0; s < 4; s++) {
      this.hist.push({ x: [0, 0], y: [0, 0] });
    }
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || input.length === 0 || !output || output.length === 0) return true;

    const channels = Math.min(input.length, output.length);
    const len = input[0].length;
    const rate = parameters.rate[0];
    const center = parameters.center[0];
    const sweep = parameters.sweep[0];
    const feedback = parameters.feedback[0];
    const inc = rate / sampleRate;

    // Logarithmic / exponential octave bounds for musical, symmetric swirl:
    const fMin = Math.max(30, center - sweep);
    const fMax = Math.min(sampleRate * 0.45, center + sweep);
    const fRatio = fMax / fMin;

    for (let i = 0; i < len; i++) {
      const lfo = Math.sin(2 * Math.PI * this.phase);
      this.phase += inc;
      if (this.phase >= 1) this.phase -= 1;

      // Exponential frequency interpolation across octaves:
      // When lfo = -1: f = fMin; lfo = 0: f = geometric center; lfo = +1: f = fMax
      const normLfo = 0.5 * (lfo + 1.0);
      const f = fMin * Math.pow(fRatio, normLfo);
      const t = Math.tan((Math.PI * f) / sampleRate);
      const a = (t - 1) / (t + 1);

      for (let ch = 0; ch < channels; ch++) {
        // Differential pair tanh saturation in feedback loop simulates OTA / JFET analog compression
        let x = input[ch][i] + feedback * Math.tanh(this.fb[ch]);
        for (let s = 0; s < 4; s++) {
          const h = this.hist[s];
          const y = a * x + h.x[ch] - a * h.y[ch];
          h.x[ch] = x;
          h.y[ch] = y;
          x = y;
        }
        if (!isFinite(x)) x = 0;
        this.fb[ch] = x;
        output[ch][i] = x;
      }
    }

    return true;
  }
}

/**
 * Feedback-loop diode clipper for op-amp overdrive stages (Tube Screamer family).
 *
 * Behavioural model, not a SPICE netlist:
 *   - Input side: 720 Hz gain shelf (unity path + drive * high-passed path).
 *   - Nonlinear element sits in the feedback path, not after the gain stage.
 *   - The loop is implicit; it is solved with a one-pole feedback state at the
 *     Rf || Cf corner, so the knee softens dynamically instead of being a fixed
 *     memoryless curve.
 *   - 4x oversampling with linear interpolation and a 4th-order decimator.
 *
 * The feedback state update is the only approximation: the true zero-delay loop
 * is solved one sample late at the oversampled rate (5.2 us at 48 kHz).
 */
class FeedbackClipperProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'drive', defaultValue: 11, minValue: 0.5, maxValue: 400, automationRate: 'k-rate' },
      { name: 'feedback', defaultValue: 0.6, minValue: 0, maxValue: 0.95, automationRate: 'k-rate' },
      { name: 'kneePos', defaultValue: 0.77, minValue: 0.05, maxValue: 2.0, automationRate: 'k-rate' },
      { name: 'kneeNeg', defaultValue: 0.77, minValue: 0.05, maxValue: 2.0, automationRate: 'k-rate' },
      { name: 'humpHz', defaultValue: 720, minValue: 20, maxValue: 5000, automationRate: 'k-rate' },
      { name: 'feedbackHz', defaultValue: 20000, minValue: 200, maxValue: 80000, automationRate: 'k-rate' },
      { name: 'makeup', defaultValue: 0.5, minValue: 0.02, maxValue: 4, automationRate: 'k-rate' },
    ];
  }

  constructor() {
    super();
    this.os = 4;
    this.prev = [0, 0];
    this.humpLp = [0, 0];
    this.fbState = [0, 0];
    this.dcX = [0, 0];
    this.dcY = [0, 0];
    // Two cascaded biquads per channel, stored as [ch * 2 + stage][z1, z2].
    this.decZ = [];
    this.dec = null;
    this.decRate = 0;
  }

  decimator(fs) {
    if (this.dec && this.decRate === fs) return this.dec;
    const cutoff = sampleRate * 0.42;
    const w0 = (2 * Math.PI * cutoff) / fs;
    const cosw = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * 0.7071067811865476);
    const a0 = 1 + alpha;
    const b0 = ((1 - cosw) / 2) / a0;
    const b1 = (1 - cosw) / a0;
    const b2 = b0;
    const a1 = (-2 * cosw) / a0;
    const a2 = (1 - alpha) / a0;
    this.dec = [b0, b1, b2, a1, a2];
    this.decRate = fs;
    return this.dec;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || input.length === 0 || !output || output.length === 0) return true;

    const channels = Math.min(input.length, output.length);
    const len = input[0].length;
    const drive = parameters.drive[0];
    const feedback = parameters.feedback[0];
    const kneePos = Math.max(0.02, parameters.kneePos[0]);
    const kneeNeg = Math.max(0.02, parameters.kneeNeg[0]);
    const humpHz = parameters.humpHz[0];
    const feedbackHz = parameters.feedbackHz[0];
    const makeup = parameters.makeup[0];

    const fsOs = sampleRate * this.os;
    const humpA = 1 - Math.exp((-2 * Math.PI * humpHz) / fsOs);
    const fbHz = Math.min(feedbackHz, fsOs * 0.45);
    const fbA = 1 - Math.exp((-2 * Math.PI * fbHz) / fsOs);
    const dcR = Math.exp((-2 * Math.PI * 15) / fsOs);
    const dec = this.decimator(fsOs);
    const b0 = dec[0];
    const b1 = dec[1];
    const b2 = dec[2];
    const a1 = dec[3];
    const a2 = dec[4];

    for (let ch = 0; ch < channels; ch++) {
      if (!this.decZ[ch * 2]) this.decZ[ch * 2] = [0, 0];
      if (!this.decZ[ch * 2 + 1]) this.decZ[ch * 2 + 1] = [0, 0];
      const zA = this.decZ[ch * 2];
      const zB = this.decZ[ch * 2 + 1];

      const inCh = input[ch];
      const outCh = output[ch];
      const prevX = this.prev[ch];
      let lastOut = 0;

      for (let i = 0; i < len; i++) {
        const x = inCh[i];

        for (let k = 1; k <= this.os; k++) {
          // First-order hold between the previous and current input sample.
          const xs = prevX + (x - prevX) * (k / this.os);

          // 720 Hz gain shelf: unity at DC, drive * high-pass above the corner.
          this.humpLp[ch] += humpA * (xs - this.humpLp[ch]);
          const hp = xs - this.humpLp[ch];
          const target = (1 + feedback) * (xs + drive * hp);

          // Diode nonlinearity in the feedback path. The (1 + feedback) term
          // restores the small-signal gain that the loop would otherwise pull
          // down, so only the knee/compression changes, not the overall level.
          const u = target - feedback * this.fbState[ch];
          const y = u >= 0
            ? kneePos * Math.tanh(u / kneePos)
            : -kneeNeg * Math.tanh(-u / kneeNeg);

          // Rf || Cf feedback state: the loop reacts over time instead of
          // clipping instantaneously.
          this.fbState[ch] += fbA * (y - this.fbState[ch]);

          // Asymmetric knees can leave DC; block it before the decimator.
          const dc = y - this.dcX[ch] + dcR * this.dcY[ch];
          this.dcX[ch] = y;
          this.dcY[ch] = dc;

          let s = dc * makeup;

          let w = b0 * s + zA[0];
          zA[0] = b1 * s - a1 * w + zA[1];
          zA[1] = b2 * s - a2 * w;
          s = w;

          w = b0 * s + zB[0];
          zB[0] = b1 * s - a1 * w + zB[1];
          zB[1] = b2 * s - a2 * w;
          s = w;

          if (k === this.os) lastOut = s;
        }

        if (!isFinite(lastOut)) {
          lastOut = 0;
          this.fbState[ch] = 0;
          this.humpLp[ch] = 0;
          this.dcX[ch] = 0;
          this.dcY[ch] = 0;
        }
        outCh[i] = lastOut;
        this.prev[ch] = x;
      }
    }

    return true;
  }
}

class PitchShifterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'ratio1', defaultValue: 1.0, minValue: 0.1, maxValue: 8.0 },
      { name: 'gain1', defaultValue: 0.0, minValue: 0.0, maxValue: 3.0 },
      { name: 'ratio2', defaultValue: 1.0, minValue: 0.1, maxValue: 8.0 },
      { name: 'gain2', defaultValue: 0.0, minValue: 0.0, maxValue: 3.0 },
      { name: 'ratio3', defaultValue: 1.0, minValue: 0.1, maxValue: 8.0 },
      { name: 'gain3', defaultValue: 0.0, minValue: 0.0, maxValue: 3.0 },
      { name: 'directGain', defaultValue: 1.0, minValue: 0.0, maxValue: 2.0 },
      { name: 'vintage', defaultValue: 0.0, minValue: 0.0, maxValue: 1.0 },
      { name: 'rangeCutoff', defaultValue: 10000.0, minValue: 40.0, maxValue: 20000.0 },
    ];
  }

  constructor() {
    super();
    // 8192 samples (~170ms at 48kHz) circular delay buffer
    this.bufferSize = 8192;
    this.bufferMask = this.bufferSize - 1;
    this.bufL = new Float32Array(this.bufferSize);
    this.bufR = new Float32Array(this.bufferSize);
    this.writeIndex = 0;

    // Window size for pitch grains (~38ms at 44.1k/48k)
    this.grainSize = 1800;

    // Phase counters for 3 independent pitch-shifted voices (0.0 to 1.0)
    this.phase1 = 0;
    this.phase2 = 0;
    this.phase3 = 0;

    // Vintage flip-flop state for OC-2 sub-octave emulation
    this.prevSample = 0;
    this.ff1 = 1;
    this.ff2 = 1;
    this.ff1Count = 0;
    this.env = 0;
    this.lpState1A = 0;
    this.lpState1B = 0;
    this.lpState2A = 0;
    this.lpState2B = 0;
    this.rangeLp1L = 0;
    this.rangeLp2L = 0;
    this.rangeLp1R = 0;
    this.rangeLp2R = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || input.length === 0 || !output || output.length === 0) return true;

    const inL = input[0];
    const inR = input.length > 1 ? input[1] : inL;
    const outL = output[0];
    const outR = output.length > 1 ? output[1] : outL;
    const len = inL.length;

    const r1 = parameters.ratio1[0];
    const g1 = parameters.gain1[0];
    const r2 = parameters.ratio2[0];
    const g2 = parameters.gain2[0];
    const r3 = parameters.ratio3[0];
    const g3 = parameters.gain3[0];
    const directGain = parameters.directGain[0];
    const isVintage = parameters.vintage[0] >= 0.5;
    const rangeCutoff = parameters.rangeCutoff[0];

    const grainLen = this.grainSize;
    const invGrain = 1.0 / grainLen;
    const twoPi = 2.0 * Math.PI;

    // Phase delta per sample for each ratio
    const delta1 = (1.0 - r1) * invGrain;
    const delta2 = (1.0 - r2) * invGrain;
    const delta3 = (1.0 - r3) * invGrain;

    // One-pole smoothing filter coefficient for range filtering
    const rangeAlpha = 1.0 - Math.exp((-twoPi * Math.min(rangeCutoff, sampleRate * 0.45)) / sampleRate);
    const envDecay = Math.exp(-1.0 / (0.045 * sampleRate)); // ~45ms envelope decay

    for (let i = 0; i < len; i++) {
      const sL = inL[i];
      const sR = inR[i];

      // Write into circular delay buffer
      const wIdx = this.writeIndex;
      this.bufL[wIdx] = sL;
      this.bufR[wIdx] = sR;
      this.writeIndex = (wIdx + 1) & this.bufferMask;

      // Track peak envelope for vintage synthesizer / gate dynamics
      const absS = Math.abs(sL);
      this.env = Math.max(absS, this.env * envDecay);

      let voice1L = 0, voice1R = 0;
      let voice2L = 0, voice2R = 0;
      let voice3L = 0, voice3R = 0;

      // ---- Voice 1 (e.g. -1 Octave or Primary Shift) ----
      if (g1 > 0.001) {
        if (isVintage && Math.abs(r1 - 0.5) < 0.05) {
          // Vintage OC-2 style analog flip-flop divider (-1 OCT) with low-hysteresis Schmitt trigger
          if (this.prevSample <= 0 && sL > 0.005 && this.env > 0.006) {
            this.ff1 = -this.ff1;
          }
          const rawSqu = this.ff1 * this.env;
          // Cascaded 2-pole Sallen-Key lowpass (~220Hz) creates authentic round, fat, warm OC-2 synth-bass growl
          const lpAlpha1 = 0.028;
          this.lpState1A += lpAlpha1 * (rawSqu - this.lpState1A);
          this.lpState1B += lpAlpha1 * (this.lpState1A - this.lpState1B);
          const octTone = this.lpState1B * 1.6;
          voice1L = octTone * g1;
          voice1R = octTone * g1;
        } else {
          // High-precision polyphonic granular pitch shift
          const pA = this.phase1;
          const pB = pA >= 0.5 ? pA - 0.5 : pA + 0.5;

          const wA = 0.5 * (1.0 - Math.cos(twoPi * pA));
          const wB = 0.5 * (1.0 - Math.cos(twoPi * pB));

          const dA = pA * grainLen;
          const dB = pB * grainLen;

          const posA = (wIdx - dA + this.bufferSize) & this.bufferMask;
          const posB = (wIdx - dB + this.bufferSize) & this.bufferMask;

          const idxA0 = Math.floor(posA);
          const fracA = posA - idxA0;
          const idxA1 = (idxA0 + 1) & this.bufferMask;

          const idxB0 = Math.floor(posB);
          const fracB = posB - idxB0;
          const idxB1 = (idxB0 + 1) & this.bufferMask;

          const sigAL = this.bufL[idxA0] + fracA * (this.bufL[idxA1] - this.bufL[idxA0]);
          const sigBL = this.bufL[idxB0] + fracB * (this.bufL[idxB1] - this.bufL[idxB0]);
          voice1L = (sigAL * wA + sigBL * wB) * g1;

          const sigAR = this.bufR[idxA0] + fracA * (this.bufR[idxA1] - this.bufR[idxA0]);
          const sigBR = this.bufR[idxB0] + fracB * (this.bufR[idxB1] - this.bufR[idxB0]);
          voice1R = (sigAR * wA + sigBR * wB) * g1;
        }
      }

      // ---- Voice 2 (e.g. -2 Octave or Dual Down Shift) ----
      if (g2 > 0.001) {
        if (isVintage && Math.abs(r2 - 0.25) < 0.05) {
          // Vintage OC-2 style analog flip-flop divider (-2 OCT)
          if (this.prevSample <= 0 && sL > 0.005 && this.env > 0.006) {
            this.ff1Count++;
            if ((this.ff1Count & 1) === 0) {
              this.ff2 = -this.ff2;
            }
          }
          const rawSqu2 = this.ff2 * this.env;
          // Cascaded 2-pole lowpass (~110Hz) for deep foundational sub-sub octave
          const lpAlpha2 = 0.016;
          this.lpState2A += lpAlpha2 * (rawSqu2 - this.lpState2A);
          this.lpState2B += lpAlpha2 * (this.lpState2A - this.lpState2B);
          voice2L = this.lpState2B * 1.8 * g2;
          voice2R = this.lpState2B * 1.8 * g2;
        } else {
          // Polyphonic pitch shift
          const pA = this.phase2;
          const pB = pA >= 0.5 ? pA - 0.5 : pA + 0.5;

          const wA = 0.5 * (1.0 - Math.cos(twoPi * pA));
          const wB = 0.5 * (1.0 - Math.cos(twoPi * pB));

          const dA = pA * grainLen;
          const dB = pB * grainLen;

          const posA = (wIdx - dA + this.bufferSize) & this.bufferMask;
          const posB = (wIdx - dB + this.bufferSize) & this.bufferMask;

          const idxA0 = Math.floor(posA);
          const fracA = posA - idxA0;
          const idxA1 = (idxA0 + 1) & this.bufferMask;

          const idxB0 = Math.floor(posB);
          const fracB = posB - idxB0;
          const idxB1 = (idxB0 + 1) & this.bufferMask;

          const sigAL = this.bufL[idxA0] + fracA * (this.bufL[idxA1] - this.bufL[idxA0]);
          const sigBL = this.bufL[idxB0] + fracB * (this.bufL[idxB1] - this.bufL[idxB0]);
          voice2L = (sigAL * wA + sigBL * wB) * g2;

          const sigAR = this.bufR[idxA0] + fracA * (this.bufR[idxA1] - this.bufR[idxA0]);
          const sigBR = this.bufR[idxB0] + fracB * (this.bufR[idxB1] - this.bufR[idxB0]);
          voice2R = (sigAR * wA + sigBR * wB) * g2;
        }
      }

      // ---- Voice 3 (e.g. +1 Octave) ----
      if (g3 > 0.001) {
        const pA = this.phase3;
        const pB = pA >= 0.5 ? pA - 0.5 : pA + 0.5;

        const wA = 0.5 * (1.0 - Math.cos(twoPi * pA));
        const wB = 0.5 * (1.0 - Math.cos(twoPi * pB));

        const dA = pA * grainLen;
        const dB = pB * grainLen;

        const posA = (wIdx - dA + this.bufferSize) & this.bufferMask;
        const posB = (wIdx - dB + this.bufferSize) & this.bufferMask;

        const idxA0 = Math.floor(posA);
        const fracA = posA - idxA0;
        const idxA1 = (idxA0 + 1) & this.bufferMask;

        const idxB0 = Math.floor(posB);
        const fracB = posB - idxB0;
        const idxB1 = (idxB0 + 1) & this.bufferMask;

        const sigAL = this.bufL[idxA0] + fracA * (this.bufL[idxA1] - this.bufL[idxA0]);
        const sigBL = this.bufL[idxB0] + fracB * (this.bufL[idxB1] - this.bufL[idxB0]);
        voice3L = (sigAL * wA + sigBL * wB) * g3;

        const sigAR = this.bufR[idxA0] + fracA * (this.bufR[idxA1] - this.bufR[idxA0]);
        const sigBR = this.bufR[idxB0] + fracB * (this.bufR[idxB1] - this.bufR[idxB0]);
        voice3R = (sigAR * wA + sigBR * wB) * g3;
      }

      // 2-pole Range filtering (for Boss OC-5 Poly Range parameter: cleanly isolates lowest root note on chords)
      if (rangeCutoff < 15000 && !isVintage) {
        this.rangeLp1L += rangeAlpha * (voice1L - this.rangeLp1L);
        this.rangeLp2L += rangeAlpha * (this.rangeLp1L - this.rangeLp2L);
        voice1L = this.rangeLp2L;

        this.rangeLp1R += rangeAlpha * (voice1R - this.rangeLp1R);
        this.rangeLp2R += rangeAlpha * (this.rangeLp1R - this.rangeLp2R);
        voice1R = this.rangeLp2R;
      }

      // Summing dry + voices
      const totalL = sL * directGain + voice1L + voice2L + voice3L;
      const totalR = sR * directGain + voice1R + voice2R + voice3R;

      outL[i] = totalL;
      if (outR !== outL) outR[i] = totalR;

      this.prevSample = sL;

      // Advance phases with modulo 1.0 wrap
      this.phase1 = (this.phase1 + delta1) % 1.0;
      if (this.phase1 < 0) this.phase1 += 1.0;

      this.phase2 = (this.phase2 + delta2) % 1.0;
      if (this.phase2 < 0) this.phase2 += 1.0;

      this.phase3 = (this.phase3 + delta3) % 1.0;
      if (this.phase3 < 0) this.phase3 += 1.0;
    }

    return true;
  }
}

registerProcessor('noise-gate-processor', NoiseGateProcessor);
registerProcessor('looper-processor', LooperProcessor);
registerProcessor('compressor-processor', CompressorProcessor);
registerProcessor('phaser-processor', PhaserProcessor);
registerProcessor('feedback-clipper-processor', FeedbackClipperProcessor);
registerProcessor('pitch-shifter-processor', PitchShifterProcessor);
`;

let workletModuleUrl: string | null = null;
const registeredContexts = new WeakSet<AudioContext>();

export async function ensureWorkletsRegistered(ctx: AudioContext): Promise<void> {
  if (!ctx.audioWorklet) {
    console.warn('AudioWorklet is not supported in this browser context');
    return;
  }

  if (registeredContexts.has(ctx)) {
    return;
  }

  if (!workletModuleUrl) {
    const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
    workletModuleUrl = URL.createObjectURL(blob);
  }

  try {
    await ctx.audioWorklet.addModule(workletModuleUrl);
    registeredContexts.add(ctx);
  } catch (err) {
    console.error('Failed to register audio worklet module:', err);
    throw err;
  }
}
