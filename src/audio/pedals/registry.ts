import type { AudioPedalNode, PedalMetadata } from '../../types/pedal';
import { MxrDynaCompNode } from './compressor/MxrDynaCompNode';
import { RossCompressorNode } from './compressor/RossCompressorNode';
import { BossCs3Node } from './compressor/BossCs3Node';
import { KeeleyCompressorNode } from './compressor/KeeleyCompressorNode';

// Overdrive Nodes
import { Ts808Node } from './overdrive/Ts808Node';
import { Ts9Node } from './overdrive/Ts9Node';
import { BossSd1Node } from './overdrive/BossSd1Node';
import { BossOd3Node } from './overdrive/BossOd3Node';
import { BossBd2Node } from './overdrive/BossBd2Node';
import { KlonCentaurNode } from './overdrive/KlonCentaurNode';
import { FulltoneOcdNode } from './overdrive/FulltoneOcdNode';
import { TsMiniNode } from './overdrive/TsMiniNode';
import { NobelsOdr1Node } from './overdrive/NobelsOdr1Node';
import { RockettArcherNode } from './overdrive/RockettArcherNode';

/**
 * Curated pedal definitions for Category 1 (Compressor) and Category 2 (Overdrive)
 * Exactly modeled according to pedalbox-list.md and reference hardware samples.
 */
