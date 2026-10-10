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

      {/* Top Header Toolstrip with Clean Close Button */}
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

      {/* Main Authentic Sola Sound MkII Wedge Coffin Chassis */}
      <div className="tonebender-chassis">
        {/* Pure CSS Procedural Noise Hammertone Texture Layer */}
        <div className="tb-enclosure-texture" />

        {/* SVG Decorative Framing: Drop Shadow, Raised Cast Rim, Inner Groove, Top Jacks */}
        <svg viewBox="0 0 186 326" className="tb-chassis-svg" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            {/* Ambient Cast Drop Shadow */}
            <filter id="tb-cast-shadow" x="-20%" y="-10%" width="140%" height="130%">
              <feDropShadow dx="0" dy="16" stdDeviation="16" floodColor="#000000" floodOpacity="0.8" />
            </filter>

            {/* Clipping Path for CSS Texture Container */}
            <clipPath id="tb-body-clip">
              <path d="M 28 14 L 158 14 C 174 14, 184 22, 184 38 L 183 140 C 182 150, 178 160, 172 172 L 150 300 C 148 310, 140 320, 126 320 L 60 320 C 46 320, 38 310, 36 300 L 14 172 C 8 160, 4 150, 3 140 L 2 38 C 2 22, 12 14, 28 14 Z" />
            </clipPath>

            {/* Raised Cast Rim 3D Bead Highlight/Shadow */}
            <linearGradient id="tb-rim-grad" x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor="#f5f8f5" />
              <stop offset="22%" stopColor="#dce3dd" />
              <stop offset="55%" stopColor="#8d978f" />
              <stop offset="85%" stopColor="#5d665f" />
              <stop offset="100%" stopColor="#3d443e" />
            </linearGradient>

            {/* Top Jacks Hex Nut Gradient */}
            <linearGradient id="tb-jack-hex" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="50%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>
            <radialGradient id="tb-jack-barrel" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#d1d5db" />
              <stop offset="60%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#1f2937" />
            </radialGradient>
          </defs>

          {/* Top Jacks Protruding from Top Edge (OUTPUT left, INPUT right) */}
          <g className="tb-top-jacks">
            {/* Left Output Jack */}
            <g transform="translate(56, 11)">
              <polygon points="-9,-5 0,-8 9,-5 9,4 0,7 -9,4" fill="url(#tb-jack-hex)" stroke="#0f172a" strokeWidth="0.8" />
              <polygon points="-7.5,-4 0,-6.5 7.5,-4 7.5,3 0,5.5 -7.5,3" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
              <circle cx="0" cy="0" r="4.2" fill="url(#tb-jack-barrel)" stroke="#0a0a0a" strokeWidth="0.6" />
              <circle cx="0" cy="0" r="2.8" fill="#050505" />
            </g>
            {/* Right Input Jack */}
            <g transform="translate(130, 11)">
              <polygon points="-9,-5 0,-8 9,-5 9,4 0,7 -9,4" fill="url(#tb-jack-hex)" stroke="#0f172a" strokeWidth="0.8" />
              <polygon points="-7.5,-4 0,-6.5 7.5,-4 7.5,3 0,5.5 -7.5,3" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
              <circle cx="0" cy="0" r="4.2" fill="url(#tb-jack-barrel)" stroke="#0a0a0a" strokeWidth="0.6" />
              <circle cx="0" cy="0" r="2.8" fill="#050505" />
            </g>
          </g>

          {/* 1. Raised Cast Outer Perimeter Rim (Bead) */}
          <path
            d="M 29 16 L 157 16 C 172 16, 181.5 23.5, 181.5 38 L 180.5 139 C 179.5 148.5, 175.5 158, 169.5 170 L 147.5 298 C 145.5 307, 138 316, 125 316 L 61 316 C 48 316, 40.5 307, 38.5 298 L 16.5 170 C 10.5 158, 6.5 148.5, 5.5 139 L 4.5 38 C 4.5 23.5, 14 16, 29 16 Z"
            fill="none"
            stroke="url(#tb-rim-grad)"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />

          {/* 2. Recessed Bevel Inner Shadow Groove */}
          <path
            d="M 31 18.5 L 155 18.5 C 169 18.5, 178.5 25.5, 178.5 39 L 177.5 138 C 176.5 147, 172.5 156, 166.5 168 L 145 296 C 143 304, 136 313, 123 313 L 63 313 C 50 313, 43 304, 41 296 L 19.5 168 C 13.5 156, 9.5 147, 8.5 138 L 7.5 39 C 7.5 25.5, 17 18.5, 31 18.5 Z"
            fill="none"
            stroke="#222823"
            strokeWidth="1.2"
            strokeOpacity="0.55"
          />
          <path
            d="M 32 19.5 L 154 19.5 C 167 19.5, 177 26.5, 177 39.5 L 176 138 C 175 146.5, 171 155.5, 165 167 L 144 295 C 142 303, 135 311.5, 122 311.5 L 64 311.5 C 51 311.5, 44 303, 42 295 L 21 167 C 15 155.5, 11 146.5, 10 138 L 9 39.5 C 9 26.5, 19 19.5, 32 19.5 Z"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="0.8"
          />
        </svg>

        {/* Foreground Content Panel */}
        <div className="tb-chassis-content">
          {/* Top Jack Markings (OUTPUT / INPUT) */}
          <div className="tb-top-labels">
            <span className="tb-jack-label left">OUTPUT</span>
            <span className="tb-jack-label right">INPUT</span>
          </div>

          {/* Vintage British Sola Sound Grotesque Typography: Tone Bender */}
          <div className="tb-brand-area">
            <span className="tb-title-tone">Tone</span>
            <span className="tb-title-bender">Bender</span>
          </div>

          {/* 2 Authentic Black Chicken-Head Knobs with LEVEL / ATTACK Silkscreen */}
          <div className="tb-knobs-area">
            <div className="tb-knob-unit left">
              <Knob
                label=""
                value={levelVal}
                min={0}
                max={10}
                step={0.1}
                defaultValue={5}
                size={52}
                variant="tonebender"
                showValue={false}
                showLabel={false}
                onChange={(val) => onChangeParam(instance.id, 'level', val)}
              />
              <span className="tb-knob-label">LEVEL</span>
            </div>

            <div className="tb-knob-unit right">
              <Knob
                label=""
                value={attackVal}
                min={0}
                max={10}
                step={0.1}
                defaultValue={6}
                size={52}
                variant="tonebender"
                showValue={false}
                showLabel={false}
                onChange={(val) => onChangeParam(instance.id, 'attack', val)}
              />
              <span className="tb-knob-label">ATTACK</span>
            </div>
          </div>

          {/* Authentic Round British Chrome Footswitch Assembly */}
          <div className="tb-stomp-section" onPointerDown={(e) => e.stopPropagation()}>
            <button
              className={`tb-stomp-switch ${isEnabled ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleEnabled(instance.id);
              }}
              title={isEnabled ? 'Click to bypass' : 'Click to engage Tone Bender'}
            >
              <svg viewBox="0 0 46 46" className="tb-stomp-svg" aria-hidden="true">
                <defs>
                  <radialGradient id="tb-foot-flange" cx="36%" cy="30%" r="68%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="28%" stopColor="#e5eae6" />
                    <stop offset="65%" stopColor="#9aa49c" />
                    <stop offset="90%" stopColor="#667068" />
                    <stop offset="100%" stopColor="#3d443e" />
                  </radialGradient>
                  <radialGradient id="tb-foot-collar" cx="40%" cy="34%" r="62%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="38%" stopColor="#d3ded5" />
                    <stop offset="72%" stopColor="#7a857c" />
                    <stop offset="100%" stopColor="#363d37" />
                  </radialGradient>
                  <radialGradient id="tb-foot-plunger" cx="35%" cy="30%" r="65%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="22%" stopColor="#edf2ee" />
                    <stop offset="58%" stopColor="#a3ada5" />
                    <stop offset="85%" stopColor="#6c756e" />
                    <stop offset="100%" stopColor="#414842" />
                  </radialGradient>
                  <filter id="tb-foot-shadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.75" />
                  </filter>
                </defs>
                {/* Outer British Round Chrome Flange / Washer */}
                <circle cx="23" cy="23" r="21" fill="url(#tb-foot-flange)" filter="url(#tb-foot-shadow)" stroke="#2f3631" strokeWidth="0.8" />
                <circle cx="23" cy="23" r="19.6" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.6" />
                {/* Stepped Chrome Collar Ring */}
                <circle cx="23" cy="23" r="16" fill="url(#tb-foot-collar)" stroke="#232924" strokeWidth="0.8" />
                <circle cx="23" cy="23" r="14.6" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5" />
                <circle cx="23" cy="23" r="12" fill="#1b201c" stroke="#101411" strokeWidth="0.6" />
                {/* Central Domed Chrome Actuator Plunger */}
                <g className="tb-plunger-group">
                  <circle cx="23" cy="23" r="10.5" fill="url(#tb-foot-plunger)" stroke="#282f2a" strokeWidth="0.8" />
                  <circle cx="22" cy="22" r="8.2" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.6" />
                  <ellipse cx="20.5" cy="20" rx="3.4" ry="1.9" fill="rgba(255,255,255,0.7)" />
                </g>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


