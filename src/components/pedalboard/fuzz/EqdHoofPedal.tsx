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

export const EqdHoofPedal: React.FC<PedalProps> = ({
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
  const shiftVal = instance.parameters['shift'] ?? 5;
  const toneVal = instance.parameters['tone'] ?? 5;
  const levelVal = instance.parameters['level'] ?? 5;
  const fuzzVal = instance.parameters['fuzz'] ?? 6;

  const isLeftPending = isJackPending?.(instance.id, 'in') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'out') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'in') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'out') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-eqd-hoof ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* 1/4" Side Phone Jacks for Patching */}
      <div
        className={`stompbox-side-jack jack-left ${isLeftPending ? 'is-jack-pending' : ''} ${hasLeftCable ? 'has-cable' : ''}`}
        title="Audio Input Jack - Click to patch cable"
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'in', e);
        }}
      />
      <div
        className={`stompbox-side-jack jack-right ${isRightPending ? 'is-jack-pending' : ''} ${hasRightCable ? 'has-cable' : ''}`}
        title="Audio Output Jack - Click to patch cable"
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'out', e);
        }}
      />

      {/* Top Header Toolstrip */}
      <div className="pedal-top-bar">
        <button
          className="pedal-mini-btn pedal-close-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(instance.id);
          }}
          title="Remove Pedal"
        >
          <X size={11} />
        </button>
      </div>

      {/* Gold & Black Enclosure Faceplate */}
      <div className="hoof-faceplate">
        {/* Top 9V marking */}
        <div className="hoof-power-mark">9V</div>

        {/* 2x2 Knobs Field in Dark Shield */}
        <div className="hoof-knobs-shield">
          {/* Top Row: Shift (left), Tone (right) */}
          <div className="hoof-knobs-row">
            <div className="hoof-knob-col">
              <Knob
                label=""
                value={shiftVal}
                min={0}
                max={10}
                step={0.1}
                size={46}
                variant="keeley"
                onChange={(val) => onChangeParam(instance.id, 'shift', val)}
              />
              <span className="hoof-knob-lbl">Shift</span>
            </div>

            <div className="hoof-knob-col">
              <Knob
                label=""
                value={toneVal}
                min={0}
                max={10}
                step={0.1}
                size={46}
                variant="keeley"
                onChange={(val) => onChangeParam(instance.id, 'tone', val)}
              />
              <span className="hoof-knob-lbl">Tone</span>
            </div>
          </div>

          {/* Bottom Row: Level (left), Fuzz (right) */}
          <div className="hoof-knobs-row">
            <div className="hoof-knob-col">
              <Knob
                label=""
                value={levelVal}
                min={0}
                max={10}
                step={0.1}
                size={46}
                variant="keeley"
                onChange={(val) => onChangeParam(instance.id, 'level', val)}
              />
              <span className="hoof-knob-lbl">Level</span>
            </div>

            <div className="hoof-knob-col">
              <Knob
                label=""
                value={fuzzVal}
                min={0}
                max={10}
                step={0.1}
                size={46}
                variant="keeley"
                onChange={(val) => onChangeParam(instance.id, 'fuzz', val)}
              />
              <span className="hoof-knob-lbl">Fuzz</span>
            </div>
          </div>
        </div>

        {/* Lower Section: Footswitch & Jewel LED */}
        <div className="hoof-lower-section">
          <div className="hoof-stomp-row">
            <div className={`hoof-led ${isEnabled ? 'active' : ''}`} />
            <div className="classic-stomp-wrap" onPointerDown={(e) => e.stopPropagation()}>
              <button
                className={`classic-stomp-switch ocd-stomp-switch ${isEnabled ? 'active' : ''}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleEnabled(instance.id);
                }}
                title={isEnabled ? 'Click to bypass' : 'Click to engage Hoof'}
              >
                <svg viewBox="0 0 52 52" className="classic-stomp-svg ocd-stomp-svg" aria-hidden="true">
                  <defs>
                    <linearGradient id="hf-hex-grad" x1="20%" y1="0%" x2="80%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="25%" stopColor="#d1d5db" />
                      <stop offset="50%" stopColor="#9ca3af" />
                      <stop offset="100%" stopColor="#4b5563" />
                    </linearGradient>
                    <radialGradient id="hf-plunger-grad" cx="38%" cy="35%" r="62%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="35%" stopColor="#e2e8f0" />
                      <stop offset="70%" stopColor="#94a3b8" />
                      <stop offset="100%" stopColor="#475569" />
                    </radialGradient>
                  </defs>
                  <polygon
                    points="43.2,35.5 26,46 8.8,35.5 8.8,14.5 26,4 43.2,14.5"
                    fill="url(#hf-hex-grad)"
                    stroke="#374151"
                    strokeWidth="1"
                  />
                  <circle cx="26" cy="25" r="14.5" fill="#9ca3af" stroke="#374151" strokeWidth="1" />
                  <circle cx="26" cy="25" r="10.5" fill="url(#hf-plunger-grad)" stroke="#1e293b" strokeWidth="1" />
                </svg>
              </button>
            </div>
          </div>

          {/* EarthQuaker Hoof Typography */}
          <div className="hoof-branding">
            <span className="hoof-title">Hoof</span>
            <span className="hoof-subtitle">EarthQuaker Devices</span>
          </div>
        </div>
      </div>
    </div>
  );
};
