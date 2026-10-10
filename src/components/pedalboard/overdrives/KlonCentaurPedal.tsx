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
        {/* 1. GAIN with LED Indicator right next to the label */}
        <div className="klon-knob-unit klon-knob-gain">
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
          <div className="klon-gain-label-wrap">
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
            <span className="klon-knob-lbl">GAIN</span>
          </div>
        </div>

        {/* 2. TREBLE */}
        <div className="klon-knob-unit klon-knob-treble">
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
        <div className="klon-knob-unit klon-knob-output">
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

      {/* Bottom Deck: Centered Stomp Switch with CENTAUR wordmark beside it */}
      <div className="klon-bottom-deck">
        <div className="klon-footswitch-block">
          <ClassicStompSwitch
            isEnabled={isEnabled}
            onToggle={() => onToggleEnabled(instance.id)}
            title="Toggle Klon Centaur Bypass"
            idPrefix="klon"
            size={46}
          />
          <span className="klon-centaur-wordmark">CENTAUR<span className="klon-tm">TM</span></span>
        </div>
      </div>
    </div>
  );
};
