export type AmpModelId =
  | 'clean-tweed'
  | 'crunch-plexi'
  | 'chime-ac30'
  | 'lead-recto'
  | 'modern-djent';

export interface AmpModelOption {
  id: AmpModelId;
  name: string;
  category: string;
  description: string;
  character: string;
}

export interface AmpHeadSettings {
  enabled: boolean;
  model: AmpModelId;
  gain: number;       // 0 to 10
  bass: number;       // 0 to 10
  mid: number;        // 0 to 10
  treble: number;     // 0 to 10
  presence: number;   // 0 to 10
  master: number;     // 0 to 10
}

export const AMP_MODELS: AmpModelOption[] = [
  {
    id: 'clean-tweed',
    name: '59 American Tweed',
    category: 'Vintage Clean',
    description: 'Warm glass harmonics, woody low-end, and open dynamic headroom.',
    character: 'Fender 5F6-A Bassman / Twin style',
  },
  {
    id: 'crunch-plexi',
    name: '1959 British Plexi',
    category: 'Classic Crunch',
    description: 'Thick muscular midrange punch, singing sustain, and classic British bark.',
    character: 'Marshall Super Lead 100W style',
  },
  {
    id: 'chime-ac30',
    name: 'Class-A Top Boost',
    category: 'British Chime',
    description: 'Bell-like jangly top-end sparkle with compressed rich harmonic breakup.',
    character: 'Vox AC30 Top Boost style',
  },
  {
    id: 'lead-recto',
    name: 'Californian Dual Lead',
    category: 'High Gain',
    description: 'Massive crushing low-end wall of sound with aggressive modern sizzle.',
    character: 'Mesa Boogie Dual Rectifier style',
  },
  {
    id: 'modern-djent',
    name: 'Djent Modern High-Gain',
    category: 'Ultra Tight',
    description: 'High-speed attack, percussive tight low-cut, and hyper-focused mid presence.',
    character: '5150 III / Peavey Invective style',
  },
];
