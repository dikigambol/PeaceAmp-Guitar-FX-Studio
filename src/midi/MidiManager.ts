export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
  state: string;
}

export type MidiActivityCallback = (info: {
  type: 'cc' | 'pc' | 'note';
  channel: number;
  number: number;
  value: number;
  deviceName: string;
}) => void;

export type MidiDevicesCallback = (devices: MidiDevice[]) => void;

interface MidiMessageEventLike {
  data?: Uint8Array | null;
}

class MidiManager {
  private midiAccess: MIDIAccess | null = null;
  private isSupported = false;
  private connectedDevices: MidiDevice[] = [];
  private onActivityListeners = new Set<MidiActivityCallback>();
  private onDevicesListeners = new Set<MidiDevicesCallback>();

  // Handlers registered from application
  private onPresetChangeHandler: ((presetIndex: number) => void) | null = null;
  private onPedalToggleHandler: ((pedalIndex: number) => void) | null = null;
  private onMasterVolumeHandler: ((normalized: number) => void) | null = null;
  private onLooperActionHandler: ((action: 'main' | 'stop' | 'clear' | 'undo') => void) | null = null;

  constructor() {
    this.isSupported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  }

  public async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Web MIDI API is not supported in this browser.');
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this.refreshDevices();

      this.midiAccess.onstatechange = () => {
        this.refreshDevices();
      };

      return true;
    } catch (err) {
      console.warn('MIDI access was denied or failed:', err);
      return false;
    }
  }

  private refreshDevices(): void {
    if (!this.midiAccess) return;

    const devices: MidiDevice[] = [];

    this.midiAccess.inputs.forEach((input) => {
      devices.push({
        id: input.id,
        name: input.name || 'Unnamed MIDI Device',
        manufacturer: input.manufacturer || 'Generic',
        state: input.state,
      });

      // Bind input message listener
      input.onmidimessage = (event: MidiMessageEventLike) => {
        this.handleMidiMessage(event, input.name || 'MIDI Controller');
      };
    });

    this.connectedDevices = devices;
    for (const listener of this.onDevicesListeners) {
      listener(this.connectedDevices);
    }
  }

  private handleMidiMessage(event: MidiMessageEventLike, deviceName: string): void {
    if (!event.data || event.data.length < 2) return;

    const statusByte = event.data[0];
    const messageType = statusByte >> 4;
    const channel = statusByte & 0x0f;
    const data1 = event.data[1];
    const data2 = event.data.length > 2 ? event.data[2] : 0;

    // 0x0B = Control Change (CC)
    if (messageType === 0x0b) {
      const ccNumber = data1;
      const ccValue = data2;

      for (const listener of this.onActivityListeners) {
        listener({
          type: 'cc',
          channel: channel + 1,
          number: ccNumber,
          value: ccValue,
          deviceName,
        });
      }

      // Default guitar pedalboard MIDI CC mappings:
      // CC #1 to #8: Toggle pedals 0 to 7
      if (ccNumber >= 1 && ccNumber <= 8 && ccValue >= 64) {
        this.onPedalToggleHandler?.(ccNumber - 1);
      }
      // CC #7: Master Volume
      else if (ccNumber === 7) {
        this.onMasterVolumeHandler?.(ccValue / 127);
      }
      // CC #64 (Sustain / Footswitch 1): Looper Main Footswitch
      else if (ccNumber === 64 && ccValue >= 64) {
        this.onLooperActionHandler?.('main');
      }
      // CC #65: Looper Stop
      else if (ccNumber === 65 && ccValue >= 64) {
        this.onLooperActionHandler?.('stop');
      }
      // CC #66: Looper Undo
      else if (ccNumber === 66 && ccValue >= 64) {
        this.onLooperActionHandler?.('undo');
      }
      // CC #67: Looper Clear
      else if (ccNumber === 67 && ccValue >= 64) {
        this.onLooperActionHandler?.('clear');
      }
    }
    // 0x0C = Program Change (PC) -> Preset Change
    else if (messageType === 0x0c) {
      const programNumber = data1;

      for (const listener of this.onActivityListeners) {
        listener({
          type: 'pc',
          channel: channel + 1,
          number: programNumber,
          value: 0,
          deviceName,
        });
      }

      this.onPresetChangeHandler?.(programNumber);
    }
    // 0x09 = Note On
    else if (messageType === 0x09 && data2 > 0) {
      for (const listener of this.onActivityListeners) {
        listener({
          type: 'note',
          channel: channel + 1,
          number: data1,
          value: data2,
          deviceName,
        });
      }
    }
  }

  public registerHandlers(handlers: {
    onPresetChange?: (presetIndex: number) => void;
    onPedalToggle?: (pedalIndex: number) => void;
    onMasterVolume?: (normalized: number) => void;
    onLooperAction?: (action: 'main' | 'stop' | 'clear' | 'undo') => void;
  }): void {
    if (handlers.onPresetChange) this.onPresetChangeHandler = handlers.onPresetChange;
    if (handlers.onPedalToggle) this.onPedalToggleHandler = handlers.onPedalToggle;
    if (handlers.onMasterVolume) this.onMasterVolumeHandler = handlers.onMasterVolume;
    if (handlers.onLooperAction) this.onLooperActionHandler = handlers.onLooperAction;
  }

  public onActivity(callback: MidiActivityCallback): () => void {
    this.onActivityListeners.add(callback);
    return () => {
      this.onActivityListeners.delete(callback);
    };
  }

  public onDevicesChange(callback: MidiDevicesCallback): () => void {
    this.onDevicesListeners.add(callback);
    callback(this.connectedDevices);
    return () => {
      this.onDevicesListeners.delete(callback);
    };
  }

  public getDevices(): MidiDevice[] {
    return this.connectedDevices;
  }

  public checkSupport(): boolean {
    return this.isSupported;
  }
}

export const midiManager = new MidiManager();
