import React from 'react';
import type { PedalInstance, PedalMetadata } from '../../../types/pedal';
import { Knob } from '../../common/Knob';
import { ClassicStompSwitch } from '../../common/ClassicStompSwitch';
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

/**
 * Authentic 7-tick dial scale surrounding each ProCo RAT knob
 */
const RatDialScale: React.FC = () => {
  // 7 ticks spanning a 270-degree arc from 135 deg to 405 deg (7:30 to 4:30)
  // Angles relative to top (12 o'clock = 0)
  const tickAngles = [-135, -90, -45, 0, 45, 90, 135];
  const cx = 32;
  const cy = 32;
  const arcR = 27;

  // SVG arc path from -135° to +135°
  const startA = (-135 * Math.PI) / 180;
  const endA = (135 * Math.PI) / 180;
  const xStart = cx + arcR * Math.sin(startA);
  const yStart = cy - arcR * Math.cos(startA);
  const xEnd = cx + arcR * Math.sin(endA);
  const yEnd = cy - arcR * Math.cos(endA);

  const arcD = `M ${xStart.toFixed(2)} ${yStart.toFixed(2)} A ${arcR} ${arcR} 0 1 1 ${xEnd.toFixed(2)} ${yEnd.toFixed(2)}`;

  return (
    <svg viewBox="0 0 64 64" className="proco-rat-dial-scale" aria-hidden="true">
      {/* Outer connecting arc */}
      <path d={arcD} fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
      {/* 7 Radial Tick Marks */}
      {tickAngles.map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = cx + (arcR - 1) * Math.sin(rad);
        const y1 = cy - (arcR - 1) * Math.cos(rad);
        const x2 = cx + (arcR + 4.5) * Math.sin(rad);
        const y2 = cy - (arcR + 4.5) * Math.cos(rad);
        return (
          <line
            key={i}
            x1={x1.toFixed(2)}
            y1={y1.toFixed(2)}
            x2={x2.toFixed(2)}
            y2={y2.toFixed(2)}
            stroke="#ffffff"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
};

export const ProCoRatPedal: React.FC<PedalProps> = ({
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
  const distortionVal = instance.parameters['distortion'] ?? 6;
  const filterVal = instance.parameters['filter'] ?? 5;
  const volumeVal = instance.parameters['volume'] ?? 5;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-proco-rat ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* Simulated Top-Mounted Phone Jacks (RAT 2 Authentic Rear Deck) */}
      <div className="proco-rat-top-jacks">
        <div className="proco-rat-top-jack-plug left" title="Output Jack" />
        <div className="proco-rat-top-jack-plug right" title="Input Jack" />
      </div>

      {/* 1/4" Side Phone Jacks for interactive pedalboard cabling */}
      <div
        className={`stompbox-side-jack jack-left ${isLeftPending ? 'is-jack-pending' : ''} ${hasLeftCable ? 'has-cable' : ''}`}
        title="Audio Output Jack - Click to patch cable"
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'out', e);
        }}
      />
      <div
        className={`stompbox-side-jack jack-right ${isRightPending ? 'is-jack-pending' : ''} ${hasRightCable ? 'has-cable' : ''}`}
        title="Audio Input Jack - Click to patch cable"
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'in', e);
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

      {/* Heavy Steel Folded Side Wings (Iconic RAT chassis profile) */}
      <div className="proco-rat-side-flange left" />
      <div className="proco-rat-side-flange right" />

      {/* 1. Top Silkscreen Triple Header Box */}
      <div className="proco-rat-header-strip">
        <div className="proco-rat-header-cell">DISTORTION</div>
        <div className="proco-rat-header-cell">FILTER</div>
        <div className="proco-rat-header-cell">VOLUME</div>
      </div>

      {/* 2. Three Knobs with Radial Dial Scales */}
      <div className="proco-rat-knobs-row">
        {/* DISTORTION */}
        <div className="proco-rat-knob-col">
          <div className="proco-rat-knob-wrapper">
            <RatDialScale />
            <Knob
              label="DISTORTION"
              value={distortionVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={6}
              formatValue={(v) => v.toFixed(1)}
              onChange={(val) => onChangeParam(instance.id, 'distortion', val)}
              variant="proco-rat"
              size={46}
              showLabel={false}
              showValue={false}
            />
          </div>
        </div>

        {/* FILTER */}
        <div className="proco-rat-knob-col">
          <div className="proco-rat-knob-wrapper">
            <RatDialScale />
            <Knob
              label="FILTER"
              value={filterVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5}
              formatValue={(v) => v.toFixed(1)}
              onChange={(val) => onChangeParam(instance.id, 'filter', val)}
              variant="proco-rat"
              size={46}
              showLabel={false}
              showValue={false}
            />
          </div>
        </div>

        {/* VOLUME */}
        <div className="proco-rat-knob-col">
          <div className="proco-rat-knob-wrapper">
            <RatDialScale />
            <Knob
              label="VOLUME"
              value={volumeVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5}
              formatValue={(v) => v.toFixed(1)}
              onChange={(val) => onChangeParam(instance.id, 'volume', val)}
              variant="proco-rat"
              size={46}
              showLabel={false}
              showValue={false}
            />
          </div>
        </div>
      </div>

      {/* 3. Center Iconic Boxed RAT Logo with Illuminating Red LED in the 'A' */}
      <div
        className="proco-rat-logo-box"
        onClick={(e) => {
          e.stopPropagation();
          onToggleEnabled(instance.id);
        }}
        title="ProCo RAT 2 (Click to toggle bypass)"
      >
        <svg viewBox="0 0 160 52" className="proco-rat-logo-svg" aria-label="RAT">
          {/* Outer Border Frame */}
          <rect x="2" y="2" width="156" height="48" rx="2" fill="none" stroke="#ffffff" strokeWidth="2.8" />

          {/* Letter 'R' */}
          <path
            d="M 16 11 H 38 C 45 11 48 14 48 20 C 48 25 44 28 38 29 L 49 43 H 38 L 29 30 H 26 V 43 H 16 Z M 26 18 V 24 H 36 C 38 24 40 23 40 21 C 40 19 38 18 36 18 Z"
            fill="#ffffff"
          />

          {/* Letter 'A' (with inner triangular LED aperture) */}
          <path
            d="M 75 11 H 85 L 102 43 H 91 L 87 35 H 73 L 69 43 H 58 Z M 75 30 H 85 L 80 19 Z"
            fill="#ffffff"
          />

          {/* Glowing Red LED nested right inside the triangle of the 'A' (at x=80, y=26) */}
          <defs>
            <radialGradient id="rat-led-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="35%" stopColor="#ff453a" stopOpacity="0.95" />
              <stop offset="70%" stopColor="#cc111a" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#880008" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="rat-led-off" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#3d1518" />
              <stop offset="70%" stopColor="#220a0c" />
              <stop offset="100%" stopColor="#100304" />
            </radialGradient>
          </defs>

          {/* Diffuse ambient LED light halo */}
          {isEnabled && (
            <circle cx="80" cy="25" r="14" fill="url(#rat-led-glow)" opacity="0.8" />
          )}

          {/* Physical LED Lens inside the 'A' counter */}
          <polygon
            points="80,21 76,28 84,28"
            fill={isEnabled ? '#ff4d40' : 'url(#rat-led-off)'}
            stroke="#1a1a1a"
            strokeWidth="0.6"
          />
          {isEnabled && (
            <circle cx="80" cy="25" r="2.2" fill="#fff" opacity="0.9" filter="drop-shadow(0 0 4px #ff3b30)" />
          )}

          {/* Letter 'T' */}
          <path
            d="M 108 11 H 144 V 18 H 131 V 43 H 121 V 18 H 108 Z"
            fill="#ffffff"
          />
        </svg>
      </div>

      {/* 4. Heavy-Duty Chrome 3PDT Stomp Footswitch with Hex Nut & Washer */}
      <div className="proco-rat-switch-area">
        <div className="proco-rat-footswitch-base">
          <div className="proco-rat-hex-nut" />
          <ClassicStompSwitch
            isEnabled={isEnabled}
            onToggle={() => onToggleEnabled(instance.id)}
            title="Toggle ProCo RAT Bypass"
            idPrefix="proco-rat"
            size={48}
          />
        </div>
      </div>
    </div>
  );
};
