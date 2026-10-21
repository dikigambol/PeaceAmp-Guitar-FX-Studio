import React, { useState, useRef } from 'react';
import type { PresetSchema } from '../../types/preset';
import { Bookmark, Download, Upload, Plus, Trash2, Check, Save, Pencil } from 'lucide-react';

interface PresetBarProps {
  presets: PresetSchema[];
  currentPresetId: string | null;
  onSelectPreset: (preset: PresetSchema) => void;
  onSaveCurrentPreset?: () => boolean;
  onSaveCurrentAsPreset: (name: string) => void;
  onRenamePreset?: (presetId: string, newName: string) => void;
  onDeletePreset: (presetId: string) => void;
  onExportPresets: () => void;
  onImportPresets: (imported: PresetSchema[]) => void;
}

export const PresetBar: React.FC<PresetBarProps> = ({
  presets,
  currentPresetId,
  onSelectPreset,
  onSaveCurrentPreset,
  onSaveCurrentAsPreset,
  onRenamePreset,
  onDeletePreset,
  onExportPresets,
  onImportPresets,
}) => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamePresetName, setRenamePresetName] = useState('');
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPreset = presets.find((p) => p.id === currentPresetId);
  const isUserPresetActive = Boolean(currentPreset && currentPreset.category === 'user');

  const handleSaveClick = () => {
    if (isUserPresetActive && onSaveCurrentPreset) {
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

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    onSaveCurrentAsPreset(newPresetName.trim());
    setNewPresetName('');
    setShowSaveModal(false);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamePresetName.trim() || !currentPreset || !onRenamePreset) return;
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
    <div className="preset-bar-strip">
      <div className="preset-selector-group">
        <Bookmark size={15} strokeWidth={1.5} className="preset-icon text-brass" />
        <span className="preset-label">RIG PRESET:</span>

        <select
          className="preset-dropdown-select"
          value={currentPresetId || ''}
          onChange={(e) => {
            const found = presets.find((p) => p.id === e.target.value);
            if (found) onSelectPreset(found);
          }}
        >
          {presets.length === 0 ? (
            <option value="" disabled>
              -- No Rig Presets Saved --
            </option>
          ) : (
            (!currentPresetId || !presets.some((p) => p.id === currentPresetId)) && (
              <option value="" disabled>
                -- Select Rig Preset --
              </option>
            )
          )}

          {presets.filter((p) => p.category === 'factory').length > 0 && (
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
        </select>

        {currentPreset && currentPreset.category === 'user' && (
          <>
            {onRenamePreset && (
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
            )}
            <button
              className="preset-delete-btn"
              onClick={() => onDeletePreset(currentPreset.id)}
              title="Delete this user preset"
            >
              <Trash2 size={13} strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>

      <div className="preset-action-buttons">
        <button
          className={`preset-btn btn-save ${isSavedFeedback ? 'is-saved' : ''}`}
          onClick={handleSaveClick}
          title={
            isUserPresetActive && currentPreset
              ? `Save & overwrite current preset "${currentPreset.name}"`
              : 'Save complete rig setup as a new preset'
          }
        >
          {isSavedFeedback ? (
            <>
              <Check size={14} strokeWidth={2.5} />
              <span>SAVED!</span>
            </>
          ) : isUserPresetActive ? (
            <>
              <Save size={14} strokeWidth={1.8} />
              <span>SAVE</span>
            </>
          ) : (
            <>
              <Plus size={14} strokeWidth={1.5} />
              <span>SAVE RIG</span>
            </>
          )}
        </button>

        {isUserPresetActive && currentPreset && (
          <button
            className="preset-btn btn-save"
            onClick={() => {
              setNewPresetName(`${currentPreset.name} (Copy)`);
              setShowSaveModal(true);
            }}
            title="Save as a new preset"
          >
            <Plus size={14} strokeWidth={1.5} />
            <span>SAVE AS</span>
          </button>
        )}

        <button
          className="preset-btn btn-export"
          onClick={onExportPresets}
          title="Export presets as JSON"
        >
          <Download size={14} strokeWidth={1.5} />
          <span>EXPORT</span>
        </button>

        <button
          className="preset-btn btn-import"
          onClick={() => fileInputRef.current?.click()}
          title="Import presets from JSON"
        >
          <Upload size={14} strokeWidth={1.5} />
          <span>IMPORT</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {/* Save Modal (Save As New) */}
      {showSaveModal && (
        <div className="save-modal-overlay">
          <form className="save-modal-card" onSubmit={handleSaveSubmit}>
            <h4>SAVE FULL RIG PRESET</h4>
            <p>Save entire rig configuration (amp head, cabinet IR, volume, pedals & canvas positions):</p>
            <input
              type="text"
              autoFocus
              className="save-modal-input"
              placeholder="e.g. Occult Black Metal Doom"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
            />
            <div className="save-modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setShowSaveModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-modal-submit" disabled={!newPresetName.trim()}>
                <Check size={14} />
                <span>Save</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && currentPreset && (
        <div className="save-modal-overlay">
          <form className="save-modal-card" onSubmit={handleRenameSubmit}>
            <h4>RENAME RIG PRESET</h4>
            <p>Enter a new name for preset <strong>"{currentPreset.name}"</strong>:</p>
            <input
              type="text"
              autoFocus
              className="save-modal-input"
              placeholder="Preset Name"
              value={renamePresetName}
              onChange={(e) => setRenamePresetName(e.target.value)}
            />
            <div className="save-modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setShowRenameModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-modal-submit" disabled={!renamePresetName.trim()}>
                <Check size={14} />
                <span>Rename</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
