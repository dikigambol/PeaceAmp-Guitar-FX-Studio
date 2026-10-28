import React, { useState, useRef, useEffect } from 'react';
import type {
  AudioDeviceInfo,
  AudioEngineMetrics,
  EngineStatus,
  InputChannelMode,
  MeterData,
} from '../types/audio';
import type { PickupVoicingType } from '../audio/InputImpedanceNode';
import type { PresetSchema } from '../types/preset';
import type { TunerResult } from '../dsp/tuner/pitchDetector';
import {
  Power,
  Activity,
  Bookmark,
  Plus,
  Download,
  Upload,
  Trash2,
  Check,
  X,
  Save,
  Pencil,
  Sliders,
  Mic,
  Headphones,
  RefreshCw,
  ShieldCheck,
  Volume2,
  VolumeX,
  Radio,
  Guitar,
  ChevronDown,
} from 'lucide-react';

interface AudioHeaderProps {
  status: EngineStatus;
  metrics: AudioEngineMetrics;
  onTogglePower: () => void;
  isLoading: boolean;
  presets: PresetSchema[];
  currentPresetId: string | null;
  onSelectPreset: (preset: PresetSchema) => void;
  onSaveCurrentPreset: () => boolean;
  onSaveNewPreset: (name: string) => void;
  onRenamePreset: (presetId: string, newName: string) => void;
  onDeletePreset: (presetId: string) => void;
  onExportPresets: () => void;
  onImportPresets: (imported: PresetSchema[]) => void;

