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

export const MxrPhase90Pedal: React.FC<PedalProps> = ({
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
  const speedVal = instance.parameters['speed'] ?? 4.0;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-mxr-phase90 ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* 1/4" Side Phone Jacks */}
      <div
        className={`stompbox-side-jack jack-left ${isLeftPending ? 'is-jack-pending' : ''} ${hasLeftCable ? 'has-cable' : ''}`}
        title="Audio Output Jack - Click to patch cable"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'out', e);
        }}
      />
      <div
        className={`stompbox-side-jack jack-right ${isRightPending ? 'is-jack-pending' : ''} ${hasRightCable ? 'has-cable' : ''}`}
        title="Audio Input Jack - Click to patch cable"
        onPointerDown={(e) => e.stopPropagation()}
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

      {/* Stamped Side Port Labels */}
      <div className="mxr-side-label-left">OUTPUT</div>
      <div className="mxr-side-label-right">INPUT</div>

      {/* Single Large Fluted Knob: SPEED */}
      <div className="mxr-single-knob-row">
        <div className="mxr-knob-col">
          <Knob
            label="SPEED"
            value={speedVal}
            min={0}
            max={10}
            step={0.1}
            defaultValue={4.0}
            formatValue={(v) => v.toFixed(1)}
            onChange={(val) => onChangeParam(instance.id, 'speed', val)}
            variant="mxr"
            size={48}
            showLabel={false}
            showValue={false}
          />
          <span className="mxr-knob-title">SPEED</span>
        </div>
      </div>

      {/* Iconic MXR Logo Box */}
      <div className="mxr-logo-box">
        <span className="mxr-logo-text">MXR</span>
      </div>

      {/* Central Red Bezel LED */}
      <div
        className="mxr-led-mount"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggleEnabled(instance.id);
        }}
        title="Status LED (Click to toggle bypass)"
      >
        <div className={`mxr-bezel-led ${isEnabled ? 'lit' : 'off'}`}>
          <div className="mxr-led-core" />
        </div>
      </div>

      {/* Classic 3PDT Chrome Footswitch */}
      <ClassicStompSwitch
        isEnabled={isEnabled}
        onToggle={() => onToggleEnabled(instance.id)}
        title="Toggle MXR Phase 90 Bypass"
        idPrefix="mxr-phase90"
        size={46}
      />

      {/* Bottom Lowercase Script */}
      <div className="mxr-bottom-title">
        <span>phase 90</span>
      </div>
    </div>
  );
};
