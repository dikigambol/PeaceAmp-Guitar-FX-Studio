import React from 'react';
import type { PedalInstance, PedalMetadata } from '../../../types/pedal';
import { Knob } from '../../common/Knob';
import { BossDualConcentricKnob } from '../../common/BossDualConcentricKnob';
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
 * Boss MT-2 Metal Zone (1991)
 * 
 * Authentic visual replica of the iconic Boss MT-2 Metal Zone pedal:
 * - Metallic dark gunmetal charcoal grey enclosure with aluminum bevel highlights.
 * - Recessed matte black control deck.
 * - Top CHECK red indicator LED.
 * - 4-Column Control Layout:
 *     1. LEVEL (Single black Boss knob with MIN/MAX dots)
 *     2. EQUALIZER: HIGH (inner dome) & LOW (outer knurled ring) dual-concentric stack
 *     3. EQUALIZER: MIDDLE (inner dome) & MID FREQ (outer knurled ring) dual-concentric stack
 *     4. DIST (Single black Boss knob with MIN/MAX dots)
 * - Authentic silkscreen graphic routing:
 *     * ⊙── HIGH / └─── LOW
 *     * MIDDLE ──⊙ / MID FREQ ──┘
 * - Distinctive orange "← OUTPUT" / "INPUT ←" and "Metal Zone MT-2" typography.
 * - Heavy-duty Boss rubber treadle with embossed BOSS emblem and black knurled thumbscrew at 6 o'clock.
 */
