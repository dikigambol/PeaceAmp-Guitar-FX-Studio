import React from 'react';
import type { MeterData } from '../../types/audio';
import { Knob } from '../common/Knob';
import { VuMeter } from '../meters/VuMeter';
import { Volume2, VolumeX, ShieldCheck } from 'lucide-react';

interface MasterOutputPanelProps {
  masterVolume: number;
  onMasterVolumeChange: (volume: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  outputMeter: MeterData;
  isEngineRunning: boolean;
}

export const MasterOutputPanel: React.FC<MasterOutputPanelProps> = ({
  masterVolume,
  onMasterVolumeChange,
  isMuted,
  onToggleMute,
  outputMeter,
  isEngineRunning,
}) => {
  const formatVolume = (v: number) => {
    return `${Math.round(v * 100)}%`;
  };

  return (
    <div className="mini-card-module">
      <div className="mini-module-header">
        <div className="mini-header-title">
          <Volume2 size={13} className="text-brass" />
          <span>MASTER OUTPUT & MONITOR</span>
        </div>
        <div className="mini-limiter-badge" title="Auto Brickwall Limiter (-0.5 dB) active">
          <ShieldCheck size={11} className="text-brass" />
          <span>LIMITER -0.5dB</span>
        </div>
      </div>

      <div className="mini-module-body">
        {/* MASTER VOLUME STAGE */}
        <div className="mini-stage-block">
          <div className="mini-stage-header">
            <div className="mini-stage-title-left">
              <Volume2 size={11} className="text-brass" />
              <span>MAIN VOLUME</span>
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
