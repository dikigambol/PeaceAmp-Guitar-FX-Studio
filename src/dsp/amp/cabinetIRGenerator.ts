import type { CabinetModelId, MicModelId } from '../../types/cabinet';

interface CabinetAcousticProfile {
  resonanceFreq: number; // Hz
  enclosureType: 'open' | 'closed';
  baseCutoff: number;    // Hz
  decaySpeed: number;    // 1/s
  coneQ: number;
  reflectionDelayMs: number; // For open back reflection
}

const CABINET_PROFILES: Record<Exclude<CabinetModelId, 'custom'>, CabinetAcousticProfile> = {
  '1x8-open': {
    resonanceFreq: 135,
    enclosureType: 'open',
    baseCutoff: 5200,
    decaySpeed: 65,
    coneQ: 0.35,
    reflectionDelayMs: 4.2,
  },
  '1x10-open': {
    resonanceFreq: 115,
    enclosureType: 'open',
    baseCutoff: 5600,
    decaySpeed: 55,
    coneQ: 0.40,
    reflectionDelayMs: 4.8,
  },
  '1x12-open': {
    resonanceFreq: 95,
    enclosureType: 'open',
    baseCutoff: 5400,
    decaySpeed: 48,
    coneQ: 0.45,
    reflectionDelayMs: 5.5,
  },
  '1x12-closed': {
    resonanceFreq: 90,
    enclosureType: 'closed',
    baseCutoff: 4700,
    decaySpeed: 52,
    coneQ: 0.50,
    reflectionDelayMs: 0,
  },
  '2x12-open': {
    resonanceFreq: 85,
    enclosureType: 'open',
    baseCutoff: 5800,
    decaySpeed: 42,
    coneQ: 0.45,
    reflectionDelayMs: 6.2,
  },
  '2x12-closed': {
    resonanceFreq: 80,
    enclosureType: 'closed',
    baseCutoff: 4900,
    decaySpeed: 46,
    coneQ: 0.55,
    reflectionDelayMs: 0,
  },
  '4x10-closed': {
    resonanceFreq: 75,
    enclosureType: 'closed',
    baseCutoff: 5100,
    decaySpeed: 44,
    coneQ: 0.52,
    reflectionDelayMs: 0,
  },
  '4x12-closed': {
    resonanceFreq: 70,
    enclosureType: 'closed',
    baseCutoff: 4800,
    decaySpeed: 38,
    coneQ: 0.58,
    reflectionDelayMs: 0,
  },
};

/**
 * Generates a realistic cabinet + microphone impulse response buffer
 * @param ctx AudioContext
 * @param cabinet CabinetModelId
 * @param mic MicModelId
 * @param position 0.0 (Edge / Off-Axis, warmer/darker) to 1.0 (Center / On-Axis, direct bite)
 */
