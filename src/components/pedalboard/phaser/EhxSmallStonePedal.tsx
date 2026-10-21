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

export const EhxSmallStonePedal: React.FC<PedalProps> = ({
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
  const rateVal = instance.parameters['rate'] ?? 3.5;
  const colorVal = instance.parameters['color'] ?? 0;
  const isColorOn = colorVal >= 0.5;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  const toggleColor = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeParam(instance.id, 'color', isColorOn ? 0 : 1);
  };

  return (
    <div
      className={`pedal-custom-enclosure pedal-ehx-small-stone ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* 1/4" Side Phone Jacks (Aligned to standard JACK_Y_OFFSET = 57, top: 46px) */}
      <div
        className={`stompbox-side-jack jack-left ${isLeftPending ? 'is-jack-pending' : ''} ${hasLeftCable ? 'has-cable' : ''}`}
        title="Amp Output Jack - Click to patch cable"
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'out', e);
        }}
      />
      <div
        className={`stompbox-side-jack jack-right ${isRightPending ? 'is-jack-pending' : ''} ${hasRightCable ? 'has-cable' : ''}`}
        title="Audio Input Jack - Click to patch cable"
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'in', e);
        }}
      />

      {/* Top Header Toolstrip with Remove Button */}
      <div className="pedal-top-bar ehx-top-bar">
        <button
          className="pedal-mini-btn pedal-close-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(instance.id);
          }}
          title="Remove pedal from board"
        >
          <X size={11} />
        </button>
      </div>

      {/* 9V Power Polarity Badge */}
      <div className="smallstone-power-badge">
        <span>9V</span>
        <svg viewBox="0 0 40 16" className="ehx-polarity-svg">
          <circle cx="8" cy="8" r="4.5" fill="none" stroke="#1e293b" strokeWidth="1.2" />
          <line x1="5.5" y1="8" x2="10.5" y2="8" stroke="#1e293b" strokeWidth="1.2" />
          <path d="M 12 8 L 22 8" stroke="#1e293b" strokeWidth="1.2" />
          <path d="M 22 4 C 27 4 27 12 22 12" fill="none" stroke="#1e293b" strokeWidth="1.2" />
          <circle cx="32" cy="8" r="4.5" fill="none" stroke="#1e293b" strokeWidth="1.2" />
          <line x1="29.5" y1="8" x2="34.5" y2="8" stroke="#1e293b" strokeWidth="1.2" />
          <line x1="32" y1="5.5" x2="32" y2="10.5" stroke="#1e293b" strokeWidth="1.2" />
        </svg>
      </div>

      {/* Main Inset Faceplate with White Border */}
      <div className="smallstone-faceplate">
        {/* Upper Black Section: Status LED, RATE Knob, COLOR Toggle */}
        <div className="smallstone-black-section">
          <div className="smallstone-upper-row">
            {/* Status Pilot LED */}
            <div
              className="smallstone-status-col"
              onClick={(e) => {
                e.stopPropagation();
                onToggleEnabled(instance.id);
              }}
              title={isEnabled ? 'Active (Click to bypass)' : 'Bypassed (Click to engage)'}
            >
              <div className={`smallstone-led ${isEnabled ? 'lit' : ''}`}>
                <div className="smallstone-led-core" />
              </div>
              <span className="smallstone-lbl status-lbl">STATUS</span>
            </div>

            {/* RATE Knob */}
            <div className="smallstone-rate-col">
              <div className="smallstone-knob-wrap">
                <Knob
                  label=""
                  value={rateVal}
                  min={0}
                  max={10}
                  step={0.1}
                  defaultValue={3.5}
                  onChange={(val) => onChangeParam(instance.id, 'rate', val)}
                  size={46}
                  variant="ehx-pointer"
                  showLabel={false}
                  showValue={false}
                />
              </div>
              <span className="smallstone-lbl rate-lbl">RATE</span>
            </div>
          </div>

          {/* COLOR Mini Toggle Switch */}
          <div
            className="smallstone-color-wrap"
            onClick={toggleColor}
            title={`Color Mode: ${isColorOn ? 'Deep Resonance (Click to switch to Warm)' : 'Warm Vintage (Click to switch to Deep)'}`}
          >
            <span className="smallstone-lbl color-lbl">COLOR</span>
            <div className="smallstone-toggle-housing">
              <div className={`smallstone-toggle-bat ${isColorOn ? 'up' : 'down'}`} />
            </div>
          </div>
        </div>

        {/* Lower Orange Section: SMALL STONE typography & Footswitch */}
        <div className="smallstone-orange-section">
          {/* Side Border Jack Labels */}
          <span className="smallstone-side-lbl lbl-amp">AMP</span>
          <span className="smallstone-side-lbl lbl-input">INPUT</span>

          {/* Sliced Typography: SMALL STONE */}
          <div className="smallstone-title-wrap">
            <svg viewBox="0 0 160 54" className="smallstone-title-svg" preserveAspectRatio="xMidYMid meet">
              <defs>
                <mask id="smallstone-mask">
                  <rect x="0" y="0" width="160" height="54" fill="#ffffff" />
                  <line x1="0" y1="12" x2="160" y2="12" stroke="#000000" strokeWidth="1.2" />
                  <line x1="0" y1="23" x2="160" y2="23" stroke="#000000" strokeWidth="1.2" />
                  <line x1="0" y1="39" x2="160" y2="39" stroke="#000000" strokeWidth="1.2" />
                  <line x1="0" y1="49" x2="160" y2="49" stroke="#000000" strokeWidth="1.2" />
                </mask>
              </defs>
              <g mask="url(#smallstone-mask)" fill="#ffffff">
                <text
                  x="80"
                  y="24"
                  textAnchor="middle"
                  className="smallstone-svg-text"
                  letterSpacing="0.5"
                >
                  SMALL
                </text>
                <text
                  x="80"
                  y="50"
                  textAnchor="middle"
                  className="smallstone-svg-text"
                  letterSpacing="0.5"
                >
                  STONE
                </text>
              </g>
            </svg>
            <span className="smallstone-sub-title">EH4800 PHASE SHIFTER</span>
          </div>

          {/* Chrome Stomp Switch */}
          <div className="smallstone-stomp-wrap">
            <ClassicStompSwitch
              isEnabled={isEnabled}
              onToggle={() => onToggleEnabled(instance.id)}
              size={46}
            />
          </div>
        </div>
      </div>

      {/* Bottom Aluminum Chassis Brand: [ H | nano ] & MADE IN NYC, USA */}
      <div className="smallstone-footer">
        <div className="ehx-nano-badge">
          <span className="badge-h">H</span>
          <span className="badge-nano">nano</span>
        </div>
        <span className="smallstone-origin">MADE IN NYC, USA</span>
      </div>
    </div>
  );
};
