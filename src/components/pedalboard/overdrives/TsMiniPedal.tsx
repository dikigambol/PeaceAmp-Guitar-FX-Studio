import React from 'react';
import type { PedalInstance, PedalMetadata } from '../../../types/pedal';
import { Knob } from '../../common/Knob';
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

export const TsMiniPedal: React.FC<PedalProps> = ({
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
  const driveVal = instance.parameters['overdrive'] ?? 5;
  const toneVal = instance.parameters['tone'] ?? 5;
  const levelVal = instance.parameters['level'] ?? 5;

  const isLeftPending = isJackPending?.(instance.id, 'in') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'out') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'in') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'out') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-ts-mini ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={{ ...style, width: 140 }}
      onPointerDown={onPointerDown}
    >
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

      {/* Top DC IN Label */}
      <div className="tsmini-dcin-label">DC IN</div>

      {/* Top Row: TONE (left), RED LED in chrome bezel (center), LEVEL (right) */}
      <div className="tsmini-micro-row">
        <div className="tsmini-micro-col">
          <span className="tsmini-micro-lbl">TONE</span>
          <Knob
            label="TONE"
            value={toneVal}
            min={0}
            max={10}
            step={0.1}
            size={28}
            variant="tsmini-small"
            showLabel={false}
            showValue={false}
            onChange={(v) => onChangeParam(instance.id, 'tone', v)}
          />
        </div>

        {/* Center Red LED in Chrome Bezel */}
        <div
          className="tsmini-led-mount"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title="Click to toggle bypass"
        >
          <div className="tsmini-led-bezel">
            <div className={`tsmini-red-led ${isEnabled ? 'lit' : 'off'}`} />
          </div>
        </div>

        <div className="tsmini-micro-col">
          <span className="tsmini-micro-lbl">LEVEL</span>
          <Knob
            label="LEVEL"
            value={levelVal}
            min={0}
            max={10}
            step={0.1}
            size={28}
            variant="tsmini-small"
            showLabel={false}
            showValue={false}
            onChange={(v) => onChangeParam(instance.id, 'level', v)}
          />
        </div>
      </div>

      {/* Center Section: OVERDRIVE text, Giant Fluted Knob, flanked by OUTPUT and INPUT */}
      <div className="tsmini-mid-section">
        <span className="tsmini-side-port-lbl port-out">OUTPUT</span>

        <div className="tsmini-main-knob-container">
          <span className="tsmini-main-lbl">OVERDRIVE</span>
          <Knob
            label="OVERDRIVE"
            value={driveVal}
            min={0}
            max={10}
            step={0.1}
            size={64}
            variant="tsmini-large"
            showLabel={false}
            showValue={false}
            onChange={(v) => onChangeParam(instance.id, 'overdrive', v)}
          />
        </div>

        <span className="tsmini-side-port-lbl port-in">INPUT</span>
      </div>

      {/* Lower White Box: TUBE SCREAMER = MINI =, Chrome Footswitch, Ibanez script */}
      <div className="tsmini-brand-box">
        <div className="tsmini-title">TUBE SCREAMER</div>
        <div className="tsmini-sub-rule">
          <span className="tsmini-rule-line" />
          <span className="tsmini-sub-text">MINI</span>
          <span className="tsmini-rule-line" />
        </div>

        {/* Chrome Heavy Stomp Switch */}
        <div className="tsmini-stomp-wrap" onPointerDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`tsmini-stomp-btn ${isEnabled ? 'active' : ''}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleEnabled(instance.id);
            }}
            title="Toggle Tube Screamer Mini Bypass"
          >
            <div className="tsmini-stomp-nut" />
            <div className="tsmini-stomp-plunger" />
          </button>
        </div>

        {/* Classic Ibanez script logo */}
        <div className="tsmini-ibanez-logo">Ibanez</div>
      </div>
    </div>
  );
};
