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

export const EhxSmallClonePedal: React.FC<PedalProps> = ({
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
  const rateVal = instance.parameters['rate'] ?? 4.0;
  const depthVal = instance.parameters['depth'] ?? 1.0;
  const isDeep = depthVal >= 0.5;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  const rateHzFormatted = `${(0.5 + Math.pow(rateVal / 10, 1.7) * 5.8).toFixed(2)} Hz`;

  const toggleDepth = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeParam(instance.id, 'depth', isDeep ? 0 : 1);
  };

  // 11 ticks spanning the 270° knob sweep from -135° to +135° (values 0 to 10 in 27° steps)
  const dialTicks = [-135, -108, -81, -54, -27, 0, 27, 54, 81, 108, 135];

  return (
    <div
      className={`pedal-custom-enclosure pedal-small-clone ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
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

      {/* Top Header Toolstrip with Remove Button */}
      <div className="small-clone-top-bar">
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
      <div className="small-clone-faceplate">
        {/* SECTION 1: TOP CONTROL AREA */}
        <div className="small-clone-top-control">
          {/* Top Chassis Label Strip: OUTPUT (left), 9V (center), INPUT (right) */}
          <div className="small-clone-io-labels">
            <span className="io-lbl io-output">OUTPUT</span>
            <span className="io-lbl io-power">9V</span>
            <span className="io-lbl io-input">INPUT</span>
          </div>

          {/* Controls Row: DEPTH Switch (left), RATE Knob (center), STATUS LED (right) */}
          <div className="small-clone-controls-row">
            {/* DEPTH Slide Switch Column */}
            <div
              className="small-clone-depth-col"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="ehx-bracket-screw top-bracket-screw" />
              <div
                className={`small-clone-switch-slot ${isDeep ? 'switch-up' : 'switch-down'}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={toggleDepth}
                title={`DEPTH Switch: ${isDeep ? 'UP (DEEP)' : 'DOWN (SUBTLE)'}`}
              >
                <div className="small-clone-switch-bat">
                  <div className="switch-grooves" />
                </div>
              </div>
              <div className="ehx-bracket-screw bot-bracket-screw" />
            </div>

            {/* RATE Knob Column with 11 Radial Graduations */}
            <div className="small-clone-rate-col">
              <div className="small-clone-radial-dials">
                {dialTicks.map((angle) => (
                  <div
                    key={angle}
                    className="radial-tick"
                    style={{ transform: `rotate(${angle}deg) translateY(-31px)` }}
                  />
                ))}
                <Knob
                  label="RATE"
                  value={rateVal}
                  min={0}
                  max={10}
                  step={0.1}
                  defaultValue={4.0}
                  formatValue={() => rateHzFormatted}
                  onChange={(val) => onChangeParam(instance.id, 'rate', val)}
                  variant="bigmuff"
                  size={50}
                  showLabel={false}
                  showValue={false}
                />
              </div>
            </div>

            {/* STATUS LED Column */}
            <div
              className="small-clone-status-col"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleEnabled(instance.id);
              }}
              title="STATUS LED (Click to toggle bypass)"
            >
              <div className="small-clone-led-bezel">
                <div className={`small-clone-led ${isEnabled ? 'lit' : 'off'}`} />
              </div>
            </div>
          </div>

          {/* Shared Labels Row: Exactly centered under each respective control and aligned on one baseline */}
          <div className="small-clone-labels-row">
            <span
              className="control-name lbl-depth"
              style={{ cursor: 'pointer' }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={toggleDepth}
              title={`Toggle DEPTH: ${isDeep ? 'Switch to SUBTLE' : 'Switch to DEEP'}`}
            >
              DEPTH
            </span>
            <span className="control-name lbl-rate">RATE</span>
            <span className="control-name lbl-status">STATUS</span>
          </div>
        </div>

        {/* Horizontal Groove Divider */}
        <div className="small-clone-divider-groove" />

        {/* SECTION 2: MIDDLE RECESSED PANEL WITH PURPLE BADGE & FOOTSWITCH */}
        <div className="small-clone-middle-section">
          {/* Indigo Purple Badge with rounded corners */}
          <div className="small-clone-purple-badge">
            {/* Bold Stylized Typography */}
            <div className="small-clone-titles">
              <span className="title-small">SMALL</span>
              <span className="title-clone">CLONE</span>
              <span className="title-sub">EH 4600 FULL-CHORUS</span>
            </div>

            {/* Centered Classic Heavy-Duty Stomp Switch (Identical to Klon Centaur) */}
            <div className="small-clone-footswitch-block">
              <ClassicStompSwitch
                isEnabled={isEnabled}
                onToggle={() => onToggleEnabled(instance.id)}
                title="Toggle Small Clone Bypass"
                idPrefix="small-clone"
                size={44}
              />
            </div>
          </div>
        </div>

        {/* Horizontal Groove Divider */}
        <div className="small-clone-divider-groove" />

        {/* SECTION 3: BOTTOM BRANDING (Black Panel with Brushed Steel Bottom Border) */}
        <div className="small-clone-footer-brand">
          <div className="ehx-brand-row">
            <span className="ehx-brand-name">ELECTRO</span>
            <div className="ehx-brand-logo-box">
              <span className="ehx-plug-crest">E</span>
            </div>
            <span className="ehx-brand-name">HARMONIX</span>
          </div>
          <span className="ehx-origin-usa">USA</span>
        </div>
      </div>
    </div>
  );
};
