import React from 'react';
import type { AudioDeviceInfo, InputChannelMode, MeterData } from '../../types/audio';
import { Knob } from '../common/Knob';
import { VuMeter } from '../meters/VuMeter';
import { Mic, RefreshCw, Sliders, ShieldOff } from 'lucide-react';

interface InputPreampPanelProps {
  devices: AudioDeviceInfo[];
  selectedDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  onRefreshDevices: () => void;
  isRefreshingDevices?: boolean;
  inputGain: number;
  onInputGainChange: (gain: number) => void;
  inputChannelMode: InputChannelMode;
  onInputChannelModeChange: (mode: InputChannelMode) => void;
  noiseGateEnabled: boolean;
  noiseGateThreshold: number;
  onNoiseGateChange: (enabled: boolean, thresholdDb: number) => void;
  inputMeter: MeterData;
  isEngineRunning: boolean;
}

const CHANNEL_OPTIONS: { id: InputChannelMode; label: string; title: string }[] = [
  { id: 'sum', label: 'L+R', title: 'Mono mix of both channels (mono mic / guitar on both inputs)' },
  { id: 'left', label: 'IN 1', title: 'Left channel only (guitar plugged into Input 1 of the interface)' },
  { id: 'right', label: 'IN 2', title: 'Right channel only (guitar plugged into Input 2 of the interface)' },
];

export const InputPreampPanel: React.FC<InputPreampPanelProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  onRefreshDevices,
  isRefreshingDevices = false,
  inputGain,
  onInputGainChange,
  inputChannelMode,
  onInputChannelModeChange,
  noiseGateEnabled,
  noiseGateThreshold,
  onNoiseGateChange,
  inputMeter,
  isEngineRunning,
}) => {
  const formatGain = (g: number) => {
    const db = 20 * Math.log10(Math.max(0.001, g));
    return `${db >= 0 ? '+' : ''}${db.toFixed(1)} dB (${g.toFixed(1)}x)`;
  };

  return (
    <div className="mini-card-module">
      <div className="mini-module-header">
        <div className="mini-header-title">
          <Sliders size={13} className="text-brass" />
          <span>INPUT PREAMP & I/O</span>
        </div>
      </div>

      <div className="mini-module-body">
        {/* Device Select Bar */}
        <div className="mini-device-bar">
          <Mic size={12} className="text-brass shrink-0" />
          <select
            className="mini-device-select"
            value={selectedDeviceId}
            onChange={(e) => onSelectDevice(e.target.value)}
            title="Audio Input Device"
          >
            {devices.length === 0 && <option value="">(Default Audio Input)</option>}
            {devices.length > 0 && selectedDeviceId && !devices.some((d) => d.deviceId === selectedDeviceId) && (
              <option value={selectedDeviceId} disabled>
                Device connected...
              </option>
            )}
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Device ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
          <button
            onClick={onRefreshDevices}
            className={`mini-icon-btn ${isRefreshingDevices ? 'is-refreshing' : ''}`}
            disabled={isRefreshingDevices}
            title={isRefreshingDevices ? 'Memindai perangkat audio...' : 'Scan & refresh perangkat audio'}
          >
            <RefreshCw size={11} className={isRefreshingDevices ? 'is-spinning' : ''} />
          </button>
        </div>

        {/* Input channel (mono fold-down) */}
        <div className="mini-io-row">
          <span className="mini-io-label">INPUT CH</span>
          <div className="mini-seg-group" role="group" aria-label="Input channel">
            {CHANNEL_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`mini-seg-btn ${inputChannelMode === opt.id ? 'is-active' : ''}`}
                onClick={() => onInputChannelModeChange(opt.id)}
                title={opt.title}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* INPUT PREAMP STAGE */}
        <div className="mini-stage-block">
          <div className="mini-stage-header">
            <div className="mini-stage-title-left">
              <Mic size={11} className="text-brass" />
              <span>STAGE GAIN</span>
            </div>
            <span className="mini-stage-val">{formatGain(inputGain)}</span>
          </div>
          <div className="mini-stage-content">
            <Knob
              label="GAIN"
              value={inputGain}
              min={0}
              max={3.0}
              step={0.05}
              defaultValue={1.0}
              formatValue={formatGain}
              onChange={onInputGainChange}
              disabled={false}
              color="#c8a665"
              size={40}
            />
            <div className="mini-vu-wrapper">
              <VuMeter
                label="PRE-FX VU"
                meterData={inputMeter}
                isActive={isEngineRunning}
              />
            </div>
          </div>
        </div>

        {/* NOISE GATE */}
        <div className="mini-stage-block">
          <div className="mini-stage-header">
            <div className="mini-stage-title-left">
              <ShieldOff size={11} className="text-brass" />
              <span>NOISE GATE</span>
            </div>
            <button
              type="button"
              className={`mini-seg-btn mini-gate-toggle ${noiseGateEnabled ? 'is-active' : ''}`}
              onClick={() => onNoiseGateChange(!noiseGateEnabled, noiseGateThreshold)}
              title="Silences hum and hiss between notes (put before the pedals)"
            >
              {noiseGateEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="mini-gate-row">
            <span className="mini-io-label">THRESH</span>
            <input
              type="range"
              min={-80}
              max={-15}
              step={1}
              value={noiseGateThreshold}
              disabled={!noiseGateEnabled}
              onChange={(e) => onNoiseGateChange(noiseGateEnabled, parseFloat(e.target.value))}
              className="cab-range-input"
              title={`Gate opens above ${noiseGateThreshold} dB`}
            />
            <span className="mini-stage-val">{noiseGateThreshold} dB</span>
          </div>
        </div>
      </div>
    </div>
  );
};
