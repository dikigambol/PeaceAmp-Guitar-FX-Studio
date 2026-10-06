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

export const Ts9Pedal: React.FC<PedalProps> = ({
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
  const driveVal = instance.parameters['drive'] ?? 5;
  const toneVal = instance.parameters['tone'] ?? 5;
  const levelVal = instance.parameters['level'] ?? 5;

  const isLeftPending = isJackPending?.(instance.id, 'in') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'out') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'in') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'out') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-ts9 ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
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

      {/* Upper Knob Section in TS9 Apple Green */}
      <div className="ts9-knobs-section">
        {/* Top Center LED */}
        <div
          className="ts9-led-mount"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title="Click to toggle TS9 bypass"
        >
          <div className="tsmini-led-bezel">
            <div className={`tsmini-red-led ${isEnabled ? 'lit' : 'off'}`} />
          </div>
        </div>

        {/* 3 Knobs Formation: DRIVE (top-left), LEVEL (top-right), TONE (center-lower) */}
        <div className="ts9-3knobs-cluster">
          {/* Top Row: DRIVE (left) and LEVEL (right) */}
          <div className="ts9-top-row">
            <div className="ts9-knob-col">
              <Knob
                label="DRIVE"
                value={driveVal}
                min={0}
                max={10}
                step={0.1}
                size={38}
                variant="ts9"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'drive', v)}
              />
              <span className="ts9-knob-lbl">DRIVE</span>
            </div>

            <div className="ts9-knob-col">
              <Knob
                label="LEVEL"
                value={levelVal}
                min={0}
                max={10}
                step={0.1}
                size={38}
                variant="ts9"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'level', v)}
              />
              <span className="ts9-knob-lbl">LEVEL</span>
            </div>
          </div>

          {/* Lower Center: TONE with Label ABOVE it */}
          <div className="ts9-center-knob-col">
            <span className="ts9-knob-lbl">TONE</span>
            <Knob
              label="TONE"
              value={toneVal}
              min={0}
              max={10}
              step={0.1}
              size={38}
              variant="ts9"
              showLabel={false}
              showValue={false}
              onChange={(v) => onChangeParam(instance.id, 'tone', v)}
            />
          </div>
        </div>
      </div>

      {/* Lower 9-Series Switch Module with Silver Badge & Cast Aluminum Ribbed Treadle */}
      <div className="ts9-module-box">
        {/* Silver Plate with OUT/IN ports and Royal Blue Ibanez logo */}
        <div className="ts9-silver-plate">
          <div className="ts9-plate-header">
            <span className="ts9-port-mark">OUT &#x25C0;</span>
            <span className="ts9-port-mark">&#x25B6; IN</span>
          </div>
          <div className="ts9-logo-blue">Ibanez</div>
          <div className="ts9-model-lbl">TS9</div>
          <div className="ts9-screamer-box">
            <div className="ts9-screamer-line" />
            <span className="ts9-screamer-lbl">Tube Screamer</span>
            <div className="ts9-screamer-line" />
          </div>
        </div>

        {/* Cast Silver Aluminum Treadle Switch with Horizontal Ribs */}
        <button
          type="button"
          className={`ts9-treadle-btn ${isEnabled ? 'active' : ''}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title="Toggle TS9 Bypass"
        >
          <div className="ts9-treadle-face">
            {/* Top Ribs */}
            <div className="ts9-ribs-group">
              <div className="ts9-rib" />
              <div className="ts9-rib" />
              <div className="ts9-rib" />
              <div className="ts9-rib" />
            </div>
            {/* Center Smooth Band */}
            <div className="ts9-ribs-middle" />
            {/* Bottom Ribs */}
            <div className="ts9-ribs-group">
              <div className="ts9-rib" />
              <div className="ts9-rib" />
              <div className="ts9-rib" />
              <div className="ts9-rib" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
