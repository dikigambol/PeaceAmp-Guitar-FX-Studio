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
import { BigMuffNode } from './fuzz/BigMuffNode';
import { FuzzFaceNode } from './fuzz/FuzzFaceNode';
import { ToneBenderNode } from './fuzz/ToneBenderNode';
import { FuzzFactoryNode } from './fuzz/FuzzFactoryNode';
import { FlatironFuzzNode } from './fuzz/FlatironFuzzNode';
import { EqdHoofNode } from './fuzz/EqdHoofNode';

// Distortion Nodes
import { BossDs1Node } from './distortion/BossDs1Node';
import { BossHm2Node } from './distortion/BossHm2Node';
import { BossMt2Node } from './distortion/BossMt2Node';
import { IbanezSm7Node } from './distortion/IbanezSm7Node';
import { MarshallShredMasterNode } from './distortion/MarshallShredMasterNode';
import { MxrDistortionPlusNode } from './distortion/MxrDistortionPlusNode';
import { ProCoRatNode } from './distortion/ProCoRatNode';

// Boost Nodes
import { MxrMicroAmpNode } from './boost/MxrMicroAmpNode';
import { RangemasterNode } from './boost/RangemasterNode';
import { TcSparkMiniNode } from './boost/TcSparkMiniNode';
import { XoticEpBoosterNode } from './boost/XoticEpBoosterNode';

// Wah / Filter Nodes
import { BossAw3Node } from './wah/BossAw3Node';

// Equalizer Nodes
import { BossGe7Node } from './eq/BossGe7Node';

// Chorus Nodes
import { BossCe2Node } from './chorus/BossCe2Node';
import { BossCh1Node } from './chorus/BossCh1Node';
import { EhxSmallCloneNode } from './chorus/EhxSmallCloneNode';
import { MxrAnalogChorusNode } from './chorus/MxrAnalogChorusNode';

// Delay Nodes
import { BossDm2Node } from './delay/BossDm2Node';
import { MxrCarbonCopyNode } from './delay/MxrCarbonCopyNode';
import { TcGaussTapeEchoNode } from './delay/TcGaussTapeEchoNode';

// Flanger Nodes
import { BossBf2Node } from './flanger/BossBf2Node';
import { EhxElectricMistressNode } from './flanger/EhxElectricMistressNode';
import { MxrFlangerNode } from './flanger/MxrFlangerNode';

// Phaser Nodes
import { EhxSmallStoneNode } from './phaser/EhxSmallStoneNode';
import { MxrPhase90Node } from './phaser/MxrPhase90Node';

// Pitch Nodes
import { BossOc5Node } from './pitch/BossOc5Node';
import { EhxPitchForkNode } from './pitch/EhxPitchForkNode';

// Tremolo Nodes
import { BossTr2Node } from './tremolo/BossTr2Node';
import { FulltoneSupaTremNode } from './tremolo/FulltoneSupaTremNode';

