import React, { useRef } from 'react';
import type { CabinetModelId, CabinetSettings, MicModelId } from '../../types/cabinet';
import { CABINET_OPTIONS, MIC_OPTIONS } from '../../types/cabinet';
import { Box, Power, Upload, RotateCcw } from 'lucide-react';

interface CabinetSimulatorPanelProps {
  settings: CabinetSettings;
  onUpdateSettings: (newSettings: Partial<CabinetSettings>) => void;
  onLoadCustomIR?: (file: File) => void;
}

export const CabinetSimulatorPanel: React.FC<CabinetSimulatorPanelProps> = ({
  settings,
  onUpdateSettings,
  onLoadCustomIR,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentCab = CABINET_OPTIONS.find((c) => c.id === settings.model);
  const currentMic = MIC_OPTIONS.find((m) => m.id === settings.mic);
  const mixPercent = Math.round(settings.mix * 100);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onLoadCustomIR) {
      onLoadCustomIR(file);
    }
    // Reset value so re-selecting same file triggers onChange
    if (e.target) e.target.value = '';
  };

  const formatDistanceLabel = (dist: number = 0.15) => {
    const inches = (0.5 + dist * 5.5).toFixed(1);
    if (dist <= 0.2) return `${inches}" (Close / Direct Punch)`;
    if (dist >= 0.7) return `${inches}" (Ambient / Studio Room)`;
    return `${inches}" (Sweet Spot Standard)`;
  };

  return (
    <div className={`mini-card-module ${settings.enabled ? 'is-active' : 'is-bypassed'}`}>
      {/* Module Title Header */}
      <div className="mini-module-header">
        <div className="mini-header-title">
          <Box size={13} className="text-brass" />
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
              {settings.model === 'custom'
                ? 'CUSTOM IR'
                : `${currentCab?.brand || ''} ${currentCab?.category || 'ENCLOSURE'}`.trim()}
            </span>
          </div>
          <select
            className="cab-dropdown"
            value={settings.model}
            onChange={(e) => onUpdateSettings({ model: e.target.value as CabinetModelId })}
            disabled={!settings.enabled}
            title={
              settings.model === 'custom'
                ? `Custom IR: ${settings.customIrName || 'User Wave'}`
                : `${currentCab?.brand} ${currentCab?.name} (${currentCab?.speakers})`
            }
          >
            {settings.customIrName && (
              <optgroup label="Custom User IR">
                <option value="custom">★ {settings.customIrName} (Custom WAV)</option>
              </optgroup>
            )}

            <optgroup label="Open Back Cabinets (Vintage / Chime / Combo)">
              {CABINET_OPTIONS.filter((c) => c.category === 'Open Back').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.brand} {c.name} — {c.speakers}
                </option>
              ))}
            </optgroup>

            <optgroup label="Closed Back Cabinets (Heavy Rock / Metal / Stadium)">
              {CABINET_OPTIONS.filter((c) => c.category === 'Closed Back').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.brand} {c.name} — {c.speakers}
                </option>
              ))}
            </optgroup>
          </select>

          {/* Cabinet & Speaker Description */}
          <div
            style={{
              fontSize: '10.5px',
              color: '#8e96a4',
              marginTop: '4px',
              lineHeight: '1.3',
              fontStyle: 'italic',
            }}
          >
            {settings.model === 'custom'
              ? `External impulse response: ${settings.customIrName || 'Loaded .wav'}`
              : `${currentCab?.description}`}
          </div>
        </div>

        {/* 2. Mic Selector Dropdown */}
        <div className="cab-control-group">
          <div className="cab-label-row">
            <span className="cab-label">Microphone</span>
            <span className="cab-tag-badge">{currentMic?.type || 'TRANSDUCER'}</span>
          </div>
          <select
            className="cab-dropdown"
            value={settings.mic}
            onChange={(e) => onUpdateSettings({ mic: e.target.value as MicModelId })}
            disabled={!settings.enabled}
            title={currentMic?.description}
          >
            {MIC_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.type}
              </option>
            ))}
          </select>
          <div
            style={{
              fontSize: '10.5px',
              color: '#8e96a4',
              marginTop: '4px',
              lineHeight: '1.3',
              fontStyle: 'italic',
            }}
          >
            {currentMic?.description}
          </div>
        </div>

        {/* 3. Mic Placement: Position (Horizontal) & Distance (Depth) */}
        <div className="cab-control-group">
          {/* Position Slider (Edge <-> Center) */}
          <div className="cab-label-row">
            <span className="cab-label">Mic Position</span>
            <span className="cab-value-text">
              {settings.position <= 0.25
                ? 'Edge (Warm & Dark)'
                : settings.position >= 0.75
                  ? 'Center (Bright & Direct)'
                  : 'Cap-Edge (Sweet Spot)'}
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
                title={`Mic axis position: ${(settings.position * 100).toFixed(0)}% from cone edge to center`}
              />
            </div>
            <span className="cab-slider-anchor-label">Center</span>
          </div>

          {/* Distance Slider (Close <-> Far) */}
          <div className="cab-label-row" style={{ marginTop: '8px' }}>
            <span className="cab-label">Mic Distance</span>
            <span className="cab-value-text">{formatDistanceLabel(settings.distance)}</span>
          </div>

          <div className="cab-slider-container">
            <span className="cab-slider-anchor-label">0.5"</span>
            <div className="cab-slider-track-box">
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={settings.distance ?? 0.15}
                disabled={!settings.enabled}
                onChange={(e) => onUpdateSettings({ distance: parseFloat(e.target.value) })}
                className="cab-range-input"
                title={`Grill distance: ${(0.5 + (settings.distance ?? 0.15) * 5.5).toFixed(1)} inches`}
              />
            </div>
            <span className="cab-slider-anchor-label">6.0"</span>
          </div>
        </div>

        {/* 4. Wet/Dry Convolution Mix & Level Output Trim */}
        <div className="cab-control-group">
          <div className="cab-label-row">
            <span className="cab-label">Mix & Output Level</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <div className="cab-mix-numeric-badge font-mono" title="Convolution Mix">
                <span>MIX: {mixPercent}%</span>
              </div>
              <div className="cab-mix-numeric-badge font-mono" title="Output Level Trim">
                <span>
                  {(settings.level ?? 0) >= 0 ? '+' : ''}
                  {(settings.level ?? 0).toFixed(1)} dB
                </span>
              </div>
            </div>
          </div>

          {/* Mix Slider */}
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

          {/* Graphical Progress Bar matching Brushed Gold Gradient */}
          <div className="cab-mix-bar-visual" title={`Convolution Mix: ${mixPercent}%`}>
            <div className="cab-mix-bar-fill" style={{ width: `${mixPercent}%` }} />
          </div>

          {/* Level Slider (-12 to +6 dB) */}
          <div className="cab-slider-container" style={{ marginTop: '8px' }}>
            <span className="cab-slider-anchor-label">-12dB</span>
            <div className="cab-slider-track-box">
              <input
                type="range"
                min={-12}
                max={6}
                step={0.5}
                value={settings.level ?? 0}
                disabled={!settings.enabled}
                onChange={(e) => onUpdateSettings({ level: parseFloat(e.target.value) })}
                className="cab-range-input"
                title={`Cabinet Output Level Trim: ${(settings.level ?? 0).toFixed(1)} dB`}
              />
            </div>
            <span className="cab-slider-anchor-label">+6dB</span>
          </div>
        </div>

        {/* 5. Custom IR (.WAV) File Loader */}
        <div className="cab-control-group" style={{ marginTop: '4px' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".wav,.wave,.aif,.aiff"
            style={{ display: 'none' }}
          />

          <div className="cab-upload-row">
            <button
              type="button"
              className="cab-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={!settings.enabled}
              title="Upload your own custom impulse response .wav file"
            >
              <Upload size={12} />
              <span>Load Custom IR (.wav)</span>
            </button>

            {settings.model === 'custom' && (
              <button
                type="button"
                className="cab-upload-btn"
                style={{ flex: 'none', width: '32px', padding: '5px' }}
                onClick={() => onUpdateSettings({ model: '4x12-closed' })}
                title="Reset to default cabinet model"
              >
                <RotateCcw size={12} />
              </button>
            )}
          </div>

          {/* Quick Demo IRs */}
          <div style={{ marginTop: '6px' }}>
            <div style={{ fontSize: '9px', color: '#bfa168', marginBottom: '3px', fontWeight: 600 }}>
              FREE DEMO IR SAMPLES:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
              <button
                type="button"
                className="cab-upload-btn"
                style={{ fontSize: '9px', padding: '3px 4px' }}
                disabled={!settings.enabled}
                onClick={async () => {
                  try {
                    const res = await fetch('/sample-irs/Mesa_Rectifier_4x12_V30_SM57.wav');
                    const blob = await res.blob();
                    const file = new File([blob], 'Mesa_Rectifier_4x12_V30_SM57.wav', { type: 'audio/wav' });
                    onLoadCustomIR?.(file);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                title="Try 24-bit 48kHz Mesa 4x12 V30 Demo IR"
              >
                Mesa V30
              </button>
              <button
                type="button"
                className="cab-upload-btn"
                style={{ fontSize: '9px', padding: '3px 4px' }}
                disabled={!settings.enabled}
                onClick={async () => {
                  try {
                    const res = await fetch('/sample-irs/Marshall_1960AX_4x12_Greenback_MD421.wav');
                    const blob = await res.blob();
                    const file = new File([blob], 'Marshall_1960AX_4x12_Greenback_MD421.wav', { type: 'audio/wav' });
                    onLoadCustomIR?.(file);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                title="Try 24-bit 48kHz Marshall Greenback Demo IR"
              >
                Marshall 1960
              </button>
              <button
                type="button"
                className="cab-upload-btn"
                style={{ fontSize: '9px', padding: '3px 4px' }}
                disabled={!settings.enabled}
                onClick={async () => {
                  try {
                    const res = await fetch('/sample-irs/Fender_Twin_2x12_Ribbon_Warm.wav');
                    const blob = await res.blob();
                    const file = new File([blob], 'Fender_Twin_2x12_Ribbon_Warm.wav', { type: 'audio/wav' });
                    onLoadCustomIR?.(file);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                title="Try 24-bit 48kHz Fender Twin Ribbon Demo IR"
              >
                Twin Ribbon
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
