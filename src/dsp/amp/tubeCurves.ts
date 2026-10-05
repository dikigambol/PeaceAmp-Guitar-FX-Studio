/**
 * 12AX7 Triode Vacuum Tube transfer curve simulation
 * Models non-linear grid conduction, warm second-harmonic generation,
 * and soft saturation compression.
 */
export function makeTubePreampCurve(gain: number, n_samples = 4096): Float32Array<ArrayBuffer> {
  const buffer = new ArrayBuffer(n_samples * Float32Array.BYTES_PER_ELEMENT);
  const curve = new Float32Array(buffer);
  const drive = Math.max(1, gain * 1.2);

  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    // 12AX7 triode asymmetric transfer function
    if (x >= 0) {
      // Soft saturation approaching cutoff
      curve[i] = (1 - Math.exp(-x * drive)) / (1 - Math.exp(-drive));
    } else {
      // Deeper grid compression on negative swing
      const neg = -x * drive * 0.8;
      curve[i] = -(1 - Math.exp(-neg)) / (1 - Math.exp(-drive * 0.8)) * 0.95;
    }
  }
  return curve;
}

/**
 * Generates an impulse response for speaker cabinet simulation
 * model: 0 = 4x12 Vintage 30, 1 = 2x12 US Twin, 2 = 1x12 Tweed
 * micDistance: 0 = on-axis (bright), 1 = off-axis (warm)
 */
export function generateCabinetImpulseResponse(
  ctx: AudioContext,
  model = 0,
  micDistance = 0.3
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * 0.05); // 50ms cabinet reflection
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Model-specific resonant frequencies and cutoff
  let resonanceFreq: number;
  let highCutFreq: number;
  let decaySpeed: number;

  if (model === 0) {
    // 4x12 Vintage 30: heavy punch @ 90Hz, cut @ 4800Hz
    resonanceFreq = 90;
    highCutFreq = 4800 - micDistance * 1200;
    decaySpeed = 50;
  } else if (model === 1) {
    // 2x12 Open Back: open resonance @ 110Hz, sparkle up to 5500Hz
    resonanceFreq = 110;
    highCutFreq = 5500 - micDistance * 1500;
    decaySpeed = 45;
  } else {
    // 1x12 Tweed: warm woody resonance @ 125Hz, smooth cut @ 4200Hz
    resonanceFreq = 125;
    highCutFreq = 4200 - micDistance * 1000;
    decaySpeed = 60;
  }

  const dt = 1 / sampleRate;
  const w0 = 2 * Math.PI * resonanceFreq;
  const wCut = 2 * Math.PI * highCutFreq;

  for (let i = 0; i < length; i++) {
    const t = i * dt;
    const envelope = Math.exp(-decaySpeed * t);

    // Damped speaker cone oscillation + lowpass impulse
    const coneResonance = Math.sin(w0 * t) * 0.4;
    const directSound = Math.exp(-wCut * t * 0.4) * (1 - t * 20);

    const sampleL = (directSound + coneResonance + (Math.random() * 0.05 - 0.025)) * envelope;
    const sampleR = (directSound + coneResonance + (Math.random() * 0.05 - 0.025)) * envelope;

    left[i] = sampleL;
    right[i] = sampleR;
  }

  return buffer;
}
