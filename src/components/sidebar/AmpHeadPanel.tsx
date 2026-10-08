import React from 'react';
import type { AmpHeadSettings, AmpModelId } from '../../types/amp';
import { AMP_MODELS } from '../../types/amp';
import { Knob } from '../common/Knob';
import { Zap, Power } from 'lucide-react';

interface AmpHeadPanelProps {
  settings: AmpHeadSettings;
  onUpdateSettings: (newSettings: Partial<AmpHeadSettings>) => void;
}

export const AmpHeadPanel: React.FC<AmpHeadPanelProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const currentModel = AMP_MODELS.find((m) => m.id === settings.model) || AMP_MODELS[0];

  const formatPercent = (v: number) => `${Math.round((v / 10) * 100)}%`;
  const formatGain = (v: number) => `${(1 + v * 1.8).toFixed(1)}x`;
  const formatPresence = (v: number) => {
    const db = -9 + (v / 10) * 18;
    return `${db >= 0 ? '+' : ''}${db.toFixed(1)} dB`;
  };

  return (
    <div className={`mini-card-module ${settings.enabled ? 'is-active' : 'is-bypassed'}`}>
      {/* Module Title Header */}
      <div className="mini-module-header">
        <div className="mini-header-title">
          <Zap size={13} className="text-brass" />
          <span>GUITAR AMP HEAD</span>
        </div>

        {/* Master Active / Bypass Switch */}
        <button
          onClick={() => onUpdateSettings({ enabled: !settings.enabled })}
          className={`cab-power-badge ${settings.enabled ? 'is-on' : 'is-off'}`}
          title={settings.enabled ? 'Click to Bypass Amp Head' : 'Click to Activate Amp Head'}
        >
          <Power size={10} />
          <span>{settings.enabled ? 'ACTIVE' : 'BYPASS'}</span>
        </button>
      </div>

      <div className="mini-module-body">
        {/* 1. Amp Model Voicing Dropdown */}
        <div className="cab-control-group">
          <div className="cab-label-row">
            <span className="cab-label">Model Voicing</span>
            <span className="cab-tag-badge">{currentModel.category}</span>
          </div>
          <select
            className="cab-dropdown"
            value={settings.model}
            onChange={(e) => onUpdateSettings({ model: e.target.value as AmpModelId })}
            disabled={!settings.enabled}
            title={currentModel.description}
          >
            {AMP_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.category}
              </option>
            ))}
          </select>
        </div>

        {/* 2. 6-Knob Tone & Drive Matrix (3x2 Grid) */}
        <div className="amp-knobs-grid">
          {/* Row 1: GAIN, BASS, MID */}
          <div className="amp-knob-cell">
            <Knob
              label="GAIN"
              value={settings.gain}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5.0}
              formatValue={formatGain}
              onChange={(val) => onUpdateSettings({ gain: val })}
              disabled={!settings.enabled}
              color="#c8a665"
              size={36}
            />
          </div>
          <div className="amp-knob-cell">
            <Knob
              label="BASS"
              value={settings.bass}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5.0}
              formatValue={formatPercent}
              onChange={(val) => onUpdateSettings({ bass: val })}
              disabled={!settings.enabled}
              color="#c8a665"
              size={36}
            />
          </div>
          <div className="amp-knob-cell">
            <Knob
              label="MID"
              value={settings.mid}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5.0}
              formatValue={formatPercent}
              onChange={(val) => onUpdateSettings({ mid: val })}
              disabled={!settings.enabled}
              color="#c8a665"
              size={36}
            />
          </div>

          {/* Row 2: TREBLE, PRESENCE, MASTER */}
          <div className="amp-knob-cell">
            <Knob
              label="TREBLE"
              value={settings.treble}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5.0}
              formatValue={formatPercent}
              onChange={(val) => onUpdateSettings({ treble: val })}
              disabled={!settings.enabled}
              color="#c8a665"
              size={36}
            />
          </div>
          <div className="amp-knob-cell">
            <Knob
              label="PRESENCE"
              value={settings.presence}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5.0}
              formatValue={formatPresence}
              onChange={(val) => onUpdateSettings({ presence: val })}
              disabled={!settings.enabled}
              color="#c8a665"
              size={36}
            />
          </div>
          <div className="amp-knob-cell">
            <Knob
              label="MASTER"
              value={settings.master}
              min={0}
              max={10}
              step={0.1}
              defaultValue={6.0}
              formatValue={formatPercent}
              onChange={(val) => onUpdateSettings({ master: val })}
              disabled={!settings.enabled}
              color="#c8a665"
              size={36}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
