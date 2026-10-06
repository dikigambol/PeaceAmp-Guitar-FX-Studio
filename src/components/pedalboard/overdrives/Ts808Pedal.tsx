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

export const Ts808Pedal: React.FC<PedalProps> = ({
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
      className={`pedal-custom-enclosure pedal-ts808 ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
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

      {/* Red Bezel LED */}
      <div
        className="ts808-led-mount"
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

      {/* Triangle 3 Knobs Formation: OVERDRIVE (top-left), LEVEL (top-right), TONE (center-lower) */}
      <div className="ts808-knobs-area">
        {/* Top Row: OVERDRIVE & LEVEL */}
        <div className="ts808-top-row">
          <div className="ts808-knob-col">
            <Knob
              label="OVERDRIVE"
              value={driveVal}
              min={0}
              max={10}
              step={0.1}
              size={36}
              variant="ts808"
              showLabel={false}
              showValue={false}
              onChange={(v) => onChangeParam(instance.id, 'overdrive', v)}
            />
            <span className="ts808-knob-lbl">OVERDRIVE</span>
          </div>

          <div className="ts808-knob-col">
            <Knob
              label="LEVEL"
              value={levelVal}
              min={0}
              max={10}
              step={0.1}
              size={36}
              variant="ts808"
              showLabel={false}
              showValue={false}
              onChange={(v) => onChangeParam(instance.id, 'level', v)}
            />
            <span className="ts808-knob-lbl">LEVEL</span>
          </div>
        </div>

        {/* Lower Center: TONE with Label ABOVE knob */}
        <div className="ts808-center-knob-col">
          <span className="ts808-knob-lbl">TONE</span>
          <Knob
            label="TONE"
            value={toneVal}
            min={0}
            max={10}
            step={0.1}
            size={36}
            variant="ts808"
            showLabel={false}
            showValue={false}
            onChange={(v) => onChangeParam(instance.id, 'tone', v)}
          />
        </div>
      </div>

      {/* Authentic TS808 Silkscreen White Box Frame (Unifies graphics, switch, and bottom Ibanez logo) */}
      <div className="ts808-frame-box">
        {/* Side Text in Box Borders */}
        <span className="ts808-port-txt ts808-port-left">OUTPUT</span>
        <span className="ts808-port-txt ts808-port-right">INPUT</span>

        {/* Big Block Condensed Title */}
        <div className="ts808-title">TUBE SCREAMER</div>
        <div className="ts808-subtitle">Overdrive Pro &nbsp; TS808</div>

        {/* Square Chrome Balance Footswitch */}
        <div className="ts808-switch-mount" onPointerDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`ts808-square-switch ${isEnabled ? 'active' : ''}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleEnabled(instance.id);
            }}
            title="Toggle TS808 Bypass"
          >
            <div className="ts808-switch-bevel">
              <div className="ts808-switch-face" />
            </div>
          </button>
        </div>

        {/* Bottom Ibanez Logo Inside Box */}
        <div className="ts-ibanez-logo">Ibanez</div>
      </div>
    </div>
  );
};
