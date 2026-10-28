export interface PedalParameterDef {
  id: string;
  name: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
  formatValue?: (val: number) => string;
}

export interface PedalMetadata {
  type: string;
  name: string;
  subtitle: string;
  category: 'amp' | 'cabinet' | 'gate' | 'dynamics' | 'eq' | 'drive' | 'distortion' | 'fuzz' | 'boost' | 'chorus' | 'delay' | 'flanger' | 'phaser' | 'pitch' | 'tremolo' | 'vibrato' | 'modulation' | 'time' | 'utility' | 'wah' | 'reverb';
  chassisColor: string;
  accentColor: string;
  parameters: PedalParameterDef[];
}

export interface PedalInstance {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  parameters: Record<string, number>;
  customIrName?: string;
}

export interface AudioPedalNode {
  id: string;
  inputNode: AudioNode;
  outputNode: AudioNode;
  updateParameter: (paramId: string, value: number) => void;
  setEnabled: (enabled: boolean) => void;
  loadCustomIRFromFile?: (file: File) => Promise<string>;
  dispose: () => void;
}