export function generateCabinetImpulseResponse(
  ctx: AudioContext,
  cabinet: CabinetModelId,
  mic: MicModelId,
  position: number = 0.5
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const durationSec = 0.06; // 60ms speaker reflection & room decay
  const length = Math.floor(sampleRate * durationSec);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const profile = CABINET_PROFILES[cabinet === 'custom' ? '4x12-closed' : cabinet] || CABINET_PROFILES['4x12-closed'];

  // Position influence:
  // Center (1.0) = higher cutoff (bright, immediate), Edge (0.0) = lower cutoff (warm, mellow)
  const posFactor = Math.max(0, Math.min(1, position));
  const cutoffVariation = (posFactor - 0.5) * 1600; // -800Hz at edge, +800Hz at center
  const effectiveCutoff = Math.max(2500, profile.baseCutoff + cutoffVariation);

  // Mic frequency response shaping parameters
  let presenceFreq = 5000;
  let presenceGain = 0.2;
  let subCutoff = 120;
  let micAir = 0.05;

  switch (mic) {
    case 'sm57':
      // Classic Shure SM57: Aggressive 5kHz peak, tight bass roll-off below 150Hz
      presenceFreq = 5200;
      presenceGain = 0.45 * (0.6 + 0.4 * posFactor);
      subCutoff = 150;
      micAir = 0.02;
      break;

    case 'md421':
      // Sennheiser MD421: Aggressive bite at 4.2kHz, deeper bass reach (85Hz)
      presenceFreq = 4200;
      presenceGain = 0.35 * (0.6 + 0.4 * posFactor);
      subCutoff = 85;
      micAir = 0.06;
      break;

    case 'ribbon':
      // Royer R-121: Silky roll-off above 3.5kHz, lush warm low-mids (250Hz), zero harshness
      presenceFreq = 2600;
      presenceGain = 0.15;
      subCutoff = 60;
      micAir = -0.15; // Smooth high roll-off
      break;

    case 'condenser':
      // AKG C414 / U87: Flat full bandwidth, extended top-end air at 10kHz
      presenceFreq = 7000;
      presenceGain = 0.25;
      subCutoff = 45;
      micAir = 0.18; // Extended air
      break;
  }

  const dt = 1 / sampleRate;
  const w0 = 2 * Math.PI * profile.resonanceFreq;
  const wCut = 2 * Math.PI * effectiveCutoff;
  const wPres = 2 * Math.PI * presenceFreq;
  const wSub = 2 * Math.PI * subCutoff;

  const reflectionDelaySamples = Math.floor((profile.reflectionDelayMs / 1000) * sampleRate);

  let peakMagnitude = 0.0001;

  for (let i = 0; i < length; i++) {
    const t = i * dt;
    const envelope = Math.exp(-profile.decaySpeed * t);

    // 1. Direct speaker cone attack and damping
    const directSound = Math.exp(-wCut * t * 0.35) * (1 - t * 25);

    // 2. Main cabinet/cone resonance (low thump)
    const coneResonance = Math.sin(w0 * t) * profile.coneQ * Math.exp(-profile.decaySpeed * 0.8 * t);

    // 3. Microphone presence peak oscillation
    const presencePeak = Math.sin(wPres * t) * presenceGain * Math.exp(-120 * t);

    // 4. Sub-bass filter envelope (highpass rumble attenuation)
    const subDamping = 1 - Math.exp(-wSub * t * 0.5);

    // 5. Open Back rear cabinet wall reflection
    let openBackReflection = 0;
    if (profile.enclosureType === 'open' && i >= reflectionDelaySamples) {
      const reflTime = (i - reflectionDelaySamples) * dt;
      openBackReflection = Math.exp(-wCut * reflTime * 0.4) * 0.22 * Math.exp(-40 * reflTime);
    }

    // 6. Deterministic paper cone modal break-up (eigenmodes at 1.85k, 2.75k, 3.65k Hz)
    // Eliminates random white noise, ensuring bit-for-bit reproducible, realistic acoustic response
    const coneBreakup = (
      Math.sin(2 * Math.PI * 1850 * t) * 0.018 * Math.exp(-220 * t) +
      Math.sin(2 * Math.PI * 2750 * t) * 0.012 * Math.exp(-280 * t) +
      Math.sin(2 * Math.PI * 3650 * t) * 0.008 * Math.exp(-340 * t)
    ) * (1 + micAir);

    const rawSignal = (directSound + coneResonance + presencePeak + openBackReflection + coneBreakup) * subDamping * envelope;

    // Stereo spread (slight micro-delay 0.08ms on right channel for wide acoustic spatialization)
    const rOffset = Math.min(i + 4, length - 1);
    left[i] = rawSignal;
    right[i] = rawSignal * 0.95 + (left[rOffset] || 0) * 0.05;

    const absVal = Math.max(Math.abs(left[i]), Math.abs(right[i]));
    if (absVal > peakMagnitude) {
      peakMagnitude = absVal;
    }
  }

  // Normalize IR peak to consistent standard level (-1 dB equivalent, 0.9)
  const normFactor = 0.9 / peakMagnitude;
  for (let i = 0; i < length; i++) {
    left[i] *= normFactor;
    right[i] *= normFactor;
  }

  return buffer;
}
