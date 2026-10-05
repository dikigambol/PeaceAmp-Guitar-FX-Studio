/**
 * Pre-computes smooth transfer curves for Web Audio WaveShaperNode.
 * Explicitly allocates ArrayBuffer for strict Float32Array<ArrayBuffer> typing.
 */

export function makeOverdriveCurve(drive: number, n_samples = 4096): Float32Array<ArrayBuffer> {
  const buffer = new ArrayBuffer(n_samples * Float32Array.BYTES_PER_ELEMENT);
  const curve = new Float32Array(buffer);
  const k = Math.max(1, drive);

  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    // Asymmetric soft tube clipping
    if (x >= 0) {
      // Smooth hyperbolic tangent with tube compression
      curve[i] = Math.tanh(x * k * 0.9);
    } else {
      // Slightly more aggressive negative swing for natural tube asymmetry
      curve[i] = Math.tanh(x * k * 1.1) * 0.95;
    }
  }
  return curve;
}

export function makeDistortionCurve(gain: number, n_samples = 4096): Float32Array<ArrayBuffer> {
  const buffer = new ArrayBuffer(n_samples * Float32Array.BYTES_PER_ELEMENT);
  const curve = new Float32Array(buffer);
  const k = Math.max(1, gain * 1.5);
  const deg = Math.PI / 180;

  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    // Hard diode symmetrical clipping with sharp knee
    const saturated = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    curve[i] = Math.max(-0.95, Math.min(0.95, saturated));
  }
  return curve;
}

export function makeFuzzCurve(fuzz: number, n_samples = 4096): Float32Array<ArrayBuffer> {
  const buffer = new ArrayBuffer(n_samples * Float32Array.BYTES_PER_ELEMENT);
  const curve = new Float32Array(buffer);
  const k = Math.max(1, fuzz * 2.0);

  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    // Extreme squared-off saturation with touch of gating and octave harmonic bloom
    if (x === 0) {
      curve[i] = 0;
    } else {
      const sign = x > 0 ? 1 : -1;
      const mag = 1 - Math.exp(-Math.abs(x) * k);
      const asym = x > 0 ? 1.0 : 0.85;
      curve[i] = sign * mag * asym;
    }
  }
  return curve;
}
