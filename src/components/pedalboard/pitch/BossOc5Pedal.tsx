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

export const BossOc5Pedal: React.FC<PedalProps> = ({
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
  const directVal = instance.parameters['direct'] ?? 5.0;
  const octUpVal = instance.parameters['octUp'] ?? 0.0;
  const octDownVal = instance.parameters['octDown'] ?? 5.0;
  const oct2DownRangeVal = instance.parameters['oct2DownRange'] ?? 5.0;
  const modeVal = instance.parameters['mode'] ?? 0.0;
  const isVintage = modeVal >= 0.5;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  const toggleMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeParam(instance.id, 'mode', isVintage ? 0 : 1);
  };

  return (
    <div
      className={`pedal-custom-enclosure pedal-boss-oc5 ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
      data-pedal-id={instance.id}
    >
      {/* 1/4" Side Patch Jacks */}
      <div
        className={`stompbox-side-jack jack-left ${isLeftPending ? 'is-jack-pending' : ''} ${hasLeftCable ? 'has-cable' : ''}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'out', e);
        }}
        title="Audio Output Jack - Click to patch cable"
      />
      <div
        className={`stompbox-side-jack jack-right ${isRightPending ? 'is-jack-pending' : ''} ${hasRightCable ? 'has-cable' : ''}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'in', e);
        }}
        title="Audio Input Jack - Click to patch cable"
      />

      {/* Top Header with Close Button */}
      <div className="pedal-top-bar boss-top-bar">
        <button
          type="button"
          className="pedal-mini-btn pedal-close-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(instance.id);
          }}
          title="Remove Boss OC-5 from board"
        >
          <X size={12} strokeWidth={1.5} />
        </button>
      </div>

      {/* Recessed Control Cavity Deck (Jet Black) */}
      <div className="boss-deck boss-deck-oc5">
        {/* CHECK LED centered at the top */}
        <div
          className="boss-oc5-check-section"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title="CHECK LED (Click to toggle bypass)"
        >
          <span className="boss-oc5-check-label">CHECK</span>
          <div className={`boss-check-led ${isEnabled ? 'lit' : 'off'}`} />
        </div>

        {/* 4 Knobs Deck with ALL parameter labels ABOVE each knob */}
        <div className="boss-oc5-knobs-deck">
          {/* Knob 1: DIRECT LEVEL */}
          <div className="boss-oc5-col">
            <div className="boss-oc5-knob-title">
              <span>DIRECT</span>
              <span>LEVEL</span>
            </div>
            <div className="boss-oc5-dial-container">
              <span className="boss-oc5-dot dot-min" />
              <Knob
                label="DIRECT LEVEL"
                value={directVal}
                min={0}
                max={10}
                step={0.1}
                size={34}
                variant="boss-black"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'direct', v)}
              />
              <span className="boss-oc5-dot dot-max" />
            </div>
          </div>

          {/* Knob 2: +1OCT LEVEL */}
          <div className="boss-oc5-col">
            <div className="boss-oc5-knob-title">
              <span>+1OCT</span>
              <span>LEVEL</span>
            </div>
            <div className="boss-oc5-dial-container">
              <span className="boss-oc5-dot dot-min" />
              <Knob
                label="+1OCT LEVEL"
                value={octUpVal}
                min={0}
                max={10}
                step={0.1}
                size={34}
                variant="boss-black"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'octUp', v)}
              />
              <span className="boss-oc5-dot dot-max" />
            </div>
          </div>

          {/* Knob 3: -1OCT LEVEL */}
          <div className="boss-oc5-col">
            <div className="boss-oc5-knob-title">
              <span>-1OCT</span>
              <span>LEVEL</span>
            </div>
            <div className="boss-oc5-dial-container">
              <span className="boss-oc5-dot dot-min" />
              <Knob
                label="-1OCT LEVEL"
                value={octDownVal}
                min={0}
                max={10}
                step={0.1}
                size={34}
                variant="boss-black"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'octDown', v)}
              />
              <span className="boss-oc5-dot dot-max" />
            </div>
          </div>

          {/* Knob 4: -2OCT RANGE */}
          <div className="boss-oc5-col">
            <div className="boss-oc5-knob-title">
              <span>-2OCT</span>
              <span>RANGE</span>
            </div>
            <div className="boss-oc5-dial-container">
              <span className="boss-oc5-dot dot-min" />
              <Knob
                label="-2OCT / RANGE"
                value={oct2DownRangeVal}
                min={0}
                max={10}
                step={0.1}
                size={34}
                variant="boss-black"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'oct2DownRange', v)}
              />
              <span className="boss-oc5-dot dot-max" />
            </div>
          </div>
        </div>

        {/* Lower Row: VINTAGE | SLIDER | [POLY] */}
        <div className="boss-oc5-bottom-controls-row">
          <div
            className="boss-oc5-switch-subdeck"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={toggleMode}
            title="Click to toggle VINTAGE / POLY mode"
          >
            <span className={`boss-mode-text ${isVintage ? 'active' : ''}`}>VINTAGE</span>
            <div className="boss-switch-slot">
              <div className={`boss-switch-lever ${isVintage ? 'lever-vintage' : 'lever-poly'}`} />
            </div>
            <span className={`boss-mode-badge ${!isVintage ? 'active' : ''}`}>POLY</span>
          </div>
        </div>
      </div>

      {/* Middle Stepped Chassis Section with IO Arrows & Authentic Octave OC-5 Typography */}
      <div className="boss-mid-graphics boss-oc5-mid">
        <div className="boss-oc5-io-row">
          <div className="boss-oc5-left-labels">
            <div className="boss-oc5-io-item">
              <span className="boss-io-arrow">&larr;</span>
              <span className="boss-io-name">OUTPUT</span>
            </div>
            <div className="boss-oc5-io-item">
              <span className="boss-io-arrow">&larr;</span>
              <span className="boss-io-name">DIRECT OUT</span>
            </div>
          </div>
          <div className="boss-oc5-right-labels">
            <div className="boss-oc5-io-item">
              <span className="boss-io-name">INPUT</span>
              <span className="boss-io-arrow">&larr;</span>
            </div>
          </div>
        </div>

        {/* Signature Boss OC-5 Title Block */}
        <div className="boss-oc5-typography">
          <div className="boss-oc5-title">Octave</div>
          <div className="boss-oc5-model">OC-5</div>
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
