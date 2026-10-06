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

export const KlonCentaurPedal: React.FC<PedalProps> = ({
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
  const gainVal = instance.parameters['gain'] ?? 5;
  const trebleVal = instance.parameters['treble'] ?? 5;
  const outputVal = instance.parameters['output'] ?? 5;

  const isLeftPending = isJackPending?.(instance.id, 'in') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'out') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'in') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'out') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-klon-centaur ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={{ ...style, width: 260 }}
      onPointerDown={onPointerDown}
    >
      {/* 4 Corner Cast Chamfers / Notches */}
      <div className="klon-notch klon-notch-tl" />
      <div className="klon-notch klon-notch-tr" />
      <div className="klon-notch klon-notch-bl" />
      <div className="klon-notch klon-notch-br" />

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

      <div className="pedal-top-bar">
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

      {/* Horizontal Row of 3 Oxblood Pointer Knobs across the Top with Red LED on far left */}
      <div className="klon-top-knobs-row">
        {/* Left Indicator LED */}
        <div
          className="klon-led-mount"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title="Click to toggle bypass"
        >
          <div className={`klon-red-led ${isEnabled ? 'lit' : 'off'}`} />
        </div>

        {/* 1. GAIN */}
        <div className="klon-knob-unit">
          <Knob
            label="GAIN"
            value={gainVal}
            min={0}
            max={10}
            step={0.1}
            size={44}
            variant="klon-oxblood"
            showLabel={false}
            showValue={false}
            onChange={(v) => onChangeParam(instance.id, 'gain', v)}
          />
          <span className="klon-knob-lbl">GAIN</span>
        </div>

        {/* 2. TREBLE */}
        <div className="klon-knob-unit">
          <Knob
            label="TREBLE"
            value={trebleVal}
            min={0}
            max={10}
            step={0.1}
            size={44}
            variant="klon-oxblood"
            showLabel={false}
            showValue={false}
            onChange={(v) => onChangeParam(instance.id, 'treble', v)}
          />
          <span className="klon-knob-lbl">TREBLE</span>
        </div>

        {/* 3. OUTPUT */}
        <div className="klon-knob-unit">
          <Knob
            label="OUTPUT"
            value={outputVal}
            min={0}
            max={10}
            step={0.1}
            size={44}
            variant="klon-oxblood"
            showLabel={false}
            showValue={false}
            onChange={(v) => onChangeParam(instance.id, 'output', v)}
          />
          <span className="klon-knob-lbl">OUTPUT</span>
        </div>
      </div>

      {/* Bottom Half: Left Centaur Horsie Illustration & Right Stomp Switch + CENTAUR wordmark */}
      <div className="klon-bottom-deck">
        {/* Left Side: Horsie Centaur with Sword */}
        <div className="klon-horsie-graphic">
          <svg viewBox="0 0 150 105" className="klon-centaur-svg">
            <g fill="none" stroke="#3d1506" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 28 78 C 30 65 38 60 54 62 C 68 63 82 55 88 47" />
              <path d="M 28 72 C 20 75 16 82 18 92 C 20 95 22 91 24 85" />
              <path d="M 24 78 C 22 84 24 90 26 94" />
              <path d="M 32 75 C 34 84 32 90 30 96 L 34 96" />
              <path d="M 40 73 C 42 81 44 89 42 94 L 46 94" />
              <path d="M 74 65 C 76 75 78 84 80 92 L 84 92" />
              <path d="M 84 63 C 88 72 92 81 94 90 L 98 90" />
              <path d="M 44 73 C 56 75 68 71 76 65" />
              <path d="M 88 47 C 90 39 88 30 84 26 C 82 22 78 20 74 22 C 70 25 70 32 72 39 C 74 46 66 52 58 56" />
              <path d="M 82 24 C 84 20 82 14 78 12 C 74 10 70 14 68 18" />
              <path d="M 78 14 C 82 15 84 18 84 20 C 82 22 80 23 78 23" />
              <path d="M 70 22 L 58 26 L 46 24" />
              <line x1="22" y1="23" x2="48" y2="24" strokeWidth="2.8" />
              <line x1="46" y1="18" x2="46" y2="29" strokeWidth="2.2" />
              <path d="M 84 24 L 106 25 L 122 26" />
              <path d="M 118 24 L 122 26 L 118 28" />
            </g>
          </svg>
        </div>

        {/* Right Side: Classic Stomp Switch and CENTAUR text */}
        <div className="klon-footswitch-block">
          <ClassicStompSwitch
            isEnabled={isEnabled}
            onToggle={() => onToggleEnabled(instance.id)}
            title="Toggle Klon Centaur Bypass"
            idPrefix="klon"
            size={44}
          />
          <span className="klon-centaur-wordmark">CENTAUR<span className="klon-tm">TM</span></span>
        </div>
      </div>
    </div>
  );
};
