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

export const BossCe2Pedal: React.FC<PedalProps> = ({
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
  const rateVal = instance.parameters['rate'] ?? 4.5;
  const depthVal = instance.parameters['depth'] ?? 6.0;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  const rateHzFormatted = `${(0.3 + Math.pow(rateVal / 10, 1.8) * 3.2).toFixed(2)} Hz`;
  const depthPctFormatted = `${Math.round((depthVal / 10) * 100)}%`;

  return (
    <div
      className={`pedal-custom-enclosure pedal-boss-ce2 ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
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
      <div className="boss-top-bar">
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

      {/* Top Painted Recessed Control Cavity (Authentic Sky Blue Body-Matching Color) */}
      <div className="boss-ce2-cavity">
        {/* CHECK LED with Label */}
        <div
          className="boss-ce2-check-wrap"
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title="CHECK LED (Click to toggle bypass)"
        >
          <span className="boss-ce2-check-text">CHECK</span>
          <div className={`boss-check-led ${isEnabled ? 'lit' : 'off'}`} />
        </div>

        {/* 2 Classic Silver Boss Knobs (RATE & DEPTH) */}
        <div className="boss-ce2-knobs-row">
          {/* RATE Knob */}
          <div className="boss-ce2-knob-col">
            <div className="boss-ce2-knob-wrapper">
              <span className="boss-dot-tick dot-min" />
              <Knob
                label="RATE"
                value={rateVal}
                min={0}
                max={10}
                step={0.1}
                defaultValue={4.5}
                formatValue={() => rateHzFormatted}
                onChange={(val) => onChangeParam(instance.id, 'rate', val)}
                variant="boss-silver"
                size={44}
                showLabel={false}
                showValue={false}
              />
              <span className="boss-dot-tick dot-max" />
            </div>
            <span className="boss-ce2-knob-label">RATE</span>
            <span className="boss-ce2-sub-val">{rateHzFormatted}</span>
          </div>

          {/* DEPTH Knob */}
          <div className="boss-ce2-knob-col">
            <div className="boss-ce2-knob-wrapper">
              <span className="boss-dot-tick dot-min" />
              <Knob
                label="DEPTH"
                value={depthVal}
                min={0}
                max={10}
                step={0.1}
                defaultValue={6.0}
                formatValue={() => depthPctFormatted}
                onChange={(val) => onChangeParam(instance.id, 'depth', val)}
                variant="boss-silver"
                size={44}
                showLabel={false}
                showValue={false}
              />
              <span className="boss-dot-tick dot-max" />
            </div>
            <span className="boss-ce2-knob-label">DEPTH</span>
            <span className="boss-ce2-sub-val">{depthPctFormatted}</span>
          </div>
        </div>
      </div>

      {/* Middle Stamped Graphic Section */}
      <div className="boss-mid-graphics boss-ce2-mid">
        {/* I/O Labels */}
        <div className="boss-io-arrows">
          <div className="boss-io-left">
            <span>&larr; OUTPUT</span>
          </div>
          <div className="boss-io-right">
            <span>INPUT &larr;</span>
          </div>
        </div>

        {/* Boss Model Typography: Chorus CE-2 */}
        <div className="boss-ce2-typography">
          <div className="boss-ce2-chorus">Chorus</div>
          <div className="boss-ce2-model">CE-2</div>
        </div>
      </div>

      {/* Bottom Boss Treadle Rubber Footplate with Clean Embossed Logo */}
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

        {/* Bottom knurled thumb-screw */}
        <div className="boss-thumb-screw" />
      </div>
    </div>
  );
};
