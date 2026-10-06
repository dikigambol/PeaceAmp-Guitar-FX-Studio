import type { PedalInstance } from './pedal';
import type { CabinetSettings } from './cabinet';
import type { AmpHeadSettings } from './amp';

export interface PresetSchema {
  version: 1;
  id: string;
  name: string;
  category: 'factory' | 'user';
  description?: string;
  pedals: PedalInstance[];
  inputGain?: number;
  masterVolume?: number;
  cabinet?: Partial<CabinetSettings>;
  ampHead?: Partial<AmpHeadSettings>;
}

