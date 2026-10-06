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

export const KeeleyCompressorPedal: React.FC<PedalProps> = ({
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
  const sustainVal = instance.parameters['sustain'] ?? 5;
  const levelVal = instance.parameters['level'] ?? 5;
  const attackVal = instance.parameters['attack'] ?? 5;
  const clippingVal = instance.parameters['clipping'] ?? 5;

  const isLeftPending = isJackPending?.(instance.id, 'in') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'out') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'in') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'out') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-keeley-c4 ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* 1/4" Side Phone Jacks */}
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

      {/* 4 Corner Screws */}
      <div className="pedal-screw screw-tl" />
      <div className="pedal-screw screw-tr" />
      <div className="pedal-screw screw-bl" />
      <div className="pedal-screw screw-br" />

      {/* Top Header Toolstrip */}
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

      {/* Power In & Blue Bezel LED */}
      <div className="keeley-top-center">
        <div className="keeley-dc-symbol">9V DC</div>
        <div
          className="keeley-led-mount"
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title="Blue Jewel LED (Click to toggle bypass)"
        >
          <div className={`keeley-blue-led ${isEnabled ? 'lit' : 'off'}`} />
        </div>
      </div>

      {/* 2x2 Knobs Grid with Center Diamond */}
      <div className="keeley-knobs-grid">
        {/* Top-Left: Sustain */}
        <div className="keeley-knob-col">
          <span className="keeley-knob-script">Sustain</span>
          <Knob
            label="Sustain"
            value={sustainVal}
            min={0}
            max={10}
            step={0.1}
            defaultValue={5}
            formatValue={(v) => v.toFixed(1)}
            onChange={(val) => onChangeParam(instance.id, 'sustain', val)}
            variant="keeley"
            size={36}
            showLabel={false}
            showValue={false}
          />
        </div>

        {/* Top-Right: Level */}
        <div className="keeley-knob-col">
          <span className="keeley-knob-script">Level</span>
          <Knob
            label="Level"
            value={levelVal}
            min={0}
            max={10}
            step={0.1}
            defaultValue={5}
            formatValue={(v) => v.toFixed(1)}
            onChange={(val) => onChangeParam(instance.id, 'level', val)}
            variant="keeley"
            size={36}
            showLabel={false}
            showValue={false}
          />
        </div>

        {/* Center Diamond C4 Emblem */}
        <div className="keeley-center-diamond">
          <div className="keeley-diamond-inner">
            <span>C<sup>4</sup></span>
          </div>
        </div>

        {/* Bottom-Left: Attack */}
        <div className="keeley-knob-col">
          <Knob
            label="Attack"
            value={attackVal}
            min={0}
            max={10}
            step={0.1}
            defaultValue={5}
            formatValue={(v) => v.toFixed(1)}
            onChange={(val) => onChangeParam(instance.id, 'attack', val)}
            variant="keeley"
            size={36}
            showLabel={false}
            showValue={false}
          />
          <span className="keeley-knob-script">Attack</span>
        </div>

        {/* Bottom-Right: Clipping */}
        <div className="keeley-knob-col">
          <Knob
            label="Clipping"
            value={clippingVal}
            min={0}
            max={10}
            step={0.1}
            defaultValue={5}
            formatValue={(v) => v.toFixed(1)}
            onChange={(val) => onChangeParam(instance.id, 'clipping', val)}
            variant="keeley"
            size={36}
            showLabel={false}
            showValue={false}
          />
          <span className="keeley-knob-script">Clipping</span>
        </div>
      </div>

      {/* Script Title Banner */}
      <div className="keeley-banner-script">
        <span className="keeley-io-text">out</span>
        <h3 className="keeley-script-title">Compressor</h3>
        <span className="keeley-io-text">in</span>
      </div>

      {/* Classic 3PDT Chrome Footswitch with Hex Nut */}
      <ClassicStompSwitch
        isEnabled={isEnabled}
        onToggle={() => onToggleEnabled(instance.id)}
        title="Toggle Keeley Compressor Bypass"
        idPrefix="keeley"
        size={46}
      />

      {/* Bottom Keeley Circle Logo */}
      <div className="keeley-bottom-emblem">
        <div className="keeley-circle-k">
          <span>K</span>
        </div>
      </div>
    </div>
  );
};
