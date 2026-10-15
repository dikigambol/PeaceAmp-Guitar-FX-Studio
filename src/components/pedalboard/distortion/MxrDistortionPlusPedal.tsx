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

export const MxrDistortionPlusPedal: React.FC<PedalProps> = ({
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
  const distortionVal = instance.parameters['distortion'] ?? 6;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-mxr-distplus ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
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

      {/* Stamped Side Port Labels (matching authentic vintage MXR chassis) */}
      <div className="mxr-side-label-left">OUTPUT</div>
      <div className="mxr-side-label-right">INPUT</div>

      {/* 2 Large Fluted Knobs: OUTPUT & DISTORTION */}
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
            label="DISTORTION"
            value={distortionVal}
            min={0}
            max={10}
            step={0.1}
            defaultValue={6}
            formatValue={(v) => v.toFixed(1)}
            onChange={(val) => onChangeParam(instance.id, 'distortion', val)}
            variant="mxr"
            size={48}
            showLabel={false}
            showValue={false}
          />
          <span className="mxr-knob-title">DISTORTION</span>
        </div>
      </div>

      {/* Iconic Block MXR Logo Box */}
      <div className="mxr-distplus-logo-box">
        <span className="mxr-distplus-logo-text">MXR</span>
      </div>

      {/* Subtle Vintage Status LED Indicator Dot */}
      <div
        className="mxr-distplus-led-mount"
        onClick={(e) => {
          e.stopPropagation();
          onToggleEnabled(instance.id);
        }}
        title="Status Indicator (Click to toggle bypass)"
      >
        <div className={`mxr-distplus-led ${isEnabled ? 'lit' : 'off'}`}>
          <div className="mxr-distplus-led-core" />
        </div>
      </div>

      {/* Classic 3PDT Chrome Footswitch */}
      <div className="mxr-distplus-switch-wrap">
        <ClassicStompSwitch
          isEnabled={isEnabled}
          onToggle={() => onToggleEnabled(instance.id)}
          title="Toggle MXR Distortion+ Bypass"
          idPrefix="mxr-distplus"
          size={46}
        />
      </div>

      {/* Bottom Lowercase Script: "distortion +" */}
      <div className="mxr-distplus-bottom-title">
        <span>distortion +</span>
      </div>
    </div>
  );
};
