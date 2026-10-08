export type CabinetModelId =
  | '1x8-open'
  | '1x10-open'
  | '1x12-open'
  | '1x12-closed'
  | '2x12-open'
  | '2x12-closed'
  | '4x10-closed'
  | '4x12-closed'
  | 'custom';

export type MicModelId = 'sm57' | 'md421' | 'ribbon' | 'condenser';

export interface CabinetSettings {
  enabled: boolean;
  model: CabinetModelId;
  mic: MicModelId;
  position: number; // 0.0 (Edge) to 1.0 (Center)
  mix: number;      // 0.0 (Dry) to 1.0 (Wet) - default 1.0 (100% Wet)
  level: number;    // dB trim (-12 to +6)
  customIrName?: string;
}

export interface CabinetOptionInfo {
  id: CabinetModelId;
  name: string;
  category: 'Open Back' | 'Closed Back' | 'Custom';
  description: string;
}

export interface MicOptionInfo {
  id: MicModelId;
  name: string;
  type: string;
  description: string;
}

export const CABINET_OPTIONS: CabinetOptionInfo[] = [
  { id: '1x8-open', name: '1×8 Open Back', category: 'Open Back', description: 'Vintage Champ, raspy lo-fi chime' },
  { id: '1x10-open', name: '1×10 Open Back', category: 'Open Back', description: 'Princeton Chime, punchy bell sparkle' },
  { id: '1x12-open', name: '1×12 Open Back', category: 'Open Back', description: 'Deluxe Reverb, open warm dynamic bloom' },
  { id: '1x12-closed', name: '1×12 Closed Back', category: 'Closed Back', description: 'Thiele Ported, tight focused modern punch' },
  { id: '2x12-open', name: '2×12 Open Back', category: 'Open Back', description: 'Twin Reverb, wide spacious 3D dispersion' },
  { id: '2x12-closed', name: '2×12 Closed Back', category: 'Closed Back', description: 'Recto Vertical, tight chug & low-end thump' },
  { id: '4x10-closed', name: '4×10 Closed Back', category: 'Closed Back', description: 'Bassman / Super, fast attack & massive mids' },
  { id: '4x12-closed', name: '4×12 Closed Back', category: 'Closed Back', description: 'Marshall 1960 V30, iconic rock stack roar' },
];

export const MIC_OPTIONS: MicOptionInfo[] = [
  { id: 'sm57', name: 'SM57', type: 'Dynamic', description: 'Aggressive 5kHz presence peak, classic punch' },
  { id: 'md421', name: 'Sennheiser-style', type: 'Dynamic (MD421)', description: 'Scooped lower-mids, biting articulate cut' },
  { id: 'ribbon', name: 'Ribbon', type: 'Ribbon (R-121)', description: 'Smooth rolled-off highs, rich warm guitar body' },
  { id: 'condenser', name: 'Condenser', type: 'Condenser (C414)', description: 'Flat full-spectrum response, airy top-end' },
];
