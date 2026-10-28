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

export const JhsHallReverbPedal: React.FC<PedalProps> = ({
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
  const verbVal = instance.parameters['verb'] ?? 5.0;
  const dampenVal = instance.parameters['dampen'] ?? 5.0;
  const decayVal = instance.parameters['decay'] ?? 5.5;
  const modulateVal = instance.parameters['modulate'] ?? 0.0;
  const isModOn = modulateVal >= 0.5;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-jhs-hall ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
      data-pedal-id={instance.id}
    >
      {/* 1/4" Side Phone Jacks (Aligned with OUTPUT and INPUT at y = 209px) */}
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

      {/* Top-Right Floating Close Button */}
      <div className="jhs-top-bar">
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

      {/* White Powder-Coat Faceplate */}
      <div className="jhs-faceplate">
        {/* Model Title: HALL REVERB (Clean Centered Header) */}
        <div className="jhs-header-title">
          <span>HALL REVERB</span>
        </div>

        {/* 3 Knobs Row: Clean, frameless, 100% centered with increased gaps */}
        <div className="jhs-knobs-area">
          <div className="jhs-knob-column">
            <Knob
              label="VERB"
              value={verbVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5.0}
              formatValue={(v) => `${Math.round(v * 10)}%`}
              onChange={(val) => onChangeParam(instance.id, 'verb', val)}
              variant="jhs"
              size={42}
              showLabel={false}
              showValue={false}
            />
            <span className="jhs-knob-label">VERB</span>
          </div>

          <div className="jhs-knob-column">
            <Knob
              label="DAMPEN"
              value={dampenVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5.0}
              formatValue={(v) => `${(v * 10).toFixed(0)}%`}
              onChange={(val) => onChangeParam(instance.id, 'dampen', val)}
              variant="jhs"
              size={42}
              showLabel={false}
              showValue={false}
            />
            <span className="jhs-knob-label">DAMPEN</span>
          </div>

          <div className="jhs-knob-column">
            <Knob
              label="DECAY"
              value={decayVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5.5}
              formatValue={(v) => `${(0.5 + Math.pow(v / 10, 1.4) * 5.0).toFixed(1)}s`}
              onChange={(val) => onChangeParam(instance.id, 'decay', val)}
              variant="jhs"
              size={42}
              showLabel={false}
              showValue={false}
            />
            <span className="jhs-knob-label">DECAY</span>
          </div>
        </div>

        {/* MODULATE Section - Shared 3-column grid, exactly aligned directly below the DECAY column */}
        <div className="jhs-modulate-row">
          <div className="jhs-modulate-col">
            <div
              className={`jhs-toggle-switch ${isModOn ? 'active' : ''}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onChangeParam(instance.id, 'modulate', isModOn ? 0 : 1);
              }}
              title={`Modulate: ${isModOn ? 'ON' : 'OFF'} (Click to toggle)`}
            >
              <div className="jhs-toggle-hex-nut">
                <div className="jhs-toggle-hole" />
              </div>
              <div className={`jhs-toggle-bat ${isModOn ? 'pos-up' : 'pos-down'}`} />
            </div>

            <div className="jhs-modulate-label-box">
              <span className="jhs-modulate-text">MODULATE</span>
            </div>
          </div>
        </div>

        {/* I/O Labels - Mepet ke tepi samping kiri dan kanan */}
        <div className="jhs-io-section">
          <div className="jhs-io-bracket bracket-left">
            <span className="jhs-bracket-txt">OUTPUT</span>
          </div>
          <div className="jhs-io-bracket bracket-right">
            <span className="jhs-bracket-txt">INPUT</span>
          </div>
        </div>

        {/* Bottom Section: JHS 3 Series Logo (Left), CENTERED ClassicStompSwitch, Status Red LED (Right) */}
        <div className="jhs-bottom-section">
          {/* JHS 3 SERIES Brand Badge (Left) */}
          <div className="jhs-brand-badge">
            <div className="jhs-bold-logo">JHS</div>
            <div className="jhs-series-tag">
              <span>3 SERIES</span>
            </div>
          </div>

          {/* Mathematically Centered ClassicStompSwitch (seperti Klon Centaur) */}
          <div className="jhs-center-footswitch">
            <ClassicStompSwitch
              isEnabled={isEnabled}
              onToggle={() => onToggleEnabled(instance.id)}
              title="Toggle JHS 3 Series Bypass"
              idPrefix="jhs-hall"
              size={46}
            />
          </div>

          {/* Status Red LED (Right) */}
          <div
            className="jhs-led-socket"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleEnabled(instance.id);
            }}
            title="Status LED (Click to toggle bypass)"
          >
            <div className={`jhs-led-lens ${isEnabled ? 'lit' : 'off'}`} />
          </div>
        </div>
      </div>
    </div>
  );
};

