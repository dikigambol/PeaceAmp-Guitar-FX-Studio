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

export const MxrUniVibePedal: React.FC<PedalProps> = ({
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
  const levelVal = instance.parameters['level'] ?? 5.0;
  const speedVal = instance.parameters['speed'] ?? 4.5;
  const depthVal = instance.parameters['depth'] ?? 7.0;
  const isVibe = (instance.parameters['vibe'] ?? 0.0) >= 0.5;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  const toggleVibeMode = () => {
    onChangeParam(instance.id, 'vibe', isVibe ? 0.0 : 1.0);
  };

  return (
    <div
      className={`pedal-custom-enclosure pedal-mxr-univibe ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
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

      {/* Corner Close Button (Absolute overlay, does not push faceplate) */}
      <button
        type="button"
        className="pedal-mini-btn mxr-univibe-close-btn"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(instance.id);
        }}
        title="Remove MXR Uni-Vibe from board"
      >
        <X size={11} strokeWidth={2} />
      </button>

      {/* Inner Black Faceplate with White Pinstripe Border */}
      <div className="mxr-univibe-inner-frame">
        {/* Stamped Vertical Side Labels (Inside Faceplate) */}
        <div className="mxr-univibe-side-label-left">OUTPUT</div>
        <div className="mxr-univibe-side-label-right">INPUT</div>

        {/* Top Left: VIBE Mode Pushbutton & Mini Indicator LED */}
        <div className="mxr-univibe-vibe-cluster">
          <button
            type="button"
            className={`mxr-univibe-vibe-btn ${isVibe ? 'active' : ''}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              toggleVibeMode();
            }}
            title={isVibe ? 'Vibrato Mode Active (Click to switch to Chorus)' : 'Chorus Mode Active (Click to switch to Vibrato)'}
          >
            <div className="mxr-vibe-btn-cap" />
          </button>
          <div
            className={`mxr-univibe-vibe-led ${isVibe ? 'lit' : 'off'}`}
            title={isVibe ? 'Vibrato Mode' : 'Chorus Mode'}
          />
          <span className="mxr-univibe-vibe-label">VIBE</span>
        </div>

        {/* Top Center: LEVEL Knob */}
        <div className="mxr-univibe-level-col">
          <Knob
            label="LEVEL"
            value={levelVal}
            min={0}
            max={10}
            step={0.1}
            size={40}
            variant="mxr"
            showLabel={false}
            showValue={false}
            onChange={(v) => onChangeParam(instance.id, 'level', v)}
          />
          <span className="mxr-univibe-knob-lbl">LEVEL</span>
        </div>

        {/* Middle Row: SPEED (Left) and DEPTH (Right) */}
        <div className="mxr-univibe-mid-knobs-row">
          <div className="mxr-univibe-knob-col">
            <Knob
              label="SPEED"
              value={speedVal}
              min={0}
              max={10}
              step={0.1}
              size={46}
              variant="mxr"
              showLabel={false}
              showValue={false}
              onChange={(v) => onChangeParam(instance.id, 'speed', v)}
            />
            <span className="mxr-univibe-knob-lbl">SPEED</span>
          </div>

          <div className="mxr-univibe-knob-col">
            <Knob
              label="DEPTH"
              value={depthVal}
              min={0}
              max={10}
              step={0.1}
              size={46}
              variant="mxr"
              showLabel={false}
              showValue={false}
              onChange={(v) => onChangeParam(instance.id, 'depth', v)}
            />
            <span className="mxr-univibe-knob-lbl">DEPTH</span>
          </div>
        </div>

        {/* Center: Classic Boxed MXR Emblem */}
        <div className="mxr-univibe-logo-box">
          <div className="mxr-boxed-emblem">
            <span>MXR</span>
          </div>
        </div>

        {/* Below Emblem: Main Amber Bezel Status LED */}
        <div
          className="mxr-univibe-led-bezel"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title="Status LED (Click to toggle bypass)"
        >
          <div className={`mxr-univibe-led-lamp ${isEnabled ? 'lit' : 'off'}`} />
        </div>

        {/* Stomp Switch */}
        <div className="mxr-univibe-switch-wrap">
          <ClassicStompSwitch
            isEnabled={isEnabled}
            onToggle={() => onToggleEnabled(instance.id)}
            size={42}
          />
        </div>

        {/* Bottom Script Typography: Uni-Vibe® */}
        <div className="mxr-univibe-title-wrap">
          <div className="mxr-univibe-script-title">
            Uni-Vibe<span className="mxr-univibe-reg">&reg;</span>
          </div>
        </div>
      </div>
    </div>
  );
};
