import type { PedalInstance } from './pedal';
import type { CabinetSettings } from './cabinet';
import type { AmpHeadSettings } from './amp';
import type { PickupVoicingType } from '../audio/InputImpedanceNode';

export interface PresetPatchConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  cableColor?: 'bone-ivory' | 'tweed' | 'oxblood' | 'rubber';
}

export interface PresetSchema {
  version: 1;
  id: string;
  name: string;
  category: 'factory' | 'user';
  description?: string;
  pedals: PedalInstance[];
  pedalPositions?: Record<string, { x: number; y: number }>;
  connections?: PresetPatchConnection[];
  inputGain?: number;
  masterVolume?: number;
  pickupVoicing?: PickupVoicingType;
  cabinet?: Partial<CabinetSettings>;
  ampHead?: Partial<AmpHeadSettings>;
}
