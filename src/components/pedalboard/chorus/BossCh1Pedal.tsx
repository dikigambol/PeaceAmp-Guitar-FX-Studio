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

export const BossCh1Pedal: React.FC<PedalProps> = ({
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
  const eLevelVal = instance.parameters['eLevel'] ?? 5.0;
  const eqVal = instance.parameters['eq'] ?? 5.0;
  const rateVal = instance.parameters['rate'] ?? 5.0;
  const depthVal = instance.parameters['depth'] ?? 6.0;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  const rateHzFormatted = `${(0.2 + Math.pow(rateVal / 10, 1.8) * 4.3).toFixed(2)} Hz`;
  const depthPctFormatted = `${Math.round((depthVal / 10) * 100)}%`;
  const eLevelPctFormatted = `${Math.round((eLevelVal / 10) * 100)}%`;
  const eqFormatted = eqVal < 4.8 ? 'LO' : eqVal > 5.2 ? 'HI' : 'FLAT';

  return (
    <div
      className={`pedal-custom-enclosure pedal-boss-ch1 ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* 1/4" Side Phone Jacks */}
      <div
        className={`stompbox-side-jack jack-left ${isLeftPending ? 'is-jack-pending' : ''} ${hasLeftCable ? 'has-cable' : ''}`}
        title="Audio Output Jack - Click to patch cable"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'out', e);
        }}
      />
      <div
        className={`stompbox-side-jack jack-right ${isRightPending ? 'is-jack-pending' : ''} ${hasRightCable ? 'has-cable' : ''}`}
        title="Audio Input Jack - Click to patch cable"
        onPointerDown={(e) => e.stopPropagation()}
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

      {/* Recessed Black Control Cavity Plate */}
      <div className="boss-ch1-cavity">
        {/* CHECK LED with Label */}
        <div
          className="boss-ch1-check-wrap"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title="CHECK LED (Click to toggle bypass)"
        >
          <span className="boss-ch1-check-text">CHECK</span>
          <div className={`boss-check-led ${isEnabled ? 'lit' : 'off'}`} />
        </div>

        {/* 4 Knobs in a Row */}
        <div className="boss-ch1-knobs-row">
          {/* Knob 1: E. LEVEL */}
          <div className="boss-ch1-knob-col">
            <span className="boss-ch1-knob-name">E. LEVEL</span>
            <div className="boss-ch1-dial-wrap">
              <span className="boss-ch1-dot dot-min" />
              <Knob
                label="E. LEVEL"
                value={eLevelVal}
                min={0}
                max={10}
                step={0.1}
                defaultValue={5.0}
                formatValue={() => eLevelPctFormatted}
                onChange={(val) => onChangeParam(instance.id, 'eLevel', val)}
                variant="boss-silver"
                size={34}
                showLabel={false}
                showValue={false}
              />
              <span className="boss-ch1-dot dot-max" />
            </div>
            <div className="boss-ch1-ticks-row">
              <span className="tick-text">MIN</span>
              <span className="tick-text">MAX</span>
            </div>
          </div>

          {/* Knob 2: EQ */}
          <div className="boss-ch1-knob-col">
            <span className="boss-ch1-knob-name">EQ</span>
            <div className="boss-ch1-dial-wrap">
              <span className="boss-ch1-dot dot-min" />
              <span className="boss-ch1-dot dot-center" />
              <Knob
                label="EQ"
                value={eqVal}
                min={0}
                max={10}
                step={0.1}
                defaultValue={5.0}
                formatValue={() => eqFormatted}
                onChange={(val) => onChangeParam(instance.id, 'eq', val)}
                variant="boss-silver"
                size={34}
                showLabel={false}
                showValue={false}
              />
              <span className="boss-ch1-dot dot-max" />
            </div>
            <div className="boss-ch1-ticks-row">
              <span className="tick-text">LO</span>
              <span className="tick-text">HI</span>
            </div>
          </div>

          {/* Knob 3: RATE */}
          <div className="boss-ch1-knob-col">
            <span className="boss-ch1-knob-name">RATE</span>
            <div className="boss-ch1-dial-wrap">
              <span className="boss-ch1-dot dot-min" />
              <Knob
                label="RATE"
                value={rateVal}
                min={0}
                max={10}
                step={0.1}
                defaultValue={5.0}
                formatValue={() => rateHzFormatted}
                onChange={(val) => onChangeParam(instance.id, 'rate', val)}
                variant="boss-silver"
                size={34}
                showLabel={false}
                showValue={false}
              />
              <span className="boss-ch1-dot dot-max" />
            </div>
            <div className="boss-ch1-ticks-row">
              <span className="tick-text">MIN</span>
              <span className="tick-text">MAX</span>
            </div>
          </div>

          {/* Knob 4: DEPTH */}
          <div className="boss-ch1-knob-col">
            <span className="boss-ch1-knob-name">DEPTH</span>
            <div className="boss-ch1-dial-wrap">
              <span className="boss-ch1-dot dot-min" />
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
                size={34}
                showLabel={false}
                showValue={false}
              />
              <span className="boss-ch1-dot dot-max" />
            </div>
            <div className="boss-ch1-ticks-row">
              <span className="tick-text">MIN</span>
              <span className="tick-text">MAX</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Stamped Graphic Section */}
      <div className="boss-mid-graphics boss-ch1-mid">
        {/* I/O Labels */}
        <div className="boss-io-arrows">
          <div className="boss-io-left">
            <span>&larr; OUTPUT</span>
          </div>
          <div className="boss-io-right">
            <span>INPUT &larr;</span>
          </div>
        </div>

        {/* Boss Model Typography: SUPER Chorus CH-1 */}
        <div className="boss-ch1-typography">
          <div className="boss-ch1-super">SUPER</div>
          <div className="boss-ch1-chorus">Chorus</div>
          <div className="boss-ch1-model">CH-1</div>
        </div>
      </div>

      {/* Bottom Boss Treadle Rubber Footplate with Embossed Logo */}
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
