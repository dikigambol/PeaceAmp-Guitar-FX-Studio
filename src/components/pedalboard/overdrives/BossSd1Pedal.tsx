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

export const BossSd1Pedal: React.FC<PedalProps> = ({
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
  const levelVal = instance.parameters['level'] ?? 5;
  const toneVal = instance.parameters['tone'] ?? 5;
  const driveVal = instance.parameters['drive'] ?? 5;

  const isLeftPending = isJackPending?.(instance.id, 'in') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'out') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'in') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'out') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-boss-sd1 ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
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

      {/* Top Deck in Enclosure Color with Recessed Bevel & Authentic Boss Layout */}
      <div className="boss-deck boss-deck-sd1">
        {/* CHECK LED top center */}
        <div
          className="boss-check-led-wrap"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title="CHECK LED (Click to toggle bypass)"
        >
          <span className="boss-check-text">CHECK</span>
          <div className={`boss-check-led ${isEnabled ? 'lit' : 'off'}`} />
        </div>

        {/* 3 Knobs Formation: LEVEL (top-L), DRIVE (top-R), TONE (mid-bottom) */}
        <div className="boss-3knobs-layout">
          {/* Top Row: LEVEL (left) and DRIVE (right) */}
          <div className="boss-top-knobs-row">
            <div className="boss-knob-unit">
              <div className="boss-knob-dial-wrap">
                <Knob
                  label="LEVEL"
                  value={levelVal}
                  min={0}
                  max={10}
                  step={0.1}
                  size={36}
                  variant="boss-silver"
                  showLabel={false}
                  showValue={false}
                  onChange={(v) => onChangeParam(instance.id, 'level', v)}
                />
              </div>
              <span className="boss-knob-label-bot">LEVEL</span>
            </div>

            <div className="boss-knob-unit">
              <div className="boss-knob-dial-wrap">
                <Knob
                  label="DRIVE"
                  value={driveVal}
                  min={0}
                  max={10}
                  step={0.1}
                  size={36}
                  variant="boss-silver"
                  showLabel={false}
                  showValue={false}
                  onChange={(v) => onChangeParam(instance.id, 'drive', v)}
                />
              </div>
              <span className="boss-knob-label-bot">DRIVE</span>
            </div>
          </div>

          {/* Lower Center: TONE with Label directly ABOVE it */}
          <div className="boss-bottom-knob-unit">
            <span className="boss-knob-label-top">TONE</span>
            <div className="boss-knob-dial-wrap">
              <Knob
                label="TONE"
                value={toneVal}
                min={0}
                max={10}
                step={0.1}
                size={36}
                variant="boss-silver"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'tone', v)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Middle Stepped Chassis Section with IO Arrows & Model Typography */}
      <div className="boss-mid-graphics">
        <div className="boss-io-arrows">
          <span>&larr; OUTPUT</span>
          <span>INPUT &larr;</span>
        </div>
        <div className="boss-sd1-typography">
          <div className="boss-sd1-super">SUPER</div>
          <div className="boss-sd1-od">OverDrive</div>
          <div className="boss-sd1-model">SD-1</div>
        </div>
      </div>

      {/* Iconic Boss Rubber Treadle Footplate with Embossed Logo */}
      <button
        type="button"
        className={`boss-treadle-plate ${isEnabled ? 'engaged' : ''}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggleEnabled(instance.id);
        }}
        title="Boss Treadle Footswitch (Click to toggle bypass)"
      >
        <div className="boss-rubber-pad">
          <div className="boss-embossed-logo">BOSS</div>
          <div className="boss-grip-lines">
            <div className="boss-grip-line" />
            <div className="boss-grip-line" />
            <div className="boss-grip-line" />
          </div>
        </div>
        <div className="boss-thumb-screw" />
      </button>
    </div>
  );
};
