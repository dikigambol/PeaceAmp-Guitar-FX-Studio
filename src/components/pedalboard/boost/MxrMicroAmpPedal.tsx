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

export const MxrMicroAmpPedal: React.FC<PedalProps> = ({
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
      className={`pedal-custom-enclosure pedal-mxr-microamp ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
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
      <div className="mxr-microamp-side-label-left">OUTPUT</div>
      <div className="mxr-microamp-side-label-right">INPUT</div>

      {/* Top Single Large GAIN Knob */}
      <div className="mxr-microamp-knob-section">
        <div className="mxr-microamp-knob-col">
          <Knob
            label="GAIN"
            value={gainVal}
            min={0}
            max={10}
            step={0.1}
            defaultValue={5}
            formatValue={(v) => `+${(v * 2.6).toFixed(1)} dB`}
            onChange={(val) => onChangeParam(instance.id, 'gain', val)}
            variant="mxr"
            size={54}
            showLabel={false}
            showValue={false}
          />
          <span className="mxr-microamp-knob-title">GAIN</span>
        </div>
      </div>

      {/* Iconic Block MXR Logo Box */}
      <div className="mxr-microamp-logo-box">
        <span className="mxr-microamp-logo-text">MXR</span>
      </div>

      {/* Status LED Indicator */}
      <div
        className="mxr-microamp-led-mount"
        onClick={(e) => {
          e.stopPropagation();
          onToggleEnabled(instance.id);
        }}
        title="Status Indicator (Click to toggle bypass)"
      >
        <div className={`mxr-microamp-led ${isEnabled ? 'lit' : 'off'}`}>
          <div className="mxr-microamp-led-core" />
        </div>
      </div>

      {/* Classic 3PDT Chrome Footswitch */}
      <div className="mxr-microamp-switch-wrap">
        <ClassicStompSwitch
          isEnabled={isEnabled}
          onToggle={() => onToggleEnabled(instance.id)}
          title="Toggle MXR Micro Amp Bypass"
          idPrefix="mxr-microamp"
          size={46}
        />
      </div>

      {/* Bottom Lowercase Title: "micro amp" */}
      <div className="mxr-microamp-bottom-title">
        <span>micro amp</span>
      </div>
    </div>
  );
};
