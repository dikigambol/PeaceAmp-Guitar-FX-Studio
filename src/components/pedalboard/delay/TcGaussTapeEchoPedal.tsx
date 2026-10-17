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

export const TcGaussTapeEchoPedal: React.FC<PedalProps> = ({
  instance,
  onToggleEnabled,
  onChangeParam,
  onRemove,
  isDragging,
  onJackClick,
  isJackPending,
  hasJackCable,
}) => {
  const isEnabled = instance.enabled;
  const delayVal = instance.parameters['delay'] ?? 4.5;
  const sustainVal = instance.parameters['sustain'] ?? 4.0;
  const volumeVal = instance.parameters['volume'] ?? 5.0;
  const modVal = instance.parameters['mod'] ?? 0;
  const isModOn = modVal >= 0.5;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  const handleToggleMod = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeParam(instance.id, 'mod', isModOn ? 0 : 1);
  };

  return (
    <div
      className={`pedal-custom-enclosure pedal-tc-gauss ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      data-pedal-id={instance.id}
    >
      {/* Outer brushed aluminum side bezels */}
      <div className="tc-gauss-bezel-left" />
      <div className="tc-gauss-bezel-right" />

      {/* 1/4" Side Phone Jacks (Aligned to JACK_Y_OFFSET = 57, top: 46px) */}
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

      {/* Inner Rounded Border Frame */}
      <div className="tc-gauss-inner-frame">
        {/* Top Header: Brand Logo & Red Convex LED */}
        <div className="tc-gauss-header">
          <span className="tc-gauss-brand">tc electronic</span>
          <div
            className="tc-gauss-led-wrap"
            onClick={(e) => {
              e.stopPropagation();
              onToggleEnabled(instance.id);
            }}
            title="Status LED (Click to toggle bypass)"
          >
            <div className={`tc-gauss-led ${isEnabled ? 'lit' : 'off'}`} />
          </div>
        </div>

        {/* 1. TOP ROW: DELAY (Left) and VOLUME (Right) */}
        <div className="tc-gauss-top-knobs">
          <div className="tc-gauss-knob-col">
            <span className="tc-gauss-knob-title">DELAY</span>
            <Knob
              label="DELAY"
              value={delayVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={4.5}
              formatValue={(v) => `${Math.round(50 + (v / 10) * 450)} ms`}
              onChange={(val) => onChangeParam(instance.id, 'delay', val)}
              variant="mxr"
              size={38}
              showLabel={false}
              showValue={false}
            />
          </div>

          <div className="tc-gauss-knob-col">
            <span className="tc-gauss-knob-title">VOLUME</span>
            <Knob
              label="VOLUME"
              value={volumeVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5.0}
              formatValue={(v) => `${Math.round((v / 10) * 100)}%`}
              onChange={(val) => onChangeParam(instance.id, 'volume', val)}
              variant="mxr"
              size={38}
              showLabel={false}
              showValue={false}
            />
          </div>
        </div>

        {/* 2. MIDDLE ROW: SUSTAIN (Center) and MOD Slide Switch (Right) */}
        <div className="tc-gauss-mid-row">
          <div className="tc-gauss-mid-spacer" />

          {/* SUSTAIN Knob */}
          <div className="tc-gauss-knob-col tc-gauss-sustain-col">
            <span className="tc-gauss-knob-title">SUSTAIN</span>
            <Knob
              label="SUSTAIN"
              value={sustainVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={4.0}
              formatValue={(v) => (v >= 9.2 ? 'RUNAWAY' : v.toFixed(1))}
              onChange={(val) => onChangeParam(instance.id, 'sustain', val)}
              variant="mxr"
              size={38}
              showLabel={false}
              showValue={false}
            />
          </div>

          {/* MOD Vertical Slide Switch */}
          <div
            className="tc-gauss-mod-switch-wrap"
            onClick={handleToggleMod}
            onPointerDown={(e) => e.stopPropagation()}
            title="Click to toggle Tape Modulation (Wow & Flutter)"
          >
            <span className={`mod-pos-label ${isModOn ? 'active' : ''}`}>MOD ON</span>
            <div className={`tc-gauss-slider-slot ${isModOn ? 'pos-on' : 'pos-off'}`}>
              <div className="tc-gauss-slider-knob" />
            </div>
            <span className={`mod-pos-label ${!isModOn ? 'active' : ''}`}>MOD OFF</span>
          </div>
        </div>

        {/* 3. GAUSS TAPE ECHO BADGE */}
        <div className="tc-gauss-badge-wrap">
          <svg viewBox="0 0 100 100" className="tc-gauss-badge-svg">
            <defs>
              {/* Arc purely confined to the bottom region (y between 70 and 85) */}
              <path id="tc-gauss-tape-arc" d="M 24,70 A 35 35 0 0 0 76,70" fill="none" />
            </defs>

            {/* Concentric Circles */}
            <circle cx="50" cy="50" r="45" fill="none" stroke="#688478" strokeWidth="1.2" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="#688478" strokeWidth="0.8" opacity="0.6" />

            {/* Acoustic Ray Lines above GAUSS */}
            <line x1="42" y1="30" x2="38" y2="26" stroke="#688478" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="50" y1="28" x2="50" y2="24" stroke="#688478" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="58" y1="30" x2="62" y2="26" stroke="#688478" strokeWidth="1.2" strokeLinecap="round" />

            {/* Acoustic Ray Lines below GAUSS (between GAUSS and TAPE ECHO) */}
            <line x1="42" y1="58" x2="38" y2="62" stroke="#688478" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="50" y1="60" x2="50" y2="64" stroke="#688478" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="58" y1="58" x2="62" y2="62" stroke="#688478" strokeWidth="1.2" strokeLinecap="round" />

            {/* Stylized GAUSS Center Text - Placed at y=45, never overlaps lower text */}
            <text
              x="50"
              y="45"
              textAnchor="middle"
              dominantBaseline="central"
              fill="#c8d6ce"
              fontSize="21"
              fontWeight="900"
              fontFamily="'Oswald', 'Impact', 'Arial Narrow', sans-serif"
              letterSpacing="2"
              textLength="54"
              lengthAdjust="spacingAndGlyphs"
            >
              GAUSS
            </text>

            {/* Curved Lower Banner Text: TAPE ECHO - Strictly positioned along bottom arc */}
            <text
              fill="#88a397"
              fontSize="7"
              fontWeight="800"
              fontFamily="var(--font-ui), sans-serif"
              letterSpacing="2"
            >
              <textPath href="#tc-gauss-tape-arc" startOffset="50%" textAnchor="middle">
                TAPE ECHO
              </textPath>
            </text>
          </svg>
        </div>

        {/* 4. FOOTSWITCH SECTION WITH SPEED STRIPES */}
        <div className="tc-gauss-bottom-section">
          <div className="tc-gauss-stripes" />

          {/* Stomp Footswitch */}
          <div className="tc-gauss-footswitch-wrap">
            <ClassicStompSwitch
              isEnabled={isEnabled}
              onToggle={() => onToggleEnabled(instance.id)}
              title="Toggle TC Electronic Gauss Tape Echo Bypass"
              idPrefix="tc-gauss"
              size={46}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
