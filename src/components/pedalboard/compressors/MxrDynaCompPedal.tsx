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

export const MxrDynaCompPedal: React.FC<PedalProps> = ({
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
  const outputVal = instance.parameters['output'] ?? 5;
  const sensitivityVal = instance.parameters['sensitivity'] ?? 5;

  const isLeftPending = isJackPending?.(instance.id, 'in') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'out') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'in') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'out') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-mxr-dynacomp ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* 1/4" Side Phone Jacks */}
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

      {/* Stamped Side Port Labels */}
      <div className="mxr-side-label-left">OUTPUT</div>
      <div className="mxr-side-label-right">INPUT</div>

      {/* 2 Large Fluted Knobs */}
      <div className="mxr-knobs-row">
        <div className="mxr-knob-col">
          <Knob
            label="OUTPUT"
            value={outputVal}
            min={0}
            max={10}
            step={0.1}
            defaultValue={5}
            formatValue={(v) => v.toFixed(1)}
            onChange={(val) => onChangeParam(instance.id, 'output', val)}
            variant="mxr"
            size={48}
            showLabel={false}
            showValue={false}
          />
          <span className="mxr-knob-title">OUTPUT</span>
        </div>

        <div className="mxr-knob-col">
          <Knob
            label="SENSITIVITY"
            value={sensitivityVal}
            min={0}
            max={10}
            step={0.1}
            defaultValue={5}
            formatValue={(v) => v.toFixed(1)}
            onChange={(val) => onChangeParam(instance.id, 'sensitivity', val)}
            variant="mxr"
            size={48}
            showLabel={false}
            showValue={false}
          />
          <span className="mxr-knob-title">SENSITIVITY</span>
        </div>
      </div>

      {/* Iconic MXR Logo Box */}
      <div className="mxr-logo-box">
        <span className="mxr-logo-text">MXR</span>
      </div>

      {/* Central Red Bezel LED */}
      <div
        className="mxr-led-mount"
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
        title="Toggle MXR Dyna Comp Bypass"
        idPrefix="mxr"
        size={46}
      />

      {/* Bottom Lowercase Script */}
      <div className="mxr-bottom-title">
        <span>dyna comp</span>
      </div>
    </div>
  );
};
