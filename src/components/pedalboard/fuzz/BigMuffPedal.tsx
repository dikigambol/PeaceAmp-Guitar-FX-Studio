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

export const BigMuffPedal: React.FC<PedalProps> = ({
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
  const volumeVal = instance.parameters['volume'] ?? 5;
  const toneVal = instance.parameters['tone'] ?? 5;
  const sustainVal = instance.parameters['sustain'] ?? 6;

  const isLeftPending = isJackPending?.(instance.id, 'in') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'out') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'in') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'out') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-bigmuff ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* 4 Corner Chassis Screws */}
      <div className="bm-screw top-left" />
      <div className="bm-screw top-right" />
      <div className="bm-screw bottom-left" />
      <div className="bm-screw bottom-right" />

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

      {/* Top Header Toolstrip */}
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

      {/* Main Faceplate Card with Black Outer Frame */}
      <div className="bigmuff-faceplate">
        {/* Top Header Labels: AMPLIFIER / INPUT */}
        <div className="bigmuff-io-header">
          <span className="bm-io-label left">AMPLIFIER</span>
          <span className="bm-io-label right">INPUT</span>
        </div>

        {/* 3 Large Classic EHX Hockey-Puck Knobs */}
        <div className="bigmuff-knobs-area">
          <div className="bigmuff-knobs-row">
            <div className="bigmuff-knob-col">
              <Knob
                label="VOLUME"
                value={volumeVal}
                min={0}
                max={10}
                step={0.1}
                defaultValue={5}
                showValue={false}
                variant="bigmuff"
                onChange={(v) => onChangeParam(instance.id, 'volume', v)}
                size={48}
              />
            </div>

            <div className="bigmuff-knob-col center">
              <Knob
                label="TONE"
                value={toneVal}
                min={0}
                max={10}
                step={0.1}
                defaultValue={5}
                showValue={false}
                variant="bigmuff"
                onChange={(v) => onChangeParam(instance.id, 'tone', v)}
                size={48}
              />
            </div>

            <div className="bigmuff-knob-col">
              <Knob
                label="SUSTAIN"
                value={sustainVal}
                min={0}
                max={10}
                step={0.1}
                defaultValue={6}
                showValue={false}
                variant="bigmuff"
                onChange={(v) => onChangeParam(instance.id, 'sustain', v)}
                size={48}
              />
            </div>
          </div>
        </div>

        {/* Red Title Section (Double Red Stripes + Bold Vintage BIG MUFF + Side LED Indicator) */}
        <div className="bigmuff-graphics-strip">
          <div className="bigmuff-red-band-top">
            <div className="bigmuff-red-line thin" />
            <div className="bigmuff-red-line thick" />
          </div>
          <div className="bigmuff-title-row">
            <div className="bigmuff-title-text">BIG MUFF</div>

            {/* Vintage Red Pilot LED Bezel (Positioned right beside BIG MUFF title) */}
            <div
              className="bigmuff-title-led-mount"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleEnabled(instance.id);
              }}
              title="Click to toggle bypass"
            >
              <div className="bigmuff-led-bezel">
                <div className={`bigmuff-red-led ${isEnabled ? 'lit' : 'off'}`} />
              </div>
            </div>
          </div>
          <div className="bigmuff-red-band-bottom">
            <div className="bigmuff-red-line thick" />
            <div className="bigmuff-red-line thin" />
          </div>
        </div>

        {/* Lower Solid Gloss Black Enamel Section with Classic 3PDT Chrome Footswitch (OCD-style) */}
        <div className="bigmuff-lower-face">
          <div className="classic-stomp-wrap" onPointerDown={(e) => e.stopPropagation()}>
            <button
              className={`classic-stomp-switch ocd-stomp-switch ${isEnabled ? 'active' : ''}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleEnabled(instance.id);
              }}
              title={isEnabled ? 'Click to bypass' : 'Click to engage Big Muff'}
            >
              <svg viewBox="0 0 52 52" className="classic-stomp-svg ocd-stomp-svg" aria-hidden="true">
                <defs>
                  <linearGradient id="bm-hex-grad" x1="20%" y1="0%" x2="80%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="25%" stopColor="#d1d5db" />
                    <stop offset="50%" stopColor="#9ca3af" />
                    <stop offset="75%" stopColor="#6b7280" />
                    <stop offset="100%" stopColor="#4b5563" />
                  </linearGradient>
                  <linearGradient id="bm-hex-chamfer" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
                  </linearGradient>
                  <radialGradient id="bm-collar-grad" cx="40%" cy="35%" r="60%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="45%" stopColor="#e5e7eb" />
                    <stop offset="75%" stopColor="#9ca3af" />
                    <stop offset="100%" stopColor="#4b5563" />
                  </radialGradient>
                  <radialGradient id="bm-plunger-grad" cx="38%" cy="35%" r="62%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="35%" stopColor="#e2e8f0" />
                    <stop offset="65%" stopColor="#94a3b8" />
                    <stop offset="90%" stopColor="#64748b" />
                    <stop offset="100%" stopColor="#475569" />
                  </radialGradient>
                  <filter id="bm-stomp-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.5" />
                  </filter>
                </defs>
                {/* Hex Nut Outer with Shadow */}
                <polygon
                  points="43.2,35.5 26,46 8.8,35.5 8.8,14.5 26,4 43.2,14.5"
                  fill="url(#bm-hex-grad)"
                  stroke="#374151"
                  strokeWidth="1"
                  filter="url(#bm-stomp-shadow)"
                />
                {/* Inner Hex Chamfer Bevel */}
                <polygon
                  points="41.5,34.5 26,44 10.5,34.5 10.5,15.5 26,6 41.5,15.5"
                  fill="none"
                  stroke="url(#bm-hex-chamfer)"
                  strokeWidth="1.2"
                />
                {/* Threaded Collar Ring */}
                <circle cx="26" cy="25" r="14.5" fill="url(#bm-collar-grad)" stroke="#374151" strokeWidth="1" />
                <circle cx="26" cy="25" r="13" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.8" />
                {/* Collar Alignment Key Notch at 12 o'clock */}
                <rect x="24.8" y="10.5" width="2.4" height="3" fill="#1f2937" rx="0.5" />
                {/* Central Plunger Actuator Button */}
                <g className="classic-plunger-disc ocd-plunger-disc">
                  <circle cx="26" cy="25" r="10.5" fill="url(#bm-plunger-grad)" stroke="#1e293b" strokeWidth="1" />
                  <circle cx="24.5" cy="23.5" r="8" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" />
                  <ellipse cx="23" cy="21.5" rx="3.5" ry="2" fill="rgba(255,255,255,0.5)" />
                </g>
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom Brushed Footer Branding */}
        <div className="bigmuff-footer">
          <span className="bigmuff-brand">electro-harmonix</span>
          <span className="bigmuff-origin">USA</span>
        </div>
      </div>
    </div>
  );
};
