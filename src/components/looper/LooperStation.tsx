import React, { useEffect, useState } from 'react';
import { getActiveLooper, type LooperTelemetry } from '../../audio/pedals/LooperPedalNode';
import { Circle, Play, Square, RotateCcw, Trash2, Plus, Volume2 } from 'lucide-react';

interface LooperStationProps {
  hasLooperInChain: boolean;
  onAddLooper: () => void;
  isEngineRunning?: boolean;
  onNotify?: (message: string) => void;
}

export const LooperStation: React.FC<LooperStationProps> = ({
  hasLooperInChain,
  onAddLooper,
  isEngineRunning = false,
  onNotify,
}) => {
  const [telemetry, setTelemetry] = useState<LooperTelemetry>({
    state: 'idle',
    progress: 0,
    durationSec: 0,
    canUndo: false,
    hasLoop: false,
  });

  const [level, setLevel] = useState<number>(1.0);

  useEffect(() => {
    const looper = getActiveLooper();
    if (!looper) return;

    const unsubscribe = looper.subscribe((t) => {
      setTelemetry({ ...t });
    });

    return () => {
      unsubscribe();
    };
  }, [hasLooperInChain]);

  const handleMainFootswitch = () => {
    // 1. If looper pedal is not on board yet, add it
    if (!hasLooperInChain) {
      onAddLooper();
      if (!isEngineRunning) {
        onNotify?.('Phrase Looper added to rig! Click POWER in the top header to start the audio engine before you can record.');
      } else {
        onNotify?.('Phrase Looper added to rig! Click RECORD to begin looping.');
      }
      return;
    }

    // 2. Validate if audio engine is running
    if (!isEngineRunning) {
      onNotify?.(
        'Cannot record: Audio Engine is not running. Please click the POWER button in the top-right header to activate your microphone or audio interface before recording loops.'
      );
      return;
    }

    // 3. Check if active looper node exists
    const looper = getActiveLooper();
    if (!looper) {
      onNotify?.(
        'Looper audio processor is not active. Please ensure the audio engine is running and the looper pedal is engaged on the board.'
      );
      return;
    }

    // 4. Trigger state transitions
    if (telemetry.state === 'idle' || telemetry.state === 'stopped') {
      if (!telemetry.hasLoop) {
        looper.record();
      } else {
        looper.play();
      }
    } else if (telemetry.state === 'recording') {
      looper.play();
    } else if (telemetry.state === 'playing') {
      looper.overdub();
    } else if (telemetry.state === 'overdubbing') {
      looper.play();
    }
  };

  const handleStop = () => {
    if (!isEngineRunning) {
      onNotify?.('Audio Engine is not running. Click POWER in the top-right header first.');
      return;
    }
    const looper = getActiveLooper();
    looper?.stop();
  };

  const handleClear = () => {
    if (!isEngineRunning) {
      onNotify?.('Audio Engine is not running. Click POWER in the top-right header first.');
      return;
    }
    const looper = getActiveLooper();
    looper?.clear();
  };

  const handleUndo = () => {
    if (!isEngineRunning) {
      onNotify?.('Audio Engine is not running. Click POWER in the top-right header first.');
      return;
    }
    const looper = getActiveLooper();
    looper?.undo();
  };

  const handleLevelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setLevel(val);
    const looper = getActiveLooper();
    looper?.updateParameter('level', val);
  };

  const currentPlaySec = telemetry.progress * telemetry.durationSec;

  const getMainBtnLabel = () => {
    if (!hasLooperInChain) {
      return 'ADD TO RIG';
    }
    switch (telemetry.state) {
      case 'recording':
        return 'STOP REC / PLAY';
      case 'playing':
        return 'OVERDUB';
      case 'overdubbing':
        return 'PLAY LOOP';
      default:
        return telemetry.hasLoop ? 'PLAY' : 'RECORD';
    }
  };

  const getMainBtnTitle = () => {
    if (!hasLooperInChain) {
      return 'Click to add Phrase Looper pedal into the pedalboard rig';
    }
    if (!isEngineRunning) {
      return 'Cannot record: Audio engine is OFF. Click POWER in the header (microphone/interface required).';
    }
    return getMainBtnLabel();
  };

  return (
    <div className="mini-card-module">
      <div className="mini-module-header">
        <div className="mini-header-title">
          <span className="text-amber-500 font-bold">⟳</span>
          <span>PHRASE LOOPER</span>
        </div>
        <div className="mini-looper-header-actions">
          <span className={`mini-looper-state-chip ${!isEngineRunning ? 'engine-off' : hasLooperInChain ? telemetry.state : 'no-pedal'}`}>
            {!isEngineRunning ? 'ENGINE OFF' : hasLooperInChain ? telemetry.state.toUpperCase() : 'NO RIG'}
          </span>
          {!hasLooperInChain && (
            <button
              className="mini-add-rig-btn"
              onClick={onAddLooper}
              title="Add Looper pedal into canvas board"
            >
              <Plus size={10} strokeWidth={2.5} />
              <span>RIG</span>
            </button>
          )}
        </div>
      </div>

      <div className="mini-module-body mini-looper-body">
        {/* Progress & Duration Bar */}
        <div className="mini-looper-timeline">
          <div
            className="mini-looper-progress-fill"
            style={{ width: `${Math.round(telemetry.progress * 100)}%` }}
          />
          <div className="mini-looper-time-text">
            <span>{currentPlaySec.toFixed(1)}s</span>
            <span>{telemetry.durationSec > 0 ? `${telemetry.durationSec.toFixed(1)}s` : '--'}</span>
          </div>
        </div>

        {/* Transport Actions Row */}
        <div className="mini-looper-controls-row">
          <button
            className={`mini-looper-action-btn main ${hasLooperInChain ? telemetry.state : 'add-rig'}`}
            onClick={handleMainFootswitch}
            title={getMainBtnTitle()}
          >
            {!hasLooperInChain ? (
              <Plus size={11} strokeWidth={2.5} />
            ) : telemetry.state === 'recording' || telemetry.state === 'overdubbing' ? (
              <Circle size={11} fill="currentColor" />
            ) : (
              <Play size={11} fill="currentColor" />
            )}
            <span>{getMainBtnLabel()}</span>
          </button>

          <button
            className="mini-looper-icon-btn"
            onClick={handleStop}
            disabled={telemetry.state === 'idle' || telemetry.state === 'stopped'}
            title="Stop loop playback"
          >
            <Square size={11} fill="currentColor" />
          </button>

          <button
            className="mini-looper-icon-btn"
            onClick={handleUndo}
            disabled={!telemetry.canUndo}
            title="Undo / Redo last overdub"
          >
            <RotateCcw size={11} />
          </button>

          <button
            className="mini-looper-icon-btn danger"
            onClick={handleClear}
            disabled={!telemetry.hasLoop}
            title="Clear loop"
          >
            <Trash2 size={11} />
          </button>
        </div>

        {/* Dedicated Volume Slider Row - Full Width, No Overflow */}
        <div className="mini-looper-vol-row" title={`Loop Playback Level: ${Math.round(level * 100)}%`}>
          <Volume2 size={11} className="text-amber-500 shrink-0" />
          <span className="mini-level-label">LOOP VOL: {Math.round(level * 100)}%</span>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={level}
            onChange={handleLevelChange}
            className="mini-range-input"
          />
        </div>
      </div>
    </div>
  );
};
