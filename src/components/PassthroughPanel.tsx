import React from 'react';
import type { AudioDeviceInfo, MeterData } from '../types/audio';
import { Knob } from './common/Knob';
import { VuMeter } from './meters/VuMeter';
import {
  Mic,
  Volume2,
  VolumeX,
  RefreshCw,
  Sliders,
  ShieldCheck,
} from 'lucide-react';

interface PassthroughPanelProps {
  devices: AudioDeviceInfo[];
  selectedDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  onRefreshDevices: () => void;
  inputGain: number;
  onInputGainChange: (gain: number) => void;
  masterVolume: number;
  onMasterVolumeChange: (volume: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  inputMeter: MeterData;
  outputMeter: MeterData;
  isEngineRunning: boolean;
}

export const PassthroughPanel: React.FC<PassthroughPanelProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  onRefreshDevices,
  inputGain,
  onInputGainChange,
  masterVolume,
  onMasterVolumeChange,
  isMuted,
  onToggleMute,
  inputMeter,
  outputMeter,
  isEngineRunning,
}) => {
  const formatGain = (g: number) => {
    const db = 20 * Math.log10(Math.max(0.001, g));
    return `${db >= 0 ? '+' : ''}${db.toFixed(1)} dB (${g.toFixed(1)}x)`;
  };

  const formatVolume = (v: number) => {
    return `${Math.round(v * 100)}%`;
  };

  return (
    <div className="mini-card-module">
      {/* Module Title Header */}
      <div className="mini-module-header">
        <div className="mini-header-title">
          <Sliders size={13} className="text-amber-500" />
          <span>MASTER PREAMP & I/O</span>
        </div>
        <div className="mini-limiter-badge" title="Auto Brickwall Limiter (-0.5 dB) active">
          <ShieldCheck size={11} />
          <span>LIMITER -0.5dB</span>
        </div>
      </div>

      <div className="mini-module-body">
        {/* Device Select Bar */}
        <div className="mini-device-bar">
          <Mic size={12} className="text-slate-400 shrink-0" />
          <select
            className="mini-device-select"
            value={selectedDeviceId}
            onChange={(e) => onSelectDevice(e.target.value)}
            title="Audio Input Device"
          >
            {devices.length === 0 && <option value="">(Default Audio Input)</option>}
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Device ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
          <button
            onClick={onRefreshDevices}
            className="mini-icon-btn"
            title="Refresh audio devices"
          >
            <RefreshCw size={11} />
          </button>
        </div>

        {/* 1. INPUT PREAMP BLOCK (ATAS) */}
        <div className="mini-stage-block">
          <div className="mini-stage-header">
            <div className="mini-stage-title-left">
              <Mic size={11} className="text-amber-500" />
              <span>INPUT PREAMP</span>
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

        {/* 2. MASTER OUTPUT BLOCK (BAWAH) */}
        <div className="mini-stage-block">
          <div className="mini-stage-header">
            <div className="mini-stage-title-left">
              <Volume2 size={11} className="text-amber-500" />
              <span>MASTER OUTPUT</span>
            </div>
            <span className="mini-stage-val">{formatVolume(masterVolume)}</span>
          </div>
          <div className="mini-stage-content">
            <Knob
              label="VOLUME"
              value={masterVolume}
              min={0}
              max={1.5}
              step={0.05}
              defaultValue={0.8}
              formatValue={formatVolume}
              onChange={onMasterVolumeChange}
              disabled={false}
              color="#c8a665"
              size={40}
            />
            <div className="mini-vu-wrapper">
              <VuMeter
                label="POST-LIMIT VU"
                meterData={outputMeter}
                isActive={isEngineRunning}
              />
            </div>
          </div>
        </div>

        {/* Master Mute Button */}
        <button
          className={`mini-mute-btn ${isMuted ? 'is-muted' : ''}`}
          onClick={onToggleMute}
          title={isMuted ? 'Unmute Master Output' : 'Mute Master Output'}
        >
          {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
          <span>{isMuted ? 'OUTPUT MUTED (CLICK TO UNMUTE)' : 'MUTE MASTER AUDIO'}</span>
        </button>
      </div>
    </div>
  );
};
