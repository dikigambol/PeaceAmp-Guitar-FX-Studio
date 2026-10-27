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

const SHIFT_ITEMS = [
  { id: 0, label: 'D', isOctave: false },
  { id: 1, label: 'm2', isOctave: false },
  { id: 2, label: 'M2', isOctave: false },
  { id: 3, label: 'M3', isOctave: false },
  { id: 4, label: 'P4', isOctave: false },
  { id: 5, label: 'P5', isOctave: false },
  { id: 6, label: 'M6', isOctave: false },
  { id: 7, label: 'm7', isOctave: false },
  { id: 8, label: '1', isOctave: true },
  { id: 9, label: '2', isOctave: true },
  { id: 10, label: '3', isOctave: true },
];

const DIAL_CENTER = 38;
const DIAL_RADIUS = 28.5;

export const EhxPitchForkPedal: React.FC<PedalProps> = ({
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
  const blendVal = instance.parameters['blend'] ?? 5.0;
  const shiftVal = Math.max(0, Math.min(10, Math.round(instance.parameters['shift'] ?? 8.0)));
  const directionVal = Math.max(0, Math.min(2, Math.round(instance.parameters['direction'] ?? 0.0)));
  const latchVal = (instance.parameters['latch'] ?? 1.0) >= 0.5;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  const toggleDirection = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Cycle: 0 (UP) -> 1 (DUAL) -> 2 (DOWN) -> 0
    const next = (directionVal + 1) % 3;
    onChangeParam(instance.id, 'direction', next);
  };

  const toggleLatch = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeParam(instance.id, 'latch', latchVal ? 0 : 1);
  };

  return (
    <div
      className={`pedal-custom-enclosure pedal-ehx-pitchfork ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
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
      <div className="pitchfork-top-bar">
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

      {/* Main Enclosure Faceplate */}
      <div className="pitchfork-faceplate">
        {/* Silver Upper Control Zone */}
        <div className="pitchfork-silver-top">
          {/* Top power jack marking */}
          <div className="pitchfork-power-label">9V ⊝-⊞+</div>

          {/* Knobs Row */}
          <div className="pitchfork-knobs-row">
            {/* BLEND Knob */}
            <div className="pitchfork-knob-col">
              <div className="pitchfork-blend-wrap">
                <Knob
                  label="BLEND"
                  value={blendVal}
                  min={0}
                  max={10}
                  step={0.1}
                  size={40}
                  variant="ehx-pointer"
                  showLabel={false}
                  showValue={false}
                  onChange={(v) => onChangeParam(instance.id, 'blend', v)}
                />
              </div>
              <span className="pitchfork-knob-name">BLEND</span>
            </div>

            {/* SHIFT Knob with Mathematical 11-position Radial Dial */}
            <div className="pitchfork-knob-col">
              <div className="pitchfork-shift-dial-wrap">
                {/* 11 Position Arc Labels Collinear with Knob Pointer Angle */}
                <div className="pitchfork-dial-labels">
                  {SHIFT_ITEMS.map((item) => {
                    const angleDeg = -135 + item.id * 27;
                    const rad = (angleDeg * Math.PI) / 180;
                    const posX = (DIAL_CENTER + DIAL_RADIUS * Math.sin(rad)).toFixed(1);
                    const posY = (DIAL_CENTER - DIAL_RADIUS * Math.cos(rad)).toFixed(1);
                    const isActive = shiftVal === item.id;
                    return (
                      <span
                        key={item.label}
                        className={`dial-pos ${item.isOctave ? 'is-octave' : ''} ${isActive ? 'active' : ''}`}
                        style={{ left: `${posX}px`, top: `${posY}px` }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onChangeParam(instance.id, 'shift', item.id);
                        }}
                        title={`Shift interval: ${item.label}`}
                      >
                        {item.label}
                      </span>
                    );
                  })}
                </div>
                <Knob
                  label="SHIFT"
                  value={shiftVal}
                  min={0}
                  max={10}
                  step={1}
                  size={40}
                  variant="ehx-pointer"
                  showLabel={false}
                  showValue={false}
                  onChange={(v) => onChangeParam(instance.id, 'shift', v)}
                />
              </div>
              <span className="pitchfork-knob-name">SHIFT</span>
            </div>
          </div>

          {/* Center 3-way Toggle Switch (UP / DUAL / DOWN) */}
          <div
            className="pitchfork-toggle-wrap"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={toggleDirection}
            title="Toggle Shift Direction: UP (▲) / DUAL / DOWN (▼)"
          >
            <div className="pitchfork-toggle-labels">
              <span className={`toggle-lbl up ${directionVal === 0 ? 'active' : ''}`}>▲</span>
              <span className={`toggle-lbl dual ${directionVal === 1 ? 'active' : ''}`}>DUAL</span>
              <span className={`toggle-lbl down ${directionVal === 2 ? 'active' : ''}`}>▼</span>
            </div>
            <div className={`pitchfork-mini-toggle pos-${directionVal === 0 ? 'up' : directionVal === 1 ? 'mid' : 'down'}`}>
              <div className="toggle-bat" />
            </div>
          </div>

          {/* Latch Section: Text on the left, Button with centered symmetric LED on the right */}
          <div
            className="pitchfork-latch-wrap"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={toggleLatch}
            title={`Click to switch between LATCH and MOMENTARY mode (Current: ${latchVal ? 'LATCH' : 'MOMENTARY'})`}
          >
            <span className="pitchfork-latch-text">LATCH</span>
            <div className={`pitchfork-latch-btn ${latchVal ? 'is-latched' : ''}`}>
              <div className={`pitchfork-latch-led ${latchVal ? 'lit' : 'off'}`} title={latchVal ? 'Latch Mode Active' : 'Momentary Mode Active'} />
            </div>
          </div>
        </div>

        {/* Black Lower Action Zone */}
        <div className="pitchfork-black-bottom">
          {/* Side Jack Markings */}
          <span className="pf-side-lbl lbl-output">OUTPUT</span>
          <span className="pf-side-lbl lbl-input">INPUT</span>

          {/* Centered PITCH FORK Big Typography */}
          <div className="pitchfork-branding">
            <h1 className="pf-title-pitch">PITCH</h1>
            <h1 className="pf-title-fork">FORK</h1>
          </div>

          {/* Status LED & Stomp Footswitch */}
          <div className="pitchfork-stomp-row">
            {/* Red Check LED */}
            <div
              className={`pitchfork-status-led ${isEnabled ? 'lit' : 'off'}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleEnabled(instance.id);
              }}
              title="Status LED (Click to toggle bypass)"
            />

            {/* Heavy Duty Stomp Switch */}
            <div className="pitchfork-switch-center">
              <ClassicStompSwitch
                isEnabled={isEnabled}
                onToggle={() => onToggleEnabled(instance.id)}
                size={46}
              />
            </div>
          </div>

          {/* Bottom electro-harmonix script */}
          <div className="pitchfork-footer-brand">
            <span className="ehx-script-logo">electro-harmonix</span>
          </div>
        </div>
      </div>
    </div>
  );
};
