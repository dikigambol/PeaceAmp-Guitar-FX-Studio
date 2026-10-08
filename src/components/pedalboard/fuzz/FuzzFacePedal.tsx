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

export const FuzzFacePedal: React.FC<PedalProps> = ({
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
  const fuzzVal = instance.parameters['fuzz'] ?? 6;

  const isLeftPending = isJackPending?.(instance.id, 'in') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'out') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'in') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'out') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-fuzzface ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* 1/4" Side Phone Jacks for Patching - Attached directly flush to circular body */}
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
      <div className="pedal-top-bar ff-top-bar">
        <button
          className="pedal-mini-btn pedal-close-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(instance.id);
          }}
          title="Remove Fuzz Face"
        >
          <X size={12} strokeWidth={1.5} />
        </button>
      </div>

      {/* Main Circular Disc Face */}
      <div className="fuzzface-circular-body">

        {/* Curved "FUZZ FACE" Arched Stencil Logo */}
        <div className="fuzzface-curved-banner">
          <svg viewBox="0 0 180 38" className="fuzzface-banner-svg" aria-hidden="true">
            <defs>
              <path id="ff-arch-path" d="M 12,32 Q 90,8 168,32" fill="none" />
            </defs>
            <text className="fuzzface-svg-title">
              <textPath href="#ff-arch-path" startOffset="50%" textAnchor="middle">
                FUZZ FACE
              </textPath>
            </text>
          </svg>
        </div>

        {/* Center Blue Pilot LED */}
        <div className="fuzzface-center-led-mount">
          <div className="fuzzface-led-bezel">
            <div className={`fuzzface-blue-led ${isEnabled ? 'lit' : ''}`} />
          </div>
        </div>

        {/* 2 Scalloped Knobs: Left = VOLUME, Right = FUZZ (No numerical indicators!) */}
        <div className="fuzzface-knobs-spread">
          {/* VOLUME (Left) */}
          <div className="fuzzface-knob-cluster left">
            <Knob
              label=""
              value={volumeVal}
              min={0}
              max={10}
              step={0.1}
              size={52}
              variant="fuzzface"
              showLabel={false}
              showValue={false}
              onChange={(val) => onChangeParam(instance.id, 'volume', val)}
            />
            <div className="fuzzface-pot-label left">
              {/* Authentic Teardrop Dot Pointing Counter-Clockwise */}
              <svg viewBox="0 0 16 16" className="fuzzface-teardrop left" aria-hidden="true">
                <path
                  d="M 14,8 C 14,11.5 11,14.5 7.5,14.5 C 4,14.5 1,11.5 1,8 C 1,4.5 7.5,0.5 7.5,0.5 C 7.5,0.5 14,4.5 14,8 Z"
                  fill="#ffffff"
                />
              </svg>
              <span>VOLUME</span>
            </div>
          </div>

          {/* FUZZ (Right) */}
          <div className="fuzzface-knob-cluster right">
            <Knob
              label=""
              value={fuzzVal}
              min={0}
              max={10}
              step={0.1}
              size={52}
              variant="fuzzface"
              showLabel={false}
              showValue={false}
              onChange={(val) => onChangeParam(instance.id, 'fuzz', val)}
            />
            <div className="fuzzface-pot-label right">
              <span>FUZZ</span>
              {/* Authentic Teardrop Dot Pointing Clockwise */}
              <svg viewBox="0 0 16 16" className="fuzzface-teardrop right" aria-hidden="true">
                <path
                  d="M 14,8 C 14,11.5 11,14.5 7.5,14.5 C 4,14.5 1,11.5 1,8 C 1,4.5 7.5,0.5 7.5,0.5 C 7.5,0.5 14,4.5 14,8 Z"
                  fill="#ffffff"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Wedge-Shaped Black Ribbed Rubber Smile Tread */}
        <div className="fuzzface-smile-wedge">
          {/* Vertical Rib Lines in Rubber */}
          <div className="fuzzface-rubber-texture" />

          {/* Authentic 3PDT Chrome Footswitch - Exactly like Big Muff */}
          <div className="classic-stomp-wrap" onPointerDown={(e) => e.stopPropagation()}>
            <button
              className={`classic-stomp-switch ocd-stomp-switch ${isEnabled ? 'active' : ''}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleEnabled(instance.id);
              }}
              title={isEnabled ? 'Click to bypass' : 'Click to engage Fuzz Face'}
            >
              <svg viewBox="0 0 52 52" className="classic-stomp-svg ocd-stomp-svg" aria-hidden="true">
                <defs>
                  <linearGradient id="ff-bm-hex-grad" x1="20%" y1="0%" x2="80%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="25%" stopColor="#d1d5db" />
                    <stop offset="50%" stopColor="#9ca3af" />
                    <stop offset="75%" stopColor="#6b7280" />
                    <stop offset="100%" stopColor="#4b5563" />
                  </linearGradient>
                  <linearGradient id="ff-bm-hex-chamfer" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
                  </linearGradient>
                  <radialGradient id="ff-bm-collar-grad" cx="40%" cy="35%" r="60%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="45%" stopColor="#e5e7eb" />
                    <stop offset="75%" stopColor="#9ca3af" />
                    <stop offset="100%" stopColor="#4b5563" />
                  </radialGradient>
                  <radialGradient id="ff-bm-plunger-grad" cx="38%" cy="35%" r="62%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="35%" stopColor="#e2e8f0" />
                    <stop offset="65%" stopColor="#94a3b8" />
                    <stop offset="90%" stopColor="#64748b" />
                    <stop offset="100%" stopColor="#475569" />
                  </radialGradient>
                  <filter id="ff-bm-stomp-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.5" />
                  </filter>
                </defs>
                {/* Hex Nut Outer with Shadow */}
                <polygon
                  points="43.2,35.5 26,46 8.8,35.5 8.8,14.5 26,4 43.2,14.5"
                  fill="url(#ff-bm-hex-grad)"
                  stroke="#374151"
                  strokeWidth="1"
                  filter="url(#ff-bm-stomp-shadow)"
                />
                {/* Inner Hex Chamfer Bevel */}
                <polygon
                  points="41.5,34.5 26,44 10.5,34.5 10.5,15.5 26,6 41.5,15.5"
                  fill="none"
                  stroke="url(#ff-bm-hex-chamfer)"
                  strokeWidth="1.2"
                />
                {/* Threaded Collar Ring */}
                <circle cx="26" cy="25" r="14.5" fill="url(#ff-bm-collar-grad)" stroke="#374151" strokeWidth="1" />
                <circle cx="26" cy="25" r="13" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.8" />
                {/* Collar Alignment Key Notch at 12 o'clock */}
                <rect x="24.8" y="10.5" width="2.4" height="3" fill="#1f2937" rx="0.5" />
                {/* Central Plunger Actuator Button */}
                <g className="classic-plunger-disc ocd-plunger-disc">
                  <circle cx="26" cy="25" r="10.5" fill="url(#ff-bm-plunger-grad)" stroke="#1e293b" strokeWidth="1" />
                  <circle cx="24.5" cy="23.5" r="8" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" />
                  <ellipse cx="23" cy="21.5" rx="3.5" ry="2" fill="rgba(255,255,255,0.5)" />
                </g>
              </svg>
            </button>
          </div>
        </div>

        {/* Serrated Gear Teeth at Bottom Edge of Circular Body */}
        <div className="fuzzface-bottom-teeth" />
      </div>
    </div>
  );
};