export const BossMt2Pedal: React.FC<PedalProps> = ({
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
  const highVal = instance.parameters['high'] ?? 5;
  const lowVal = instance.parameters['low'] ?? 5;
  const middleVal = instance.parameters['middle'] ?? 5;
  const midFreqVal = instance.parameters['midFreq'] ?? 5;
  const distVal = instance.parameters['dist'] ?? 6;

  const isLeftPending = isJackPending?.(instance.id, 'in') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'out') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'in') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'out') ?? false;

  const formatDb = (v: number) => {
    const db = -15 + (v / 10) * 30;
    return `${db > 0 ? '+' : ''}${db.toFixed(0)} dB`;
  };

  const formatHz = (v: number) => {
    const freq = 200 * Math.pow(25.0, v / 10);
    return freq >= 1000 ? `${(freq / 1000).toFixed(1)}k Hz` : `${Math.round(freq)} Hz`;
  };

  return (
    <div
      className={`pedal-custom-enclosure pedal-boss-mt2 ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
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
          title="Remove Boss MT-2 from board"
        >
          <X size={12} strokeWidth={1.5} />
        </button>
      </div>

      {/* Recessed Control Cavity Deck */}
      <div className="boss-deck boss-deck-mt2">
        {/* CHECK LED top center with white label */}
        <div
          className="boss-check-led-wrap boss-mt2-check-wrap"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title="CHECK LED (Click to toggle bypass)"
        >
          <span className="boss-check-text boss-mt2-white-text">CHECK</span>
          <div className={`boss-check-led ${isEnabled ? 'lit' : 'off'}`} />
        </div>

        {/* Labels row directly above knobs */}
        <div className="boss-mt2-top-labels-row">
          <div className="boss-mt2-top-label-col boss-mt2-lbl-level">LEVEL</div>
          <div className="boss-mt2-top-label-center">EQUALIZER</div>
          <div className="boss-mt2-top-label-col boss-mt2-lbl-dist">DIST</div>
        </div>

        {/* 4 Columns of Knobs */}
        <div className="boss-mt2-knobs-row">
          {/* Column 1: LEVEL */}
          <div className="boss-mt2-knob-col">
            <div className="boss-mt2-dial-wrap">
              <Knob
                label="LEVEL"
                value={levelVal}
                min={0}
                max={10}
                step={0.1}
                size={34}
                variant="boss-black"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'level', v)}
              />
            </div>
            {/* Markings below LEVEL */}
            <div className="boss-mt2-dots-pair">
              <div className="boss-mt2-white-dot" />
              <div className="boss-mt2-white-dot" />
            </div>
            <div className="boss-mt2-minmax-row">
              <span>MIN</span>
              <span>MAX</span>
            </div>
          </div>

          {/* Column 2: EQUALIZER - HIGH (Inner) & LOW (Outer) Dual-Concentric */}
          <div className="boss-mt2-knob-col">
            <div className="boss-mt2-dial-wrap">
              <BossDualConcentricKnob
                innerLabel="HIGH"
                innerValue={highVal}
                onInnerChange={(v) => onChangeParam(instance.id, 'high', v)}
                innerFormat={formatDb}
                outerLabel="LOW"
                outerValue={lowVal}
                onOuterChange={(v) => onChangeParam(instance.id, 'low', v)}
                outerFormat={formatDb}
                size={38}
              />
            </div>
            {/* Markings below HIGH / LOW */}
            <div className="boss-mt2-dots-pair">
              <div className="boss-mt2-white-dot" />
              <div className="boss-mt2-white-dot" />
            </div>
            <div className="boss-mt2-scale-row">
              <span>-15</span>
              <span>+15</span>
            </div>
            {/* Silkscreen diagram: ⊙── HIGH / └─── LOW */}
            <div className="boss-mt2-diagram-col">
              <svg width="42" height="15" viewBox="0 0 42 15" className="boss-mt2-diagram-svg">
                {/* Concentric circle icon representing inner knob */}
                <circle cx="5" cy="4" r="3.2" stroke="#ffffff" strokeWidth="0.8" fill="none" />
                <circle cx="5" cy="4" r="1.3" fill="#ffffff" />
                {/* Line from inner circle to HIGH */}
                <line x1="8.5" y1="4" x2="16" y2="4" stroke="#ffffff" strokeWidth="0.8" />
                <text x="17" y="6.5" fill="#ffffff" fontSize="4.5" fontFamily="'Michroma', sans-serif" fontWeight="700">
                  HIGH
                </text>

                {/* Bracket line pointing to outer ring representing LOW */}
                <path d="M 5 8 L 5 12 L 16 12" stroke="#ffffff" strokeWidth="0.8" fill="none" />
                <text x="17" y="14.5" fill="#ffffff" fontSize="4.5" fontFamily="'Michroma', sans-serif" fontWeight="700">
                  LOW
                </text>
              </svg>
            </div>
          </div>

          {/* Column 3: EQUALIZER - MIDDLE (Inner) & MID FREQ (Outer) Dual-Concentric */}
          <div className="boss-mt2-knob-col">
            <div className="boss-mt2-dial-wrap">
              <BossDualConcentricKnob
                innerLabel="MIDDLE"
                innerValue={middleVal}
                onInnerChange={(v) => onChangeParam(instance.id, 'middle', v)}
                innerFormat={formatDb}
                outerLabel="MID FREQ"
                outerValue={midFreqVal}
                onOuterChange={(v) => onChangeParam(instance.id, 'midFreq', v)}
                outerFormat={formatHz}
                size={38}
              />
            </div>
            {/* Markings below MIDDLE / MID FREQ */}
            <div className="boss-mt2-dots-pair">
              <div className="boss-mt2-white-dot" />
              <div className="boss-mt2-white-dot" />
            </div>
            <div className="boss-mt2-scale-row">
              <span>200</span>
              <span>5k</span>
            </div>
            {/* Silkscreen diagram: MIDDLE ──⊙ / MID FREQ ──┘ */}
            <div className="boss-mt2-diagram-col">
              <svg width="44" height="15" viewBox="0 0 44 15" className="boss-mt2-diagram-svg">
                {/* Text MIDDLE on left */}
                <text x="0" y="6.5" fill="#ffffff" fontSize="4.2" fontFamily="'Michroma', sans-serif" fontWeight="700">
                  MIDDLE
                </text>
                {/* Line to inner circle */}
                <line x1="22" y1="4" x2="33" y2="4" stroke="#ffffff" strokeWidth="0.8" />
                {/* Concentric circle icon */}
                <circle cx="36.5" cy="4" r="3.2" stroke="#ffffff" strokeWidth="0.8" fill="none" />
                <circle cx="36.5" cy="4" r="1.3" fill="#ffffff" />

                {/* Text MID FREQ below */}
                <text x="0" y="14.5" fill="#ffffff" fontSize="4.2" fontFamily="'Michroma', sans-serif" fontWeight="700">
                  MID FREQ
                </text>
                {/* Line going right and bending up to outer ring */}
                <path d="M 27 12 L 36.5 12 L 36.5 8" stroke="#ffffff" strokeWidth="0.8" fill="none" />
              </svg>
            </div>
          </div>

          {/* Column 4: DIST */}
          <div className="boss-mt2-knob-col">
            <div className="boss-mt2-dial-wrap">
              <Knob
                label="DIST"
                value={distVal}
                min={0}
                max={10}
                step={0.1}
                size={34}
                variant="boss-black"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'dist', v)}
              />
            </div>
            {/* Markings below DIST */}
            <div className="boss-mt2-dots-pair">
              <div className="boss-mt2-white-dot" />
              <div className="boss-mt2-white-dot" />
            </div>
            <div className="boss-mt2-minmax-row">
              <span>MIN</span>
              <span>MAX</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Stepped Chassis Section with IO Arrows & Authentic MT-2 Typography */}
      <div className="boss-mid-graphics boss-mt2-mid-graphics">
        <div className="boss-io-arrows boss-mt2-io-arrows">
          <div className="boss-mt2-arrow-tag">
            <span className="boss-mt2-arrow">&larr;</span> OUTPUT
          </div>
          <div className="boss-mt2-arrow-tag">
            INPUT <span className="boss-mt2-arrow">&larr;</span>
          </div>
        </div>
        <div className="boss-mt2-typography">
          <div className="boss-mt2-title">Metal Zone</div>
          <div className="boss-mt2-model">MT-2</div>
        </div>
      </div>

      {/* Iconic Boss Rubber Treadle Footplate with Embossed Logo and Black Knurled Screw */}
      <button
        type="button"
        className={`boss-treadle-plate boss-mt2-treadle ${isEnabled ? 'engaged' : ''}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggleEnabled(instance.id);
        }}
        title="Boss MT-2 Treadle Footswitch (Click to toggle bypass)"
      >
        <div className="boss-rubber-pad boss-mt2-rubber-pad">
          {/* Embossed BOSS Logo with Emblem */}
          <div className="boss-mt2-logo-row">
            <svg width="22" height="22" viewBox="0 0 24 24" className="boss-mt2-emblem-svg">
              <path
                d="M 5 3 L 15 3 C 18 3 20 5 20 8 C 20 10.5 18 12 16 12.5 C 18.5 13 21 15 21 18 C 21 21 18 23 14 23 L 5 23 Z M 9 7 L 9 10 L 14 10 C 15 10 16 9.5 16 8.5 C 16 7.5 15 7 14 7 Z M 9 14 L 9 19 L 14.5 19 C 16 19 17 18 17 16.5 C 17 15 16 14 14.5 14 Z"
                fill="#1b1c20"
                stroke="#090a0c"
                strokeWidth="1.2"
                filter="drop-shadow(0 1px 0 rgba(255,255,255,0.08))"
              />
            </svg>
            <span className="boss-mt2-embossed-text">BOSS</span>
          </div>
        </div>
        {/* Black Knurled Battery Compartment Thumbscrew at 6 o'clock */}
        <div className="boss-thumb-screw boss-mt2-thumbscrew" />
      </button>
    </div>
  );
};
