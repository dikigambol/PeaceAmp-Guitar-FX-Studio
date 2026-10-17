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

export const MxrAnalogChorusPedal: React.FC<PedalProps> = ({
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
  const lowVal = instance.parameters['low'] ?? 8.0;
  const highVal = instance.parameters['high'] ?? 8.0;
  const levelVal = instance.parameters['level'] ?? 6.0;
  const rateVal = instance.parameters['rate'] ?? 4.5;
  const depthVal = instance.parameters['depth'] ?? 6.5;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  const rateHzFormatted = `${(0.2 + Math.pow(rateVal / 10, 1.8) * 4.8).toFixed(2)} Hz`;

  return (
    <div
      className={`pedal-custom-enclosure pedal-mxr-analog-chorus ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* 1/4" Side Phone Jacks (Aligned with JACK_Y_OFFSET = 57, top: 46px) */}
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
      <div className="mxr-side-label-left">OUTPUT</div>
      <div className="mxr-side-label-right">INPUT</div>

      {/* 1. TOP ROW: 2 DUAL EQ KNOBS (LOW & HIGH) */}
      <div className="mxr-chorus-eq-row">
        <div className="mxr-chorus-eq-col">
          <div className="mxr-eq-header">
            <span className="eq-sub">CUT</span>
            <span className="eq-title">LOW</span>
            <span className="eq-sub">FLAT</span>
          </div>
          <Knob
            label="LOW"
            value={lowVal}
            min={0}
            max={10}
            step={0.1}
            defaultValue={8.0}
            formatValue={(v) => (v >= 9.0 ? 'FLAT' : v <= 1.0 ? 'CUT' : `${v.toFixed(1)}`)}
            onChange={(val) => onChangeParam(instance.id, 'low', val)}
            variant="mxr"
            size={36}
            showLabel={false}
            showValue={false}
          />
        </div>

        <div className="mxr-chorus-eq-col">
          <div className="mxr-eq-header">
            <span className="eq-sub">CUT</span>
            <span className="eq-title">HIGH</span>
            <span className="eq-sub">FLAT</span>
          </div>
          <Knob
            label="HIGH"
            value={highVal}
            min={0}
            max={10}
            step={0.1}
            defaultValue={8.0}
            formatValue={(v) => (v >= 9.0 ? 'FLAT' : v <= 1.0 ? 'CUT' : `${v.toFixed(1)}`)}
            onChange={(val) => onChangeParam(instance.id, 'high', val)}
            variant="mxr"
            size={36}
            showLabel={false}
            showValue={false}
          />
        </div>
      </div>

      {/* 2. MIDDLE ROW: 3 MAIN CONTROLS (LEVEL, RATE, DEPTH) */}
      <div className="mxr-chorus-main-knobs">
        <div className="mxr-chorus-knob-col">
          <Knob
            label="LEVEL"
            value={levelVal}
            min={0}
            max={10}
            step={0.1}
            defaultValue={6.0}
            formatValue={(v) => `${Math.round((v / 10) * 100)}%`}
            onChange={(val) => onChangeParam(instance.id, 'level', val)}
            variant="mxr"
            size={38}
            showLabel={false}
            showValue={false}
          />
          <span className="mxr-knob-title">LEVEL</span>
        </div>

        <div className="mxr-chorus-knob-col">
          <Knob
            label="RATE"
            value={rateVal}
            min={0}
            max={10}
            step={0.1}
            defaultValue={4.5}
            formatValue={() => rateHzFormatted}
            onChange={(val) => onChangeParam(instance.id, 'rate', val)}
            variant="mxr"
            size={38}
            showLabel={false}
            showValue={false}
          />
          <span className="mxr-knob-title">RATE</span>
        </div>

        <div className="mxr-chorus-knob-col">
          <Knob
            label="DEPTH"
            value={depthVal}
            min={0}
            max={10}
            step={0.1}
            defaultValue={6.5}
            formatValue={(v) => `${Math.round((v / 10) * 100)}%`}
            onChange={(val) => onChangeParam(instance.id, 'depth', val)}
            variant="mxr"
            size={38}
            showLabel={false}
            showValue={false}
          />
          <span className="mxr-knob-title">DEPTH</span>
        </div>
      </div>

      {/* 3. CENTER LED MOUNT */}
      <div
        className="mxr-led-mount"
        onClick={(e) => {
          e.stopPropagation();
          onToggleEnabled(instance.id);
        }}
        title="Status LED (Click to toggle bypass)"
      >
        <div className={`mxr-bezel-led mxr-chorus-bezel-led ${isEnabled ? 'lit' : 'off'}`}>
          <div className="mxr-led-core" />
        </div>
      </div>

      {/* 4. ICONIC MXR LOGO BOX */}
      <div className="mxr-logo-box">
        <span className="mxr-logo-text">MXR</span>
      </div>

      {/* 5. CLASSIC 3PDT CHROME FOOTSWITCH */}
      <ClassicStompSwitch
        isEnabled={isEnabled}
        onToggle={() => onToggleEnabled(instance.id)}
        title="Toggle MXR Analog Chorus Bypass"
        idPrefix="mxr-chorus"
        size={46}
      />

      {/* 6. BOTTOM TITLE: analog chorus */}
      <div className="mxr-bottom-title mxr-chorus-bottom-title">
        <span>analog</span>
        <span>chorus</span>
      </div>
    </div>
  );
};
