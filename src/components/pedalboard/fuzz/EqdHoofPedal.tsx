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

/* Authentic EarthQuaker Devices Hoof™ Vector Typography */
const HoofLogoSvg: React.FC = () => (
  <svg viewBox="0 0 108 38" className="hoof-title-logo-svg" aria-label="Hoof">
    <g fill="#18181b">
      {/* Ornate 'H' */}
      {/* Left stem top bracketed serif */}
      <path d="M 11 5 L 21 5 L 20 7.5 L 17.5 7.5 L 17.5 16 L 14.5 16 L 14.5 7.5 L 12 7.5 Z" />
      {/* Left stem circular loop flourish */}
      <path
        d="M 16 16
           C 11.5 16, 7.5 19.5, 7.5 24
           C 7.5 28.5, 11.5 32, 16 32
           C 20.5 32, 23.5 28.5, 23.5 24
           C 23.5 20.5, 20.5 18, 17 18
           C 14.5 18, 12.5 19.5, 12.5 22
           C 12.5 24, 14 25.5, 16 25.5
           C 17.5 25.5, 19 24.5, 19 23"
        fill="none"
        stroke="#18181b"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Left stem lower section and base serif */}
      <path d="M 14.5 28 L 17.5 28 L 17.5 32 L 20 32 L 21 34.5 L 11 34.5 L 12 32 L 14.5 32 Z" />

      {/* Horizontal Crossbar */}
      <rect x="18" y="20.5" width="12" height="3" />

      {/* Right stem top bracketed serif */}
      <path d="M 26 5 L 36 5 L 35 7.5 L 32.5 7.5 L 32.5 32 L 35 32 L 36 34.5 L 26 34.5 L 27 32 L 29.5 32 L 29.5 7.5 L 27 7.5 Z" />

      {/* First Striped 'o' */}
      <ellipse cx="46" cy="23.5" rx="7.8" ry="9.5" fill="none" stroke="#18181b" strokeWidth="2.6" />
      <line x1="41" y1="27.5" x2="47.5" y2="18.5" stroke="#18181b" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="45" y1="28.5" x2="51.5" y2="19.5" stroke="#18181b" strokeWidth="1.8" strokeLinecap="round" />

      {/* Second Striped 'o' */}
      <ellipse cx="64" cy="23.5" rx="7.8" ry="9.5" fill="none" stroke="#18181b" strokeWidth="2.6" />
      <line x1="59" y1="27.5" x2="65.5" y2="18.5" stroke="#18181b" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="63" y1="28.5" x2="69.5" y2="19.5" stroke="#18181b" strokeWidth="1.8" strokeLinecap="round" />

      {/* Stylized 'f' */}
      <path
        d="M 83 7
           C 79.5 7, 76.5 9.5, 75.5 13.5
           L 75.5 32
           L 74 32
           L 73 34.5
           L 81 34.5
           L 80 32
           L 78.5 32
           L 78.5 14.5
           C 79 12, 80.5 10.5, 83 10.5
           C 84.5 10.5, 86 11.2, 87 12.5
           L 88.5 10
           C 87 8, 85 7, 83 7 Z"
      />
      {/* 'f' crossbar */}
      <rect x="72" y="17.5" width="10.5" height="2.8" rx="0.6" />

      {/* Trademark TM */}
      <text x="89.5" y="13" fontSize="5" fontFamily="sans-serif" fontWeight="900" fill="#18181b">TM</text>
    </g>
  </svg>
);

