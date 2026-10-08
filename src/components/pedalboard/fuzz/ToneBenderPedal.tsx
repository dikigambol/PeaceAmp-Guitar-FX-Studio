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

export const ToneBenderPedal: React.FC<PedalProps> = ({
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
  const levelVal = instance.parameters['level'] ?? 5;
  const attackVal = instance.parameters['attack'] ?? 6;

  const isLeftPending = isJackPending?.(instance.id, 'in') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'out') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'in') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'out') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-tonebender ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* 1/4" Side Phone Jacks for Patching Cables */}
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
      <div className="pedal-top-bar tb-top-bar">
        <button
          className="pedal-mini-btn pedal-close-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(instance.id);
          }}
          title="Remove Tone Bender"
        >
          <X size={12} strokeWidth={1.5} />
        </button>
      </div>

      {/* Main Authentic Wedge Chassis with Smooth Border Radiuses */}
      <div className="tonebender-chassis">
        {/* SVG Base Artwork for Authentic Smooth Cast-Metal Rim with Rounded Corners */}
        <svg viewBox="0 0 186 300" className="tb-chassis-svg" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <filter id="tb-cast-shadow" x="-10%" y="-10%" width="120%" height="130%">
              <feDropShadow dx="0" dy="16" stdDeviation="18" floodColor="#000000" floodOpacity="0.85" />
            </filter>
          </defs>
          {/* Outer Cast Rim with Smooth Bezier Rounded Shoulders */}
          <path
            d="M 36 2 L 150 2 C 172 2, 184 14, 184 36 L 168 280 C 168 292, 158 298, 144 298 L 42 298 C 28 298, 18 292, 18 280 L 2 36 C 2 14, 14 2, 36 2 Z"
            fill="#9ca3af"
            stroke="#475569"
            strokeWidth="2.5"
            filter="url(#tb-cast-shadow)"
          />
          {/* Embossed Inner Bevel Ridge */}
          <path
            d="M 36 7 L 150 7 C 168 7, 178 17, 178 36 L 163 276 C 163 286, 155 292, 142 292 L 44 292 C 31 292, 23 286, 23 276 L 8 36 C 8 17, 18 7, 36 7 Z"
            fill="#94a3b8"
            stroke="#64748b"
            strokeWidth="1.8"
          />
        </svg>

        {/* Foreground Content Panel */}
        <div className="tb-chassis-content">
          {/* Vintage British Sola Sound Grotesque Typography: Tone Bender */}
          <div className="tb-brand-area">
            <span className="tb-title-tone">Tone</span>
            <span className="tb-title-bender">Bender</span>
          </div>

          {/* 2 Authentic Black Chicken-Head Knobs */}
          <div className="tb-knobs-row">
            <div className="tb-knob-col">
              <Knob
                label=""
                value={levelVal}
                min={0}
                max={10}
                step={0.1}
                defaultValue={5}
                size={56}
                variant="tonebender"
                showValue={false}
                showLabel={false}
                onChange={(val) => onChangeParam(instance.id, 'level', val)}
              />
              <span className="tb-knob-title">LEVEL</span>
            </div>

            <div className="tb-knob-col">
              <Knob
                label=""
                value={attackVal}
                min={0}
                max={10}
                step={0.1}
                defaultValue={6}
                size={56}
                variant="tonebender"
                showValue={false}
                showLabel={false}
                onChange={(val) => onChangeParam(instance.id, 'attack', val)}
              />
              <span className="tb-knob-title">ATTACK</span>
            </div>
          </div>

          {/* Classic 3PDT Chrome Footswitch (Exact Big Muff Stomp Assembly) */}
          <div className="tb-stomp-section">
            <div className="classic-stomp-wrap" onPointerDown={(e) => e.stopPropagation()}>
              <button
                className={`classic-stomp-switch ocd-stomp-switch ${isEnabled ? 'active' : ''}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleEnabled(instance.id);
                }}
                title={isEnabled ? 'Click to bypass' : 'Click to engage Tone Bender'}
              >
                <svg viewBox="0 0 52 52" className="classic-stomp-svg ocd-stomp-svg" aria-hidden="true">
                  <defs>
                    <linearGradient id="tb-hex-grad" x1="20%" y1="0%" x2="80%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="25%" stopColor="#d1d5db" />
                      <stop offset="50%" stopColor="#9ca3af" />
                      <stop offset="75%" stopColor="#6b7280" />
                      <stop offset="100%" stopColor="#4b5563" />
                    </linearGradient>
                    <linearGradient id="tb-hex-chamfer" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
                      <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
                    </linearGradient>
                    <radialGradient id="tb-collar-grad" cx="40%" cy="35%" r="60%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="45%" stopColor="#e5e7eb" />
                      <stop offset="75%" stopColor="#9ca3af" />
                      <stop offset="100%" stopColor="#4b5563" />
                    </radialGradient>
                    <radialGradient id="tb-plunger-grad" cx="38%" cy="35%" r="62%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="35%" stopColor="#e2e8f0" />
                      <stop offset="65%" stopColor="#94a3b8" />
                      <stop offset="90%" stopColor="#64748b" />
                      <stop offset="100%" stopColor="#475569" />
                    </radialGradient>
                    <filter id="tb-stomp-shadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.5" />
                    </filter>
                  </defs>
                  {/* Hex Nut Outer with Shadow */}
                  <polygon
                    points="43.2,35.5 26,46 8.8,35.5 8.8,14.5 26,4 43.2,14.5"
                    fill="url(#tb-hex-grad)"
                    stroke="#374151"
                    strokeWidth="1"
                    filter="url(#tb-stomp-shadow)"
                  />
                  {/* Inner Hex Chamfer Bevel */}
                  <polygon
                    points="41.5,34.5 26,44 10.5,34.5 10.5,15.5 26,6 41.5,15.5"
                    fill="none"
                    stroke="url(#tb-hex-chamfer)"
                    strokeWidth="1.2"
                  />
                  {/* Threaded Collar Ring */}
                  <circle cx="26" cy="25" r="14.5" fill="url(#tb-collar-grad)" stroke="#374151" strokeWidth="1" />
                  <circle cx="26" cy="25" r="13" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.8" />
                  {/* Collar Alignment Key Notch at 12 o'clock */}
                  <rect x="24.8" y="10.5" width="2.4" height="3" fill="#1f2937" rx="0.5" />
                  {/* Central Plunger Actuator Button */}
                  <g className="classic-plunger-disc ocd-plunger-disc">
                    <circle cx="26" cy="25" r="10.5" fill="url(#tb-plunger-grad)" stroke="#1e293b" strokeWidth="1" />
                    <circle cx="24.5" cy="23.5" r="8" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" />
                    <ellipse cx="23" cy="21.5" rx="3.5" ry="2" fill="rgba(255,255,255,0.5)" />
                  </g>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

