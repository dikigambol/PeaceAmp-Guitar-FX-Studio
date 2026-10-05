import React, { useState, useRef } from 'react';
import type { PresetSchema } from '../../types/preset';
import { Bookmark, Download, Upload, Plus, Trash2, Check } from 'lucide-react';

interface PresetBarProps {
  presets: PresetSchema[];
  currentPresetId: string | null;
  onSelectPreset: (preset: PresetSchema) => void;
  onSaveCurrentAsPreset: (name: string) => void;
  onDeletePreset: (presetId: string) => void;
  onExportPresets: () => void;
  onImportPresets: (imported: PresetSchema[]) => void;
}

export const PresetBar: React.FC<PresetBarProps> = ({
  presets,
  currentPresetId,
  onSelectPreset,
  onSaveCurrentAsPreset,
  onDeletePreset,
  onExportPresets,
  onImportPresets,
}) => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPreset = presets.find((p) => p.id === currentPresetId);

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    onSaveCurrentAsPreset(newPresetName.trim());
    setNewPresetName('');
    setShowSaveModal(false);
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
          <optgroup label="FACTORY PRESETS">
            {presets
              .filter((p) => p.category === 'factory')
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </optgroup>

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
          <button
            className="preset-delete-btn"
            onClick={() => onDeletePreset(currentPreset.id)}
            title="Delete this user preset"
          >
            <Trash2 size={13} strokeWidth={1.5} />
          </button>
        )}
      </div>

      <div className="preset-action-buttons">
        <button
          className="preset-btn btn-save"
          onClick={() => setShowSaveModal(true)}
          title="Save current pedal settings as a new preset"
        >
          <Plus size={14} strokeWidth={1.5} />
          <span>SAVE PRESET</span>
        </button>

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

      {/* Save Modal */}
      {showSaveModal && (
        <div className="save-modal-overlay">
          <form className="save-modal-card" onSubmit={handleSaveSubmit}>
            <h4>SAVE NEW PRESET</h4>
            <p>Enter a preset name to save your current pedalboard settings:</p>
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
    </div>
  );
};