/**
 * Curated pedal definitions for Category 1 (Compressor), Category 2 (Overdrive), and Category 4 (Fuzz)
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

  // Category 3: Distortion
  'dist-ds1': {
    type: 'dist-ds1',
    name: 'Boss DS-1',
    subtitle: 'Classic Orange Distortion',
    category: 'distortion',
    chassisColor: '#fa5c1b',
    accentColor: '#111827',
    parameters: [
      { id: 'tone', name: 'TONE', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'level', name: 'LEVEL', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'dist', name: 'DIST', min: 0, max: 10, step: 0.1, defaultValue: 6, formatValue: (v) => v.toFixed(1) },
    ],
  },
  'dist-hm2': {
    type: 'dist-hm2',
    name: 'Boss HM-2 Heavy Metal',
    subtitle: 'Swedish Chainsaw Distortion',
    category: 'distortion',
    chassisColor: '#18191c',
    accentColor: '#f97316',
    parameters: [
      { id: 'level', name: 'LEVEL', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'colorMixL', name: 'COLOR MIX L', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'colorMixH', name: 'COLOR MIX H', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'dist', name: 'DIST', min: 0, max: 10, step: 0.1, defaultValue: 6, formatValue: (v) => v.toFixed(1) },
    ],
  },
  'dist-mt2': {
    type: 'dist-mt2',
    name: 'Boss MT-2 Metal Zone',
    subtitle: 'Dual-Stage Distortion with 3-Band Parametric EQ',
    category: 'distortion',
    chassisColor: '#2b2d32',
    accentColor: '#ff6b21',
    parameters: [
      { id: 'level', name: 'LEVEL', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'high', name: 'HIGH', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => `${(-15 + (v / 10) * 30) > 0 ? '+' : ''}${(-15 + (v / 10) * 30).toFixed(0)} dB` },
      { id: 'low', name: 'LOW', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => `${(-15 + (v / 10) * 30) > 0 ? '+' : ''}${(-15 + (v / 10) * 30).toFixed(0)} dB` },
      { id: 'middle', name: 'MIDDLE', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => `${(-15 + (v / 10) * 30) > 0 ? '+' : ''}${(-15 + (v / 10) * 30).toFixed(0)} dB` },
      {
        id: 'midFreq',
        name: 'MID FREQ',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5,
        formatValue: (v) => {
          const freq = 200 * Math.pow(25.0, v / 10);
          return freq >= 1000 ? `${(freq / 1000).toFixed(1)}k Hz` : `${Math.round(freq)} Hz`;
        },
      },
      { id: 'dist', name: 'DIST', min: 0, max: 10, step: 0.1, defaultValue: 6, formatValue: (v) => v.toFixed(1) },
    ],
  },
  'dist-sm7': {
    type: 'dist-sm7',
    name: 'Ibanez SM7 Smash Box',
    subtitle: 'Tone-Lok Nu-Metal Distortion with VOID Gate',
    category: 'distortion',
    chassisColor: '#8a9497',
    accentColor: '#00e676',
    parameters: [
      { id: 'drive', name: 'DRIVE', min: 0, max: 10, step: 0.1, defaultValue: 6, formatValue: (v) => v.toFixed(1) },
      { id: 'lo', name: 'LO', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => `${(-14 + (v / 10) * 28) > 0 ? '+' : ''}${(-14 + (v / 10) * 28).toFixed(0)} dB` },
      { id: 'hi', name: 'HI', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => `${(-14 + (v / 10) * 28) > 0 ? '+' : ''}${(-14 + (v / 10) * 28).toFixed(0)} dB` },
      { id: 'level', name: 'LEVEL', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'void', name: 'VOID', min: 0, max: 2, step: 1, defaultValue: 1, formatValue: (v) => (v === 0 ? 'OFF' : v === 1 ? '1' : '2') },
      { id: 'edge', name: 'EDGE', min: 0, max: 1, step: 1, defaultValue: 0, formatValue: (v) => (v === 0 ? 'SHARP' : 'SMOOTH') },
    ],
  },
  'dist-shredmaster': {
    type: 'dist-shredmaster',
    name: 'Marshall ShredMaster',
    subtitle: 'Classic 1991 British High-Gain Distortion',
    category: 'distortion',
    chassisColor: '#1c1e22',
    accentColor: '#d4af37',
    parameters: [
      { id: 'gain', name: 'Gain', min: 0, max: 10, step: 0.1, defaultValue: 6, formatValue: (v) => v.toFixed(1) },
      { id: 'bass', name: 'Bass', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => `${(-12 + (v / 10) * 24) > 0 ? '+' : ''}${(-12 + (v / 10) * 24).toFixed(0)} dB` },
      { id: 'contour', name: 'Contour', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => (v < 4 ? 'British Mid-Boost' : v > 6 ? 'Shoegaze Scoop' : 'Flat Mid') },
      { id: 'treble', name: 'Treble', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => `${(-12 + (v / 10) * 24) > 0 ? '+' : ''}${(-12 + (v / 10) * 24).toFixed(0)} dB` },
      { id: 'volume', name: 'Volume', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
    ],
  },
  'dist-mxrdistplus': {
    type: 'dist-mxrdistplus',
    name: 'MXR Distortion+',
    subtitle: 'Classic 1970s Germanium Hard Clipper',
    category: 'distortion',
    chassisColor: '#d9a726',
    accentColor: '#1a1a1a',
    parameters: [
      { id: 'output', name: 'OUTPUT', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'distortion', name: 'DISTORTION', min: 0, max: 10, step: 0.1, defaultValue: 6, formatValue: (v) => v.toFixed(1) },
    ],
  },
  'dist-procorat': {
    type: 'dist-procorat',
    name: 'ProCo RAT 2',
    subtitle: 'Classic 1988 LM308 Rodent Distortion',
    category: 'distortion',
    chassisColor: '#121316',
    accentColor: '#ffffff',
    parameters: [
      { id: 'distortion', name: 'DISTORTION', min: 0, max: 10, step: 0.1, defaultValue: 6, formatValue: (v) => v.toFixed(1) },
      { id: 'filter', name: 'FILTER', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => (v < 3 ? 'Bright Cut' : v > 7 ? 'Woolly Warm' : 'Balanced Lead') },
      { id: 'volume', name: 'VOLUME', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
    ],
  },

  // Category 4: Fuzz
  'fuzz-bigmuff': {
    type: 'fuzz-bigmuff',
    name: 'Electro-Harmonix Big Muff',
    subtitle: 'Classic Pi Sustainer & Fuzz',
    category: 'fuzz',
    chassisColor: '#cbd1d6',
    accentColor: '#d81d24',
    parameters: [
      { id: 'volume', name: 'VOLUME', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'tone', name: 'TONE', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'sustain', name: 'SUSTAIN', min: 0, max: 10, step: 0.1, defaultValue: 6, formatValue: (v) => v.toFixed(1) },
    ],
  },
  'fuzz-fuzzface': {
    type: 'fuzz-fuzzface',
    name: 'Fuzz Face',
    subtitle: 'Dallas Arbiter Germanium PNP',
    category: 'fuzz',
    chassisColor: '#dc2626',
    accentColor: '#ffffff',
    parameters: [
      { id: 'volume', name: 'VOLUME', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'fuzz', name: 'FUZZ', min: 0, max: 10, step: 0.1, defaultValue: 6, formatValue: (v) => v.toFixed(1) },
    ],
  },
  'fuzz-tonebender': {
    type: 'fuzz-tonebender',
    name: 'Tone Bender',
    subtitle: 'Sola Sound Professional MKII',
    category: 'fuzz',
    chassisColor: '#94a3b8',
    accentColor: '#0f172a',
    parameters: [
      { id: 'level', name: 'LEVEL', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'attack', name: 'ATTACK', min: 0, max: 10, step: 0.1, defaultValue: 6, formatValue: (v) => v.toFixed(1) },
    ],
  },
  'fuzz-fuzzfactory': {
    type: 'fuzz-fuzzfactory',
    name: 'ZVEX Fuzz Factory',
    subtitle: '5-Knob Oscillating Germanium Fuzz',
    category: 'fuzz',
    chassisColor: '#e2e8f0',
    accentColor: '#0f172a',
    parameters: [
      { id: 'vol', name: 'VOL', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'gate', name: 'GATE', min: 0, max: 10, step: 0.1, defaultValue: 4, formatValue: (v) => v.toFixed(1) },
      { id: 'comp', name: 'COMP', min: 0, max: 10, step: 0.1, defaultValue: 3, formatValue: (v) => v.toFixed(1) },
      { id: 'drive', name: 'DRIVE', min: 0, max: 10, step: 0.1, defaultValue: 6, formatValue: (v) => v.toFixed(1) },
      { id: 'stab', name: 'STAB', min: 0, max: 10, step: 0.1, defaultValue: 8.5, formatValue: (v) => v.toFixed(1) },
    ],
  },
  'fuzz-flatiron': {
    type: 'fuzz-flatiron',
    name: 'Electro-Harmonix Fuzz',
    subtitle: 'Flatiron Op-Amp Hard Clipper',
    category: 'fuzz',
    chassisColor: '#f8fafc',
    accentColor: '#ea580c',
    parameters: [
      { id: 'vol', name: 'VOL', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'drive', name: 'DRIVE', min: 0, max: 10, step: 0.1, defaultValue: 6, formatValue: (v) => v.toFixed(1) },
      { id: 'filter', name: 'FILTER', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
    ],
  },
  'fuzz-hoof': {
    type: 'fuzz-hoof',
    name: 'EarthQuaker Devices Hoof',
    subtitle: 'Hybrid Ge/Si Fuzz with Shift EQ',
    category: 'fuzz',
    chassisColor: '#caa137',
    accentColor: '#18181b',
    parameters: [
      { id: 'shift', name: 'SHIFT', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'tone', name: 'TONE', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'level', name: 'LEVEL', min: 0, max: 10, step: 0.1, defaultValue: 5, formatValue: (v) => v.toFixed(1) },
      { id: 'fuzz', name: 'FUZZ', min: 0, max: 10, step: 0.1, defaultValue: 6, formatValue: (v) => v.toFixed(1) },
    ],
  },

  // Category 5: Boost
  'boost-mxr-microamp': {
    type: 'boost-mxr-microamp',
    name: 'MXR Micro Amp',
    subtitle: 'Classic Transparent +26dB Clean Preamp Boost',
    category: 'boost',
    chassisColor: '#d7d0be',
    accentColor: '#111827',
    parameters: [
      {
        id: 'gain',
        name: 'GAIN',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5,
        formatValue: (v) => `+${(v * 2.6).toFixed(1)} dB`,
      },
    ],
  },
  'boost-rangemaster': {
    type: 'boost-rangemaster',
    name: 'Rangemaster Treble Booster',
    subtitle: '1965 British Germanium OC44 Lead Booster',
    category: 'boost',
    chassisColor: '#d1d5db',
    accentColor: '#18181b',
    parameters: [
      {
        id: 'set',
        name: 'SET',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5,
        formatValue: (v) => `+${(v * 2.8).toFixed(1)} dB`,
      },
    ],
  },
  'boost-spark-mini': {
    type: 'boost-spark-mini',
    name: 'TC Electronic Spark Mini',
    subtitle: 'Discrete Analog +20dB Clean Boost with PrimeTech',
    category: 'boost',
    chassisColor: '#f8f8fa',
    accentColor: '#9c7b28',
    parameters: [
      {
        id: 'level',
        name: 'LEVEL',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5,
        formatValue: (v) => `+${(v * 2.0).toFixed(1)} dB`,
      },
    ],
  },
  'boost-xotic-ep': {
    type: 'boost-xotic-ep',
    name: 'Xotic EP Booster',
    subtitle: 'Discrete JFET Preamp (+3dB to +20dB)',
    category: 'boost',
    chassisColor: '#17181c',
    accentColor: '#3b82f6',
    parameters: [
      {
        id: 'gain',
        name: 'GAIN',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5,
        formatValue: (v) => `+${(3.0 + (v / 10) * 17.0).toFixed(1)} dB`,
      },
    ],
  },
  // Category 6: Wah / Filter
  'wah-boss-aw3': {
    type: 'wah-boss-aw3',
    name: 'BOSS AW-3 Dynamic Wah',
    subtitle: 'Dynamic Envelope & Humanizer Wah',
    category: 'wah',
    chassisColor: '#c5a059',
    accentColor: '#1a1a1a',
    parameters: [
      {
        id: 'decay',
        name: 'DECAY',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5.0,
        formatValue: (v) => v.toFixed(1),
      },
      {
        id: 'manual',
        name: 'MANUAL',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 4.0,
        formatValue: (v) => v.toFixed(1),
      },
      {
        id: 'sens',
        name: 'SENS',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 6.0,
        formatValue: (v) => v.toFixed(1),
      },
      {
        id: 'mode',
        name: 'MODE',
        min: 0,
        max: 4,
        step: 1,
        defaultValue: 0,
        formatValue: (v) => ['UP', 'DOWN', 'SHARP', 'HUMAN', 'TEMPO'][Math.round(v)] || 'UP',
      },
    ],
  },
  // Category: Equalizer
  'eq-boss-ge7': {
    type: 'eq-boss-ge7',
    name: 'Boss GE-7 Equalizer',
    subtitle: '7-Band Graphic Equalizer',
    category: 'eq',
    chassisColor: '#dcd4c0',
    accentColor: '#d32f2f',
    parameters: [
      { id: 'band100', name: '100', min: -15, max: 15, step: 0.5, defaultValue: 0, unit: 'dB', formatValue: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)} dB` },
      { id: 'band200', name: '200', min: -15, max: 15, step: 0.5, defaultValue: 0, unit: 'dB', formatValue: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)} dB` },
      { id: 'band400', name: '400', min: -15, max: 15, step: 0.5, defaultValue: 0, unit: 'dB', formatValue: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)} dB` },
      { id: 'band800', name: '800', min: -15, max: 15, step: 0.5, defaultValue: 0, unit: 'dB', formatValue: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)} dB` },
      { id: 'band1600', name: '1.6k', min: -15, max: 15, step: 0.5, defaultValue: 0, unit: 'dB', formatValue: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)} dB` },
      { id: 'band3200', name: '3.2k', min: -15, max: 15, step: 0.5, defaultValue: 0, unit: 'dB', formatValue: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)} dB` },
      { id: 'band6400', name: '6.4k', min: -15, max: 15, step: 0.5, defaultValue: 0, unit: 'dB', formatValue: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)} dB` },
      { id: 'level', name: 'LEVEL', min: -15, max: 15, step: 0.5, defaultValue: 0, unit: 'dB', formatValue: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)} dB` },
    ],
  },
  // Category: Chorus
  'chorus-boss-ce2': {
    type: 'chorus-boss-ce2',
    name: 'Boss CE-2 Chorus',
    subtitle: 'Warm Analog BBD Chorus',
    category: 'chorus',
    chassisColor: '#4caac7',
    accentColor: '#1a1a1a',
    parameters: [
      {
        id: 'rate',
        name: 'RATE',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 4.5,
        formatValue: (v) => `${(0.3 + Math.pow(v / 10, 1.8) * 3.2).toFixed(2)} Hz`,
      },
      {
        id: 'depth',
        name: 'DEPTH',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 6.0,
        formatValue: (v) => `${Math.round((v / 10) * 100)}%`,
      },
    ],
  },
  'chorus-boss-ch1': {
    type: 'chorus-boss-ch1',
    name: 'Boss CH-1 Super Chorus',
    subtitle: 'Bright Modern Stereo Chorus',
    category: 'chorus',
    chassisColor: '#8ba6c5',
    accentColor: '#1a1a1a',
    parameters: [
      {
        id: 'eLevel',
        name: 'E. LEVEL',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5.0,
        formatValue: (v) => `${Math.round((v / 10) * 100)}%`,
      },
      {
        id: 'eq',
        name: 'EQ',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5.0,
        formatValue: (v) => (v < 4.8 ? 'LO' : v > 5.2 ? 'HI' : 'FLAT'),
      },
      {
        id: 'rate',
        name: 'RATE',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5.0,
        formatValue: (v) => `${(0.2 + Math.pow(v / 10, 1.8) * 4.3).toFixed(2)} Hz`,
      },
      {
        id: 'depth',
        name: 'DEPTH',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 6.0,
        formatValue: (v) => `${Math.round((v / 10) * 100)}%`,
      },
    ],
  },
  'chorus-ehx-smallclone': {
    type: 'chorus-ehx-smallclone',
    name: 'Electro-Harmonix Small Clone',
    subtitle: 'Classic Analog Full-Chorus',
    category: 'chorus',
    chassisColor: '#2b2e35',
    accentColor: '#3b288a',
    parameters: [
      {
        id: 'rate',
        name: 'RATE',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 4.0,
        formatValue: (v) => `${(0.5 + Math.pow(v / 10, 1.7) * 5.8).toFixed(2)} Hz`,
      },
      {
        id: 'depth',
        name: 'DEPTH',
        min: 0,
        max: 1,
        step: 1,
        defaultValue: 1,
        formatValue: (v) => (v >= 0.5 ? 'DEEP' : 'SUBTLE'),
      },
    ],
  },
  'chorus-mxr-analog': {
    type: 'chorus-mxr-analog',
    name: 'MXR Analog Chorus',
    subtitle: 'Classic BBD Chorus with Dual EQ',
    category: 'chorus',
    chassisColor: '#0ea5e9',
    accentColor: '#0f172a',
    parameters: [
      {
        id: 'low',
        name: 'LOW',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 8.0,
        formatValue: (v) => (v >= 9.0 ? 'FLAT' : v <= 1.0 ? 'CUT' : `${v.toFixed(1)}`),
      },
      {
        id: 'high',
        name: 'HIGH',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 8.0,
        formatValue: (v) => (v >= 9.0 ? 'FLAT' : v <= 1.0 ? 'CUT' : `${v.toFixed(1)}`),
      },
      {
        id: 'level',
        name: 'LEVEL',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 6.0,
        formatValue: (v) => `${Math.round((v / 10) * 100)}%`,
      },
      {
        id: 'rate',
        name: 'RATE',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 4.5,
        formatValue: (v) => `${(0.2 + Math.pow(v / 10, 1.8) * 4.8).toFixed(2)} Hz`,
      },
      {
        id: 'depth',
        name: 'DEPTH',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 6.5,
        formatValue: (v) => `${Math.round((v / 10) * 100)}%`,
      },
    ],
  },
  'delay-boss-dm2': {
    type: 'delay-boss-dm2',
    name: 'Boss DM-2 Delay',
    subtitle: '1981 Vintage BBD Analog Delay',
    category: 'delay',
    chassisColor: '#b91c1c',
    accentColor: '#1a1a1a',
    parameters: [
      {
        id: 'repeatRate',
        name: 'REPEAT RATE',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 4.5,
        formatValue: (v) => `${Math.round(80 + (v / 10) * 250)} ms`,
      },
      {
        id: 'intensity',
        name: 'INTENSITY',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 4.0,
        formatValue: (v) => (v >= 9.5 ? 'RUNAWAY' : v.toFixed(1)),
      },
      {
        id: 'echo',
        name: 'ECHO',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5.0,
        formatValue: (v) => `${Math.round((v / 10) * 100)}%`,
      },
    ],
  },
  'delay-mxr-carbon-copy': {
    type: 'delay-mxr-carbon-copy',
    name: 'MXR Carbon Copy',
    subtitle: 'M169 Analog BBD Delay with Modulation',
    category: 'delay',
    chassisColor: '#082d21',
    accentColor: '#38bdf8',
    parameters: [
      {
        id: 'regen',
        name: 'REGEN',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 4.5,
        formatValue: (v) => (v >= 9.5 ? 'RUNAWAY' : v.toFixed(1)),
      },
      {
        id: 'mix',
        name: 'MIX',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5.0,
        formatValue: (v) => `${Math.round((v / 10) * 100)}%`,
      },
      {
        id: 'delay',
        name: 'DELAY',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5.0,
        formatValue: (v) => `${Math.round(40 + (v / 10) * 560)} ms`,
      },
      {
        id: 'mod',
        name: 'MODULATION',
        min: 0,
        max: 1,
        step: 1,
        defaultValue: 0,
        formatValue: (v) => (v >= 0.5 ? 'ON' : 'OFF'),
      },
    ],
  },
  'delay-tce-gauss': {
    type: 'delay-tce-gauss',
    name: 'TC Electronic Gauss Tape Echo',
    subtitle: 'Vintage Magnetic Tape Echo with Wow & Flutter',
    category: 'delay',
    chassisColor: '#273b33',
    accentColor: '#ef4444',
    parameters: [
      {
        id: 'delay',
        name: 'DELAY',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 4.5,
        formatValue: (v) => `${Math.round(50 + (v / 10) * 450)} ms`,
      },
      {
        id: 'sustain',
        name: 'SUSTAIN',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 4.0,
        formatValue: (v) => (v >= 9.2 ? 'RUNAWAY' : v.toFixed(1)),
      },
      {
        id: 'volume',
        name: 'VOLUME',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5.0,
        formatValue: (v) => `${Math.round((v / 10) * 100)}%`,
      },
      {
        id: 'mod',
        name: 'MODULATION',
        min: 0,
        max: 1,
        step: 1,
        defaultValue: 0,
        formatValue: (v) => (v >= 0.5 ? 'ON' : 'OFF'),
      },
    ],
  },
  'flanger-boss-bf2': {
    type: 'flanger-boss-bf2',
    name: 'Boss BF-2 Flanger',
    subtitle: '1980 Vintage BBD Analog Flanger',
    category: 'flanger',
    chassisColor: '#83276b',
    accentColor: '#1a1a1a',
    parameters: [
      {
        id: 'manual',
        name: 'MANUAL',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5.0,
        formatValue: (v) => `${(2.2 + (v / 10) * 5.8).toFixed(1)} ms`,
      },
      {
        id: 'depth',
        name: 'DEPTH',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5.0,
        formatValue: (v) => `${Math.round((v / 10) * 100)}%`,
      },
      {
        id: 'rate',
        name: 'RATE',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 2.8,
        formatValue: (v) => `${(0.08 * Math.pow(56, v / 10)).toFixed(2)} Hz`,
      },
      {
        id: 'res',
        name: 'RESONANCE',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 3.5,
        formatValue: (v) => `${Math.round((v / 10) * 100)}%`,
      },
    ],
  },
  'flanger-ehx-electric-mistress': {
    type: 'flanger-ehx-electric-mistress',
    name: 'EHX Stereo Electric Mistress',
    subtitle: 'Flanger & Chorus Modulation',
    category: 'flanger',
    chassisColor: '#c8cbd0',
    accentColor: '#e6007e',
    parameters: [
      {
        id: 'rate',
        name: 'RATE',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 3.5,
        formatValue: (v) => `${(0.05 * Math.pow(90, v / 10)).toFixed(2)} Hz`,
      },
      {
        id: 'flangerDepth',
        name: 'FLANGER DEPTH',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5.0,
        formatValue: (v) => `${Math.round((v / 10) * 100)}%`,
      },
      {
        id: 'chorusDepth',
        name: 'CHORUS DEPTH',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 4.0,
        formatValue: (v) => `${Math.round((v / 10) * 100)}%`,
      },
    ],
  },
  'flanger-mxr': {
    type: 'flanger-mxr',
    name: 'MXR M117R Flanger',
    subtitle: 'Classic Analog BBD Flanger',
    category: 'flanger',
    chassisColor: '#383d44',
    accentColor: '#ffffff',
    parameters: [
      {
        id: 'manual',
        name: 'MANUAL',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5.0,
        formatValue: (v) => `${(0.4 + (v / 10) * 3.8).toFixed(1)} ms`,
      },
      {
        id: 'width',
        name: 'WIDTH',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 6.0,
        formatValue: (v) => `${Math.round((v / 10) * 100)}%`,
      },
      {
        id: 'speed',
        name: 'SPEED',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 3.0,
        formatValue: (v) => `${(0.04 * Math.pow(87.5, v / 10)).toFixed(2)} Hz`,
      },
      {
        id: 'regen',
        name: 'REGEN.',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5.0,
        formatValue: (v) => `${Math.round((v / 10) * 100)}%`,
      },
    ],
  },

  // Category: Phaser
  'phaser-ehx-smallstone': {
    type: 'phaser-ehx-smallstone',
    name: 'EHX Nano Small Stone',
    subtitle: 'Classic 4-Stage OTA Phase Shifter',
    category: 'phaser',
    chassisColor: '#d1d5db',
    accentColor: '#cf5627',
    parameters: [
      {
        id: 'rate',
        name: 'RATE',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 3.5,
        formatValue: (v) => `${(0.08 * Math.pow(81.25, v / 10)).toFixed(2)} Hz`,
      },
      {
        id: 'color',
        name: 'COLOR',
        min: 0,
        max: 1,
        step: 1,
        defaultValue: 0,
        formatValue: (v) => (v >= 0.5 ? 'DEEP' : 'WARM'),
      },
    ],
  },
  'phaser-mxr-phase90': {
    type: 'phaser-mxr-phase90',
    name: 'MXR Phase 90',
    subtitle: 'Classic 4-Stage JFET Phase Shifter',
    category: 'phaser',
    chassisColor: '#f97316',
    accentColor: '#000000',
    parameters: [
      {
        id: 'speed',
        name: 'SPEED',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 4.0,
        formatValue: (v) => `${(0.10 * Math.pow(52, v / 10)).toFixed(2)} Hz`,
      },
    ],
  },

  // Category: Pitch / Octave
  'pitch-boss-oc5': {
    type: 'pitch-boss-oc5',
    name: 'Boss OC-5',
    subtitle: 'Octave Divider & Polyphonic Shifter',
    category: 'pitch',
    chassisColor: '#5c3621',
    accentColor: '#ffffff',
    parameters: [
      {
        id: 'direct',
        name: 'DIRECT LEVEL',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5.0,
        formatValue: (v) => `${Math.round((v / 10) * 100)}%`,
      },
      {
        id: 'octUp',
        name: '+1OCT LEVEL',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 0.0,
        formatValue: (v) => `${Math.round((v / 10) * 100)}%`,
      },
      {
        id: 'octDown',
        name: '-1OCT LEVEL',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5.0,
        formatValue: (v) => `${Math.round((v / 10) * 100)}%`,
      },
      {
        id: 'oct2DownRange',
        name: '-2OCT / RANGE',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5.0,
        formatValue: (v) => `${Math.round((v / 10) * 100)}%`,
      },
      {
        id: 'mode',
        name: 'MODE',
        min: 0,
        max: 1,
        step: 1,
        defaultValue: 0,
        formatValue: (v) => (v >= 0.5 ? 'VINTAGE' : 'POLY'),
      },
    ],
  },
  'pitch-ehx-pitchfork': {
    type: 'pitch-ehx-pitchfork',
    name: 'EHX Pitch Fork',
    subtitle: 'Polyphonic Pitch Shifter / Harmony',
    category: 'pitch',
    chassisColor: '#f3f4f6',
    accentColor: '#dc2626',
    parameters: [
      {
        id: 'blend',
        name: 'BLEND',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5.0,
        formatValue: (v) => `${Math.round((v / 10) * 100)}% WET`,
      },
      {
        id: 'shift',
        name: 'SHIFT',
        min: 0,
        max: 10,
        step: 1,
        defaultValue: 8,
        formatValue: (v) => {
          const names = ['D (Detune)', 'm2 (+1)', 'M2 (+2)', 'M3 (+4)', 'P4 (+5)', 'P5 (+7)', 'M6 (+9)', 'm7 (+10)', '1 OCT (+12)', '2 OCT (+24)', '3 OCT (+36)'];
          return names[Math.round(v)] || '1 OCT';
        },
      },
      {
        id: 'direction',
        name: 'DIRECTION',
        min: 0,
        max: 2,
        step: 1,
        defaultValue: 0,
        formatValue: (v) => {
          const dirs = ['UP (▲)', 'DUAL', 'DOWN (▼)'];
          return dirs[Math.round(v)] || 'UP (▲)';
        },
      },
      {
        id: 'latch',
        name: 'LATCH',
        min: 0,
        max: 1,
        step: 1,
        defaultValue: 1,
        formatValue: (v) => (v >= 0.5 ? 'LATCH' : 'MOMENTARY'),
      },
    ],
  },

  // Category: Tremolo
  'tremolo-boss-tr2': {
    type: 'tremolo-boss-tr2',
    name: 'BOSS TR-2',
    subtitle: 'Wave-Morphing Tremolo',
    category: 'tremolo',
    chassisColor: '#1d8376',
    accentColor: '#ffffff',
    parameters: [
      {
        id: 'rate',
        name: 'RATE',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5,
        formatValue: (v) => `${(0.9 * Math.pow(22.0 / 0.9, v / 10)).toFixed(1)} Hz`,
      },
      {
        id: 'wave',
        name: 'WAVE',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5,
        formatValue: (v) => (v < 3.5 ? 'TRIANGLE' : v > 6.5 ? 'SQUARE' : 'TRAPEZOID'),
      },
      {
        id: 'depth',
        name: 'DEPTH',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 7,
        formatValue: (v) => `${Math.round(v * 10)}%`,
      },
    ],
  },
  'tremolo-fulltone-supatrem': {
    type: 'tremolo-fulltone-supatrem',
    name: 'Fulltone Supa-Trem',
    subtitle: 'Photocell Tremolo ST-1',
    category: 'tremolo',
    chassisColor: '#18181b',
    accentColor: '#38bdf8',
    parameters: [
      {
        id: 'speed',
        name: 'SPEED',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5,
        formatValue: (v) => `${(0.7 * Math.pow(14.5 / 0.7, v / 10)).toFixed(1)} Hz`,
      },
      {
        id: 'mix',
        name: 'MIX',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 7,
        formatValue: (v) => `${Math.round(v * 10)}%`,
      },
      {
        id: 'volume',
        name: 'VOLUME',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 5,
        formatValue: (v) => (v <= 5 ? `${Math.round((v / 5) * 100)}%` : `+${(((v - 5) / 5) * 12).toFixed(1)} dB`),
      },
      {
        id: 'hardSoft',
        name: 'HARD / SOFT',
        min: 0,
        max: 1,
        step: 1,
        defaultValue: 0,
        formatValue: (v) => (v >= 0.5 ? 'HARD' : 'SOFT'),
      },
      {
        id: 'halfSpeed',
        name: 'HALF SPEED',
        min: 0,
        max: 1,
        step: 1,
        defaultValue: 0,
        formatValue: (v) => (v >= 0.5 ? 'HALF SPEED' : 'NORMAL'),
      },
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
    // Tremolo
    case 'tremolo-boss-tr2':
      return new BossTr2Node(ctx, id, initialParams, enabled);
    case 'tremolo-fulltone-supatrem':
      return new FulltoneSupaTremNode(ctx, id, initialParams, enabled);
    // Pitch / Octave
    case 'pitch-boss-oc5':
      return new BossOc5Node(ctx, id, initialParams, enabled);
    case 'pitch-ehx-pitchfork':
      return new EhxPitchForkNode(ctx, id, initialParams, enabled);
    // Flanger
    case 'flanger-boss-bf2':
      return new BossBf2Node(ctx, id, initialParams, enabled);
    case 'flanger-ehx-electric-mistress':
      return new EhxElectricMistressNode(ctx, id, initialParams, enabled);
    case 'flanger-mxr':
      return new MxrFlangerNode(ctx, id, initialParams, enabled);

    // Phaser
    case 'phaser-ehx-smallstone':
      return new EhxSmallStoneNode(ctx, id, initialParams, enabled);
    case 'phaser-mxr-phase90':
      return new MxrPhase90Node(ctx, id, initialParams, enabled);

    // Delay
    case 'delay-boss-dm2':
      return new BossDm2Node(ctx, id, initialParams, enabled);
    case 'delay-mxr-carbon-copy':
      return new MxrCarbonCopyNode(ctx, id, initialParams, enabled);
    case 'delay-tce-gauss':
      return new TcGaussTapeEchoNode(ctx, id, initialParams, enabled);

    // Chorus
    case 'chorus-boss-ce2':
      return new BossCe2Node(ctx, id, initialParams, enabled);
    case 'chorus-boss-ch1':
      return new BossCh1Node(ctx, id, initialParams, enabled);
    case 'chorus-ehx-smallclone':
      return new EhxSmallCloneNode(ctx, id, initialParams, enabled);
    case 'chorus-mxr-analog':
      return new MxrAnalogChorusNode(ctx, id, initialParams, enabled);

    // Equalizer
    case 'eq-boss-ge7':
      return new BossGe7Node(ctx, id, initialParams, enabled);

    // Wah / Filter
    case 'wah-boss-aw3':
      return new BossAw3Node(ctx, id, initialParams, enabled);

    // Boost
    case 'boost-mxr-microamp':
      return new MxrMicroAmpNode(ctx, id, initialParams, enabled);
    case 'boost-rangemaster':
      return new RangemasterNode(ctx, id, initialParams, enabled);
    case 'boost-spark-mini':
      return new TcSparkMiniNode(ctx, id, initialParams, enabled);
    case 'boost-xotic-ep':
      return new XoticEpBoosterNode(ctx, id, initialParams, enabled);

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

    // Distortion
    case 'dist-ds1':
      return new BossDs1Node(ctx, id, initialParams, enabled);
    case 'dist-hm2':
      return new BossHm2Node(ctx, id, initialParams, enabled);
    case 'dist-mt2':
      return new BossMt2Node(ctx, id, initialParams, enabled);
    case 'dist-sm7':
      return new IbanezSm7Node(ctx, id, initialParams, enabled);
    case 'dist-shredmaster':
      return new MarshallShredMasterNode(ctx, id, initialParams, enabled);
    case 'dist-mxrdistplus':
      return new MxrDistortionPlusNode(ctx, id, initialParams, enabled);
    case 'dist-procorat':
      return new ProCoRatNode(ctx, id, initialParams, enabled);

    // Fuzz
    case 'fuzz-bigmuff':
      return new BigMuffNode(ctx, id, initialParams, enabled);
    case 'fuzz-fuzzface':
      return new FuzzFaceNode(ctx, id, initialParams, enabled);
    case 'fuzz-tonebender':
      return new ToneBenderNode(ctx, id, initialParams, enabled);
    case 'fuzz-fuzzfactory':
      return new FuzzFactoryNode(ctx, id, initialParams, enabled);
    case 'fuzz-flatiron':
      return new FlatironFuzzNode(ctx, id, initialParams, enabled);
    case 'fuzz-hoof':
      return new EqdHoofNode(ctx, id, initialParams, enabled);

    default:
      throw new Error(`Unknown pedal type: ${type}`);
  }
}

