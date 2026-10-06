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

export const BossCs3Pedal: React.FC<PedalProps> = ({
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
  const attackVal = instance.parameters['attack'] ?? 5;
  const sustainVal = instance.parameters['sustain'] ?? 5;

  const isLeftPending = isJackPending?.(instance.id, 'in') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'out') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'in') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'out') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-boss-cs3 ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
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

      {/* Top Recessed Black Control Plate */}
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
          <div className={`boss-check-led ${isEnabled ? 'lit' : 'off'}`} />
        </div>

        {/* 4 White Boss Knobs in a Row */}
        <div className="boss-knobs-row">
          <div className="boss-knob-col">
            <span className="boss-knob-name">LEVEL</span>
            <Knob
              label="LEVEL"
              value={levelVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5}
              formatValue={(v) => v.toFixed(1)}
              onChange={(val) => onChangeParam(instance.id, 'level', val)}
              variant="boss"
              size={32}
              showLabel={false}
              showValue={false}
            />
            <span className="boss-sub-ticks">MIN MAX</span>
          </div>

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
              variant="boss"
              size={32}
              showLabel={false}
              showValue={false}
            />
            <span className="boss-sub-ticks">LO HI</span>
          </div>

          <div className="boss-knob-col">
            <span className="boss-knob-name">ATTACK</span>
            <Knob
              label="ATTACK"
              value={attackVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5}
              formatValue={(v) => v.toFixed(1)}
              onChange={(val) => onChangeParam(instance.id, 'attack', val)}
              variant="boss"
              size={32}
              showLabel={false}
              showValue={false}
            />
            <span className="boss-sub-ticks">MIN MAX</span>
          </div>

          <div className="boss-knob-col">
            <span className="boss-knob-name">SUSTAIN</span>
            <Knob
              label="SUSTAIN"
              value={sustainVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5}
              formatValue={(v) => v.toFixed(1)}
              onChange={(val) => onChangeParam(instance.id, 'sustain', val)}
              variant="boss"
              size={32}
              showLabel={false}
              showValue={false}
            />
            <span className="boss-sub-ticks">MIN MAX</span>
          </div>
        </div>
      </div>

      {/* Middle Stamped Graphic Section */}
      <div className="boss-mid-graphics">
        <div className="boss-io-arrows">
          <span>&larr; OUTPUT</span>
          <span>INPUT &larr;</span>
        </div>
        <div className="boss-model-titles">
          <h3 className="boss-title-main">Compression</h3>
          <h4 className="boss-title-sub">Sustainer</h4>
          <span className="boss-model-badge">CS-3</span>
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
