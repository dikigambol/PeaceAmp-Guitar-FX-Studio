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

export const FulltoneSupaTremPedal: React.FC<PedalProps> = ({
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
  const speedVal = instance.parameters['speed'] ?? 5.0;
  const mixVal = instance.parameters['mix'] ?? 7.0;
  const volumeVal = instance.parameters['volume'] ?? 5.0;
  const isHard = (instance.parameters['hardSoft'] ?? 0.0) >= 0.5;
  const isHalfSpeed = (instance.parameters['halfSpeed'] ?? 0.0) >= 0.5;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;


  return (
    <div
      className={`pedal-custom-enclosure pedal-fulltone-supatrem ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
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

      {/* Decorative knurled side screws matching original chassis hardware */}
      <div className="supatrem-knurled-screw screw-left" />
      <div className="supatrem-knurled-screw screw-right" />

      {/* Mini Close Button */}
      <button
        className="pedal-mini-btn pedal-close-btn supatrem-close-btn"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(instance.id);
        }}
        title="Remove Fulltone Supa-Trem from board"
      >
        <X size={12} strokeWidth={1.5} />
      </button>

      {/* Top Deck: SPEED and MIX Knobs Centered Horizontally Together */}
      <div className="supatrem-main-knobs-wrap">
        <div className="supatrem-knob-col">
          <span className="supatrem-knob-lbl">SPEED</span>
          <Knob
            label="SPEED"
            value={speedVal}
            min={0}
            max={10}
            step={0.1}
            size={50}
            variant="mxr"
            showLabel={false}
            showValue={false}
            onChange={(v) => onChangeParam(instance.id, 'speed', v)}
          />
        </div>

        <div className="supatrem-knob-col">
          <span className="supatrem-knob-lbl">MIX</span>
          <Knob
            label="MIX"
            value={mixVal}
            min={0}
            max={10}
            step={0.1}
            size={50}
            variant="mxr"
            showLabel={false}
            showValue={false}
            onChange={(v) => onChangeParam(instance.id, 'mix', v)}
          />
        </div>
      </div>

      {/* Top Deck: VOLUME Trim Pot Aligned Vertically with HARD / SOFT Switch */}
      <div className="supatrem-vol-cluster">
        <div className="supatrem-vol-arc-wrap">
          <svg viewBox="0 0 34 34" className="supatrem-vol-arc">
            <path
              d="M 8.5 25.5 A 12.5 12.5 0 1 1 25.5 25.5"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <polyline
              points="22,25.5 26,25.5 26,21.5"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <Knob
            label="VOLUME"
            value={volumeVal}
            min={0}
            max={10}
            step={0.1}
            size={24}
            variant="default"
            color="#38bdf8"
            showLabel={false}
            showValue={false}
            onChange={(v) => onChangeParam(instance.id, 'volume', v)}
          />
        </div>
        <span className="supatrem-vol-lbl">VOLUME</span>
      </div>

      {/* Middle Deck: Left HALF SPEED Switch */}
      <div className="supatrem-left-switch-col">
        <ClassicStompSwitch
          isEnabled={isHalfSpeed}
          onToggle={() => onChangeParam(instance.id, 'halfSpeed', isHalfSpeed ? 0 : 1)}
          size={38}
        />
        <span className={`supatrem-switch-lbl ${isHalfSpeed ? 'active' : ''}`}>HALF SPEED</span>
      </div>

      {/* Middle Deck: Center Branding */}
      <div className="supatrem-branding-center">
        <div className="supatrem-title-block">
          <h1 className="supatrem-title-main">
            Supa-Trem<span className="supatrem-reg">&reg;</span>
          </h1>
          <div className="supatrem-sub-row">
            <span className="supatrem-script-author">
              by <span className="fulltone-cursive">Fulltone</span>
              <span className="supatrem-reg-small">&reg;</span>
            </span>
            <span className="supatrem-model-tag">ST-1</span>
          </div>
        </div>
      </div>

      {/* Middle Deck: Right HARD / SOFT Switch */}
      <div className="supatrem-right-switch-col">
        <ClassicStompSwitch
          isEnabled={isHard}
          onToggle={() => onChangeParam(instance.id, 'hardSoft', isHard ? 0 : 1)}
          size={38}
        />
        <span className={`supatrem-switch-lbl ${isHard ? 'active' : ''}`}>HARD / SOFT</span>
      </div>

      {/* Bottom Deck: Dead-Center BYPASS Footswitch Cluster */}
      <div className="supatrem-bypass-wrap">
        {/* Sapphire Blue LED on the left */}
        <div
          className={`supatrem-bypass-led ${isEnabled ? 'lit' : 'off'}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title="Main Bypass LED (Click to toggle bypass)"
        />

        {/* Centered Stompswitch */}
        <ClassicStompSwitch
          isEnabled={isEnabled}
          onToggle={() => onToggleEnabled(instance.id)}
          size={40}
        />

        {/* BYPASS tag on the right */}
        <span className="supatrem-bypass-tag">BYPASS</span>
      </div>
    </div>
  );
};
