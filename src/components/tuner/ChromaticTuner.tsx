import React from 'react';
import type { TunerResult } from '../../dsp/tuner/pitchDetector';
import { Radio, Power } from 'lucide-react';

interface ChromaticTunerProps {
  tunerResult: TunerResult | null;
  isEngineRunning: boolean;
  enabled: boolean;
  onToggleEnabled: () => void;
}

export const ChromaticTuner: React.FC<ChromaticTunerProps> = ({
  tunerResult,
  isEngineRunning,
  enabled,
  onToggleEnabled,
}) => {
  const cents = tunerResult ? tunerResult.cents : 0;
  // Needle position: -50 cents = 0%, 0 cents = 50%, +50 cents = 100%
  const needlePercent = Math.min(100, Math.max(0, ((cents + 50) / 100) * 100));

  const noteDisplay = !enabled ? '--' : tunerResult ? tunerResult.note : '--';
  const octaveDisplay = !enabled ? '' : tunerResult ? tunerResult.octave : '';
  const freqDisplay = !enabled ? 'BYPASS' : tunerResult ? `${tunerResult.frequency.toFixed(1)}Hz` : '--';

  const inTune = enabled && (tunerResult?.inTune ?? false);
  const statusText = !enabled
    ? 'BYPASS'
    : !isEngineRunning
      ? 'OFFLINE'
      : !tunerResult
        ? 'PLUCK STRING'
        : inTune
          ? 'IN TUNE'
          : tunerResult.cents < 0
            ? `${Math.abs(tunerResult.cents)}¢ FLAT`
            : `${tunerResult.cents}¢ SHARP`;

  return (
    <div className={`mini-card-module ${enabled ? 'is-active' : 'is-bypassed'}`}>
      <div className="mini-module-header">
        <div className="mini-header-title">
          <Radio size={13} className="text-brass" />
          <span>CHROMATIC TUNER</span>
        </div>

        {/* Master Active / Bypass Switch */}
        <button
          onClick={onToggleEnabled}
          className={`cab-power-badge ${enabled ? 'is-on' : 'is-off'}`}
          title={enabled ? 'Click to Bypass Chromatic Tuner' : 'Click to Activate Chromatic Tuner'}
        >
          <Power size={10} />
          <span>{enabled ? 'ACTIVE' : 'BYPASS'}</span>
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
              {enabled && tunerResult && (
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
