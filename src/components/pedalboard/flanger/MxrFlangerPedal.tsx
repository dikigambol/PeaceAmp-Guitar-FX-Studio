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

export const MxrFlangerPedal: React.FC<PedalProps> = ({
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
  const manualVal = instance.parameters['manual'] ?? 5.0;
  const widthVal = instance.parameters['width'] ?? 6.0;
  const speedVal = instance.parameters['speed'] ?? 3.0;
  const regenVal = instance.parameters['regen'] ?? 5.0;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-mxr-flanger ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* 1/4" Side Phone Jacks (Aligned to standard JACK_Y_OFFSET = 57, top: 46px) */}
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

      {/* Top Header Toolstrip with Remove Button */}
      <div className="pedal-top-bar mxr-top-bar">
        <button
          className="pedal-mini-btn pedal-close-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(instance.id);
          }}
          title="Remove pedal from board"
        >
          <X size={11} />
        </button>
      </div>

      {/* Main Faceplate with White Pinstripe Border */}
      <div className="mxr-flanger-faceplate">
        {/* Pinstripe Inner Box with Broken Border Labels */}
        <div className="mxr-pinstripe-frame">
          {/* Top Power Header Line */}
          <div className="mxr-pinstripe-header">
            <div className="pinstripe-line" />
            <span className="pinstripe-power-lbl">POWER</span>
            <div className="pinstripe-line" />
          </div>

          {/* Side Border Indicators */}
          <div className="mxr-pinstripe-side-lbl lbl-output">OUTPUT</div>
          <div className="mxr-pinstripe-side-lbl lbl-input">INPUT</div>

          {/* 4 Knobs Row: MANUAL, WIDTH, SPEED, REGEN. */}
          <div className="mxr-flanger-knobs-row">
            {/* Knob 1: MANUAL */}
            <div className="mxr-flanger-knob-col">
              <div className="mxr-flanger-knob-wrap">
                <Knob
                  label=""
                  value={manualVal}
                  min={0}
                  max={10}
                  step={0.1}
                  defaultValue={5.0}
                  onChange={(val) => onChangeParam(instance.id, 'manual', val)}
                  size={38}
                  variant="mxr"
                  showLabel={false}
                  showValue={false}
                />
              </div>
              <span className="mxr-flanger-knob-lbl">MANUAL</span>
            </div>

            {/* Knob 2: WIDTH */}
            <div className="mxr-flanger-knob-col">
              <div className="mxr-flanger-knob-wrap">
                <Knob
                  label=""
                  value={widthVal}
                  min={0}
                  max={10}
                  step={0.1}
                  defaultValue={6.0}
                  onChange={(val) => onChangeParam(instance.id, 'width', val)}
                  size={38}
                  variant="mxr"
                  showLabel={false}
                  showValue={false}
                />
              </div>
              <span className="mxr-flanger-knob-lbl">WIDTH</span>
            </div>

            {/* Knob 3: SPEED */}
            <div className="mxr-flanger-knob-col">
              <div className="mxr-flanger-knob-wrap">
                <Knob
                  label=""
                  value={speedVal}
                  min={0}
                  max={10}
                  step={0.1}
                  defaultValue={3.0}
                  onChange={(val) => onChangeParam(instance.id, 'speed', val)}
                  size={38}
                  variant="mxr"
                  showLabel={false}
                  showValue={false}
                />
              </div>
              <span className="mxr-flanger-knob-lbl">SPEED</span>
            </div>

            {/* Knob 4: REGEN. */}
            <div className="mxr-flanger-knob-col">
              <div className="mxr-flanger-knob-wrap">
                <Knob
                  label=""
                  value={regenVal}
                  min={0}
                  max={10}
                  step={0.1}
                  defaultValue={5.0}
                  onChange={(val) => onChangeParam(instance.id, 'regen', val)}
                  size={38}
                  variant="mxr"
                  showLabel={false}
                  showValue={false}
                />
              </div>
              <span className="mxr-flanger-knob-lbl">REGEN.</span>
            </div>
          </div>

          {/* Centered Deep Red Jewel Pilot LED */}
          <div
            className="mxr-flanger-led-wrap"
            onClick={(e) => {
              e.stopPropagation();
              onToggleEnabled(instance.id);
            }}
            title={isEnabled ? 'Active (Click to bypass)' : 'Bypassed (Click to engage)'}
          >
            <div className={`mxr-flanger-led ${isEnabled ? 'lit' : ''}`}>
              <div className="mxr-led-lens" />
            </div>
          </div>

          {/* Lower Control Section: [MXR] logo, Footswitch, flanger */}
          <div className="mxr-flanger-lower-row">
            {/* Left: Classic MXR Badge Logo */}
            <div className="mxr-logo-badge">
              <span className="mxr-logo-text">MXR</span>
            </div>

            {/* Center: 3PDT Chrome Footswitch */}
            <div className="mxr-flanger-stomp-wrap">
              <ClassicStompSwitch
                isEnabled={isEnabled}
                onToggle={() => onToggleEnabled(instance.id)}
                size={42}
              />
            </div>

            {/* Right: Lowercase flanger text */}
            <div className="mxr-flanger-title">
              <span>flanger</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
