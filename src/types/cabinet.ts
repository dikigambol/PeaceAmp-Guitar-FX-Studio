export type CabinetModelId =
  // Fender®
  | '1x8-open'          // Fender '57 Champ 1x8
  | '1x10-open'         // Fender '65 Princeton Reverb 1x10
  | '1x12-open'         // Fender '65 Deluxe Reverb 1x12
  | '2x12-fender'       // Fender '65 Twin Reverb 2x12
  | '4x10-open'         // Fender '59 Bassman 4x10
  | '4x10-closed'       // Fender Super Reverb / Bassman Closed 4x10 (backward compatible)
  // Vox®
  | '2x12-open'         // Vox AC30 Top Boost 2x12
  // Marshall®
  | '4x12-greenback'    // Marshall 1960AX 4x12 (Celestion Greenback)
  | '4x12-closed'       // Marshall 1960A 4x12 (Celestion Vintage 30)
  // Mesa/Boogie®
  | '1x12-closed'       // Mesa Thiele Ported 1x12 (EVM12L)
  | '2x12-closed'       // Mesa Rectifier Vertical 2x12
  | '4x12-recto-os'     // Mesa Oversized Rectifier Standard 4x12
  // Orange®
  | '4x12-orange'       // Orange PPC412 4x12 (18mm Baltic Birch)
  // Dumble®
  | '1x12-dumble'       // Dumble Oval Ported 1x12 (EVM-12L / G12-65)
  // Roland®
  | '2x12-jc120'        // Roland JC-120 2x12 (Silver Cone Studio Flat)
  // EVH® / Peavey®
  | '4x12-5150'         // EVH 5150 III 4x12 (Celestion G12-EVH)
  // Custom
  | 'custom';

export type MicModelId =
  | 'sm57'       // Shure SM57 (Dynamic)
  | 'sm7b'       // Shure SM7B (Dynamic Broadcaster)
  | 'md421'      // Sennheiser MD421 (Dynamic)
  | 'ribbon'     // Royer R-121 (Ribbon)
  | 'm160'       // Beyerdynamic M160 (Dual Ribbon)
  | 'condenser'; // AKG C414 / Neumann U87 (Large Diaphragm Condenser)

export interface CabinetSettings {
  enabled: boolean;
  model: CabinetModelId;
  mic: MicModelId;
  position: number; // 0.0 (Edge / Warm) to 1.0 (Center / Direct) - default 0.5
  distance: number; // 0.0 (Close - 0.5") to 1.0 (Far / Ambient - 6") - default 0.15
  mix: number;      // 0.0 (Dry) to 1.0 (Wet) - default 1.0 (100% Wet)
  level: number;    // dB trim (-12 to +6) - default 0 dB
  customIrName?: string;
}

export interface CabinetOptionInfo {
  id: CabinetModelId;
  brand: string;
  name: string;
  category: 'Open Back' | 'Closed Back' | 'Custom';
  speakers: string;
  description: string;
}

export interface MicOptionInfo {
  id: MicModelId;
  name: string;
  type: string;
  description: string;
}

