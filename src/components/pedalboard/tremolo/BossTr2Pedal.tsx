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

export const BossTr2Pedal: React.FC<PedalProps> = ({
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
  const waveVal = instance.parameters['wave'] ?? 5.0;
  const depthVal = instance.parameters['depth'] ?? 7.0;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-boss-tr2 ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
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

      {/* Recessed Control Cavity Deck */}
      <div className="boss-deck boss-deck-tr2">
        {/* CHECK LED centered at top */}
        <div
          className="boss-tr2-check-section"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title="Status LED (Click to toggle bypass)"
        >
          <span className="boss-tr2-check-label">CHECK</span>
          <div className={`boss-tr2-check-led ${isEnabled ? 'lit' : 'off'}`} />
        </div>

        {/* 3 Knobs Triangle Layout */}
        <div className="boss-tr2-knobs-deck">
          {/* Top Row: RATE & DEPTH */}
          <div className="boss-tr2-top-knobs-row">
            {/* RATE Knob */}
            <div className="boss-tr2-knob-col">
              <div className="boss-tr2-dial-wrap">
                <span className="boss-tr2-dot dot-min" />
                <Knob
                  label="RATE"
                  value={rateVal}
                  min={0}
                  max={10}
                  step={0.1}
                  size={36}
                  variant="boss-black"
                  showLabel={false}
                  showValue={false}
                  onChange={(v) => onChangeParam(instance.id, 'rate', v)}
                />
                <span className="boss-tr2-dot dot-max" />
              </div>
              <span className="boss-tr2-knob-name">RATE</span>
            </div>

            {/* DEPTH Knob */}
            <div className="boss-tr2-knob-col">
              <div className="boss-tr2-dial-wrap">
                <span className="boss-tr2-dot dot-min" />
                <Knob
                  label="DEPTH"
                  value={depthVal}
                  min={0}
                  max={10}
                  step={0.1}
                  size={36}
                  variant="boss-black"
                  showLabel={false}
                  showValue={false}
                  onChange={(v) => onChangeParam(instance.id, 'depth', v)}
                />
                <span className="boss-tr2-dot dot-max" />
              </div>
              <span className="boss-tr2-knob-name">DEPTH</span>
            </div>
          </div>

          {/* Bottom Center: WAVE Knob with Triangle & Square Wave icons */}
          <div className="boss-tr2-bottom-knob-row">
            <span className="boss-tr2-wave-name">WAVE</span>
            <div className="boss-tr2-wave-control-wrap">
              {/* Triangle wave icon on the left */}
              <div className="boss-tr2-wave-icon wave-tri" title="Triangle / Sine wave (Smooth vintage amp tremolo)">
                <svg viewBox="0 0 20 12" className="tr2-wave-svg">
                  <path d="M 2 10 L 10 2 L 18 10" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div className="boss-tr2-dial-wrap-small">
                <span className="boss-tr2-dot dot-min" />
                <Knob
                  label="WAVE"
                  value={waveVal}
                  min={0}
                  max={10}
                  step={0.1}
                  size={30}
                  variant="boss-black"
                  showLabel={false}
                  showValue={false}
                  onChange={(v) => onChangeParam(instance.id, 'wave', v)}
                />
                <span className="boss-tr2-dot dot-max" />
              </div>

              {/* Square wave icon on the right */}
              <div className="boss-tr2-wave-icon wave-square" title="Square wave (Choppy hard optical stutter)">
                <svg viewBox="0 0 20 12" className="tr2-wave-svg">
                  <path d="M 2 10 L 2 2 L 10 2 L 10 10 L 18 10" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Stepped Chassis Section with IO Arrows & Authentic Tremolo TR-2 Typography */}
      <div className="boss-mid-graphics boss-tr2-mid">
        <div className="boss-tr2-io-row">
          <div className="boss-tr2-io-item left">
            <span className="boss-io-arrow">&larr;</span>
            <span className="boss-io-name">OUTPUT</span>
          </div>
          <div className="boss-tr2-io-item right">
            <span className="boss-io-name">INPUT</span>
            <span className="boss-io-arrow">&larr;</span>
          </div>
        </div>

        {/* Signature Boss TR-2 Title Block */}
        <div className="boss-tr2-typography">
          <div className="boss-tr2-title">Tremolo</div>
          <div className="boss-tr2-model">TR-2</div>
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
