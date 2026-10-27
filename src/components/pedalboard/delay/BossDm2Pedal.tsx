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

export const BossDm2Pedal: React.FC<PedalProps> = ({
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
  const repeatRateVal = instance.parameters['repeatRate'] ?? 4.5;
  const intensityVal = instance.parameters['intensity'] ?? 4.0;
  const echoVal = instance.parameters['echo'] ?? 5.0;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-boss-dm2 ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      data-pedal-id={instance.id}
    >
      {/* 1/4" Side Patch Jacks (Aligned to JACK_Y_OFFSET = 57) */}
      <div
        className={`stompbox-side-jack jack-left ${isLeftPending ? 'is-jack-pending' : ''} ${hasLeftCable ? 'has-cable' : ''}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'out', e);
        }}
        title="Audio Output Jack (Left) - Click to patch cable"
      />

      <div
        className={`stompbox-side-jack jack-right ${isRightPending ? 'is-jack-pending' : ''} ${hasRightCable ? 'has-cable' : ''}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'in', e);
        }}
        title="Audio Input Jack (Right) - Click to patch cable"
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
          title="Remove Boss DM-2 from board"
        >
          <X size={12} strokeWidth={1.5} />
        </button>
      </div>

      {/* Recessed Control Cavity Deck (Matching Boss Enclosure Deck System) */}
      <div className="boss-deck boss-deck-dm2">
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

        {/* 3 Knobs Formation: REPEAT RATE (top-L), INTENSITY (top-R), ECHO (mid-bottom) - Samakan persis dengan Boss DS-1 */}
        <div className="boss-3knobs-layout">
          {/* Top Row: REPEAT RATE (left) and INTENSITY (right) */}
          <div className="boss-top-knobs-row">
            <div className="boss-knob-unit">
              <div className="boss-knob-dial-wrap">
                <Knob
                  label="REPEAT RATE"
                  value={repeatRateVal}
                  min={0}
                  max={10}
                  step={0.1}
                  size={36}
                  variant="boss-silver"
                  showLabel={false}
                  showValue={false}
                  onChange={(v) => onChangeParam(instance.id, 'repeatRate', v)}
                />
              </div>
              <div className="boss-ds1-knob-sub">
                <div className="boss-knob-dot" />
                <span className="boss-knob-label-bot boss-dm2-stacked-label">
                  <span>REPEAT</span>
                  <span>RATE</span>
                </span>
              </div>
            </div>

            <div className="boss-knob-unit">
              <div className="boss-knob-dial-wrap">
                <Knob
                  label="INTENSITY"
                  value={intensityVal}
                  min={0}
                  max={10}
                  step={0.1}
                  size={36}
                  variant="boss-silver"
                  showLabel={false}
                  showValue={false}
                  onChange={(v) => onChangeParam(instance.id, 'intensity', v)}
                />
              </div>
              <div className="boss-ds1-knob-sub">
                <div className="boss-knob-dot" />
                <span className="boss-knob-label-bot boss-dm2-stacked-label">
                  <span>INTEN</span>
                  <span>SITY</span>
                </span>
              </div>
            </div>
          </div>

          {/* Lower Center: ECHO with Label directly ABOVE it */}
          <div className="boss-bottom-knob-unit">
            <span className="boss-knob-label-top">ECHO</span>
            <div className="boss-knob-dial-wrap">
              <Knob
                label="ECHO"
                value={echoVal}
                min={0}
                max={10}
                step={0.1}
                size={36}
                variant="boss-silver"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'echo', v)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Middle Stepped Chassis Section with IO Arrows & Authentic DM-2 Typography */}
      <div className="boss-mid-graphics">
        <div className="boss-io-arrows">
          <span>&larr; OUTPUT</span>
          <span>INPUT &larr;</span>
        </div>
        <div className="boss-dm2-typography">
          <div className="boss-dm2-title">Delay</div>
          <div className="boss-dm2-model">DM-2</div>
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
