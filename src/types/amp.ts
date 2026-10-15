export type AmpModelId =
  // Roland®
  | 'pristine-clean'
  // Fender®
  | 'fender-twin'
  | 'clean-tweed'
  | 'fender-deluxe'
  // Vox®
  | 'chime-ac30'
  // Marshall®
  | 'crunch-plexi'
  | 'marshall-jcm800'
  | 'marshall-silver-jubilee'
  // Orange®
  | 'orange-rockerverb'
  // Mesa/Boogie®
  | 'lead-recto'
  | 'mesa-mark'
  | 'mesa-lonestar'
  // Dumble®
  | 'dumble-ods'
  // Soldano®
  | 'soldano-slo100'
  // Bogner®
  | 'bogner-ecstasy'
  // EVH® / Peavey®
  | 'evh-5150'
  | 'modern-djent'
  // ENGL®
  | 'engl-powerball';

export interface AmpModelOption {
  id: AmpModelId;
  brand: string;
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
  // --- Roland® ---
  {
    id: 'pristine-clean',
    brand: 'Roland®',
    name: 'JC-120 Jazz Chorus',
    category: 'Ultra Clean',
    description: '100% crystal clean, zero breakup, ultra-high headroom — the legendary studio pedal platform.',
    character: 'Roland® Jazz Chorus JC-120 Solid State',
  },

  // --- Fender® ---
  {
    id: 'fender-twin',
    brand: 'Fender®',
    name: "'65 Twin Reverb",
    category: 'Sparkling Clean',
    description: 'Iconic sparkling American glass cleans, deep open headroom, and bell-like chime.',
    character: "Fender® '65 Blackface Twin Reverb (AB763)",
  },
  {
    id: 'clean-tweed',
    brand: 'Fender®',
    name: "'59 Bassman Tweed",
    category: 'Vintage Tweed',
    description: 'Warm glass harmonics, woody low-end, and legendary touch-responsive edge-of-breakup grit.',
    character: "Fender® 5F6-A Tweed Bassman 4x10",
  },
  {
    id: 'fender-deluxe',
    brand: 'Fender®',
    name: "'65 Deluxe Reverb",
    category: 'Blues Breakup',
    description: 'Sweet scooped mids with dynamic, singing tube breakup when digging into the strings.',
    character: "Fender® '65 Deluxe Reverb 22W 6V6",
  },

  // --- Vox® ---
  {
    id: 'chime-ac30',
    brand: 'Vox®',
    name: 'AC30 Top Boost',
    category: 'British Chime',
    description: 'Famous British jangly top-end sparkle with compressed rich harmonic crunch when pushed.',
    character: 'Vox® AC30 2x12 Top Boost Class-A EL84',
  },

  // --- Marshall® ---
  {
    id: 'crunch-plexi',
    brand: 'Marshall®',
    name: '1959 Super Lead Plexi',
    category: 'Classic Crunch',
    description: 'Thick muscular midrange punch, singing sustain, and authentic 70s British rock roar.',
    character: 'Marshall® 1959 Super Lead 100W Plexi EL34',
  },
  {
    id: 'marshall-jcm800',
    brand: 'Marshall®',
    name: 'JCM800 2203',
    category: 'Hard Rock Roar',
    description: 'The definitive sound of 80s hard rock and heavy metal — tight biting crunch and razor sustain.',
    character: 'Marshall® JCM800 2203 Master Volume 100W',
  },
  {
    id: 'marshall-silver-jubilee',
    brand: 'Marshall®',
    name: '2555 Silver Jubilee',
    category: 'Heavy Lead',
    description: 'Darker, thicker Marshall voicing with smooth singing high gain favored by Slash and Bonamassa.',
    character: 'Marshall® 2555 Silver Jubilee 100W',
  },

  // --- Orange® ---
  {
    id: 'orange-rockerverb',
    brand: 'Orange®',
    name: 'Rockerverb 50 MKIII',
    category: 'British Fuzz Crunch',
    description: 'Fat, juicy British midrange with unmistakable fuzzy harmonic roar for rock, stoner, and doom.',
    character: 'Orange® Rockerverb 50 MKIII EL34',
  },

  // --- Mesa/Boogie® ---
  {
    id: 'lead-recto',
    brand: 'Mesa/Boogie®',
    name: 'Dual Rectifier',
    category: 'Modern High Gain',
    description: 'Massive crushing low-end wall of sound with aggressive modern sizzle and high-gain roar.',
    character: 'Mesa/Boogie® Dual Rectifier Solo Head 100W 6L6',
  },
  {
    id: 'mesa-mark',
    brand: 'Mesa/Boogie®',
    name: 'Mark IIC+ / IV Lead',
    category: 'Liquid Lead',
    description: 'Legendary tight low end, singing liquid sustain, and classic scooped graphic EQ V-curve.',
    character: 'Mesa/Boogie® Mark IIC+ / IV Lead Channel',
  },
  {
    id: 'mesa-lonestar',
    brand: 'Mesa/Boogie®',
    name: 'Lone Star Special',
    category: 'Boutique Texas Blues',
    description: 'Lush, warm cleans and singing creamy overdrive with gorgeous touch sensitivity.',
    character: 'Mesa/Boogie® Lone Star Custom Class A/AB',
  },

  // --- Dumble® ---
  {
    id: 'dumble-ods',
    brand: 'Dumble®',
    name: 'Overdrive Special (ODS)',
    category: 'Boutique Touch Bloom',
    description: 'The holy grail of boutique amplifiers — touch-sensitive vocal harmonic bloom and infinite sustain.',
    character: 'Dumble® Overdrive Special 100W HRM',
  },

  // --- Soldano® ---
  {
    id: 'soldano-slo100',
    brand: 'Soldano®',
    name: 'SLO-100 Super Lead',
    category: 'Rich Harmonic Lead',
    description: 'Articulate high-gain blueprint for modern guitar tone — singing highs and harmonically dense overdrive.',
    character: 'Soldano® Super Lead Overdrive SLO-100',
  },

  // --- Bogner® ---
  {
    id: 'bogner-ecstasy',
    brand: 'Bogner®',
    name: 'Ecstasy 101B',
    category: 'Velvet High Gain',
    description: 'Ultra-refined boutique German tone — creamy multi-channel response with warm singing low-mids.',
    character: 'Bogner® Ecstasy 101B Red Channel',
  },

  // --- EVH® / Peavey® ---
  {
    id: 'evh-5150',
    brand: 'EVH® / Peavey®',
    name: '5150 III 100W',
    category: 'Aggressive Metal',
    description: 'The modern metal gold standard — blistering high-gain saturation, fast attack, and brutal palm mutes.',
    character: 'EVH® 5150 III / Peavey® 5150 Red Channel',
  },
  {
    id: 'modern-djent',
    brand: 'EVH® / Peavey®',
    name: 'Modern Djent / Invective',
    category: 'Ultra Tight Modern',
    description: 'High-speed percussive attack, tight low-cut sub filtering, and hyper-focused high-mid punch.',
    character: 'Peavey® Invective .120 / Modern Djent Voice',
  },

  // --- ENGL® ---
  {
    id: 'engl-powerball',
    brand: 'ENGL®',
    name: 'Powerball II',
    category: 'Precision German Gain',
    description: 'Razor-sharp attack, punishing low-end punch, and articulate German high-gain definition.',
    character: 'ENGL® Powerball II E645/2 100W 6L6',
  },
];
