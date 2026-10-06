import React from 'react';
import type { CabinetModelId, CabinetSettings, MicModelId } from '../../types/cabinet';
import { CABINET_OPTIONS, MIC_OPTIONS } from '../../types/cabinet';
import { Box, Power } from 'lucide-react';

interface CabinetSimulatorPanelProps {
  settings: CabinetSettings;
  onUpdateSettings: (newSettings: Partial<CabinetSettings>) => void;
}

export const CabinetSimulatorPanel: React.FC<CabinetSimulatorPanelProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const currentCab = CABINET_OPTIONS.find((c) => c.id === settings.model);
  const currentMic = MIC_OPTIONS.find((m) => m.id === settings.mic);
  const mixPercent = Math.round(settings.mix * 100);

  return (
    <div className={`mini-card-module ${settings.enabled ? 'is-active' : 'is-bypassed'}`}>
      {/* Module Title Header */}
      <div className="mini-module-header">
        <div className="mini-header-title">
          <Box size={13} className="text-amber-500" />
          <span>CABINET IR SIMULATOR</span>
        </div>

        {/* Master Active / Bypass Switch */}
        <button
          onClick={() => onUpdateSettings({ enabled: !settings.enabled })}
          className={`cab-power-badge ${settings.enabled ? 'is-on' : 'is-off'}`}
          title={settings.enabled ? 'Click to Bypass Cabinet IR' : 'Click to Activate Cabinet IR'}
        >
          <Power size={10} />
          <span>{settings.enabled ? 'ACTIVE' : 'BYPASS'}</span>
        </button>
      </div>

      <div className="mini-module-body">
        {/* 1. Cabinet Selector Dropdown */}
        <div className="cab-control-group">
          <div className="cab-label-row">
            <span className="cab-label">Cabinet</span>
            <span className="cab-tag-badge">
              {currentCab?.category || 'ENCLOSURE'}
            </span>
          </div>
          <select
            className="cab-dropdown"
            value={settings.model}
            onChange={(e) => onUpdateSettings({ model: e.target.value as CabinetModelId })}
            disabled={!settings.enabled}
          >
            <optgroup label="Open Back Cabinets">
              {CABINET_OPTIONS.filter((c) => c.category === 'Open Back').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.description}
                </option>
              ))}
            </optgroup>
            <optgroup label="Closed Back Cabinets">
              {CABINET_OPTIONS.filter((c) => c.category === 'Closed Back').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.description}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* 2. Mic Selector Dropdown */}
        <div className="cab-control-group">
          <div className="cab-label-row">
            <span className="cab-label">Mic</span>
            <span className="cab-tag-badge">{currentMic?.type || 'TRANSDUCER'}</span>
          </div>
          <select
            className="cab-dropdown"
            value={settings.mic}
            onChange={(e) => onUpdateSettings({ mic: e.target.value as MicModelId })}
            disabled={!settings.enabled}
          >
            {MIC_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.description}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Mic Position Slider (Edge <-> Center) */}
        <div className="cab-control-group">
          <div className="cab-label-row">
            <span className="cab-label">Position</span>
            <span className="cab-value-text">
              {settings.position <= 0.25
                ? 'Edge (Warm & Dark)'
                : settings.position >= 0.75
                  ? 'Center (Bright & Direct)'
                  : 'Sweet Spot (Balanced)'}
            </span>
          </div>

          <div className="cab-slider-container">
            <span className="cab-slider-anchor-label">Edge</span>
            <div className="cab-slider-track-box">
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={settings.position}
                disabled={!settings.enabled}
                onChange={(e) => onUpdateSettings({ position: parseFloat(e.target.value) })}
                className="cab-range-input"
                title={`Mic placement: ${(settings.position * 100).toFixed(0)}% from cone edge to center`}
              />
            </div>
            <span className="cab-slider-anchor-label">Center</span>
          </div>
        </div>

        {/* 4. Wet/Dry Convolution Mix Slider */}
        <div className="cab-control-group">
          <div className="cab-label-row">
            <span className="cab-label">Mix</span>
            <div className="cab-mix-numeric-badge font-mono">
              <span>{mixPercent}%</span>
            </div>
          </div>

          <div className="cab-slider-container">
            <span className="cab-slider-anchor-label">Dry</span>
            <div className="cab-slider-track-box">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={settings.mix}
                disabled={!settings.enabled}
                onChange={(e) => onUpdateSettings({ mix: parseFloat(e.target.value) })}
                className="cab-range-input"
                title={`Wet/Dry mix: ${mixPercent}% Cabinet IR`}
              />
            </div>
            <span className="cab-slider-anchor-label">Wet</span>
          </div>

          {/* Graphical Progress Bar matching ASCII Mockup */}
          <div className="cab-mix-bar-visual" title={`Convolution Mix: ${mixPercent}%`}>
            <div
              className="cab-mix-bar-fill"
              style={{ width: `${mixPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
