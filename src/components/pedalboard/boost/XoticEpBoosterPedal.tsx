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

export const XoticEpBoosterPedal: React.FC<PedalProps> = ({
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
  const gainVal = instance.parameters['gain'] ?? 5;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-xotic-ep ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={{ ...style, width: 140 }}
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

      {/* Main Faceplate Container with White/Silver Inset Border */}
      <div className="xotic-ep-faceplate">
        {/* Top Polarity Icon */}
        <div className="xotic-ep-polarity">
          <span>+</span>
          <div className="polarity-symbol">
            <span className="polarity-center" />
            <span className="polarity-outer" />
          </div>
          <span>-</span>
        </div>

        {/* Clear Transparent Acrylic Skirted Knob */}
        <div className="xotic-ep-knob-section">
          <Knob
            label="GAIN"
            value={gainVal}
            min={0}
            max={10}
            step={0.1}
            defaultValue={5}
            formatValue={(v) => `+${(3.0 + (v / 10) * 17.0).toFixed(1)} dB`}
            onChange={(val) => onChangeParam(instance.id, 'gain', val)}
            variant="xotic-clear"
            size={56}
            showLabel={false}
            showValue={false}
          />
        </div>

        {/* Electric Sapphire Blue LED */}
        <div
          className="xotic-ep-led-mount"
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title="Status Indicator (Click to toggle bypass)"
        >
          <div className={`xotic-blue-led ${isEnabled ? 'lit' : 'off'}`}>
            <div className="xotic-led-core" />
          </div>
        </div>

        {/* Center Stylized "ep" Script Logo & Subtitles */}
        <div className="xotic-ep-brand-center">
          <div className="xotic-ep-logo-text">ep</div>
          <div className="xotic-ep-booster-sub">-booster-</div>
          <div className="xotic-ep-origin">BY XOTIC USA</div>
        </div>

        {/* Chrome Footswitch Assembly */}
        <div className="xotic-ep-switch-wrap">
          <ClassicStompSwitch
            isEnabled={isEnabled}
            onToggle={() => onToggleEnabled(instance.id)}
            title="Toggle Xotic EP Booster Bypass"
            idPrefix="xotic-ep"
            size={44}
          />
        </div>
      </div>

      {/* Side Port Stamped Labels */}
      <div className="xotic-ep-side-out">OUT</div>
      <div className="xotic-ep-side-in">IN</div>
    </div>
  );
};
