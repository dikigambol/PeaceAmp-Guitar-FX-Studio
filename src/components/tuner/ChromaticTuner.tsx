import React from 'react';
import type { TunerResult } from '../../dsp/tuner/pitchDetector';
import { VolumeX, Radio } from 'lucide-react';

interface ChromaticTunerProps {
  tunerResult: TunerResult | null;
  isEngineRunning: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const ChromaticTuner: React.FC<ChromaticTunerProps> = ({
  tunerResult,
  isEngineRunning,
  isMuted,
  onToggleMute,
}) => {
  const cents = tunerResult ? tunerResult.cents : 0;
  // Needle position: -50 cents = 0%, 0 cents = 50%, +50 cents = 100%
  const needlePercent = Math.min(100, Math.max(0, ((cents + 50) / 100) * 100));

  const noteDisplay = tunerResult ? tunerResult.note : '--';
  const octaveDisplay = tunerResult ? tunerResult.octave : '';
  const freqDisplay = tunerResult ? `${tunerResult.frequency.toFixed(1)}Hz` : '--';

  const inTune = tunerResult?.inTune ?? false;
  const statusText = !isEngineRunning
    ? 'OFFLINE'
    : !tunerResult
    ? 'PLUCK STRING'
    : inTune
    ? 'IN TUNE'
    : tunerResult.cents < 0
    ? `${Math.abs(tunerResult.cents)}¢ FLAT`
    : `${tunerResult.cents}¢ SHARP`;

  return (
    <div className="mini-card-module">
      <div className="mini-module-header">
        <div className="mini-header-title">
          <Radio size={13} className="text-amber-500" />
          <span>CHROMATIC TUNER</span>
        </div>
        <button
          className={`mini-tuner-mute ${isMuted ? 'active' : ''}`}
          onClick={onToggleMute}
          title={isMuted ? 'Unmute guitar' : 'Mute guitar while tuning'}
        >
          <VolumeX size={11} />
          <span>{isMuted ? 'MUTED' : 'MUTE'}</span>
        </button>
      </div>

      <div className="mini-module-body mini-tuner-body">
        {/* Left: Note Readout */}
        <div className="mini-tuner-note-box">
          <div className={`mini-note-val ${inTune ? 'is-tune' : ''}`}>
            {noteDisplay}
            {octaveDisplay && <span className="mini-octave">{octaveDisplay}</span>}
          </div>
          <span className="mini-tuner-freq">{freqDisplay}</span>
        </div>

        {/* Right: Meter Gauge Bar */}
        <div className="mini-tuner-gauge-col">
          <div className="mini-tuner-status-row">
            <span className={`mini-status-chip ${inTune ? 'is-tune' : ''}`}>
              {statusText}
            </span>
          </div>

          <div className="mini-tuner-track-wrap">
            <div className="mini-meter-ticks">
              <span>-50¢</span>
              <span className="zero-mark">0</span>
              <span>+50¢</span>
            </div>
            <div className="mini-meter-track">
              <div className="mini-center-mark" />
              {tunerResult && (
                <div
                  className={`mini-needle ${inTune ? 'is-tune' : ''}`}
                  style={{ left: `${needlePercent}%` }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