export const PEDAL_DEFINITIONS: Record<string, PedalMetadata> = {
  // Category 1: Compressors
  'comp-dynacomp': {
    type: 'comp-dynacomp',
    name: 'MXR Dyna Comp',
    subtitle: 'Classic OTA Nashville Squash',
    category: 'dynamics',
    chassisColor: '#b91c1c',
    accentColor: '#ffffff',
    parameters: [
      { id: 'output', name: 'OUTPUT', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'sensitivity', name: 'SENSITIVITY', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
    ],
  },
  'comp-ross': {
    type: 'comp-ross',
    name: 'Ross Compressor',
    subtitle: 'Vintage Smooth Singing Sustain',
    category: 'dynamics',
    chassisColor: '#7a838d',
    accentColor: '#f1f5f9',
    parameters: [
      { id: 'sustain', name: 'SUSTAIN', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'level', name: 'LEVEL', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
    ],
  },
  'comp-cs3': {
    type: 'comp-cs3',
    name: 'Boss CS-3',
    subtitle: 'Compression Sustainer',
    category: 'dynamics',
    chassisColor: '#1a62bf',
    accentColor: '#ffffff',
    parameters: [
      { id: 'level', name: 'LEVEL', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'tone', name: 'TONE', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'attack', name: 'ATTACK', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'sustain', name: 'SUSTAIN', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
    ],
  },
  'comp-keeley': {
    type: 'comp-keeley',
    name: 'Keeley Compressor',
    subtitle: '4-Knob Studio Audiophile C4',
    category: 'dynamics',
    chassisColor: '#b8bcc4',
    accentColor: '#1e293b',
    parameters: [
      { id: 'sustain', name: 'SUSTAIN', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'level', name: 'LEVEL', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'attack', name: 'ATTACK', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'clipping', name: 'CLIPPING', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
    ],
  },

  // Category 2: Overdrives
  'od-ts808': {
    type: 'od-ts808',
    name: 'Tube Screamer TS-808',
    subtitle: 'Original Overdrive Pro',
    category: 'drive',
    chassisColor: '#15803d',
    accentColor: '#ffffff',
    parameters: [
      { id: 'overdrive', name: 'OVERDRIVE', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'tone', name: 'TONE', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'level', name: 'LEVEL', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
    ],
  },
  'od-ts9': {
    type: 'od-ts9',
    name: 'Ibanez TS9',
    subtitle: 'Classic 9-Series Tube Screamer',
    category: 'drive',
    chassisColor: '#4ade80',
    accentColor: '#0f172a',
    parameters: [
      { id: 'drive', name: 'DRIVE', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'tone', name: 'TONE', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'level', name: 'LEVEL', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
    ],
  },
  'od-sd1': {
    type: 'od-sd1',
    name: 'Boss SD-1',
    subtitle: 'Super OverDrive (Asymmetrical Clipping)',
    category: 'drive',
    chassisColor: '#eab308',
    accentColor: '#0f172a',
    parameters: [
      { id: 'level', name: 'LEVEL', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'tone', name: 'TONE', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'drive', name: 'DRIVE', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
    ],
  },
  'od-od3': {
    type: 'od-od3',
    name: 'Boss OD-3',
    subtitle: 'Dual-Stage OverDrive',
    category: 'drive',
    chassisColor: '#ca8a04',
    accentColor: '#1c1917',
    parameters: [
      { id: 'level', name: 'LEVEL', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'tone', name: 'TONE', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'drive', name: 'DRIVE', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
    ],
  },
  'od-bd2': {
    type: 'od-bd2',
    name: 'Boss BD-2',
    subtitle: 'Blues Driver (FET Transistor Crunch)',
    category: 'drive',
    chassisColor: '#1d4ed8',
    accentColor: '#fbbf24',
    parameters: [
      { id: 'level', name: 'LEVEL', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'tone', name: 'TONE', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'gain', name: 'GAIN', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
    ],
  },
  'od-klon': {
    type: 'od-klon',
    name: 'Klon Centaur',
    subtitle: 'Gold Horsie Transparent Overdrive',
    category: 'drive',
    chassisColor: '#d97706',
    accentColor: '#451a03',
    parameters: [
      { id: 'gain', name: 'GAIN', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'treble', name: 'TREBLE', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'output', name: 'OUTPUT', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
    ],
  },
  'od-ocd': {
    type: 'od-ocd',
    name: 'Fulltone OCD',
    subtitle: 'Obsessive Compulsive Drive (MOSFET HP/LP)',
    category: 'drive',
    chassisColor: '#f1f5f9',
    accentColor: '#0f172a',
    parameters: [
      { id: 'volume', name: 'Volume', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'tone', name: 'Tone', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'drive', name: 'Drive', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'mode', name: 'Voice HP/LP', min: 0, max: 1, step: 1, defaultValue: 1, formatValue: (v) => (v >= 0.5 ? 'HP' : 'LP') },
    ],
  },
  'od-tsmini': {
    type: 'od-tsmini',
    name: 'Tube Screamer Mini',
    subtitle: 'JRC4558 Mini Format Overdrive',
    category: 'drive',
    chassisColor: '#16a34a',
    accentColor: '#ffffff',
    parameters: [
      { id: 'overdrive', name: 'OVERDRIVE', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'tone', name: 'TONE', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'level', name: 'LEVEL', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
    ],
  },
  'od-odr1': {
    type: 'od-odr1',
    name: 'Nobels ODR-1',
    subtitle: 'Natural Overdrive (Nashville Spectrum EQ)',
    category: 'drive',
    chassisColor: '#84cc16',
    accentColor: '#111827',
    parameters: [
      { id: 'drive', name: 'DRIVE', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'spectrum', name: 'SPECTRUM', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'level', name: 'LEVEL', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'bassCut', name: 'BASS CUT', min: 0, max: 10, step: 0.1, defaultValue: 0, formatValue: (v) => v.toFixed(1) },
      { id: 'gainBoost', name: 'GAIN BOOST', min: 0, max: 1, step: 1, defaultValue: 0, formatValue: (v) => (v >= 0.5 ? 'ON' : 'OFF') },
    ],
  },
  'od-archer': {
    type: 'od-archer',
    name: 'Rockett Archer',
    subtitle: 'Tour Series Germanium Overdrive',
    category: 'drive',
    chassisColor: '#cbd5e1',
    accentColor: '#1e293b',
    parameters: [
      { id: 'output', name: 'OUTPUT', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'treble', name: 'TREBLE', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'gain', name: 'GAIN', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
    ],
  },
};

export function createPedalAudioNode(
  type: string,
  ctx: AudioContext,
  id: string,
  initialParams?: Record<string, number>,
  enabled = true
): AudioPedalNode {
  switch (type) {
    // Compressors
    case 'comp-dynacomp':
      return new MxrDynaCompNode(ctx, id, initialParams, enabled);
    case 'comp-ross':
      return new RossCompressorNode(ctx, id, initialParams, enabled);
    case 'comp-cs3':
      return new BossCs3Node(ctx, id, initialParams, enabled);
    case 'comp-keeley':
      return new KeeleyCompressorNode(ctx, id, initialParams, enabled);

    // Overdrives
    case 'od-ts808':
      return new Ts808Node(ctx, id, initialParams, enabled);
    case 'od-ts9':
      return new Ts9Node(ctx, id, initialParams, enabled);
    case 'od-sd1':
      return new BossSd1Node(ctx, id, initialParams, enabled);
    case 'od-od3':
      return new BossOd3Node(ctx, id, initialParams, enabled);
    case 'od-bd2':
      return new BossBd2Node(ctx, id, initialParams, enabled);
    case 'od-klon':
      return new KlonCentaurNode(ctx, id, initialParams, enabled);
    case 'od-ocd':
      return new FulltoneOcdNode(ctx, id, initialParams, enabled);
    case 'od-tsmini':
      return new TsMiniNode(ctx, id, initialParams, enabled);
    case 'od-odr1':
      return new NobelsOdr1Node(ctx, id, initialParams, enabled);
    case 'od-archer':
      return new RockettArcherNode(ctx, id, initialParams, enabled);

    default:
      throw new Error(`Unknown pedal type: ${type}`);
  }
}

