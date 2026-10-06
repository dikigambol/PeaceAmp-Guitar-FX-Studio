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

      {/* Iconic Centaur Archer Silhouette & Wordmark */}
      <div className="archer-graphics-row">
        {/* Centaur Archer Vector Graphic */}
        <svg viewBox="0 0 100 100" className="archer-centaur-svg" aria-label="Centaur Archer Graphic">
          {/* Taut Recurve Bow & Bowstring */}
          <path
            d="M 18 16 C 14 36, 17 62, 34 82 M 18 16 L 43 45 L 34 82 M 15 22 L 44 47"
            fill="none"
            stroke="#11161d"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Centaur Archer Silhouette */}
          <path
            d="M 34 46 
               C 36 39, 34 33, 36 27 
               C 38 23, 42 20, 46 22 
               C 49 24, 49 28, 47 32 
               C 45 35, 43 38, 42 42 
               C 46 41, 52 39, 58 40 
               C 61 41, 62 45, 59 47 
               C 54 49, 49 48, 43 48 
               C 43 52, 45 56, 50 58 
               C 58 57, 66 59, 73 66 
               C 76 69, 79 74, 80 80 
               C 80 85, 77 88, 73 87 
               C 69 86, 68 81, 67 77 
               C 65 73, 60 71, 55 71 
               C 51 75, 46 82, 42 88 
               C 40 91, 36 89, 36 85 
               C 38 79, 42 72, 44 67 
               C 38 65, 34 59, 32 53 
               C 31 49, 33 47, 34 46 Z"
            fill="#11161d"
          />
          {/* Drawn Left Bow Arm */}
          <path
            d="M 39 34 L 20 44 L 27 41"
            fill="none"
            stroke="#11161d"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Rear Flank & Leg */}
          <path
            d="M 61 72 C 65 79, 70 86, 74 93"
            fill="none"
            stroke="#11161d"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Swishing Tail */}
          <path
            d="M 77 74 C 85 75, 90 81, 88 88 C 86 91, 82 90, 81 86 C 82 81, 79 77, 76 75"
            fill="#11161d"
          />
        </svg>

        {/* Classical Roman Serif Title */}
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
