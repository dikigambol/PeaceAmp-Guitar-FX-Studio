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

// Shared Clockwise Rotational Arrow for OCD Knobs (Volume, Drive, Tone)
const OcdRotationalArrow: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 62 62" className={`ocd-knob-arc-svg ${className}`} aria-hidden="true">
    <path
      d="M 24.5 7 A 25 25 0 0 1 43.5 52.6"
      fill="none"
      stroke="#14171a"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <polygon points="38,55.5 43.5,49.5 46.5,54.5" fill="#14171a" />
  </svg>
);

export const FulltoneOcdPedal: React.FC<PedalProps> = ({
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
  const volVal = instance.parameters['volume'] ?? 5;
  const toneVal = instance.parameters['tone'] ?? 5;
  const driveVal = instance.parameters['drive'] ?? 5;
  const modeVal = instance.parameters['mode'] ?? 1; // 0 = LP, 1 = HP

  const isLeftPending = isJackPending?.(instance.id, 'in') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'out') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'in') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'out') ?? false;

  const isHp = modeVal >= 0.5;

  return (
    <div
      className={`pedal-custom-enclosure pedal-fulltone-ocd ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* 4 Authentic Chassis Corner Screws */}
      <div className="pedal-screw screw-tl" />
      <div className="pedal-screw screw-tr" />
      <div className="pedal-screw screw-bl" />
      <div className="pedal-screw screw-br" />

      {/* 1/4" Side Audio Phone Jacks */}
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

      {/* Top Header Bar */}
      <div className="pedal-top-bar">
        <button
          className="pedal-mini-btn pedal-close-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(instance.id);
          }}
          title="Remove pedal from board"
        >
          <X size={12} strokeWidth={1.5} />
        </button>
      </div>

      {/* Top Section: Volume & Drive Knobs with Authentic Rotational Arrows & Center HP/LP Toggle + Blue LED */}
      <div className="ocd-top-row">
        {/* Left: Volume Knob */}
        <div className="ocd-knob-unit">
          <span className="ocd-label">Volume</span>
          <div className="ocd-knob-wrap">
            <Knob
              label="Volume"
              value={volVal}
              min={0}
              max={10}
              step={0.1}
              size={44}
              variant="ocd"
              showLabel={false}
              showValue={false}
              onChange={(v) => onChangeParam(instance.id, 'volume', v)}
            />
            {/* Volume Rotational Arrow: Identical to Drive & Tone */}
            <OcdRotationalArrow />
          </div>
        </div>

        {/* Center: HP / LP Modern Tactile Slide Switch & Blue Jewel LED */}
        <div className="ocd-center-toggle-col">
          <span className={`ocd-switch-lbl ${isHp ? 'is-active' : ''}`}>HP</span>
          <div
            className={`ocd-toggle-switch ocd-modern-slider ${isHp ? 'is-hp' : 'is-lp'}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onChangeParam(instance.id, 'mode', isHp ? 0 : 1);
            }}
            title={`Mode: ${isHp ? 'High Peak (HP)' : 'Low Peak (LP)'} - Click to switch`}
            role="switch"
            aria-checked={isHp}
          >
            <div className="ocd-slider-slot">
              <div className="ocd-slider-thumb">
                <div className="ocd-slider-ridge" />
                <div className="ocd-slider-ridge" />
                <div className="ocd-slider-ridge" />
              </div>
            </div>
          </div>
          <span className={`ocd-switch-lbl ${!isHp ? 'is-active' : ''}`}>LP</span>

          {/* Electric Blue Jewel Indicator LED */}
          <div
            className="ocd-led-mount"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleEnabled(instance.id);
            }}
            title="Click to toggle bypass"
          >
            <div className="ocd-led-bezel">
              <div className={`ocd-blue-led ${isEnabled ? 'lit' : 'off'}`} />
            </div>
          </div>
        </div>

        {/* Right: Drive Knob */}
        <div className="ocd-knob-unit">
          <span className="ocd-label">Drive</span>
          <div className="ocd-knob-wrap">
            <Knob
              label="Drive"
              value={driveVal}
              min={0}
              max={10}
              step={0.1}
              size={44}
              variant="ocd"
              showLabel={false}
              showValue={false}
              onChange={(v) => onChangeParam(instance.id, 'drive', v)}
            />
            {/* Drive Rotational Arrow */}
            <OcdRotationalArrow />
          </div>
        </div>
      </div>

      {/* Middle Section: Center Tone Knob with Label to the Right and Wrapping Arrow */}
      <div className="ocd-mid-tone-row">
        <div className="ocd-tone-group">
          <div className="ocd-knob-wrap">
            <Knob
              label="Tone"
              value={toneVal}
              min={0}
              max={10}
              step={0.1}
              size={44}
              variant="ocd"
              showLabel={false}
              showValue={false}
              onChange={(v) => onChangeParam(instance.id, 'tone', v)}
            />
            {/* Tone Rotational Arrow */}
            <OcdRotationalArrow />
          </div>
          <span className="ocd-label ocd-tone-side-lbl">Tone</span>
        </div>
      </div>

      {/* Iconic Bold Hand-Drawn OCD® Graphic Mark */}
      <div className="ocd-logo-badge">
        <svg viewBox="0 0 160 68" className="ocd-logo-svg" aria-label="Fulltone OCD">
          {/* Letter O */}
          <path
            d="M 31 7 C 17 7, 5 18, 5 35 C 5 52, 17 63, 31 63 C 45 63, 56 52, 56 35 C 56 18, 45 7, 31 7 Z M 31 20 C 38 20, 43 26, 43 35 C 43 44, 38 50, 31 50 C 24 50, 19 44, 19 35 C 19 26, 24 20, 31 20 Z"
            fill="#12161a"
            fillRule="evenodd"
          />
          {/* Letter C */}
          <path
            d="M 97 17 C 95 12, 87 6, 75 6 C 58 6, 47 19, 47 35 C 47 51, 58 64, 75 64 C 88 64, 96 57, 98 51 C 99 47, 95 43, 90 43 C 86 43, 83 46, 79 48 C 76 50, 73 51, 71 51 C 62 51, 59 44, 59 35 C 59 26, 63 19, 72 19 C 76 19, 80 20, 83 23 C 86 25, 89 26, 92 26 C 96 26, 99 22, 97 17 Z"
            fill="#12161a"
          />
          {/* Letter D */}
          <path
            d="M 103 8 C 103 6.5, 104.5 5.5, 106 5.5 L 126 5.5 C 142 5.5, 155 18, 155 35 C 155 49, 144 61, 131 63.5 C 127 64.5, 114 64.5, 106 64.5 C 104.5 64.5, 103 63.5, 103 62 Z M 116 18 L 116 52 C 120 52, 126 52, 129 50 C 137 47, 142 42, 142 35 C 142 27, 137 20, 127 18 C 124 18, 119 18, 116 18 Z"
            fill="#12161a"
            fillRule="evenodd"
          />
          {/* Registered Trademark ® */}
          <circle cx="151.5" cy="60.5" r="3.6" fill="none" stroke="#12161a" strokeWidth="1" />
          <text x="151.5" y="62.7" textAnchor="middle" fontSize="4.6" fontWeight="900" fill="#12161a" fontFamily="sans-serif">R</text>
        </svg>
      </div>

      {/* 3PDT Chrome Footswitch with Machined Hex Base */}
      <div className="ocd-stomp-wrap" onPointerDown={(e) => e.stopPropagation()}>
        <button
          className={`ocd-stomp-switch ${isEnabled ? 'active' : ''}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title="Toggle OCD Bypass"
        >
          <svg viewBox="0 0 52 52" className="ocd-stomp-svg" aria-hidden="true">
            <defs>
              <linearGradient id="ocd-hex-grad" x1="20%" y1="0%" x2="80%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="25%" stopColor="#d1d5db" />
                <stop offset="50%" stopColor="#9ca3af" />
                <stop offset="75%" stopColor="#6b7280" />
                <stop offset="100%" stopColor="#4b5563" />
              </linearGradient>
              <linearGradient id="ocd-hex-chamfer" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
              </linearGradient>
              <radialGradient id="ocd-collar-grad" cx="40%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="45%" stopColor="#e5e7eb" />
                <stop offset="75%" stopColor="#9ca3af" />
                <stop offset="100%" stopColor="#4b5563" />
              </radialGradient>
              <radialGradient id="ocd-plunger-grad" cx="38%" cy="35%" r="62%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="35%" stopColor="#e2e8f0" />
                <stop offset="65%" stopColor="#94a3b8" />
                <stop offset="90%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#475569" />
              </radialGradient>
              <filter id="ocd-stomp-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.45" />
              </filter>
            </defs>
            {/* Hex Nut Outer with Shadow */}
            <polygon
              points="43.2,35.5 26,46 8.8,35.5 8.8,14.5 26,4 43.2,14.5"
              fill="url(#ocd-hex-grad)"
              stroke="#374151"
              strokeWidth="1"
              filter="url(#ocd-stomp-shadow)"
            />
            {/* Inner Hex Chamfer Bevel */}
            <polygon
              points="41.5,34.5 26,44 10.5,34.5 10.5,15.5 26,6 41.5,15.5"
              fill="none"
              stroke="url(#ocd-hex-chamfer)"
              strokeWidth="1.2"
            />
            {/* Threaded Collar Ring */}
            <circle cx="26" cy="25" r="14.5" fill="url(#ocd-collar-grad)" stroke="#374151" strokeWidth="1" />
            <circle cx="26" cy="25" r="13" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.8" />
            {/* Collar Alignment Key Notch at 12 o'clock */}
            <rect x="24.8" y="10.5" width="2.4" height="3" fill="#1f2937" rx="0.5" />
            {/* Central Plunger Actuator Button */}
            <circle
              className="ocd-plunger-disc"
              cx="26"
              cy="25"
              r="10"
              fill="url(#ocd-plunger-grad)"
              stroke="#374151"
              strokeWidth="0.9"
            />
            {/* Concentric Machined Texture Rings */}
            <circle cx="26" cy="25" r="8" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
            <circle cx="26" cy="25" r="5" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="0.6" />
            {/* Specular Glint */}
            <ellipse cx="23.5" cy="22" rx="3.5" ry="2" fill="rgba(255,255,255,0.45)" />
          </svg>
        </button>
      </div>

      {/* Footer Branding: Mike Fuller Signature Fulltone® & Built in the USA */}
      <div className="ocd-footer-brand">
        <div className="ocd-fulltone-wrap">
          <svg viewBox="0 0 100 24" className="ocd-fulltone-svg" aria-label="Fulltone">
            <text
              x="48"
              y="18"
              textAnchor="middle"
              fontFamily="'Brush Script MT', 'Berkshire Swash', 'Comic Neue', cursive"
              fontSize="20"
              fontWeight="900"
              fontStyle="italic"
              fill="#14171a"
              letterSpacing="0.2px"
            >
              Fulltone
            </text>
            <circle cx="92" cy="7" r="2.2" fill="none" stroke="#14171a" strokeWidth="0.8" />
            <text x="92" y="8.8" textAnchor="middle" fontSize="3.2" fontWeight="bold" fill="#14171a" fontFamily="sans-serif">R</text>
          </svg>
        </div>
        <div className="ocd-usa-txt">Built in the USA</div>
      </div>
    </div>
  );
};
