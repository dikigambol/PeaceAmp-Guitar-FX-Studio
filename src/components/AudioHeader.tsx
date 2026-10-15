import React, { useState, useRef } from 'react';
import type { AudioEngineMetrics, EngineStatus } from '../types/audio';
import type { PresetSchema } from '../types/preset';
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
  Pencil
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
}

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
}) => {
  const isRunning = status === 'running';
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamePresetName, setRenamePresetName] = useState('');
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPreset = presets.find((p) => p.id === currentPresetId);
  const isUserPresetActive = Boolean(currentPreset);

  const handleSaveClick = () => {
    if (isUserPresetActive) {
      const ok = onSaveCurrentPreset();
      if (ok) {
        setIsSavedFeedback(true);
        setTimeout(() => setIsSavedFeedback(false), 1600);
      }
    } else {
      setNewPresetName('');
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

  return (
    <header className="studio-header">
      {/* SECTION 1: Brand with PeaceAmp Guitar Icon & Ornamental Title */}
      <div className="header-brand-block">
        <div className="brand-guitar-badge" title="PeaceAmp Guitar FX Processor">
          <img src="/ikon.png" alt="PeaceAmp Guitar" className="brand-guitar-img" />
        </div>
        <div className="brand-text-wrap">
          <span className="brand-main-title">PeaceAmp</span>
          <span className="brand-pill-badge">STUDIO</span>
        </div>
      </div>

      {/* SECTION 2: Clean Rig Preset Toolbar (Centered & Neat) */}
      <div className="header-preset-toolbar">
        <div className="preset-label-wrap">
          <Bookmark size={13} className="preset-icon-brass" />
          <span className="preset-static-label">PRESET:</span>
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

        {/* Preset Action Buttons */}
        <div className="preset-action-group">
          {/* Main SAVE button: Overwrites active preset if user preset, or opens modal if none */}
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
                <Check size={12} strokeWidth={2.5} />
                <span>SAVED!</span>
              </>
            ) : isUserPresetActive ? (
              <>
                <Save size={12} strokeWidth={2.2} />
                <span>SAVE</span>
              </>
            ) : (
              <>
                <Plus size={12} strokeWidth={2.2} />
                <span>SAVE</span>
              </>
            )}
          </button>

          {/* If a user preset is active: provide Rename & Save As New buttons */}
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
                <Pencil size={12} strokeWidth={2} />
              </button>

              <button
                className="preset-btn-icon"
                onClick={() => {
                  setNewPresetName(`${currentPreset.name} (Copy)`);
                  setShowSaveModal(true);
                }}
                title="Save current rig as a new preset (Save As)"
              >
                <Plus size={13} strokeWidth={2.2} />
              </button>
            </>
          )}

          <button
            className="preset-btn-icon"
            onClick={onExportPresets}
            title="Export presets to JSON file"
          >
            <Download size={13} strokeWidth={2} />
          </button>

          <button
            className="preset-btn-icon"
            onClick={() => fileInputRef.current?.click()}
            title="Import presets from JSON file"
          >
            <Upload size={13} strokeWidth={2} />
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
              <Trash2 size={13} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* SECTION 3: Audio Telemetry, Fullscreen & Master Power */}
      <div className="header-controls-block">
        {/* Telemetry Readout */}
        <div className="header-telemetry-badge" title={`Engine Status: ${status.toUpperCase()}`}>
          <span className={`telemetry-led-dot ${isRunning ? 'is-active' : 'is-idle'}`} />
          <Activity size={12} className="telemetry-activity-icon" />
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
          <Power size={13} strokeWidth={2.2} />
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
                Enter a name to save your current complete rig (amp, cabinet, pedals, and positions):
              </p>
              <input
                type="text"
                className="dialog-text-input"
                placeholder="e.g. 70s Classic Rock Lead"
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
