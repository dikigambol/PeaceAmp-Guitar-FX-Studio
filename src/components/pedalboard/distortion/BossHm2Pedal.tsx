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
 * Boss HM-2 Heavy Metal (1983 / HM-2w Waza Craft)
 * 
 * Authentic visual replica of the legendary Swedish Chainsaw pedal:
 * - Satin/gloss jet-black Boss compact enclosure with aluminum edge bevels.
 * - Recessed control cavity with orange "CHECK" LED.
 * - 4 iconic Boss orange-capped knobs:
 *     * LEVEL (Volume)
 *     * COLOR MIX: L (Low Gyrator @ 100 Hz) & H (High Gyrator @ 1000 Hz) with underline bracket
 *     * DIST. (Distortion Drive)
 * - Authentic Boss "Heavy Metal HM-2w" typography in vibrant safety orange.
 * - Heavy-duty rubber treadle with embossed BOSS logo & Waza Craft "技" metal badge.
 * - Silver knurled thumbscrew at 6 o'clock.
 */
export const BossHm2Pedal: React.FC<PedalProps> = ({
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
  const levelVal = instance.parameters['level'] ?? 5;
  const colorMixLVal = instance.parameters['colorMixL'] ?? 5;
  const colorMixHVal = instance.parameters['colorMixH'] ?? 5;
  const distVal = instance.parameters['dist'] ?? 6;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-boss-hm2 ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      data-pedal-id={instance.id}
    >
      {/* 1/4" Side Patch Jacks */}
      <div
        className={`stompbox-side-jack jack-left ${isLeftPending ? 'jack-pending-target' : ''} ${hasLeftCable ? 'jack-has-cable' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'out', e);
        }}
        title="OUTPUT Jack (Left)"
      >
        <div className="side-jack-hex-nut" />
        <div className="side-jack-hole" />
      </div>

      <div
        className={`stompbox-side-jack jack-right ${isRightPending ? 'jack-pending-target' : ''} ${hasRightCable ? 'jack-has-cable' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'in', e);
        }}
        title="INPUT Jack (Right)"
      >
        <div className="side-jack-hex-nut" />
        <div className="side-jack-hole" />
      </div>

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
          title="Remove Boss HM-2 from board"
        >
          <X size={12} strokeWidth={1.5} />
        </button>
      </div>

      {/* Recessed Control Cavity Deck */}
      <div className="boss-deck boss-deck-hm2">
        {/* CHECK LED top center with orange label */}
        <div
          className="boss-check-led-wrap"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title="CHECK LED (Click to toggle bypass)"
        >
          <span className="boss-check-text hm2-orange-text">CHECK</span>
          <div className={`boss-check-led ${isEnabled ? 'lit' : 'off'}`} />
        </div>

        {/* 4 Knobs Formation in a single horizontal row */}
        <div className="boss-hm2-knobs-row">
          {/* Knob 1: LEVEL */}
          <div className="boss-hm2-knob-col">
            <div className="boss-hm2-knob-dot" />
            <div className="boss-hm2-knob-dial-wrap">
              <Knob
                label="LEVEL"
                value={levelVal}
                min={0}
                max={10}
                step={0.1}
                size={34}
                variant="boss-orange"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'level', v)}
              />
            </div>
            <span className="boss-hm2-knob-lbl">LEVEL</span>
          </div>

          {/* Knob 2: COLOR MIX L (Low) */}
          <div className="boss-hm2-knob-col">
            <div className="boss-hm2-knob-dot" />
            <div className="boss-hm2-knob-dial-wrap">
              <Knob
                label="LOW"
                value={colorMixLVal}
                min={0}
                max={10}
                step={0.1}
                size={34}
                variant="boss-orange"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'colorMixL', v)}
              />
            </div>
            <span className="boss-hm2-knob-lbl hm2-lbl-l">L</span>
          </div>

          {/* Knob 3: COLOR MIX H (High) */}
          <div className="boss-hm2-knob-col">
            <div className="boss-hm2-knob-dot" />
            <div className="boss-hm2-knob-dial-wrap">
              <Knob
                label="HIGH"
                value={colorMixHVal}
                min={0}
                max={10}
                step={0.1}
                size={34}
                variant="boss-orange"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'colorMixH', v)}
              />
            </div>
            <span className="boss-hm2-knob-lbl hm2-lbl-h">H</span>
          </div>

          {/* Knob 4: DIST. */}
          <div className="boss-hm2-knob-col">
            <div className="boss-hm2-knob-dot" />
            <div className="boss-hm2-knob-dial-wrap">
              <Knob
                label="DIST"
                value={distVal}
                min={0}
                max={10}
                step={0.1}
                size={34}
                variant="boss-orange"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'dist', v)}
              />
            </div>
            <span className="boss-hm2-knob-lbl">DIST.</span>
          </div>
        </div>

        {/* COLOR MIX connecting bracket between L and H */}
        <div className="boss-hm2-bracket-container">
          <div className="boss-hm2-bracket-line">
            <span className="boss-hm2-bracket-text">COLOR MIX</span>
          </div>
        </div>
      </div>

      {/* Middle Stepped Chassis Section with IO Arrows & Authentic HM-2 Typography */}
      <div className="boss-mid-graphics boss-hm2-mid-graphics">
        <div className="boss-io-arrows boss-hm2-io-arrows">
          <span>&larr; OUTPUT</span>
          <span>INPUT &larr;</span>
        </div>
        <div className="boss-hm2-typography">
          <div className="boss-hm2-title">Heavy Metal</div>
          <div className="boss-hm2-model">HM-2w</div>
        </div>
      </div>

      {/* Iconic Boss Rubber Treadle Footplate with Embossed Logo & Waza Craft Badge */}
      <button
        type="button"
        className={`boss-treadle-plate boss-hm2-treadle ${isEnabled ? 'engaged' : ''}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggleEnabled(instance.id);
        }}
        title="Boss HM-2 Treadle Footswitch (Click to toggle bypass)"
      >
        <div className="boss-rubber-pad boss-hm2-rubber-pad">
          {/* Embossed BOSS Logo */}
          <div className="boss-hm2-logo-row">
            <div className="boss-hm2-logo-emblem">
              <div className="boss-hm2-emblem-shape" />
            </div>
            <span className="boss-hm2-embossed-text">BOSS</span>
          </div>

          {/* Iconic Waza Craft "技" Metallic Badge */}
          <div className="boss-hm2-waza-badge">
            <div className="waza-kanji-box">
              <span className="waza-kanji-char">技</span>
            </div>
            <div className="waza-text-box">
              <span className="waza-title-text">WAZA CRAFT</span>
              <div className="waza-underline" />
            </div>
          </div>
        </div>
        {/* Silver Knurled Battery Compartment Thumbscrew at 6 o'clock */}
        <div className="boss-thumb-screw boss-hm2-thumbscrew" />
      </button>
    </div>
  );
};
