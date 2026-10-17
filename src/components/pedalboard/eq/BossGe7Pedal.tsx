import React, { useRef, useState } from 'react';
import type { PedalInstance, PedalMetadata } from '../../../types/pedal';
import { X } from 'lucide-react';
import { GE7_BANDS } from '../../../audio/pedals/eq/BossGe7Node';

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

interface SliderProps {
  id?: string;
  label: string;
  value: number;
  onChange: (val: number) => void;
  isLevel?: boolean;
}

const Ge7Slider: React.FC<SliderProps> = ({ id, label, value, onChange, isLevel = false }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);

  // Value is -15 to +15. Pct: 0 at -15, 0.5 at 0, 1 at +15
  const pct = Math.max(0, Math.min(1, (value + 15) / 30));

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const track = trackRef.current;
    if (!track) return;

    track.setPointerCapture(e.pointerId);
    setIsInteracting(true);

    const updateFromPointer = (clientY: number) => {
      const rect = track.getBoundingClientRect();
      const trackHeight = rect.height;
      // Invert Y: bottom is -15, top is +15
      const offsetY = clientY - rect.top;
      const normalized = 1 - offsetY / trackHeight;
      const clamped = Math.max(0, Math.min(1, normalized));
      // Map to -15 .. +15 with 0.5 step snap
      const rawVal = -15 + clamped * 30;
      const stepped = Math.round(rawVal * 2) / 2;
      onChange(Math.max(-15, Math.min(15, stepped)));
    };

    updateFromPointer(e.clientY);

    const onPointerMove = (moveEvent: PointerEvent) => {
      updateFromPointer(moveEvent.clientY);
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      track.releasePointerCapture(upEvent.pointerId);
      setIsInteracting(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(0); // Quick reset to 0dB unity/flat
  };

  const formattedVal = `${value > 0 ? '+' : ''}${value.toFixed(1)} dB`;

  return (
    <div
      data-slider-id={id}
      className={`ge7-slider-col ${isLevel ? 'is-level-col' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Frequency / Level Label */}
      <span className="ge7-slider-label">{label}</span>

      {/* Slider Track Slot */}
      <div
        ref={trackRef}
        className="ge7-slider-track"
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        title={`${label}: ${formattedVal} (Double-click to reset 0 dB)`}
      >
        {/* Slot Groove */}
        <div className="ge7-slider-groove" />

        {/* 0 dB Center Tick Guide */}
        <div className="ge7-center-zero-tick" />

        {/* Floating Tooltip during drag/hover */}
        {(isHovered || isInteracting) && (
          <div className="ge7-slider-tooltip">
            {formattedVal}
          </div>
        )}

        {/* Physical Boss Capsule Fader Knob */}
        <div
          className={`ge7-slider-thumb ${isInteracting ? 'active' : ''}`}
          style={{ bottom: `calc(${pct * 100}% - 7px)` }}
        >
          {/* Red Indicator Stripe in Center of Cap */}
          <div className="ge7-thumb-stripe" />
        </div>
      </div>
    </div>
  );
};

export const BossGe7Pedal: React.FC<PedalProps> = ({
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
  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  const levelVal = instance.parameters['level'] ?? 0;

  return (
    <div
      className={`pedal-custom-enclosure pedal-boss-ge7 ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* 1/4" Side Phone Jacks */}
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
      <div className="boss-top-bar">
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

      {/* Recessed Black Slider Control Cavity */}
      <div className="boss-ge7-cavity">
        {/* CHECK LED Indicator */}
        <div
          className="boss-ge7-check-led-wrap"
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title="CHECK LED (Click to toggle bypass)"
        >
          <div className={`boss-check-led ${isEnabled ? 'lit' : 'off'}`} />
        </div>

        {/* Top Frequency Zigzag Header Bracket Graphic */}
        <svg className="boss-ge7-bracket-svg" viewBox="0 0 216 14" preserveAspectRatio="none">
          <polyline
            points="14,12 28,3 42,12 56,3 70,12 84,3 98,12 112,3 126,12 140,3 154,12 168,3 182,12"
            fill="none"
            stroke="rgba(255, 255, 255, 0.7)"
            strokeWidth="1.2"
          />
        </svg>

        {/* Sliders Container with Scale Legend */}
        <div className="boss-ge7-sliders-area">
          {/* Left Vertical Scale Legend (+15, 0, -15) */}
          <div className="ge7-scale-legend">
            <span className="scale-num scale-top">+15</span>
            <div className="scale-dash" />
            <div className="scale-dash" />
            <span className="scale-num scale-mid">0</span>
            <div className="scale-dash" />
            <div className="scale-dash" />
            <span className="scale-num scale-bot">-15</span>
          </div>

          {/* 7 EQ Sliders */}
          <div className="ge7-eq-bands-group">
            {GE7_BANDS.map((band) => {
              const val = instance.parameters[band.id] ?? 0;
              return (
                <Ge7Slider
                  key={band.id}
                  id={band.id}
                  label={band.name}
                  value={val}
                  onChange={(newVal) => onChangeParam(instance.id, band.id, newVal)}
                />
              );
            })}
          </div>

          {/* Vertical Separator Line between EQ and Level */}
          <div className="ge7-divider-line" />

          {/* 8th Slider: Master Level */}
          <div className="ge7-level-group">
            <Ge7Slider
              id="level"
              label="Level"
              value={levelVal}
              onChange={(newVal) => onChangeParam(instance.id, 'level', newVal)}
              isLevel
            />
          </div>
        </div>

        {/* Continuous 0 dB Guide Line across all tracks */}
        <div className="ge7-global-zero-line" />
      </div>

      {/* Middle Stamped Graphic Section */}
      <div className="boss-mid-graphics boss-ge7-mid">
        {/* I/O Labels */}
        <div className="boss-io-arrows">
          <div className="boss-io-left">
            <span>&larr; OUTPUT</span>
          </div>
          <div className="boss-io-right">
            <span>INPUT &larr;</span>
          </div>
        </div>

        {/* Boss Model Typography: Equalizer GE-7 */}
        <div className="boss-ge7-typography">
          <div className="boss-ge7-equalizer">Equalizer</div>
          <div className="boss-ge7-model">GE-7</div>
        </div>
      </div>

      {/* Bottom Boss Treadle Rubber Footplate with Embossed Logo */}
      <div
        className={`boss-treadle-plate ${isEnabled ? 'engaged' : ''}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggleEnabled(instance.id);
        }}
        title="Boss Treadle Footswitch (Click to toggle bypass)"
      >
        <div className="boss-rubber-pad">
          <div className="boss-embossed-logo">BOSS</div>
          <div className="boss-grip-lines">
            <div className="boss-grip-line" />
            <div className="boss-grip-line" />
            <div className="boss-grip-line" />
          </div>
        </div>

        {/* Bottom knurled thumb-screw */}
        <div className="boss-thumb-screw" />
      </div>
    </div>
  );
};
