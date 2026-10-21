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
      {/* 1/4" Side Phone Jacks (Aligned to standard JACK_Y_OFFSET = 57, top: 46px) */}
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

      {/* Top Header Toolstrip with Remove Button */}
      <div className="pedal-top-bar mxr-top-bar">
        <button
          className="pedal-mini-btn pedal-close-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(instance.id);
          }}
          title="Remove pedal from board"
        >
          <X size={11} />
        </button>
      </div>

      {/* Side Labels on Orange Chassis */}
      <div className="phase90-side-lbl lbl-output">OUTPUT</div>
      <div className="phase90-side-lbl lbl-input">INPUT</div>

      {/* Main Face Container */}
      <div className="phase90-face-content">
        {/* Single Center Large SPEED Knob */}
        <div className="phase90-knob-section">
          <div className="phase90-knob-wrap">
            <Knob
              label=""
              value={speedVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={4.0}
              onChange={(val) => onChangeParam(instance.id, 'speed', val)}
              size={54}
              variant="mxr"
              showLabel={false}
              showValue={false}
            />
          </div>
          <span className="phase90-speed-lbl">SPEED</span>
        </div>

        {/* Iconic [ MXR ] Block Logo */}
        <div className="phase90-logo-badge">
          <span className="phase90-logo-text">MXR</span>
        </div>

        {/* Center Red Pilot LED */}
        <div
          className="phase90-led-wrap"
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title={isEnabled ? 'Active (Click to bypass)' : 'Bypassed (Click to engage)'}
        >
          <div className={`phase90-led ${isEnabled ? 'lit' : ''}`}>
            <div className="phase90-led-core" />
          </div>
        </div>

        {/* Chrome Footswitch */}
        <div className="phase90-stomp-wrap">
          <ClassicStompSwitch
            isEnabled={isEnabled}
            onToggle={() => onToggleEnabled(instance.id)}
            size={46}
          />
        </div>

        {/* Lowercase Title: phase 90 */}
        <div className="phase90-title-wrap">
          <span className="phase90-title-text">phase 90</span>
        </div>
      </div>
    </div>
  );
};
