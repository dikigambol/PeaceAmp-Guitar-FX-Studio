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

export const RossCompressorPedal: React.FC<PedalProps> = ({
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
  const sustainVal = instance.parameters['sustain'] ?? 5;
  const levelVal = instance.parameters['level'] ?? 5;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-ross-compressor ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
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

      {/* 4 Corner Screws */}
      <div className="pedal-screw screw-tl" />
      <div className="pedal-screw screw-tr" />
      <div className="pedal-screw screw-bl" />
      <div className="pedal-screw screw-br" />

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

      {/* Stamped Side Port Labels */}
      <div className="ross-side-label-left">OUT</div>
      <div className="ross-side-label-right-top">IN</div>
      <div className="ross-side-label-right-bot">PWR</div>

      {/* Small Precision-Centered Indicator LED between two knobs near top */}
      <div
        className={`ross-led-mount ${isEnabled ? 'lit' : 'off'}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleEnabled(instance.id);
        }}
        title="Status LED (Click to toggle bypass)"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          className="ross-led-svg"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={`ross-bezel-${instance.id}`} cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="45%" stopColor="#94a3b8" />
              <stop offset="85%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </radialGradient>
            <radialGradient id={`ross-recess-${instance.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="65%" stopColor="#0b0f14" />
              <stop offset="100%" stopColor="#1e2530" />
            </radialGradient>
            <radialGradient id={`ross-led-on-${instance.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#ff4d4d" />
              <stop offset="70%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </radialGradient>
            <radialGradient id={`ross-led-off-${instance.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b1111" />
              <stop offset="60%" stopColor="#1f0909" />
              <stop offset="100%" stopColor="#0d0303" />
            </radialGradient>
          </defs>

          {/* Outer Chrome Bezel Ring - concentric at cx=8, cy=8 */}
          <circle cx="8" cy="8" r="7" fill={`url(#ross-bezel-${instance.id})`} stroke="#0f172a" strokeWidth="0.8" />

          {/* Dark Inner Collar Recess - concentric at cx=8, cy=8 */}
          <circle cx="8" cy="8" r="5.2" fill={`url(#ross-recess-${instance.id})`} stroke="#090d12" strokeWidth="0.6" />

          {/* LED Lens - concentric at cx=8, cy=8 */}
          <circle
            cx="8"
            cy="8"
            r="3.6"
            fill={isEnabled ? `url(#ross-led-on-${instance.id})` : `url(#ross-led-off-${instance.id})`}
            stroke={isEnabled ? 'rgba(255, 200, 200, 0.85)' : 'rgba(0, 0, 0, 0.8)'}
            strokeWidth="0.5"
          />

          {/* Central Hotspot Gleam when illuminated - concentric at cx=8, cy=8 */}
          {isEnabled && (
            <circle cx="8" cy="8" r="1.3" fill="#ffffff" opacity="0.9" />
          )}
        </svg>
      </div>

      {/* Recessed Circular Wells with Wedge Knobs */}
      <div className="ross-wells-container">
        <div className="ross-well-col">
          <div className="ross-sunken-well">
            <Knob
              label="SUSTAIN"
              value={sustainVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5}
              formatValue={(v) => v.toFixed(1)}
              onChange={(val) => onChangeParam(instance.id, 'sustain', val)}
              variant="ross"
              size={48}
              showLabel={false}
              showValue={false}
            />
          </div>
          <span className="ross-knob-title">SUSTAIN</span>
        </div>

        <div className="ross-well-col">
          <div className="ross-sunken-well">
            <Knob
              label="LEVEL"
              value={levelVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5}
              formatValue={(v) => v.toFixed(1)}
              onChange={(val) => onChangeParam(instance.id, 'level', val)}
              variant="ross"
              size={48}
              showLabel={false}
              showValue={false}
            />
          </div>
          <span className="ross-knob-title">LEVEL</span>
        </div>
      </div>

      {/* Iconic ROSS Flowing Logo */}
      <div className="ross-logo-plate">
        <div className="ross-logo-box">
          <span className="ross-logo-text">RO<span className="ross-logo-s">SS</span></span>
          <span className="ross-trademark">™</span>
        </div>
      </div>

      {/* Classic 3PDT Chrome Footswitch */}
      <ClassicStompSwitch
        isEnabled={isEnabled}
        onToggle={() => onToggleEnabled(instance.id)}
        title="Toggle Ross Compressor Bypass"
        idPrefix="ross"
        size={46}
      />

      {/* Bottom Bold Typography */}
      <div className="ross-bottom-title">
        <span>COMPRESSOR</span>
      </div>
    </div>
  );
};
