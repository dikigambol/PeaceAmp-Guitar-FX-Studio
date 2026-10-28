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

export const RV6_MODE_LABELS = [
  'ROOM',
  'HALL',
  'PLATE',
  'SPRING',
  'MODULATE',
  '+DELAY',
  'SHIMMER',
  'DYNAMIC',
];

export const BossRv6Pedal: React.FC<PedalProps> = ({
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
  const toneVal = instance.parameters['tone'] ?? 5.0;
  const timeVal = instance.parameters['time'] ?? 5.0;
  const modeVal = instance.parameters['mode'] ?? 1.0; // default: Hall

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  const currentModeIdx = Math.min(7, Math.max(0, Math.round(modeVal)));
  const currentModeLabel = RV6_MODE_LABELS[currentModeIdx] || 'HALL';

  // Sub-tick formatted values (matching Boss AW-3 typography and format)
  const eLevelSub = `${Math.round((eLevelVal / 10) * 100)}%`;
  const toneSub = `${(1.2 * Math.pow(15 / 1.2, toneVal / 10)).toFixed(1)}kHz`;
  const timeSub = `${(0.35 + Math.pow(timeVal / 10, 1.4) * 7.15).toFixed(1)}s`;

  return (
    <div
      className={`pedal-custom-enclosure pedal-boss-rv6 ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
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

      {/* Top Recessed Control Cavity (All Controls & Selectors Self-Contained) */}
      <div className="boss-control-cavity boss-rv6-cavity">
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
          <div className={`boss-check-led ${isEnabled ? 'lit' : 'off'}`} />
        </div>

        {/* 4 Knobs in a Symmetrical Row (size=32 matching AW-3) */}
        <div className="boss-knobs-row">
          {/* Knob 1: E.LEVEL */}
          <div className="boss-knob-col">
            <span className="boss-knob-name">E.LEVEL</span>
            <Knob
              label="E.LEVEL"
              value={eLevelVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5}
              formatValue={(v) => v.toFixed(1)}
              onChange={(val) => onChangeParam(instance.id, 'eLevel', val)}
              variant="boss-black"
              size={32}
              showLabel={false}
              showValue={false}
            />
            <span className="boss-sub-ticks">{eLevelSub}</span>
          </div>

          {/* Knob 2: TONE */}
          <div className="boss-knob-col">
            <span className="boss-knob-name">TONE</span>
            <Knob
              label="TONE"
              value={toneVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5}
              formatValue={(v) => v.toFixed(1)}
              onChange={(val) => onChangeParam(instance.id, 'tone', val)}
              variant="boss-black"
              size={32}
              showLabel={false}
              showValue={false}
            />
            <span className="boss-sub-ticks">{toneSub}</span>
          </div>

          {/* Knob 3: TIME */}
          <div className="boss-knob-col">
            <span className="boss-knob-name">TIME</span>
            <Knob
              label="TIME"
              value={timeVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5}
              formatValue={(v) => v.toFixed(1)}
              onChange={(val) => onChangeParam(instance.id, 'time', val)}
              variant="boss-black"
              size={32}
              showLabel={false}
              showValue={false}
            />
            <span className="boss-sub-ticks">{timeSub}</span>
          </div>

          {/* Knob 4: MODE Rotary Switch */}
          <div className="boss-knob-col">
            <span className="boss-knob-name">MODE</span>
            <Knob
              label="MODE"
              value={modeVal}
              min={0}
              max={7}
              step={1}
              defaultValue={1}
              formatValue={(v) => RV6_MODE_LABELS[Math.round(v)] || 'HALL'}
              onChange={(val) => onChangeParam(instance.id, 'mode', Math.round(val))}
              variant="boss-black"
              size={32}
              showLabel={false}
              showValue={false}
            />
            <span className="boss-sub-ticks mode-active-text">{currentModeLabel}</span>
          </div>
        </div>
      </div>

      {/* Middle Stamped Graphic Section (Clean Authentic Stamped Chassis) */}
      <div className="boss-mid-graphics boss-rv6-mid">
        {/* I/O Labels */}
        <div className="boss-io-arrows">
          <div className="boss-io-left">
            <span>&larr; OUTPUT</span>
          </div>
          <div className="boss-io-right">
            <span>INPUT &larr;</span>
          </div>
        </div>

        {/* Boss Model Typography (Matching AW-3 / SD-1 Style with Michroma Font) */}
        <div className="boss-rv6-typography">
          <div className="boss-rv6-title">Reverb</div>
          <div className="boss-rv6-model">RV-6</div>
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