export const EqdHoofPedal: React.FC<PedalProps> = ({
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
  const shiftVal = instance.parameters['shift'] ?? 5;
  const toneVal = instance.parameters['tone'] ?? 5;
  const levelVal = instance.parameters['level'] ?? 5;
  const fuzzVal = instance.parameters['fuzz'] ?? 6;

  const isLeftPending = isJackPending?.(instance.id, 'in') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'out') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'in') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'out') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-eqd-hoof ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* Authentic Top-Mounted Phone Jack Hex Nuts Peeking Over Top */}
      <div className="hoof-top-jack-nuts" aria-hidden="true">
        <div className="hoof-top-jack-nut left" />
        <div className="hoof-top-jack-nut right" />
      </div>

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
      <div className="pedal-top-bar hoof-top-bar">
        <button
          className="pedal-mini-btn pedal-close-btn hoof-close-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(instance.id);
          }}
          title="Remove EarthQuaker Devices Hoof"
        >
          <X size={11} strokeWidth={1.8} />
        </button>
      </div>

      {/* Gold Enclosure Faceplate */}
      <div className="hoof-faceplate">
        {/* Clean Black Box with Border Radius for Controls (Kotak Hitam dengan Border Radius) */}
        <div className="hoof-knobs-box">
          {/* Top Polarity & 9V Indicator inside Black Box */}
          <div className="hoof-box-power-row">
            <svg viewBox="0 0 24 10" className="hoof-polarity-svg" aria-hidden="true">
              <text x="1.5" y="7.5" fill="#facc15" fontSize="6.5" fontFamily="monospace" fontWeight="900">+</text>
              <line x1="5.5" y1="5.5" x2="8.5" y2="5.5" stroke="#facc15" strokeWidth="0.8" />
              <circle cx="12" cy="5.5" r="3.2" fill="none" stroke="#facc15" strokeWidth="0.8" />
              <circle cx="12" cy="5.5" r="1.1" fill="#facc15" />
              <line x1="15.5" y1="5.5" x2="18.5" y2="5.5" stroke="#facc15" strokeWidth="0.8" />
              <text x="19.5" y="7.5" fill="#facc15" fontSize="6.5" fontFamily="monospace" fontWeight="900">-</text>
            </svg>
            <span className="hoof-9v-text">9V</span>
          </div>

          {/* 2x2 Knobs Field: Shift & Tone (Top), Level & Fuzz (Bottom) */}
          <div className="hoof-knobs-area">
            {/* Top Row: Shift & Tone */}
            <div className="hoof-knobs-row">
              <div className="hoof-knob-col">
                <Knob
                  label=""
                  value={shiftVal}
                  min={0}
                  max={10}
                  step={0.1}
                  size={44}
                  variant="davies"
                  showValue={false}
                  showLabel={false}
                  onChange={(val) => onChangeParam(instance.id, 'shift', val)}
                />
                <span className="hoof-knob-lbl">Shift</span>
              </div>

              <div className="hoof-knob-col">
                <Knob
                  label=""
                  value={toneVal}
                  min={0}
                  max={10}
                  step={0.1}
                  size={44}
                  variant="davies"
                  showValue={false}
                  showLabel={false}
                  onChange={(val) => onChangeParam(instance.id, 'tone', val)}
                />
                <span className="hoof-knob-lbl">Tone</span>
              </div>
            </div>

            {/* Bottom Row: Level & Fuzz */}
            <div className="hoof-knobs-row">
              <div className="hoof-knob-col">
                <Knob
                  label=""
                  value={levelVal}
                  min={0}
                  max={10}
                  step={0.1}
                  size={44}
                  variant="davies"
                  showValue={false}
                  showLabel={false}
                  onChange={(val) => onChangeParam(instance.id, 'level', val)}
                />
                <span className="hoof-knob-lbl">Level</span>
              </div>

              <div className="hoof-knob-col">
                <Knob
                  label=""
                  value={fuzzVal}
                  min={0}
                  max={10}
                  step={0.1}
                  size={44}
                  variant="davies"
                  showValue={false}
                  showLabel={false}
                  onChange={(val) => onChangeParam(instance.id, 'fuzz', val)}
                />
                <span className="hoof-knob-lbl">Fuzz</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lower Section: Chrome Bezel LED (Left) and Soft-Touch Footswitch (Center) */}
        <div className="hoof-actuator-row">
          {/* Chrome Conical Bezel Pilot LED (Mounted on Left side) */}
          <div className="hoof-led-mount-left">
            <div className="hoof-chrome-bezel">
              <div className={`hoof-pilot-dome ${isEnabled ? 'lit' : ''}`} />
            </div>
          </div>

          {/* EarthQuaker Devices Signature Soft-Touch Silent Relay Footswitch (Center) */}
          <div className="classic-stomp-wrap hoof-stomp-center" onPointerDown={(e) => e.stopPropagation()}>
            <button
              className={`classic-stomp-switch ocd-stomp-switch ${isEnabled ? 'active' : ''}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleEnabled(instance.id);
              }}
              title={isEnabled ? 'Click to bypass' : 'Click to engage EarthQuaker Hoof Fuzz'}
            >
              <svg viewBox="0 0 52 52" className="classic-stomp-svg ocd-stomp-svg" aria-hidden="true">
                <defs>
                  <linearGradient id="hf-hex-grad" x1="20%" y1="0%" x2="80%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="25%" stopColor="#d1d5db" />
                    <stop offset="50%" stopColor="#9ca3af" />
                    <stop offset="75%" stopColor="#6b7280" />
                    <stop offset="100%" stopColor="#4b5563" />
                  </linearGradient>
                  <linearGradient id="hf-chamfer-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
                  </linearGradient>
                  <radialGradient id="hf-collar-grad" cx="40%" cy="35%" r="60%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="45%" stopColor="#e5e7eb" />
                    <stop offset="75%" stopColor="#9ca3af" />
                    <stop offset="100%" stopColor="#4b5563" />
                  </radialGradient>
                  <radialGradient id="hf-plunger-grad" cx="38%" cy="35%" r="62%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="30%" stopColor="#f1f5f9" />
                    <stop offset="60%" stopColor="#cbd5e1" />
                    <stop offset="85%" stopColor="#94a3b8" />
                    <stop offset="100%" stopColor="#475569" />
                  </radialGradient>
                  <filter id="hf-stomp-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.55" />
                  </filter>
                </defs>
                {/* Hex Nut Collar */}
                <polygon
                  points="43.2,35.5 26,46 8.8,35.5 8.8,14.5 26,4 43.2,14.5"
                  fill="url(#hf-hex-grad)"
                  stroke="#374151"
                  strokeWidth="1"
                  filter="url(#hf-stomp-shadow)"
                />
                <polygon
                  points="41.5,34.5 26,44 10.5,34.5 10.5,15.5 26,6 41.5,15.5"
                  fill="none"
                  stroke="url(#hf-chamfer-grad)"
                  strokeWidth="1.2"
                />
                {/* Threaded Collar Ring */}
                <circle cx="26" cy="25" r="14.5" fill="url(#hf-collar-grad)" stroke="#374151" strokeWidth="1" />
                <circle cx="26" cy="25" r="13" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
                <rect x="24.8" y="10.5" width="2.4" height="3" fill="#1f2937" rx="0.5" />
                {/* Smooth Round Soft-Touch Actuator Plunger */}
                <g className="classic-plunger-disc ocd-plunger-disc">
                  <circle cx="26" cy="25" r="10.5" fill="url(#hf-plunger-grad)" stroke="#1e293b" strokeWidth="1" />
                  <circle cx="25" cy="24" r="8" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" />
                </g>
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom Typography: Authentic Hoof™ and EarthQuakerDevices™ */}
        <div className="hoof-bottom-branding">
          <HoofLogoSvg />
          <div className="hoof-eqd-company-name">
            EarthQuakerDevices<span className="hoof-tm-sup">TM</span>
          </div>
        </div>
      </div>
    </div>
  );
};
