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

/**
 * Boss DS-1 Distortion (1978)
 * 
 * Exact replica of the legendary orange Boss compact distortion pedal.
 * Features:
 *   - Iconic vibrant Boss orange enclosure with cast aluminum side shoulders.
 *   - Recessed top control cavity with CHECK LED indicator.
 *   - Authentic triangle knob formation:
 *       * Top Left: TONE (with dot & label below)
 *       * Top Right: DIST (with dot & label below)
 *       * Lower Center: LEVEL (with label directly above)
 *   - Authentic Boss Eurostile / Microgramma "Distortion DS-1" typography.
 *   - Heavy-duty cast aluminum foot treadle with embossed rubber BOSS foot pad and knurled thumb screw.
 */
export const BossDs1Pedal: React.FC<PedalProps> = ({
  instance,
  onToggleEnabled,
  onChangeParam,
  onRemove,
  isDragging,
  onJackClick,
  isJackPending,
  hasJackCable,
}) => {
  const isEnabled = instance.enabled;
  const toneVal = instance.parameters['tone'] ?? 5;
  const levelVal = instance.parameters['level'] ?? 5;
  const distVal = instance.parameters['dist'] ?? 6;

  const isLeftPending = isJackPending?.(instance.id, 'in') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'out') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'in') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'out') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-boss-ds1 ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      data-pedal-id={instance.id}
    >
      {/* 1/4" Side Patch Jacks */}
      <div
        className={`stompbox-side-jack jack-left ${isLeftPending ? 'is-jack-pending' : ''} ${hasLeftCable ? 'has-cable' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'in', e);
        }}
        title="Audio Input Jack (Left) - Click to patch cable"
      />

      <div
        className={`stompbox-side-jack jack-right ${isRightPending ? 'is-jack-pending' : ''} ${hasRightCable ? 'has-cable' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'out', e);
        }}
        title="Audio Output Jack (Right) - Click to patch cable"
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
          title="Remove Boss DS-1 from board"
        >
          <X size={12} strokeWidth={1.5} />
        </button>
      </div>

      {/* Recessed Control Cavity Deck */}
      <div className="boss-deck boss-deck-ds1">
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

        {/* 3 Knobs Formation: TONE (top-L), DIST (top-R), LEVEL (mid-bottom) */}
        <div className="boss-3knobs-layout">
          {/* Top Row: TONE (left) and DIST (right) */}
          <div className="boss-top-knobs-row">
            <div className="boss-knob-unit">
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
              <div className="boss-ds1-knob-sub">
                <div className="boss-knob-dot" />
                <span className="boss-knob-label-bot">TONE</span>
              </div>
            </div>

            <div className="boss-knob-unit">
              <div className="boss-knob-dial-wrap">
                <Knob
                  label="DIST"
                  value={distVal}
                  min={0}
                  max={10}
                  step={0.1}
                  size={36}
                  variant="boss-silver"
                  showLabel={false}
                  showValue={false}
                  onChange={(v) => onChangeParam(instance.id, 'dist', v)}
                />
              </div>
              <div className="boss-ds1-knob-sub">
                <div className="boss-knob-dot" />
                <span className="boss-knob-label-bot">DIST</span>
              </div>
            </div>
          </div>

          {/* Lower Center: LEVEL with Label directly ABOVE it */}
          <div className="boss-bottom-knob-unit">
            <span className="boss-knob-label-top">LEVEL</span>
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
          </div>
        </div>
      </div>

      {/* Middle Stepped Chassis Section with IO Arrows & Authentic DS-1 Typography */}
      <div className="boss-mid-graphics">
        <div className="boss-io-arrows">
          <span>&larr; OUTPUT</span>
          <span>INPUT &larr;</span>
        </div>
        <div className="boss-ds1-typography">
          <div className="boss-ds1-title">Distortion</div>
          <div className="boss-ds1-model">DS-1</div>
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
