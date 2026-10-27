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

const VB2_MODES = ['LATCH', 'BYPASS', 'UNLATCH'] as const;

export const BossVb2Pedal: React.FC<PedalProps> = ({
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
  const rateVal = instance.parameters['rate'] ?? 5.0;
  const depthVal = instance.parameters['depth'] ?? 7.0;
  const riseTimeVal = instance.parameters['riseTime'] ?? 3.0;
  const modeVal = instance.parameters['mode'] ?? 0.0;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  const currentModeIndex = Math.min(2, Math.max(0, Math.round(modeVal)));
  const currentModeLabel = VB2_MODES[currentModeIndex] || 'LATCH';

  const rateHz = 1.5 * Math.pow(14.0 / 1.5, rateVal / 10);
  const riseTimeSec = 0.05 + (riseTimeVal / 10) * 3.45;

  const isBypassMode = currentModeIndex === 1;
  const isUnlatchMode = currentModeIndex === 2;

  // LED is lit when active
  const isLedLit = isEnabled;

  return (
    <div
      className={`pedal-custom-enclosure pedal-boss-vb2 ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
      data-pedal-id={instance.id}
    >
      {/* 1/4" Side Phone Jacks (Aligned with JACK_Y_OFFSET = 57, top: 46px) */}
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
          type="button"
          className="pedal-mini-btn pedal-close-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(instance.id);
          }}
          title="Remove Boss VB-2 from board"
        >
          <X size={12} strokeWidth={1.5} />
        </button>
      </div>

      {/* Top Recessed Black Control Plate (Matching Boss AW-3 Layout) */}
      <div className="boss-control-cavity">
        {/* CHECK LED */}
        <div
          className="boss-check-led-wrap"
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title="CHECK LED (Click to toggle bypass)"
        >
          <span className="boss-check-text">CHECK</span>
          <div className={`boss-check-led ${isLedLit ? 'lit' : 'off'}`} />
        </div>

        {/* 4 Knobs in a Row */}
        <div className="boss-knobs-row">
          {/* Knob 1: RATE */}
          <div className="boss-knob-col">
            <span className="boss-knob-name">RATE</span>
            <Knob
              label="RATE"
              value={rateVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5}
              formatValue={(v) => v.toFixed(1)}
              onChange={(val) => onChangeParam(instance.id, 'rate', val)}
              variant="boss"
              size={32}
              showLabel={false}
              showValue={false}
            />
            <span className="boss-sub-ticks">{rateHz.toFixed(1)}Hz</span>
          </div>

          {/* Knob 2: DEPTH */}
          <div className="boss-knob-col">
            <span className="boss-knob-name">DEPTH</span>
            <Knob
              label="DEPTH"
              value={depthVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={7}
              formatValue={(v) => v.toFixed(1)}
              onChange={(val) => onChangeParam(instance.id, 'depth', val)}
              variant="boss"
              size={32}
              showLabel={false}
              showValue={false}
            />
            <span className="boss-sub-ticks">{Math.round(depthVal * 10)}%</span>
          </div>

          {/* Knob 3: RISE TIME */}
          <div className="boss-knob-col">
            <span className="boss-knob-name">RISE TIME</span>
            <Knob
              label="RISE TIME"
              value={riseTimeVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={3}
              formatValue={(v) => v.toFixed(1)}
              onChange={(val) => onChangeParam(instance.id, 'riseTime', val)}
              variant="boss"
              size={32}
              showLabel={false}
              showValue={false}
            />
            <span className="boss-sub-ticks">{riseTimeSec.toFixed(1)}s</span>
          </div>

          {/* Knob 4: MODE Rotary Switch */}
          <div className="boss-knob-col">
            <span className="boss-knob-name">MODE</span>
            <Knob
              label="MODE"
              value={modeVal}
              min={0}
              max={2}
              step={1}
              defaultValue={0}
              formatValue={(v) => VB2_MODES[Math.round(v)] || 'LATCH'}
              onChange={(val) => onChangeParam(instance.id, 'mode', Math.round(val))}
              variant="boss"
              size={32}
              showLabel={false}
              showValue={false}
            />
            <span className="boss-sub-ticks mode-active-text">{currentModeLabel}</span>
          </div>
        </div>
      </div>

      {/* Middle Stamped Graphic Section (Clean Authentic Stamped Chassis) */}
      <div className="boss-mid-graphics boss-vb2-mid">
        {/* I/O Labels */}
        <div className="boss-io-arrows">
          <div className="boss-io-left">
            <span>&larr; OUTPUT</span>
          </div>
          <div className="boss-io-right">
            <span>INPUT &larr;</span>
          </div>
        </div>

        {/* Boss Model Typography (AW-3 / DS-1 Authentic Style) */}
        <div className="boss-vb2-typography">
          <div className="boss-vb2-title">Vibrato</div>
          <div className="boss-vb2-model">VB-2</div>
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
