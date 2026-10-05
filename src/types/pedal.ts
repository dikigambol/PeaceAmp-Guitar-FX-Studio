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
  category: 'dynamics' | 'eq' | 'drive' | 'modulation' | 'time' | 'utility';
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
}

export interface AudioPedalNode {
  id: string;
  inputNode: AudioNode;
  outputNode: AudioNode;
  updateParameter: (paramId: string, value: number) => void;
  setEnabled: (enabled: boolean) => void;
  dispose: () => void;
}
