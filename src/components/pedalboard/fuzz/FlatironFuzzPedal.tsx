import React from 'react';
import type { PedalInstance, PedalMetadata } from '../../../types/pedal';
import { Knob } from '../../common/Knob';
import { X } from 'lucide-react';

interface PedalProps {
  instance: PedalInstance;
  metadata: PedalMetadata;
  index: number;
  onToggleEnabled: (id: string) => void;
  onChangeParam: (id: string, paramId: string, val: number) => void;
  onRemove: (id: string) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  style?: React.CSSProperties;
  isDragging?: boolean;
  onJackClick?: (pedalId: string, port: 'in' | 'out', e: React.MouseEvent) => void;
  isJackPending?: (pedalId: string, port: 'in' | 'out') => boolean;
  hasJackCable?: (pedalId: string, port: 'in' | 'out') => boolean;
}

export const FlatironFuzzPedal: React.FC<PedalProps> = ({
  instance,
  onToggleEnabled,
  onChangeParam,
  onRemove,
  onPointerDown,
  style,
  isDragging = false,
  onJackClick,
  isJackPending,
  hasJackCable,
}) => {
  const isEnabled = instance.enabled;
  const volVal = instance.parameters['vol'] ?? 5;
  const driveVal = instance.parameters['drive'] ?? 6;
  const filterVal = instance.parameters['filter'] ?? 5;

  const isLeftPending = isJackPending?.(instance.id, 'in') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'out') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'in') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'out') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-flatiron ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* 1/4" Side Phone Jacks for Patching */}
      <div
        className={`stompbox-side-jack jack-left ${isLeftPending ? 'is-jack-pending' : ''} ${hasLeftCable ? 'has-cable' : ''}`}
        title="Audio Input Jack - Click to patch cable"
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'in', e);
        }}
      />
      <div
        className={`stompbox-side-jack jack-right ${isRightPending ? 'is-jack-pending' : ''} ${hasRightCable ? 'has-cable' : ''}`}
        title="Audio Output Jack - Click to patch cable"
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'out', e);
        }}
      />

      {/* Top Header Toolstrip with Big Muff style close button */}
      <div className="pedal-top-bar flatiron-top-bar">
        <button
          className="pedal-mini-btn pedal-close-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(instance.id);
          }}
          title="Remove Flatiron Fuzz"
        >
          <X size={11} strokeWidth={1.5} />
        </button>
      </div>

      {/* Retro Vibrant Orange Silkscreen Faceplate Card */}
      <div className="flatiron-faceplate">
        {/* Flatiron Building NYC Architectural Silkscreen Graphic */}
        <div className="flatiron-building-svg-wrap" aria-hidden="true">
          <svg viewBox="0 0 136 210" className="flatiron-building-svg">
            <defs>
              <linearGradient id="fl-bldg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffedd5" stopOpacity="0.45" />
                <stop offset="50%" stopColor="#fed7aa" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#c2410c" stopOpacity="0.6" />
              </linearGradient>
              <pattern id="fl-dot-grid" width="4" height="4" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="0.7" fill="#ffffff" fillOpacity="0.25" />
              </pattern>
            </defs>
            {/* Halftone stipple backdrop texture */}
            <rect x="0" y="0" width="136" height="210" fill="url(#fl-dot-grid)" />
            {/* Skyscraper Wedge Outline */}
            <polygon points="68,14 88,65 94,155 42,155 48,65" fill="url(#fl-bldg-grad)" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.7" />
            {/* Architectural Cornice Top */}
            <rect x="63" y="10" width="10" height="4.5" fill="#ffffff" fillOpacity="0.65" rx="1" />
            <circle cx="68" cy="8" r="2" fill="#ffffff" fillOpacity="0.8" />
            {/* Skyscraper Facade Vertical Mullions */}
            <line x1="68" y1="15" x2="68" y2="155" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.8" />
            <line x1="61" y1="28" x2="57" y2="155" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.5" />
            <line x1="75" y1="28" x2="79" y2="155" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.5" />
            <line x1="55" y1="45" x2="50" y2="155" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.4" />
            <line x1="81" y1="45" x2="86" y2="155" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.4" />
            {/* Window Floor Stories Grid */}
            {[26, 36, 46, 56, 66, 76, 86, 96, 106, 116, 126, 136, 146].map((y) => (
              <line key={y} x1="46" y1={y} x2="90" y2={y} stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.45" />
            ))}
          </svg>
        </div>

        {/* 9V DC Power Jack Silk Indicator */}
        <div className="flatiron-power-tag">
          <span className="fl-power-text">9V</span>
          <svg viewBox="0 0 18 10" className="fl-power-icon" aria-hidden="true">
            <circle cx="9" cy="5" r="3.5" fill="none" stroke="#ffffff" strokeWidth="0.8" />
            <circle cx="9" cy="5" r="1.2" fill="#ffffff" />
            <path d="M 2 5 L 5 5 M 13 5 L 16 5" stroke="#ffffff" strokeWidth="0.8" />
            <path d="M 1 3.5 L 1 6.5" stroke="#ffffff" strokeWidth="0.8" />
            <path d="M 17 3.5 L 17 6.5 M 15.5 5 L 18.5 5" stroke="#ffffff" strokeWidth="0.8" />
          </svg>
        </div>

        {/* Side Jack Silkscreen Vertical Labels */}
        <div className="flatiron-side-text left">
          <span className="fl-side-arrow">&#9650;</span>
          <span>AMP.</span>
        </div>
        <div className="flatiron-side-text right">
          <span className="fl-side-arrow">&#9660;</span>
          <span>INPUT</span>
        </div>

        {/* Triangle Knobs Configuration: VOL & DRIVE (top row), FILTER (center) */}
        <div className="flatiron-knobs-area">
          {/* Top Row: VOL and DRIVE */}
          <div className="flatiron-knobs-top-row">
            <div className="flatiron-knob-col">
              <Knob
                label=""
                value={volVal}
                min={0}
                max={10}
                step={0.1}
                size={38}
                variant="flatiron"
                showValue={false}
                showLabel={false}
                onChange={(val) => onChangeParam(instance.id, 'vol', val)}
              />
              <span className="flatiron-knob-lbl">VOL</span>
            </div>

            <div className="flatiron-knob-col">
              <Knob
                label=""
                value={driveVal}
                min={0}
                max={10}
                step={0.1}
                size={38}
                variant="flatiron"
                showValue={false}
                showLabel={false}
                onChange={(val) => onChangeParam(instance.id, 'drive', val)}
              />
              <span className="flatiron-knob-lbl">DRIVE</span>
            </div>
          </div>

          {/* Center Lower Knob: FILTER */}
          <div className="flatiron-knob-center">
            <Knob
              label=""
              value={filterVal}
              min={0}
              max={10}
              step={0.1}
              size={38}
              variant="flatiron"
              showValue={false}
              showLabel={false}
              onChange={(val) => onChangeParam(instance.id, 'filter', val)}
            />
            <span className="flatiron-knob-lbl">FILTER</span>
          </div>
        </div>

        {/* Retro 1970s Inline Block Typography: FLATIRON */}
        <div className="flatiron-logo-wrap">
          <div className="flatiron-title-art">FLATIRON</div>
        </div>

        {/* Footswitch 3PDT Assembly and Red Jewel Pilot LED */}
        <div className="flatiron-stomp-row">
          <div className="classic-stomp-wrap" onPointerDown={(e) => e.stopPropagation()}>
            <button
              className={`classic-stomp-switch ocd-stomp-switch ${isEnabled ? 'active' : ''}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleEnabled(instance.id);
              }}
              title={isEnabled ? 'Click to bypass' : 'Click to engage Flatiron Fuzz'}
            >
              <svg viewBox="0 0 52 52" className="classic-stomp-svg ocd-stomp-svg" aria-hidden="true">
                <defs>
                  <linearGradient id="fl-hex-grad" x1="20%" y1="0%" x2="80%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="25%" stopColor="#d1d5db" />
                    <stop offset="50%" stopColor="#9ca3af" />
                    <stop offset="75%" stopColor="#6b7280" />
                    <stop offset="100%" stopColor="#4b5563" />
                  </linearGradient>
                  <linearGradient id="fl-hex-chamfer" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
                  </linearGradient>
                  <radialGradient id="fl-collar-grad" cx="40%" cy="35%" r="60%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="45%" stopColor="#e5e7eb" />
                    <stop offset="75%" stopColor="#9ca3af" />
                    <stop offset="100%" stopColor="#4b5563" />
                  </radialGradient>
                  <radialGradient id="fl-plunger-grad" cx="38%" cy="35%" r="62%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="35%" stopColor="#e2e8f0" />
                    <stop offset="65%" stopColor="#94a3b8" />
                    <stop offset="90%" stopColor="#64748b" />
                    <stop offset="100%" stopColor="#475569" />
                  </radialGradient>
                  <filter id="fl-stomp-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.5" />
                  </filter>
                </defs>
                {/* Hex Nut Outer with Shadow */}
                <polygon
                  points="43.2,35.5 26,46 8.8,35.5 8.8,14.5 26,4 43.2,14.5"
                  fill="url(#fl-hex-grad)"
                  stroke="#374151"
                  strokeWidth="1"
                  filter="url(#fl-stomp-shadow)"
                />
                {/* Inner Hex Chamfer Bevel */}
                <polygon
                  points="41.5,34.5 26,44 10.5,34.5 10.5,15.5 26,6 41.5,15.5"
                  fill="none"
                  stroke="url(#fl-hex-chamfer)"
                  strokeWidth="1.2"
                />
                {/* Threaded Collar Ring */}
                <circle cx="26" cy="25" r="14.5" fill="url(#fl-collar-grad)" stroke="#374151" strokeWidth="1" />
                <circle cx="26" cy="25" r="13" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.8" />
                <rect x="24.8" y="10.5" width="2.4" height="3" fill="#1f2937" rx="0.5" />
                {/* Central Plunger Actuator Button */}
                <g className="classic-plunger-disc ocd-plunger-disc">
                  <circle cx="26" cy="25" r="10.5" fill="url(#fl-plunger-grad)" stroke="#1e293b" strokeWidth="1" />
                  <circle cx="24.5" cy="23.5" r="8" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" />
                  <ellipse cx="23" cy="21.5" rx="3.5" ry="2" fill="rgba(255,255,255,0.5)" />
                </g>
              </svg>
            </button>
          </div>

          {/* Vintage Red Bezel Pilot LED */}
          <div className="flatiron-led-mount">
            <div className={`flatiron-led ${isEnabled ? 'active' : ''}`} />
          </div>
        </div>

        {/* Retro 1970s Inline Block Typography: FUZZ */}
        <div className="flatiron-fuzz-wrap">
          <div className="flatiron-fuzz-art">FUZZ</div>
        </div>

        {/* Footer: electro-harmonix & NEW YORK CITY, USA */}
        <div className="flatiron-footer">
          <span className="flatiron-ehx-text">electro-harmonix</span>
          <span className="flatiron-nyc-text">NEW YORK CITY, USA</span>
        </div>
      </div>
    </div>
  );
};
