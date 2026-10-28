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

export const MxrSmartGatePedal: React.FC<PedalProps> = ({
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
  const triggerVal = instance.parameters['trigger'] ?? 4.5;
  const rangeVal = Math.round(instance.parameters['range'] ?? 0); // 0 = Normal, 1 = Hi Range
  const modeVal = Math.round(instance.parameters['mode'] ?? 2);   // 0 = HISS, 1 = MID, 2 = FULL

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  const minDb = rangeVal >= 1 ? -58 : -72;
  const maxDb = rangeVal >= 1 ? -14 : -28;
  const currentDb = minDb + (triggerVal / 10) * (maxDb - minDb);

  const cycleMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Cycle FULL (2) -> MID (1) -> HISS (0) -> FULL (2)
    const nextMode = modeVal === 2 ? 1 : modeVal === 1 ? 0 : 2;
    onChangeParam(instance.id, 'mode', nextMode);
  };

  return (
    <div
      className={`pedal-custom-enclosure pedal-mxr-smartgate ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* 1/4" Side Phone Jacks */}
      <div
        className={`stompbox-side-jack jack-left ${isLeftPending ? 'is-jack-pending' : ''} ${hasLeftCable ? 'has-cable' : ''}`}
        title="Audio Output Jack - Click to patch cable"
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'out', e);
        }}
      />
      <div
        className={`stompbox-side-jack jack-right ${isRightPending ? 'is-jack-pending' : ''} ${hasRightCable ? 'has-cable' : ''}`}
        title="Audio Input Jack - Click to patch cable"
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'in', e);
        }}
      />

      {/* Top Header Close Button */}
      <div className="pedal-top-bar">
        <button
          className="pedal-mini-btn pedal-close-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(instance.id);
          }}
          title="Remove MXR Smart Gate from board"
        >
          <X size={11} strokeWidth={1.5} />
        </button>
      </div>

      {/* Black Pin-Line Frame Box */}
      <div className="smartgate-pinline-frame">
        {/* Stamped Vertical Side Port Labels breaking the frame line */}
        <span className="smartgate-side-label side-out">OUTPUT</span>
        <span className="smartgate-side-label side-in">INPUT</span>

        {/* Top Row: HI TRIGGER RANGE Push Button + GATE Activity LED */}
        <div className="smartgate-top-row" onPointerDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`smartgate-range-btn ${rangeVal >= 1 ? 'is-pressed' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onChangeParam(instance.id, 'range', rangeVal >= 1 ? 0 : 1);
            }}
            title={`Hi Trigger Range: ${rangeVal >= 1 ? 'IN (+14 dB High-Level / FX Loop Mode)' : 'OUT (Normal Guitar Input Level)'}`}
          />
          <span className="smartgate-top-label">HI TRIGGER RANGE</span>
          <div
            className="smartgate-gate-led-wrap"
            title="GATE Activity Indicator: Menyala hijau saat Gate sedang menutup/meredam noise di bawah Trigger Level, dan padam saat senar dipetik (Gate Terbuka)"
          >
            <div
              data-smartgate-led={instance.id}
              className={`smartgate-gate-led ${isEnabled ? 'is-lit' : ''}`}
            />
            <span className="smartgate-top-label">GATE</span>
          </div>
        </div>

        {/* Center Row: MXR Skirted Knob + 3-Way Slide Switch (FULL / MID / HISS) */}
        <div className="smartgate-center-row">
          <div className="smartgate-knob-wrap">
            <Knob
              label="TRIGGER LEVEL"
              value={triggerVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={4.5}
              formatValue={() => `${currentDb.toFixed(0)} dB`}
              onChange={(val) => onChangeParam(instance.id, 'trigger', val)}
              variant="mxr"
              size={52}
              showLabel={false}
              showValue={false}
            />
          </div>

          {/* 3-Way Vertical Slide Switch: FULL (2) / MID (1) / HISS (0) */}
          <div
            className="smartgate-mode-assembly"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={cycleMode}
            title={`Gate Mode: ${modeVal === 2 ? 'FULL (Full-Bandwidth Gate)' : modeVal === 1 ? 'MID (Mid/High Gate)' : 'HISS (High-Frequency De-Hisser)'} — Click to switch`}
          >
            <span
              className={`smartgate-mode-text mode-top ${modeVal === 2 ? 'is-selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onChangeParam(instance.id, 'mode', 2);
              }}
            >
              FULL
            </span>

            <div className="smartgate-slide-row">
              <div className="smartgate-mid-vertical">
                <span>M</span>
                <span>I</span>
                <span>D</span>
              </div>
              <div className="smartgate-slide-slot">
                <div
                  className={`smartgate-slide-cap pos-${modeVal}`}
                />
              </div>
            </div>

            <span
              className={`smartgate-mode-text mode-bottom ${modeVal === 0 ? 'is-selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onChangeParam(instance.id, 'mode', 0);
              }}
            >
              HISS
            </span>
          </div>
        </div>

        {/* Trigger Level Label */}
        <div className="smartgate-trigger-label">- TRIGGER LEVEL +</div>

        {/* Iconic MXR Rounded-Rect Logo */}
        <div className="smartgate-mxr-box">
          <span className="smartgate-mxr-text">MXR</span>
        </div>

        {/* Status LED Bezel */}
        <div
          className="smartgate-status-led-bezel"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title={isEnabled ? 'Smart Gate Power ON (Click to Bypass)' : 'Smart Gate Bypassed (Click to Engage)'}
        >
          <div className={`smartgate-status-led-core ${isEnabled ? 'is-on' : ''}`} />
        </div>
      </div>

      {/* 3PDT Chrome Footswitch overlapping bottom of frame */}
      <div className="smartgate-stomp-wrap" onPointerDown={(e) => e.stopPropagation()}>
        <ClassicStompSwitch
          isEnabled={isEnabled}
          onToggle={() => onToggleEnabled(instance.id)}
          title="Toggle MXR M135 Smart Gate Bypass"
          idPrefix="mxr-smartgate"
          size={40}
        />
      </div>

      {/* Bottom Title: "smartgate" */}
      <div className="smartgate-bottom-title">
        <span className="smart-thin">smart</span>
        <span className="gate-bold">gate</span>
      </div>
    </div>
  );
};
