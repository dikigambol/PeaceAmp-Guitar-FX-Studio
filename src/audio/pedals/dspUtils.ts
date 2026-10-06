/**
 * Shared DSP helpers for all pedal models:
 *  - consistent gain staging (Level / Output knob taper)
 *  - DC blocking after asymmetric clipping stages
 */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Unified Level / Volume / Output knob taper (0 - 10) -> linear gain.
 *
 *  - Knob at 5 (noon) = 0 dB + trimDb  (trimDb is calibrated per pedal so that
 *    every pedal sits at roughly unity loudness at noon settings)
 *  - Knob at 0        = silent (smooth fade, no zipper)
 *  - Knob at 10       = +10 dB over noon
 *  - Below noon       = 30 dB of attenuation range
 */
export function levelToGain(level: number, trimDb = 0): number {
  const l = clamp(level, 0, 10);
  const db = l < 5 ? -30 * (1 - l / 5) : (10 * (l - 5)) / 5;
  let gain = Math.pow(10, (db + trimDb) / 20);
  if (l < 0.5) gain *= l / 0.5;
  return gain;
}

/**
 * Creates a DC blocker (2nd-order Butterworth high-pass far below the guitar range).
 * Asymmetric clipping creates DC offset that otherwise eats headroom,
 * thumps on bypass and biases the next pedal in the chain.
 */
export function createDcBlocker(ctx: BaseAudioContext, frequency = 12): BiquadFilterNode {
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(frequency, ctx.currentTime);
  filter.Q.setValueAtTime(0.707, ctx.currentTime);
  return filter;
}

/**
 * Click-free, pop-free true bypass crossfade.
 * Resilient against conflicting scheduled automation and guarantees exact 0.0 wet leakage.
 */
export function applyBypassCrossfade(
  wetGain: GainNode,
  dryGain: GainNode,
  enabled: boolean,
  ctx: BaseAudioContext,
  fadeTime = 0.012
): void {
  const now = ctx.currentTime;
  const targetWet = enabled ? 1.0 : 0.0;
  const targetDry = enabled ? 0.0 : 1.0;

  try {
    wetGain.gain.cancelScheduledValues(now);
    wetGain.gain.setValueAtTime(wetGain.gain.value, now);
    wetGain.gain.linearRampToValueAtTime(targetWet, now + fadeTime);

    dryGain.gain.cancelScheduledValues(now);
    dryGain.gain.setValueAtTime(dryGain.gain.value, now);
    dryGain.gain.linearRampToValueAtTime(targetDry, now + fadeTime);
  } catch {
    wetGain.gain.setValueAtTime(targetWet, now);
    dryGain.gain.setValueAtTime(targetDry, now);
  }
}

