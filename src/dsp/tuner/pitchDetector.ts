export interface TunerResult {
  frequency: number;
  note: string;
  octave: number;
  cents: number;      // -50 to +50
  inTune: boolean;    // true if within +/- 3 cents
  status: 'flat' | 'in-tune' | 'sharp';
  clarity: number;    // 0 to 1 confidence
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Autocorrelation pitch detector optimized for electric and acoustic guitar
 */
export function detectPitch(
  buffer: Float32Array,
  sampleRate: number,
  minFreq = 65,    // Down to Drop-C / Drop-D
  maxFreq = 1000   // Up to high E 19th fret
): TunerResult | null {
  const size = buffer.length;

  // 1. RMS signal energy check (ignore silence / background noise)
  let sumSquares = 0;
  for (let i = 0; i < size; i++) {
    sumSquares += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sumSquares / size);
  if (rms < 0.012) {
    return null;
  }

  // 2. Correlation lag boundaries
  const minLag = Math.floor(sampleRate / maxFreq);
  const maxLag = Math.floor(sampleRate / minFreq);

  // 3. Autocorrelation search
  let bestCorrelation = -1;
  let bestLag = -1;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let correlation = 0;
    for (let i = 0; i < size - lag; i++) {
      correlation += buffer[i] * buffer[i + lag];
    }
    // Normalize by lag window
    correlation /= (size - lag);

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }

  if (bestLag <= 0 || bestCorrelation < rms * rms * 0.4) {
    return null;
  }

  // 4. Parabolic peak interpolation for sub-sample accuracy
  let exactLag = bestLag;
  if (bestLag > minLag && bestLag < maxLag) {
    let prev = 0;
    let next = 0;
    for (let i = 0; i < size - (bestLag + 1); i++) {
      prev += buffer[i] * buffer[i + bestLag - 1];
      next += buffer[i] * buffer[i + bestLag + 1];
    }
    prev /= (size - (bestLag - 1));
    next /= (size - (bestLag + 1));

    const delta = (next - prev) / (2 * (2 * bestCorrelation - prev - next));
    if (Math.abs(delta) < 1) {
      exactLag += delta;
    }
  }

  const frequency = sampleRate / exactLag;
  if (frequency < minFreq || frequency > maxFreq) {
    return null;
  }

  // 5. Note calculation (A4 = 440 Hz)
  const midiNumber = 12 * Math.log2(frequency / 440) + 69;
  const nearestMidi = Math.round(midiNumber);
  const targetFrequency = 440 * Math.pow(2, (nearestMidi - 69) / 12);
  const cents = Math.round(1200 * Math.log2(frequency / targetFrequency));

  const noteIndex = (nearestMidi % 12 + 12) % 12;
  const note = NOTE_NAMES[noteIndex];
  const octave = Math.floor(nearestMidi / 12) - 1;

  const inTune = Math.abs(cents) <= 3;
  const status = inTune ? 'in-tune' : cents < 0 ? 'flat' : 'sharp';

  return {
    frequency,
    note,
    octave,
    cents,
    inTune,
    status,
    clarity: Math.min(1, bestCorrelation / (rms * rms)),
  };
}
