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
 * Ibanez SM7 Smash Box (Tone-Lok Series, 2000)
 * 
 * Authentic visual replica of the legendary 2000s nu-metal distortion pedal:
 * - Cast-metal hammerite pebble-finish silver-grey Tone-Lok enclosure.
 * - 4 Tone-Lok Push-Lok dials: DRIVE, LO, HI, LEVEL with radial graduation ticks and LO/HI EQ bracket.
 * - 2 authentic slide switches:
 *     * VOID (3-position noise gate: OFF, 1, 2)
 *     * EDGE (2-position voicing: SHARP, SMOOTH)
 * - Center red status LED.
 * - Iconic neon green acrylic SM7 badge + bold "SMASH BOX" typography.
 * - Heavy beveled metal foot treadle with 4 angled corner pads and embossed Ibanez script logo.
 */
export const IbanezSm7Pedal: React.FC<PedalProps> = ({
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
  const driveVal = instance.parameters['drive'] ?? 6;
  const loVal = instance.parameters['lo'] ?? 5;
  const hiVal = instance.parameters['hi'] ?? 5;
  const levelVal = instance.parameters['level'] ?? 5;
  const voidVal = instance.parameters['void'] ?? 1; // 0 = OFF, 1 = VOID 1, 2 = VOID 2
  const edgeVal = instance.parameters['edge'] ?? 0; // 0 = SHARP, 1 = SMOOTH

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-ibanez-sm7 ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
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

      {/* Top Header with Close Button and DC Spec Print */}
      <div className="pedal-top-bar sm7-top-bar">
        <div className="sm7-dc-spec">
          <span>+ - (·) - DC9V 14mA</span>
        </div>
        <button
          type="button"
          className="pedal-mini-btn pedal-close-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(instance.id);
          }}
          title="Remove Ibanez SM7 from board"
        >
          <X size={12} strokeWidth={1.5} />
        </button>
      </div>

      {/* Upper Control Deck (Recessed Housing) */}
      <div className="sm7-control-deck">
        {/* 4 Tone-Lok Knobs Row */}
        <div className="sm7-knobs-row">
          {/* Knob 1: DRIVE */}
          <div className="sm7-knob-col">
            <div className="sm7-dial-outer-wrap">
              {/* Radial Tick Graduation Marks */}
              <svg viewBox="0 0 54 54" className="sm7-radial-ticks-svg">
                {Array.from({ length: 7 }).map((_, i) => {
                  const deg = -135 + i * 45;
                  const rad = (deg * Math.PI) / 180;
                  const x1 = 27 + 21 * Math.sin(rad);
                  const y1 = 27 - 21 * Math.cos(rad);
                  const x2 = 27 + 25 * Math.sin(rad);
                  const y2 = 27 - 25 * Math.cos(rad);
                  return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3b4249" strokeWidth="1.2" />;
                })}
              </svg>
              <Knob
                label="DRIVE"
                value={driveVal}
                min={0}
                max={10}
                step={0.1}
                size={34}
                variant="ibanez-tonelok"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'drive', v)}
              />
            </div>
            <div className="sm7-scale-labels">
              <span>0</span>
              <span>10</span>
            </div>
            <span className="sm7-knob-title">DRIVE</span>
          </div>

          {/* Knob 2: LO */}
          <div className="sm7-knob-col">
            <div className="sm7-dial-outer-wrap">
              <svg viewBox="0 0 54 54" className="sm7-radial-ticks-svg">
                {Array.from({ length: 7 }).map((_, i) => {
                  const deg = -135 + i * 45;
                  const rad = (deg * Math.PI) / 180;
                  const x1 = 27 + 21 * Math.sin(rad);
                  const y1 = 27 - 21 * Math.cos(rad);
                  const x2 = 27 + 25 * Math.sin(rad);
                  const y2 = 27 - 25 * Math.cos(rad);
                  return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3b4249" strokeWidth="1.2" />;
                })}
              </svg>
              <Knob
                label="LO"
                value={loVal}
                min={0}
                max={10}
                step={0.1}
                size={34}
                variant="ibanez-tonelok"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'lo', v)}
              />
            </div>
            <div className="sm7-scale-labels">
              <span>0</span>
              <span>10</span>
            </div>
            <span className="sm7-knob-title">LO</span>
          </div>

          {/* Knob 3: HI */}
          <div className="sm7-knob-col">
            <div className="sm7-dial-outer-wrap">
              <svg viewBox="0 0 54 54" className="sm7-radial-ticks-svg">
                {Array.from({ length: 7 }).map((_, i) => {
                  const deg = -135 + i * 45;
                  const rad = (deg * Math.PI) / 180;
                  const x1 = 27 + 21 * Math.sin(rad);
                  const y1 = 27 - 21 * Math.cos(rad);
                  const x2 = 27 + 25 * Math.sin(rad);
                  const y2 = 27 - 25 * Math.cos(rad);
                  return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3b4249" strokeWidth="1.2" />;
                })}
              </svg>
              <Knob
                label="HI"
                value={hiVal}
                min={0}
                max={10}
                step={0.1}
                size={34}
                variant="ibanez-tonelok"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'hi', v)}
              />
            </div>
            <div className="sm7-scale-labels">
              <span>0</span>
              <span>10</span>
            </div>
            <span className="sm7-knob-title">HI</span>
          </div>

          {/* Knob 4: LEVEL */}
          <div className="sm7-knob-col">
            <div className="sm7-dial-outer-wrap">
              <svg viewBox="0 0 54 54" className="sm7-radial-ticks-svg">
                {Array.from({ length: 7 }).map((_, i) => {
                  const deg = -135 + i * 45;
                  const rad = (deg * Math.PI) / 180;
                  const x1 = 27 + 21 * Math.sin(rad);
                  const y1 = 27 - 21 * Math.cos(rad);
                  const x2 = 27 + 25 * Math.sin(rad);
                  const y2 = 27 - 25 * Math.cos(rad);
                  return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3b4249" strokeWidth="1.2" />;
                })}
              </svg>
              <Knob
                label="LEVEL"
                value={levelVal}
                min={0}
                max={10}
                step={0.1}
                size={34}
                variant="ibanez-tonelok"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'level', v)}
              />
            </div>
            <div className="sm7-scale-labels">
              <span>0</span>
              <span>10</span>
            </div>
            <span className="sm7-knob-title">LEVEL</span>
          </div>
        </div>

        {/* EQ connecting bracket linking LO and HI */}
        <div className="sm7-eq-bracket-container">
          <div className="sm7-eq-bracket-line">
            <span className="sm7-eq-bracket-text">EQ</span>
          </div>
        </div>

        {/* Lower Row: VOID Switch (Left) - LED (Center) - EDGE Switch (Right) */}
        <div className="sm7-switches-row">
          {/* VOID Slide Switch (3-position: OFF, 1, 2) */}
          <div
            className="sm7-switch-col"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="sm7-switch-positions">
              <span
                className={`sm7-pos-lbl ${voidVal === 0 ? 'active' : ''}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeParam(instance.id, 'void', 0);
                }}
                title="VOID OFF (Noise gate bypassed)"
              >
                OFF
              </span>
              <span
                className={`sm7-pos-lbl ${voidVal === 1 ? 'active' : ''}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeParam(instance.id, 'void', 1);
                }}
                title="VOID 1 (Soft gate for rhythm & lead sustain)"
              >
                1
              </span>
              <span
                className={`sm7-pos-lbl ${voidVal === 2 ? 'active' : ''}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeParam(instance.id, 'void', 2);
                }}
                title="VOID 2 (Hard gate for tight staccato chugging)"
              >
                2
              </span>
            </div>
            <div
              className="sm7-dots-indicator-row sm7-void-dots"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div
                className={`sm7-dot ${voidVal === 0 ? 'lit' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeParam(instance.id, 'void', 0);
                }}
              />
              <div
                className={`sm7-dot ${voidVal === 1 ? 'lit' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeParam(instance.id, 'void', 1);
                }}
              />
              <div
                className={`sm7-dot ${voidVal === 2 ? 'lit' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeParam(instance.id, 'void', 2);
                }}
              />
            </div>
            {/* Slide Track */}
            <div
              className="sm7-slider-slot"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                const nextVal = (voidVal + 1) % 3;
                onChangeParam(instance.id, 'void', nextVal);
              }}
              title="VOID Noise Gate (Click to cycle: OFF -> 1 -> 2)"
            >
              <div
                className="sm7-slider-handle"
                style={{
                  left: voidVal === 0 ? '2px' : voidVal === 1 ? '16px' : '30px',
                }}
              >
                <div className="sm7-slider-grooves" />
              </div>
            </div>
            <span
              className="sm7-switch-label"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                const nextVal = (voidVal + 1) % 3;
                onChangeParam(instance.id, 'void', nextVal);
              }}
            >
              VOID
            </span>
          </div>

          {/* Center LED Indicator (Horizontally Centered) */}
          <div
            className="sm7-led-wrap"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleEnabled(instance.id);
            }}
            title="SM7 Status LED (Click to toggle bypass)"
          >
            <div className={`sm7-led ${isEnabled ? 'lit' : 'off'}`} />
          </div>

          {/* EDGE Slide Switch (2-position: SHARP, SMOOTH) */}
          <div
            className="sm7-switch-col"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="sm7-switch-positions sm7-edge-positions">
              <span
                className={`sm7-pos-lbl ${edgeVal === 0 ? 'active' : ''}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeParam(instance.id, 'edge', 0);
                }}
                title="EDGE SHARP (Aggressive high bite)"
              >
                SHARP
              </span>
              <span
                className={`sm7-pos-lbl ${edgeVal === 1 ? 'active' : ''}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeParam(instance.id, 'edge', 1);
                }}
                title="EDGE SMOOTH (Warm high-cut scoop)"
              >
                SMOOTH
              </span>
            </div>
            <div
              className="sm7-dots-indicator-row sm7-edge-dots"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div
                className={`sm7-dot ${edgeVal === 0 ? 'lit' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeParam(instance.id, 'edge', 0);
                }}
              />
              <div
                className={`sm7-dot ${edgeVal === 1 ? 'lit' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeParam(instance.id, 'edge', 1);
                }}
              />
            </div>
            {/* Slide Track */}
            <div
              className="sm7-slider-slot sm7-slider-slot-2pos"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                const nextVal = edgeVal === 0 ? 1 : 0;
                onChangeParam(instance.id, 'edge', nextVal);
              }}
              title="EDGE Voicing Filter (Click to toggle: SHARP <-> SMOOTH)"
            >
              <div
                className="sm7-slider-handle"
                style={{
                  left: edgeVal === 0 ? '2px' : '22px',
                }}
              >
                <div className="sm7-slider-grooves" />
              </div>
            </div>
            <span
              className="sm7-switch-label"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                const nextVal = edgeVal === 0 ? 1 : 0;
                onChangeParam(instance.id, 'edge', nextVal);
              }}
            >
              EDGE
            </span>
          </div>
        </div>
      </div>

      {/* Middle Stepped Chassis Section with IO Arrows & Neon Acrylic SM7 Badge */}
      <div className="sm7-mid-graphics">
        <div className="sm7-io-arrows">
          <span className="sm7-io-out">&#9664;OUT</span>
          <span className="sm7-io-in">IN&#9664;</span>
        </div>
        <div className="sm7-branding-row">
          {/* Glowing Green Acrylic SM7 Badge */}
          <div className="sm7-acrylic-badge">
            <span className="sm7-badge-text">SM7</span>
          </div>
          {/* Heavy Sans-Serif "SMASH BOX" Title */}
          <div className="sm7-title-text">SMASH BOX</div>
        </div>
      </div>

      {/* Heavy Beveled Tone-Lok Treadle Footswitch with Embossed Ibanez Logo */}
      <button
        type="button"
        className={`sm7-treadle-plate ${isEnabled ? 'engaged' : ''}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggleEnabled(instance.id);
        }}
        title="Ibanez SM7 Treadle Footswitch (Click to toggle bypass)"
      >
        <div className="sm7-treadle-face">
          {/* 4 Angled Corner Pads / Indentations */}
          <div className="sm7-corner-pad pad-top-left" />
          <div className="sm7-corner-pad pad-top-right" />
          <div className="sm7-corner-pad pad-bot-left" />
          <div className="sm7-corner-pad pad-bot-right" />

          {/* Deep Embossed Ibanez Script Logo */}
          <div className="sm7-ibanez-logo-wrap">
            <svg viewBox="0 0 160 48" className="sm7-ibanez-logo-svg">
              <defs>
                <filter id="sm7-emboss-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#ffffff" floodOpacity="0.35" />
                  <feDropShadow dx="0" dy="-1.5" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.8" />
                </filter>
              </defs>
              <text
                x="50%"
                y="36"
                textAnchor="middle"
                fontFamily="'Times New Roman', serif"
                fontStyle="italic"
                fontWeight="900"
                fontSize="42"
                letterSpacing="1"
                fill="#6e787d"
                stroke="#474f53"
                strokeWidth="1.2"
                filter="url(#sm7-emboss-shadow)"
              >
                Ibanez
              </text>
            </svg>
          </div>
        </div>
        {/* Bottom Hinge Slot */}
        <div className="sm7-bottom-hinge-slot" />
      </button>
    </div>
  );
};
