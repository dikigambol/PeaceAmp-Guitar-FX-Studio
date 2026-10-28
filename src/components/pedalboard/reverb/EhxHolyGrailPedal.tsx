import React from 'react';
import type { PedalInstance, PedalMetadata } from '../../../types/pedal';
import { Knob } from '../../common/Knob';
import { ClassicStompSwitch } from '../../common/ClassicStompSwitch';
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

const MODES = ['SPRING', 'HALL', 'FLERB'];

export const EhxHolyGrailPedal: React.FC<PedalProps> = ({
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
  const reverbVal = instance.parameters['reverb'] ?? 4.5;
  const modeVal = instance.parameters['mode'] ?? 0;
  const currentModeIdx = Math.max(0, Math.min(2, Math.round(modeVal)));

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  const cycleMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMode = (currentModeIdx + 1) % 3;
    onChangeParam(instance.id, 'mode', nextMode);
  };

  return (
    <div
      className={`pedal-custom-enclosure pedal-holy-grail ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* 1/4" Side Phone Jacks (Aligned with JACK_Y_OFFSET = 57, top: 46px) */}
      <div
        className={`stompbox-side-jack jack-left ${isLeftPending ? 'is-jack-pending' : ''} ${hasLeftCable ? 'has-cable' : ''}`}
        title="Amp Output Jack - Click to patch cable"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'out', e);
        }}
      />
      <div
        className={`stompbox-side-jack jack-right ${isRightPending ? 'is-jack-pending' : ''} ${hasRightCable ? 'has-cable' : ''}`}
        title="Guitar Input Jack - Click to patch cable"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'in', e);
        }}
      />

      {/* Top Header Toolstrip with Close Button (Floating in top-right) */}
      <div className="pedal-top-bar holy-grail-top-bar">
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

      {/* Main Faceplate Container */}
      <div className="holy-grail-faceplate">
        {/* Full-bleed SVG Border with mathematically clean gaps for AMP & INPUT */}
        <svg className="holy-grail-frame-svg" viewBox="0 0 186 330" preserveAspectRatio="none">
          {/* Top Frame Path (from y=145 up, around top, down to y=145) */}
          <path
            d="M 1.5,145 L 1.5,10 Q 1.5,1.5 10,1.5 L 176,1.5 Q 184.5,1.5 184.5,10 L 184.5,145"
            fill="none"
            stroke="#00aeef"
            strokeWidth="2.5"
          />
          {/* Bottom Frame Path (from y=187 down, around bottom, up to y=187) */}
          <path
            d="M 184.5,187 L 184.5,320 Q 184.5,328.5 176,328.5 L 10,328.5 Q 1.5,328.5 1.5,320 L 1.5,187"
            fill="none"
            stroke="#00aeef"
            strokeWidth="2.5"
          />
          {/* Vertical AMP text cleanly seated in the left frame gap */}
          <text
            x="6.5"
            y="166"
            textAnchor="middle"
            transform="rotate(-90 6.5 166)"
            fontFamily="var(--font-ui), sans-serif"
            fontSize="8.5"
            fontWeight="900"
            fill="#090c10"
            letterSpacing="0.8"
          >
            AMP
          </text>
          {/* Vertical INPUT text cleanly seated in the right frame gap */}
          <text
            x="179.5"
            y="166"
            textAnchor="middle"
            transform="rotate(90 179.5 166)"
            fontFamily="var(--font-ui), sans-serif"
            fontSize="8.5"
            fontWeight="900"
            fill="#090c10"
            letterSpacing="0.8"
          >
            INPUT
          </text>
        </svg>

        {/* Content Container (Tightly formatted inside the SVG border) */}
        <div className="holy-grail-inner-content">
          {/* Top Center: 9V DC Jack Indicator */}
          <div className="holy-grail-power-label">
            <span>9VDC</span>
            <span className="power-polarity-icon">⊕-C-⊝</span>
          </div>

          {/* Upper Controls Row: Symmetrical 2-Column Balance Between Toggle & Knob */}
          <div className="holy-grail-controls-row">
            {/* Left Column: 3-Position Mode Toggle Switch (SPRING, HALL, FLERB) */}
            <div className="holy-grail-toggle-box">
              <span className={`toggle-txt toggle-txt-top ${currentModeIdx === 0 ? 'active' : ''}`}>
                SPRING
              </span>
              <div className="toggle-switch-middle">
                <div
                  className="vintage-toggle-switch"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={cycleMode}
                  title={`Mode: ${MODES[currentModeIdx]} (Click to toggle)`}
                >
                  <div className="toggle-hex-nut">
                    <div className="toggle-bushing">
                      <div className={`toggle-bat pos-${currentModeIdx}`} />
                    </div>
                  </div>
                </div>
                <span className={`toggle-txt toggle-txt-side ${currentModeIdx === 1 ? 'active' : ''}`}>
                  HALL
                </span>
              </div>
              <span className={`toggle-txt toggle-txt-bottom ${currentModeIdx === 2 ? 'active' : ''}`}>
                FLERB
              </span>
            </div>

            {/* Right Column: Large Reverb Knob */}
            <div className="holy-grail-knob-box">
              <Knob
                label="REVERB"
                value={reverbVal}
                min={0}
                max={10}
                step={0.1}
                size={50}
                variant="ehx-pointer"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'reverb', v)}
              />
              <span className="holy-grail-knob-caption">REVERB</span>
            </div>
          </div>

          {/* Center Deck: Symmetrically Centered Precision Round LED & Clean 2-Tier Logo */}
          <div className="holy-grail-center-deck">
            {/* Red Jewel Dome LED (Mathematically Centered in Bezel) */}
            <div
              className={`holy-grail-bezel-led ${isEnabled ? 'lit' : 'off'}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleEnabled(instance.id);
              }}
              title="Status LED (Click to toggle bypass)"
            >
              <div className="holy-grail-led-lens" />
            </div>

            {/* Clean 2-Tier Stacked 3D Title (UFO Rings Removed) */}
            <div className="holy-grail-logo-wrap">
              <svg viewBox="0 0 176 72" className="holy-grail-svg-art">
                {/* Line 1: HOLY (Centered) */}
                <text
                  x="88"
                  y="29"
                  textAnchor="middle"
                  fontFamily="'Arial Black', Impact, sans-serif"
                  fontSize="26"
                  fontWeight="900"
                  fill="#00aeef"
                  stroke="#090c10"
                  strokeWidth="3.2"
                  paintOrder="stroke fill"
                  letterSpacing="3"
                >
                  HOLY
                </text>
                {/* Line 2: GRAIL (Centered, Directly Below) */}
                <text
                  x="88"
                  y="63"
                  textAnchor="middle"
                  fontFamily="'Arial Black', Impact, sans-serif"
                  fontSize="26"
                  fontWeight="900"
                  fill="#00aeef"
                  stroke="#090c10"
                  strokeWidth="3.2"
                  paintOrder="stroke fill"
                  letterSpacing="3"
                >
                  GRAIL
                </text>
              </svg>
            </div>
          </div>

          {/* Lower Deck: Symmetrically Centered 3PDT Switch & Footer Brand */}
          <div className="holy-grail-lower-deck">
            <div className="holy-grail-stomp-wrap">
              <ClassicStompSwitch
                isEnabled={isEnabled}
                onToggle={() => onToggleEnabled(instance.id)}
                size={48}
              />
            </div>

            <div className="holy-grail-footer-brand">
              <span className="ehx-brand-name">electro-harmonix</span>
              <span className="ehx-brand-city">NEW YORK CITY, USA</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

