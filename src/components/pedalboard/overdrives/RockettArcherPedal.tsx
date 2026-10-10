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

export const RockettArcherPedal: React.FC<PedalProps> = ({
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
  const outputVal = instance.parameters['output'] ?? 5;
  const trebleVal = instance.parameters['treble'] ?? 5;
  const gainVal = instance.parameters['gain'] ?? 5;

  const isLeftPending = isJackPending?.(instance.id, 'in') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'out') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'in') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'out') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-rockett-archer ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* 1/4" Side Audio Phone Jacks */}
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

      {/* Top Header Bar */}
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

      {/* Top Silkscreen Specification Row: OUT, MADE IN USA / 9VDC, IN */}
      <div className="archer-top-banner">
        <span className="archer-port-txt">OUT</span>
        <div className="archer-mid-banner">
          <div>MADE IN USA</div>
          <div>9VDC</div>
        </div>
        <span className="archer-port-txt">IN</span>
      </div>

      {/* 3 Oxblood Pointer Knobs in Inverted V-Formation */}
      <div className="archer-knobs-section">
        {/* Top Flanking Knobs: OUTPUT (Left) & TREBLE (Right) */}
        <div className="archer-flank-knobs-row">
          {/* OUTPUT Control */}
          <div className="archer-knob-col">
            <div className="archer-knob-holder">
              <Knob
                label="OUTPUT"
                value={outputVal}
                min={0}
                max={10}
                step={0.1}
                size={50}
                variant="archer"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'output', v)}
              />
            </div>
            <span className="archer-knob-lbl">OUTPUT</span>
          </div>

          {/* TREBLE Control */}
          <div className="archer-knob-col">
            <div className="archer-knob-holder">
              <Knob
                label="TREBLE"
                value={trebleVal}
                min={0}
                max={10}
                step={0.1}
                size={50}
                variant="archer"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'treble', v)}
              />
            </div>
            <span className="archer-knob-lbl">TREBLE</span>
          </div>
        </div>

        {/* Center GAIN Column: GAIN Label -> Red Jewel LED -> GAIN Knob */}
        <div className="archer-center-gain-col">
          <span className="archer-knob-lbl archer-gain-lbl">GAIN</span>

          {/* Red Indicator Jewel LED Mount */}
          <div
            className="archer-led-mount"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleEnabled(instance.id);
            }}
            title="Status LED (Click to toggle bypass)"
          >
            <div className="archer-led-bezel">
              <div className={`archer-red-led ${isEnabled ? 'lit' : 'off'}`} />
            </div>
          </div>

          {/* Center Gain Knob */}
          <div className="archer-knob-holder archer-gain-knob-holder">
            <Knob
              label="GAIN"
              value={gainVal}
              min={0}
              max={10}
              step={0.1}
              size={50}
              variant="archer"
              showLabel={false}
              showValue={false}
              onChange={(v) => onChangeParam(instance.id, 'gain', v)}
            />
          </div>
        </div>
      </div>

      {/* Archer Wordmark */}
      <div className="archer-graphics-row">
        <span className="archer-title">ARCHER</span>
      </div>

      {/* Classic 3PDT Chrome Footswitch with Machined Hex Base */}
      <ClassicStompSwitch
        isEnabled={isEnabled}
        onToggle={() => onToggleEnabled(instance.id)}
        title="Toggle Archer Bypass"
        idPrefix="archer"
        size={48}
      />

      {/* Bottom Branding */}
      <div className="archer-brand-bottom">J. ROCKETT AUDIO DESIGNS</div>
    </div>
  );
};
