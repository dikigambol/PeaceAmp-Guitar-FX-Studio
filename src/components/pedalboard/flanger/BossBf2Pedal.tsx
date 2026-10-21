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

export const BossBf2Pedal: React.FC<PedalProps> = ({
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
  const manualVal = instance.parameters['manual'] ?? 5.0;
  const depthVal = instance.parameters['depth'] ?? 5.0;
  const rateVal = instance.parameters['rate'] ?? 2.8;
  const resVal = instance.parameters['res'] ?? 3.5;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-boss-bf2 ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* 1/4" Side Phone Jacks (Aligned to JACK_Y_OFFSET = 57, top: 46px) */}
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

      {/* Top Deck: Authentic Boss Recessed Control Cavity */}
      <div className="boss-deck boss-deck-bf2">
        {/* CHECK LED with Label */}
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

        {/* 4 Knobs in a Single Symmetrical Row: MANUAL, DEPTH, RATE, RES */}
        <div className="boss-knobs-row boss-bf2-knobs-row">
          <div className="boss-knob-col">
            <span className="boss-knob-name">MANUAL</span>
            <Knob
              label="MANUAL"
              value={manualVal}
              min={0}
              max={10}
              step={0.1}
              size={30}
              variant="boss-silver"
              showLabel={false}
              showValue={false}
              onChange={(v) => onChangeParam(instance.id, 'manual', v)}
            />
          </div>

          <div className="boss-knob-col">
            <span className="boss-knob-name">DEPTH</span>
            <Knob
              label="DEPTH"
              value={depthVal}
              min={0}
              max={10}
              step={0.1}
              size={30}
              variant="boss-silver"
              showLabel={false}
              showValue={false}
              onChange={(v) => onChangeParam(instance.id, 'depth', v)}
            />
          </div>

          <div className="boss-knob-col">
            <span className="boss-knob-name">RATE</span>
            <Knob
              label="RATE"
              value={rateVal}
              min={0}
              max={10}
              step={0.1}
              size={30}
              variant="boss-silver"
              showLabel={false}
              showValue={false}
              onChange={(v) => onChangeParam(instance.id, 'rate', v)}
            />
          </div>

          <div className="boss-knob-col">
            <span className="boss-knob-name">RES</span>
            <Knob
              label="RES"
              value={resVal}
              min={0}
              max={10}
              step={0.1}
              size={30}
              variant="boss-silver"
              showLabel={false}
              showValue={false}
              onChange={(v) => onChangeParam(instance.id, 'res', v)}
            />
          </div>
        </div>
      </div>

      {/* Middle Stepped Chassis Section with IO Arrows & Authentic Boss Typography */}
      <div className="boss-mid-graphics boss-bf2-mid">
        <div className="boss-io-arrows">
          <div className="boss-io-left">
            <span>&larr; OUTPUT</span>
          </div>
          <div className="boss-io-right">
            <span>INPUT &larr;</span>
          </div>
        </div>
        <div className="boss-bf2-typography">
          <div className="boss-bf2-title">Flanger</div>
          <div className="boss-bf2-model">BF-2</div>
        </div>
      </div>

      {/* Authentic Boss Rubber Treadle Footplate with Embossed Logo */}
      <div
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
      </div>
    </div>
  );
};
