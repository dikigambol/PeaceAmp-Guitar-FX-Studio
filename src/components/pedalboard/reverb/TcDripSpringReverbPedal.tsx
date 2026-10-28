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

export const TcDripSpringReverbPedal: React.FC<PedalProps> = ({
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
  const dwellVal = instance.parameters['dwell'] ?? 5.0;
  const mixVal = instance.parameters['mix'] ?? 5.0;
  const toneVal = instance.parameters['tone'] ?? 5.0;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-tc-drip ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
      data-pedal-id={instance.id}
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
      <div className="tc-drip-top-bar">
        <button
          type="button"
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

      {/* Main Faceplate Area */}
      <div className="tc-drip-faceplate">
        {/* Top Header: Brand Logo & Red Convex LED */}
        <div className="tc-drip-header">
          <span className="tc-drip-brand">tc electronic</span>
          <div
            className="tc-drip-led-wrap"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleEnabled(instance.id);
            }}
            title="Status LED (Click to toggle bypass)"
          >
            <div className={`tc-drip-led ${isEnabled ? 'lit' : 'off'}`} />
          </div>
        </div>

        {/* 1. TOP ROW: DWELL (Left) and MIX (Right) */}
        <div className="tc-drip-top-knobs">
          <div className="tc-drip-knob-col">
            <span className="tc-drip-knob-title">DWELL</span>
            <Knob
              label="DWELL"
              value={dwellVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5}
              formatValue={(v) => `${(v * 10).toFixed(0)}%`}
              onChange={(val) => onChangeParam(instance.id, 'dwell', val)}
              variant="tc-drip"
              size={38}
              showLabel={false}
              showValue={false}
            />
          </div>

          <div className="tc-drip-knob-col">
            <span className="tc-drip-knob-title">MIX</span>
            <Knob
              label="MIX"
              value={mixVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5}
              formatValue={(v) => `${Math.round(v * 10)}%`}
              onChange={(val) => onChangeParam(instance.id, 'mix', val)}
              variant="tc-drip"
              size={38}
              showLabel={false}
              showValue={false}
            />
          </div>
        </div>

        {/* 2. MIDDLE ROW: TONE (Center) */}
        <div className="tc-drip-mid-knob">
          <div className="tc-drip-knob-col">
            <span className="tc-drip-knob-title">TONE</span>
            <Knob
              label="TONE"
              value={toneVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5}
              formatValue={(v) => `${(1.2 * Math.pow(14.5 / 1.2, v / 10)).toFixed(1)}kHz`}
              onChange={(val) => onChangeParam(instance.id, 'tone', val)}
              variant="tc-drip"
              size={34}
              showLabel={false}
              showValue={false}
            />
          </div>
        </div>

        {/* 3. VINTAGE SCRIPT LOGO: "Drip" & "SPRING REVERB" */}
        <div className="tc-drip-badge-section">
          <div className="tc-drip-script-logo">
            <span className="drip-word">Drip</span>
            <div className="drip-swoosh" />
          </div>
          <div className="tc-drip-subtitle">SPRING REVERB</div>
        </div>
      </div>

      {/* 4. BOTTOM SECTION: Edge-to-edge Pinstripe Grille & Heavy Duty Footswitch */}
      <div className="tc-drip-bottom-section">
        {/* Pinstripe Grille Lines (Edge to edge, mepet ke box) */}
        <div className="tc-drip-stripes">
          <div className="tc-stripe-line" />
          <div className="tc-stripe-line" />
          <div className="tc-stripe-line" />
          <div className="tc-stripe-line" />
          <div className="tc-stripe-line" />
          <div className="tc-stripe-line" />
          <div className="tc-stripe-line" />
          <div className="tc-stripe-line" />
        </div>

        {/* Heavy Duty Stomp Footswitch */}
        <div className="tc-drip-footswitch-center">
          <ClassicStompSwitch
            isEnabled={isEnabled}
            onToggle={() => onToggleEnabled(instance.id)}
            title="Toggle TC Drip Bypass"
            idPrefix="tc-drip"
            size={44}
          />
        </div>
      </div>
    </div>
  );
};
