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

export const EhxElectricMistressPedal: React.FC<PedalProps> = ({
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
  const rateVal = instance.parameters['rate'] ?? 3.5;
  const flangerDepthVal = instance.parameters['flangerDepth'] ?? instance.parameters['color'] ?? 5.0;
  const chorusDepthVal = instance.parameters['chorusDepth'] ?? instance.parameters['range'] ?? 4.0;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-ehx-stereo-mistress ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* 1/4" Side Phone Jacks (Aligned to standard JACK_Y_OFFSET = 57, top: 46px) */}
      <div
        className={`stompbox-side-jack jack-left ${isLeftPending ? 'is-jack-pending' : ''} ${hasLeftCable ? 'has-cable' : ''}`}
        title="Main Output Jack - Click to patch cable"
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

      {/* Top Header Toolstrip with Remove Button */}
      <div className="pedal-top-bar ehx-top-bar">
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

      {/* Black Faceplate with Double Border (Outer White, Inner Hot-Pink) */}
      <div className="ehx-sm-faceplate">
        {/* Top Power Polarity Graphic */}
        <div className="ehx-sm-power-badge">
          <span>9V</span>
          <svg viewBox="0 0 40 16" className="ehx-polarity-svg">
            <circle cx="8" cy="8" r="4.5" fill="none" stroke="#ffffff" strokeWidth="1.2" />
            <line x1="5.5" y1="8" x2="10.5" y2="8" stroke="#ffffff" strokeWidth="1.2" />
            <path d="M 12 8 L 22 8" stroke="#ffffff" strokeWidth="1.2" />
            <path d="M 22 4 C 27 4 27 12 22 12" fill="none" stroke="#ffffff" strokeWidth="1.2" />
            <circle cx="32" cy="8" r="4.5" fill="none" stroke="#ffffff" strokeWidth="1.2" />
            <line x1="29.5" y1="8" x2="34.5" y2="8" stroke="#ffffff" strokeWidth="1.2" />
            <line x1="32" y1="5.5" x2="32" y2="10.5" stroke="#ffffff" strokeWidth="1.2" />
          </svg>
        </div>

        {/* 3 Knobs Row: RATE, FLANGER DEPTH, CHORUS DEPTH */}
        <div className="ehx-sm-knobs-row">
          {/* Knob 1: RATE */}
          <div className="ehx-sm-knob-col">
            <div className="ehx-sm-knob-wrap">
              <Knob
                label=""
                value={rateVal}
                min={0}
                max={10}
                step={0.1}
                defaultValue={3.5}
                onChange={(val) => onChangeParam(instance.id, 'rate', val)}
                size={38}
                variant="ehx-pointer"
                showLabel={false}
                showValue={false}
              />
            </div>
            <div className="ehx-sm-knob-lbl">
              <span>RATE</span>
            </div>
          </div>

          {/* Knob 2: FLANGER DEPTH */}
          <div className="ehx-sm-knob-col">
            <div className="ehx-sm-knob-wrap">
              <Knob
                label=""
                value={flangerDepthVal}
                min={0}
                max={10}
                step={0.1}
                defaultValue={5.0}
                onChange={(val) => onChangeParam(instance.id, 'flangerDepth', val)}
                size={38}
                variant="ehx-pointer"
                showLabel={false}
                showValue={false}
              />
            </div>
            <div className="ehx-sm-knob-lbl stacked">
              <span>FLANGER</span>
              <span>DEPTH</span>
            </div>
          </div>

          {/* Knob 3: CHORUS DEPTH */}
          <div className="ehx-sm-knob-col">
            <div className="ehx-sm-knob-wrap">
              <Knob
                label=""
                value={chorusDepthVal}
                min={0}
                max={10}
                step={0.1}
                defaultValue={4.0}
                onChange={(val) => onChangeParam(instance.id, 'chorusDepth', val)}
                size={38}
                variant="ehx-pointer"
                showLabel={false}
                showValue={false}
              />
            </div>
            <div className="ehx-sm-knob-lbl stacked">
              <span>CHORUS</span>
              <span>DEPTH</span>
            </div>
          </div>
        </div>

        {/* Center Status LED (Right below FLANGER DEPTH knob) */}
        <div
          className="ehx-sm-led-container"
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title={isEnabled ? 'Active (Click to bypass)' : 'Bypassed (Click to engage)'}
        >
          <div className={`ehx-sm-pilot-led ${isEnabled ? 'lit' : ''}`}>
            <div className="ehx-sm-led-inner" />
          </div>
        </div>

        {/* Graphic Typography: Stereo electric mistress */}
        <div className="ehx-sm-logo-section">
          <div className="ehx-sm-script-stereo">Stereo</div>
          <div className="ehx-sm-sliced-title">
            {/* Authentic EHX Sliced-Block Font SVG Representation */}
            <svg viewBox="0 0 170 56" className="ehx-sm-title-svg" preserveAspectRatio="xMidYMid meet">
              <defs>
                {/* Horizontal slice pattern replicating the iconic EHX sliced lettering */}
                <mask id="ehx-sliced-mask">
                  <rect x="0" y="0" width="170" height="56" fill="#ffffff" />
                  <line x1="0" y1="12" x2="170" y2="12" stroke="#000000" strokeWidth="1.2" />
                  <line x1="0" y1="23" x2="170" y2="23" stroke="#000000" strokeWidth="1.2" />
                  <line x1="0" y1="39" x2="170" y2="39" stroke="#000000" strokeWidth="1.2" />
                  <line x1="0" y1="49" x2="170" y2="49" stroke="#000000" strokeWidth="1.2" />
                </mask>
              </defs>
              <g mask="url(#ehx-sliced-mask)" fill="#ffffff">
                <text
                  x="85"
                  y="26"
                  textAnchor="middle"
                  className="ehx-svg-title-text"
                  letterSpacing="-0.5"
                >
                  electric
                </text>
                <text
                  x="85"
                  y="52"
                  textAnchor="middle"
                  className="ehx-svg-title-text"
                  letterSpacing="-0.5"
                >
                  mistress
                </text>
              </g>
            </svg>
          </div>
        </div>

        {/* Side Jack Indicators inside Faceplate Graphic */}
        <div className="ehx-sm-jack-labels">
          <span className="ehx-sm-jack-lbl lbl-main-out">OUTPUT</span>
          <span className="ehx-sm-jack-lbl lbl-input">INPUT</span>
        </div>

        {/* Stomp Switch Section */}
        <div className="ehx-sm-stomp-section">
          <ClassicStompSwitch
            isEnabled={isEnabled}
            onToggle={() => onToggleEnabled(instance.id)}
            size={46}
          />
        </div>

        {/* Footer Brand Logo */}
        <div className="ehx-sm-footer-brand">
          <span className="ehx-sm-brand-serif">electro-harmonix</span>
          <span className="ehx-sm-origin-tag">MADE IN NYC, USA</span>
        </div>
      </div>
    </div>
  );
};