export const CABINET_OPTIONS: CabinetOptionInfo[] = [
  // --- Fender® ---
  {
    id: '1x8-open',
    brand: 'Fender®',
    name: '1×8 Champ Vintage',
    category: 'Open Back',
    speakers: '1×8" Weber Alnico',
    description: 'Raspy lo-fi chime, boxy midrange focus, quick vintage compression.',
  },
  {
    id: '1x10-open',
    brand: 'Fender®',
    name: '1×10 Princeton Reverb',
    category: 'Open Back',
    speakers: '1×10" Jensen C10R',
    description: 'Punchy tight bass, sweet upper-mid bell chime, articulate sparkle.',
  },
  {
    id: '1x12-open',
    brand: 'Fender®',
    name: '1×12 Deluxe Reverb',
    category: 'Open Back',
    speakers: '1×12" Jensen C12K',
    description: 'Warm woody dynamic bloom, airy highs, classic open-back 3D spread.',
  },
  {
    id: '2x12-fender',
    brand: 'Fender®',
    name: '2×12 Twin Reverb',
    category: 'Open Back',
    speakers: '2×12" JBL D120F / Jensen',
    description: 'Massive pristine headroom, sparkling chime, and deep dimensional clean punch.',
  },
  {
    id: '4x10-open',
    brand: 'Fender®',
    name: '4×10 Bassman Tweed',
    category: 'Open Back',
    speakers: '4×10" Jensen P10R Alnico',
    description: 'Instant dynamic transient attack, rich organic low-mids, singing blues bloom.',
  },
  {
    id: '4x10-closed',
    brand: 'Fender®',
    name: '4×10 Super Bassman',
    category: 'Closed Back',
    speakers: '4×10" Eminence Custom',
    description: 'Tight percussive punch, punchy midrange thrust, articulate bass definition.',
  },

  // --- Vox® ---
  {
    id: '2x12-open',
    brand: 'Vox®',
    name: '2×12 AC30 Top Boost',
    category: 'Open Back',
    speakers: '2×12" Celestion Alnico Blue',
    description: 'Legendary British bell-like jangle, signature vocal chime, and creamy compression.',
  },

  // --- Marshall® ---
  {
    id: '4x12-greenback',
    brand: 'Marshall®',
    name: '1960AX Greenback',
    category: 'Closed Back',
    speakers: '4×12" Celestion G12M-25 Greenback',
    description: 'Warm woody midrange crunch, smooth rolled-off top end, iconic 60s/70s rock tone.',
  },
  {
    id: '4x12-closed',
    brand: 'Marshall®',
    name: '1960A Vintage 30 Stack',
    category: 'Closed Back',
    speakers: '4×12" Celestion Vintage 30',
    description: 'Iconic heavy rock stack roar: aggressive 2.5kHz cut, tight bass thump, stadium authority.',
  },

  // --- Mesa/Boogie® ---
  {
    id: '1x12-closed',
    brand: 'Mesa/Boogie®',
    name: '1×12 Thiele Ported',
    category: 'Closed Back',
    speakers: '1×12" EVM12L Black Shadow',
    description: 'Tuned bass-reflex port: surprisingly huge low-end thump in an articulate compact footprint.',
  },
  {
    id: '2x12-closed',
    brand: 'Mesa/Boogie®',
    name: '2×12 Recto Vertical',
    category: 'Closed Back',
    speakers: '2×12" Celestion Vintage 30',
    description: 'Massive punch, tight modern rock chug, and authoritative low-end impact.',
  },
  {
    id: '4x12-recto-os',
    brand: 'Mesa/Boogie®',
    name: '4×12 Rectifier Oversized',
    category: 'Closed Back',
    speakers: '4×12" Celestion V30 (Oversized Enclosure)',
    description: 'Deep 55Hz sub-bass resonance, crushing wall of sound for modern metal & drop tunings.',
  },

  // --- Orange® ---
  {
    id: '4x12-orange',
    brand: 'Orange®',
    name: 'PPC412 Heavy Birch',
    category: 'Closed Back',
    speakers: '4×12" Celestion Vintage 30 (18mm Birch)',
    description: 'High-density Baltic birch: focused, dark, super-thick midrange roar for stoner & rock.',
  },

  // --- Dumble® ---
  {
    id: '1x12-dumble',
    brand: 'Dumble®',
    name: '1×12 Oval Ported',
    category: 'Open Back',
    speakers: '1×12" EVM-12L / Celestion G12-65',
    description: 'Semi-open rear oval port: velvety vocal midrange bloom, smooth top, touch sensitivity.',
  },

  // --- Roland® ---
  {
    id: '2x12-jc120',
    brand: 'Roland®',
    name: '2×12 JC-120 Stereo',
    category: 'Open Back',
    speakers: '2×12" Roland Silver Cone',
    description: 'Ultra-flat, transparent hi-fi response — pure uncolored platform for stereo effects.',
  },

  // --- EVH® / Peavey® ---
  {
    id: '4x12-5150',
    brand: 'EVH® / Peavey®',
    name: '5150 III Stealth',
    category: 'Closed Back',
    speakers: '4×12" Celestion G12-EVH',
    description: 'Surgical fast attack, ultra-tight palm mutes, blistering modern metal saturation.',
  },
];

export const MIC_OPTIONS: MicOptionInfo[] = [
  {
    id: 'sm57',
    name: 'Shure® SM57',
    type: 'Dynamic Cardioids',
    description: 'Aggressive 5kHz presence spike, classic cutting rock bite, industry standard.',
  },
  {
    id: 'sm7b',
    name: 'Shure® SM7B',
    type: 'Dynamic Broadcaster',
    description: 'Thick muscular body, smooth silk highs, tames harsh distortion sizzle.',
  },
  {
    id: 'md421',
    name: 'Sennheiser® MD421',
    type: 'Dynamic Studio',
    description: 'Punchy low-end girth, contoured 1kHz scoop, crisp articulate pick attack.',
  },
  {
    id: 'ribbon',
    name: 'Royer® R-121',
    type: 'Figure-8 Ribbon',
    description: 'Velvety smooth, ultra-warm analog body, zero harshness, thick vintage warmth.',
  },
  {
    id: 'm160',
    name: 'Beyerdynamic® M160',
    type: 'Double Ribbon',
    description: 'Hypercardioid focus, rich harmonic balance, legendary classic rock presence.',
  },
  {
    id: 'condenser',
    name: 'AKG® C414',
    type: 'Large Condenser',
    description: 'Full-spectrum hi-fi fidelity, extended 10kHz airy sparkle, studio realism.',
  },
];