  // Consolidated Top Console Controls (moved from former Left Sidebar)
  devices: AudioDeviceInfo[];
  selectedDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  outputDevices: AudioDeviceInfo[];
  selectedOutputDeviceId: string;
  onSelectOutputDevice: (deviceId: string) => void;
  isOutputSelectionSupported: boolean;
  onRefreshDevices: () => void;
  isRefreshingDevices: boolean;
  inputGain: number;
  onInputGainChange: (gain: number) => void;
  inputChannelMode: InputChannelMode;
  onInputChannelModeChange: (mode: InputChannelMode) => void;
  pickupVoicing: PickupVoicingType;
  onPickupVoicingChange: (pickup: PickupVoicingType) => void;
  masterVolume: number;
  onMasterVolumeChange: (volume: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  tunerEnabled: boolean;
  onToggleTuner: () => void;
  tunerResult: TunerResult | null;
  inputMeter: MeterData;
  outputMeter: MeterData;
}

const CHANNEL_OPTIONS: { id: InputChannelMode; label: string; title: string }[] = [
  { id: 'left', label: 'IN 1', title: 'Input 1 only (standard guitar input — lowest noise)' },
  { id: 'right', label: 'IN 2', title: 'Input 2 only' },
  { id: 'sum', label: 'L+R', title: 'Mono sum of Input 1 + Input 2' },
];

const PICKUP_VOICING_OPTIONS: { id: PickupVoicingType; shortLabel: string; label: string; desc: string }[] = [
  { id: 'flat', shortLabel: 'Flat DI', label: 'Natural DI (Flat Hi-Z)', desc: 'True pickup character of your guitar without extra EQ coloration' },
  { id: 'single-coil', shortLabel: 'Strat SC', label: 'Strat / Tele Single-Coil', desc: 'Glassy 3.3 kHz chime & bell-like attack' },
  { id: 'humbucker', shortLabel: 'PAF HB', label: 'PAF Humbucker', desc: 'Warm, woody 2.1 kHz midrange with smooth highs' },
  { id: 'p90', shortLabel: 'P-90', label: 'Vintage P-90 Soapbar', desc: 'Gritty 2.5 kHz upper-mid bark & punch' },
  { id: 'trisonic-series', shortLabel: 'Tri-Sonic (BM)', label: 'Burns Tri-Sonic Series (Red Special)', desc: 'Brian May signature in-series pickups: thick 1.35 kHz vocal midrange & smooth treble' },
  { id: 'active', shortLabel: 'Active EMG', label: 'Active Humbucker (EMG)', desc: 'Buffered low-Z response with extended tight bandwidth' },
];

export const AudioHeader: React.FC<AudioHeaderProps> = ({
  status,
  metrics,
  onTogglePower,
  isLoading,
  presets,
  currentPresetId,
  onSelectPreset,
  onSaveCurrentPreset,
  onSaveNewPreset,
  onRenamePreset,
  onDeletePreset,
  onExportPresets,
  onImportPresets,
  devices,
  selectedDeviceId,
  onSelectDevice,
  outputDevices,
  selectedOutputDeviceId,
  onSelectOutputDevice,
  isOutputSelectionSupported,
  onRefreshDevices,
  isRefreshingDevices,
  inputGain,
  onInputGainChange,
  inputChannelMode,
  onInputChannelModeChange,
  pickupVoicing,
  onPickupVoicingChange,
  masterVolume,
  onMasterVolumeChange,
  isMuted,
  onToggleMute,
  tunerEnabled,
  onToggleTuner,
  tunerResult,
  inputMeter,
  outputMeter,
}) => {
  const isRunning = status === 'running';
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamePresetName, setRenamePresetName] = useState('');
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);
  const [showIoPopover, setShowIoPopover] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const ioPopoverRef = useRef<HTMLDivElement>(null);

  const currentPreset = presets.find((p) => p.id === currentPresetId);
  const isUserPresetActive = Boolean(currentPreset && currentPreset.category === 'user');

  // Close I/O popover on outside click
  useEffect(() => {
    if (!showIoPopover) return;
    const handleOutside = (e: MouseEvent) => {
      if (ioPopoverRef.current && !ioPopoverRef.current.contains(e.target as Node)) {
        setShowIoPopover(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showIoPopover]);

  const handleSaveClick = () => {
    if (isUserPresetActive) {
      const ok = onSaveCurrentPreset();
      if (ok) {
        setIsSavedFeedback(true);
        setTimeout(() => setIsSavedFeedback(false), 1600);
      }
    } else {
      setNewPresetName(currentPreset ? `${currentPreset.name} (Custom)` : '');
      setShowSaveModal(true);
    }
  };

  const handleSaveNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    onSaveNewPreset(newPresetName.trim());
    setNewPresetName('');
    setShowSaveModal(false);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamePresetName.trim() || !currentPreset) return;
    onRenamePreset(currentPreset.id, renamePresetName.trim());
    setShowRenameModal(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          onImportPresets(parsed);
        } else if (parsed && parsed.version === 1) {
          onImportPresets([parsed]);
        }
      } catch {
        alert('Invalid preset JSON format');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Convert dB (-60..0) to 0..100% for compact header meter bars
  const meterToPercent = (m: MeterData) => {
    if (!isRunning || m.peakDb <= -60) return 0;
    return Math.min(100, Math.max(0, ((m.peakDb + 60) / 60) * 100));
  };

  const inPercent = meterToPercent(inputMeter);
  const outPercent = meterToPercent(outputMeter);

  const formatGainDb = (g: number) => {
    const db = 20 * Math.log10(Math.max(0.001, g));
    return `${db >= 0 ? '+' : ''}${db.toFixed(1)}dB`;
  };

  // Tuner calculations
  const cents = tunerResult ? tunerResult.cents : 0;
  const needlePercent = Math.min(100, Math.max(0, ((cents + 50) / 100) * 100));
  const inTune = tunerEnabled && (tunerResult?.inTune ?? false);
  const noteDisplay = !tunerEnabled ? '--' : tunerResult ? `${tunerResult.note}${tunerResult.octave}` : '--';

  return (
    <header className="studio-header">
      {/* SECTION 1: Brand + Compact Input / Pickup / Gate Console */}
      <div className="header-left-cluster">
        <div className="header-brand-block">
          <div className="brand-guitar-badge" title="PeaceAmp Guitar FX Processor">
            <img src="/ikon.png" alt="PeaceAmp Guitar" className="brand-guitar-img" />
          </div>
          <div className="brand-text-wrap">
            <span className="brand-main-title">PeaceAmp</span>
          </div>
        </div>

        <div className="header-cluster-divider" />

        {/* I/O & Input Preamp Popover Trigger */}
        <div className="header-io-popover-anchor" ref={ioPopoverRef}>
          <button
            type="button"
            className={`header-console-pill ${showIoPopover ? 'is-open' : ''}`}
            onClick={() => setShowIoPopover((prev) => !prev)}
            title="Audio Interface I/O, Input Channel, Preamp Gain & Noise Gate Settings"
          >
            <Sliders size={12} className="text-brass" />
            <span>I/O</span>
            <span className="header-pill-sub">{inputChannelMode === 'left' ? 'IN1' : inputChannelMode === 'right' ? 'IN2' : 'L+R'}</span>
            <ChevronDown size={11} />
          </button>

          {showIoPopover && (
            <div className="header-io-dropdown-panel" onMouseDown={(e) => e.stopPropagation()}>
              <div className="io-popover-header">
                <div className="io-popover-title">
                  <Sliders size={12} />
                  <span>AUDIO I/O & INPUT PREAMP</span>
                </div>
                <button
                  type="button"
                  className="io-popover-close"
                  onClick={() => setShowIoPopover(false)}
                >
                  <X size={13} />
                </button>
              </div>

              {/* Input Device */}
              <div className="io-popover-section">
                <label className="io-popover-label">
                  <Mic size={11} />
                  <span>INPUT DEVICE</span>
                </label>
                <div className="mini-device-bar">
                  <select
                    className="mini-device-select"
                    value={selectedDeviceId}
                    onChange={(e) => onSelectDevice(e.target.value)}
                  >
                    {devices.length === 0 && <option value="">(Default Audio Input)</option>}
                    {devices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Input ${d.deviceId.slice(0, 6)}`}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={onRefreshDevices}
                    className={`mini-icon-btn ${isRefreshingDevices ? 'is-refreshing' : ''}`}
                    disabled={isRefreshingDevices}
                    title="Scan & refresh audio devices"
                  >
                    <RefreshCw size={11} className={isRefreshingDevices ? 'is-spinning' : ''} />
                  </button>
                </div>
              </div>

              {/* Input Channel Mode */}
              <div className="io-popover-section">
                <div className="mini-io-row">
                  <span className="mini-io-label">INPUT CH</span>
                  <div className="mini-seg-group">
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
              </div>

              {/* Output Device */}
              <div className="io-popover-section">
                <label className="io-popover-label">
                  <Headphones size={11} />
                  <span>OUTPUT DEVICE</span>
                  <span className="mini-limiter-badge" style={{ marginLeft: 'auto' }}>
                    <ShieldCheck size={10} />
                    <span>LIMIT -0.5dB</span>
                  </span>
                </label>
                <div className="mini-device-bar">
                  <select
                    className="mini-device-select"
                    value={selectedOutputDeviceId}
                    onChange={(e) => onSelectOutputDevice(e.target.value)}
                    disabled={!isOutputSelectionSupported}
                  >
                    {outputDevices.length === 0 && <option value="">(Default Audio Output)</option>}
                    {outputDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Output ${d.deviceId.slice(0, 6)}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Input Preamp Gain */}
              <div className="io-popover-section">
                <div className="io-popover-row-head">
                  <span className="mini-io-label">INPUT GAIN</span>
                  <span className="mini-stage-val">{formatGainDb(inputGain)} ({inputGain.toFixed(2)}x)</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={3.0}
                  step={0.05}
                  value={inputGain}
                  onChange={(e) => onInputGainChange(parseFloat(e.target.value))}
                  className="cab-range-input"
                />
              </div>
            </div>
          )}
        </div>

        {/* Quick Pickup Voicing Selector right in Top Bar */}
        <div className="header-inline-control" title="Guitar Pickup & Cable Impedance Voicing">
          <Guitar size={12} className="text-brass shrink-0" />
          <select
            className="header-compact-select"
            value={pickupVoicing}
            onChange={(e) => onPickupVoicingChange(e.target.value as PickupVoicingType)}
          >
            {PICKUP_VOICING_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id} title={opt.desc}>
                {opt.shortLabel}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Input Gain + Mini IN VU Meter */}
        <div className="header-inline-meter-group" title={`Input Gain: ${formatGainDb(inputGain)} | Peak: ${inputMeter.peakDb > -99 ? inputMeter.peakDb.toFixed(1) : '-∞'} dB`}>
          <span className="header-mini-label">IN</span>
          <input
            type="range"
            min={0}
            max={2.5}
            step={0.05}
            value={inputGain}
            onChange={(e) => onInputGainChange(parseFloat(e.target.value))}
            className="header-mini-slider"
          />
          <div className="header-mini-vu-track">
            <div
              className={`header-mini-vu-fill ${inputMeter.clipHold ? 'is-clip' : ''}`}
              style={{ width: `${inPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: Clean Rig Preset Toolbar (Centered) */}
      <div className="header-preset-toolbar">
        <div className="preset-label-wrap">
          <Bookmark size={12} className="preset-icon-brass" />
          <span className="preset-static-label">PRESET</span>
        </div>

        <select
          className="preset-toolbar-select"
          value={currentPresetId || ''}
          onChange={(e) => {
            const found = presets.find((p) => p.id === e.target.value);
            if (found) onSelectPreset(found);
          }}
          title="Choose Amp & Rig Preset"
        >
          {presets.length === 0 ? (
            <option value="" disabled>
              CLEAN BOARD (NO PRESETS)
            </option>
          ) : (
            <>
              {(!currentPresetId || !presets.some((p) => p.id === currentPresetId)) && (
                <option value="" disabled>
                  SELECT PRESET RIG...
                </option>
              )}
              {presets.some((p) => p.category === 'factory') && (
                <optgroup label="FACTORY PRESETS">
                  {presets
                    .filter((p) => p.category === 'factory')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </optgroup>
              )}

              {presets.some((p) => p.category === 'user') && (
                <optgroup label="USER PRESETS">
                  {presets
                    .filter((p) => p.category === 'user')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </optgroup>
              )}
            </>
          )}
        </select>

        <div className="preset-toolbar-divider" />

        <div className="preset-action-group">
          <button
            className={`preset-btn-save ${isSavedFeedback ? 'is-saved' : ''}`}
            onClick={handleSaveClick}
            title={
              isUserPresetActive && currentPreset
                ? `Save & overwrite current preset "${currentPreset.name}"`
                : 'Save current pedalboard as a new preset'
            }
          >
            {isSavedFeedback ? (
              <>
                <Check size={11} strokeWidth={2.5} />
                <span>SAVED</span>
              </>
            ) : (
              <>
                <Save size={11} strokeWidth={2.2} />
                <span>SAVE</span>
              </>
            )}
          </button>

          {isUserPresetActive && currentPreset && (
            <>
              <button
                className="preset-btn-icon"
                onClick={() => {
                  setRenamePresetName(currentPreset.name);
                  setShowRenameModal(true);
                }}
                title={`Rename preset "${currentPreset.name}"`}
              >
                <Pencil size={11} strokeWidth={2} />
              </button>

              <button
                className="preset-btn-icon"
                onClick={() => {
                  setNewPresetName(`${currentPreset.name} (Copy)`);
                  setShowSaveModal(true);
                }}
                title="Save current rig as a new preset (Save As)"
              >
                <Plus size={12} strokeWidth={2.2} />
              </button>
            </>
          )}

          <button
            className="preset-btn-icon"
            onClick={onExportPresets}
            title="Export presets to JSON file"
          >
            <Download size={12} strokeWidth={2} />
          </button>

          <button
            className="preset-btn-icon"
            onClick={() => fileInputRef.current?.click()}
            title="Import presets from JSON file"
          >
            <Upload size={12} strokeWidth={2} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            style={{ display: 'none' }}
          />

          {isUserPresetActive && currentPreset && (
            <button
              className="preset-btn-icon is-danger"
              onClick={() => onDeletePreset(currentPreset.id)}
              title="Delete this user preset"
            >
              <Trash2 size={12} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* SECTION 3: Minimalist Tuner, Master Volume & Engine Power */}
      <div className="header-controls-block">
        {/* Chromatic Tuner Trigger & Inline Readout */}
        <div className="header-tuner-anchor">
          <button
            type="button"
            className={`header-tuner-pill ${tunerEnabled ? 'is-active' : ''} ${inTune ? 'is-in-tune' : ''}`}
            onClick={onToggleTuner}
            title={tunerEnabled ? 'Click to Exit Silent Tuner' : 'Click to Activate Chromatic Tuner (Silent Tuning)'}
          >
            <Radio size={12} />
            <span>TUNER</span>
            {tunerEnabled && (
              <span className={`header-tuner-note-badge ${inTune ? 'is-tune' : ''}`}>
                {noteDisplay}
              </span>
            )}
          </button>

          {/* Floating Minimalist Chromatic Tuner Bar when Active */}
          {tunerEnabled && (
            <div className="header-floating-tuner-card">
              <div className="floating-tuner-left">
                <span className={`floating-tuner-note ${inTune ? 'is-tune' : ''}`}>
                  {tunerResult ? tunerResult.note : '--'}
                  {tunerResult && <small>{tunerResult.octave}</small>}
                </span>
                <span className="floating-tuner-hz">
                  {tunerResult ? `${tunerResult.frequency.toFixed(1)} Hz` : 'PLUCK STRING'}
                </span>
              </div>

              <div className="floating-tuner-gauge">
                <div className="floating-tuner-ticks">
                  <span>-50¢</span>
                  <span className={inTune ? 'is-tune' : ''}>
                    {!isRunning
                      ? 'ENGINE OFF'
                      : !tunerResult
                        ? 'LISTENING...'
                        : inTune
                          ? '● IN TUNE ●'
                          : tunerResult.cents < 0
                            ? `${tunerResult.cents}¢ FLAT`
                            : `+${tunerResult.cents}¢ SHARP`}
                  </span>
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

              <button
                type="button"
                className="floating-tuner-close"
                onClick={onToggleTuner}
                title="Close Tuner & Unmute Output"
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Inline Master Volume + OUT VU Meter + Mute */}
        <div
          className="header-inline-meter-group"
          title={`Master Volume: ${Math.round(masterVolume * 100)}% | Peak: ${outputMeter.peakDb > -99 ? outputMeter.peakDb.toFixed(1) : '-∞'} dB`}
        >
          <button
            type="button"
            className={`header-mute-icon-btn ${isMuted ? 'is-muted' : ''}`}
            onClick={onToggleMute}
            title={isMuted ? 'Output Muted — Click to Unmute' : 'Mute Master Output'}
          >
            {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>
          <span className="header-mini-label">OUT</span>
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.05}
            value={masterVolume}
            onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
            className="header-mini-slider"
          />
          <div className="header-mini-vu-track">
            <div
              className={`header-mini-vu-fill ${outputMeter.clipHold ? 'is-clip' : ''}`}
              style={{ width: `${outPercent}%` }}
            />
          </div>
        </div>

        {/* Telemetry Readout */}
        <div className="header-telemetry-badge" title={`Engine Status: ${status.toUpperCase()}`}>
          <span className={`telemetry-led-dot ${isRunning ? 'is-active' : 'is-idle'}`} />
          <Activity size={11} className="telemetry-activity-icon" />
          <span className="telemetry-num">
            {metrics.sampleRate ? `${(metrics.sampleRate / 1000).toFixed(0)}k` : '--k'}
          </span>
          <span className="telemetry-sep">•</span>
          <span className="telemetry-num">
            {metrics.totalLatencyMs > 0 ? `${metrics.totalLatencyMs.toFixed(1)}ms` : '--ms'}
          </span>
        </div>

        {/* Master Power Toggle Button */}
        <button
          className={`header-power-btn ${isRunning ? 'is-running' : ''}`}
          onClick={onTogglePower}
          disabled={isLoading}
          title={isRunning ? 'Stop Audio Engine' : 'Start Audio Engine'}
        >
          <Power size={12} strokeWidth={2.2} />
          <span>{isLoading ? 'STARTING...' : isRunning ? 'ENGINE ON' : 'POWER ON'}</span>
        </button>
      </div>

      {/* Modal: Save User Preset (Save As New) */}
      {showSaveModal && (
        <div className="header-modal-backdrop" onClick={() => setShowSaveModal(false)}>
          <div className="header-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title-bar">
              <h5>SAVE NEW RIG PRESET</h5>
              <button
                type="button"
                className="dialog-close-btn"
                onClick={() => setShowSaveModal(false)}
              >
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleSaveNewSubmit} className="dialog-form-body">
              <p className="dialog-info-text">
                Enter a name to save your current complete rig (amps, cabinets, pedals, and routing):
              </p>
              <input
                type="text"
                className="dialog-text-input"
                placeholder="e.g. Brian May Tri-Amp AC30"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                autoFocus
                maxLength={32}
              />
              <div className="dialog-button-row">
                <button
                  type="button"
                  className="dialog-btn-cancel"
                  onClick={() => setShowSaveModal(false)}
                >
                  CANCEL
                </button>
                <button type="submit" className="dialog-btn-submit" disabled={!newPresetName.trim()}>
                  <Check size={13} strokeWidth={2.2} />
                  <span>SAVE PRESET</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Rename User Preset */}
      {showRenameModal && currentPreset && (
        <div className="header-modal-backdrop" onClick={() => setShowRenameModal(false)}>
          <div className="header-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title-bar">
              <h5>RENAME RIG PRESET</h5>
              <button
                type="button"
                className="dialog-close-btn"
                onClick={() => setShowRenameModal(false)}
              >
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleRenameSubmit} className="dialog-form-body">
              <p className="dialog-info-text">
                Enter a new name for preset <strong>"{currentPreset.name}"</strong>:
              </p>
              <input
                type="text"
                className="dialog-text-input"
                placeholder="Preset Name"
                value={renamePresetName}
                onChange={(e) => setRenamePresetName(e.target.value)}
                autoFocus
                maxLength={32}
              />
              <div className="dialog-button-row">
                <button
                  type="button"
                  className="dialog-btn-cancel"
                  onClick={() => setShowRenameModal(false)}
                >
                  CANCEL
                </button>
                <button type="submit" className="dialog-btn-submit" disabled={!renamePresetName.trim()}>
                  <Check size={13} strokeWidth={2.2} />
                  <span>RENAME</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
