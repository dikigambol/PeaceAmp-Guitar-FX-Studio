import React from 'react';
import type { PedalInstance, PedalMetadata } from '../../../types/pedal';
import { Knob } from '../../common/Knob';
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

/**
 * Marshall ShredMaster (1991)
 * 
 * Authentic visual replica of the legendary British high-gain wedge distortion pedal:
 * - Satin-black heavy folded sheet-steel enclosure with side flange wings.
 * - Slanted top control panel with 5 classic Marshall JCM-style fluted knobs:
 *     * Gain
 *     * Bass
 *     * Contour (the iconic Marshall mid-scoop/boost network)
 *     * Treble
 *     * Volume
 * - Iconic gold "SHRED MASTER" silkscreen branding with double frame rules.
 * - Central red status LED above vintage chrome Carling-style stomp switch.
 * - Massive embossed vintage Marshall script logo across the lower steel deck.
 */
export const MarshallShredMasterPedal: React.FC<PedalProps> = ({
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
  const gainVal = instance.parameters['gain'] ?? 6;
  const bassVal = instance.parameters['bass'] ?? 5;
  const contourVal = instance.parameters['contour'] ?? 5;
  const trebleVal = instance.parameters['treble'] ?? 5;
  const volumeVal = instance.parameters['volume'] ?? 5;

  const isLeftPending = isJackPending?.(instance.id, 'in') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'out') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'in') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'out') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-marshall-shredmaster ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      data-pedal-id={instance.id}
    >
      {/* 1/4" Side Patch Jacks */}
      <div
        className={`stompbox-side-jack jack-left ${isLeftPending ? 'is-jack-pending' : ''} ${hasLeftCable ? 'has-cable' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'in', e);
        }}
        title="Audio Input Jack (Left) - Click to patch cable"
      />

      <div
        className={`stompbox-side-jack jack-right ${isRightPending ? 'is-jack-pending' : ''} ${hasRightCable ? 'has-cable' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'out', e);
        }}
        title="Audio Output Jack (Right) - Click to patch cable"
      />

      {/* Top Header with Close Button */}
      <div className="pedal-top-bar shredmaster-top-bar">
        <button
          type="button"
          className="pedal-mini-btn pedal-close-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(instance.id);
          }}
          title="Remove Marshall ShredMaster from board"
        >
          <X size={12} strokeWidth={1.5} />
        </button>
      </div>

      {/* Slanted Upper Control Deck */}
      <div className="shredmaster-slanted-deck">
        {/* Row of 5 Marshall Fluted Knobs */}
        <div className="shredmaster-knobs-row">
          {/* Knob 1: Gain */}
          <div className="shredmaster-knob-col">
            <div className="shredmaster-dial-wrap">
              <Knob
                label="Gain"
                value={gainVal}
                min={0}
                max={10}
                step={0.1}
                size={30}
                variant="marshall-black"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'gain', v)}
              />
            </div>
          </div>

          {/* Knob 2: Bass */}
          <div className="shredmaster-knob-col">
            <div className="shredmaster-dial-wrap">
              <Knob
                label="Bass"
                value={bassVal}
                min={0}
                max={10}
                step={0.1}
                size={30}
                variant="marshall-black"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'bass', v)}
              />
            </div>
          </div>

          {/* Knob 3: Contour */}
          <div className="shredmaster-knob-col">
            <div className="shredmaster-dial-wrap">
              <Knob
                label="Contour"
                value={contourVal}
                min={0}
                max={10}
                step={0.1}
                size={30}
                variant="marshall-black"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'contour', v)}
              />
            </div>
          </div>

          {/* Knob 4: Treble */}
          <div className="shredmaster-knob-col">
            <div className="shredmaster-dial-wrap">
              <Knob
                label="Treble"
                value={trebleVal}
                min={0}
                max={10}
                step={0.1}
                size={30}
                variant="marshall-black"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'treble', v)}
              />
            </div>
          </div>

          {/* Knob 5: Volume */}
          <div className="shredmaster-knob-col">
            <div className="shredmaster-dial-wrap">
              <Knob
                label="Volume"
                value={volumeVal}
                min={0}
                max={10}
                step={0.1}
                size={30}
                variant="marshall-black"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'volume', v)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Gold Silkscreen Branding Section */}
      <div className="shredmaster-branding-section">
        {/* Top Labels Row aligned under respective knobs */}
        <div className="shredmaster-labels-row">
          <span>Gain</span>
          <span>Bass</span>
          <span>Contour</span>
          <span>Treble</span>
          <span>Volume</span>
        </div>

        {/* Gold Silkscreen Horizontal Rule under knob labels */}
        <div className="shredmaster-labels-line" />

        {/* Gold Framing Rule & Title */}
        <div className="shredmaster-title-row">
          <div className="shredmaster-title-line-left" />
          <span className="shredmaster-title-text">SHRED MASTER</span>
          <div className="shredmaster-title-line-right" />
        </div>
      </div>

      {/* Lower Flat Foot Deck */}
      <div className="shredmaster-lower-deck">
        {/* Status LED */}
        <div
          className="shredmaster-led-wrap"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title="Status LED (Click to toggle bypass)"
        >
          <div className={`shredmaster-led ${isEnabled ? 'lit' : 'off'}`} />
        </div>

        {/* Vintage Carling-Style Chrome Stomp Switch (OCD 3PDT Design) */}
        <div className="ocd-stomp-wrap shredmaster-stomp-wrap" onPointerDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`ocd-stomp-switch shredmaster-stomp-switch ${isEnabled ? 'active' : ''}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleEnabled(instance.id);
            }}
            title="Toggle Marshall ShredMaster Bypass"
          >
            <svg viewBox="0 0 52 52" className="ocd-stomp-svg shredmaster-stomp-svg" aria-hidden="true">
              <defs>
                <linearGradient id="shred-hex-grad" x1="20%" y1="0%" x2="80%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="25%" stopColor="#d1d5db" />
                  <stop offset="50%" stopColor="#9ca3af" />
                  <stop offset="75%" stopColor="#6b7280" />
                  <stop offset="100%" stopColor="#4b5563" />
                </linearGradient>
                <linearGradient id="shred-hex-chamfer" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
                </linearGradient>
                <radialGradient id="shred-collar-grad" cx="40%" cy="35%" r="60%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="45%" stopColor="#e5e7eb" />
                  <stop offset="75%" stopColor="#9ca3af" />
                  <stop offset="100%" stopColor="#4b5563" />
                </radialGradient>
                <radialGradient id="shred-plunger-grad" cx="38%" cy="35%" r="62%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="35%" stopColor="#e2e8f0" />
                  <stop offset="65%" stopColor="#94a3b8" />
                  <stop offset="90%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#475569" />
                </radialGradient>
                <filter id="shred-stomp-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.45" />
                </filter>
              </defs>
              {/* Hex Nut Outer with Shadow */}
              <polygon
                points="43.2,35.5 26,46 8.8,35.5 8.8,14.5 26,4 43.2,14.5"
                fill="url(#shred-hex-grad)"
                stroke="#374151"
                strokeWidth="1"
                filter="url(#shred-stomp-shadow)"
              />
              {/* Inner Hex Chamfer Bevel */}
              <polygon
                points="41.5,34.5 26,44 10.5,34.5 10.5,15.5 26,6 41.5,15.5"
                fill="none"
                stroke="url(#shred-hex-chamfer)"
                strokeWidth="1.2"
              />
              {/* Threaded Collar Ring */}
              <circle cx="26" cy="25" r="14.5" fill="url(#shred-collar-grad)" stroke="#374151" strokeWidth="1" />
              <circle cx="26" cy="25" r="13" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.8" />
              {/* Collar Alignment Key Notch at 12 o'clock */}
              <rect x="24.8" y="10.5" width="2.4" height="3" fill="#1f2937" rx="0.5" />
              {/* Central Plunger Actuator Button */}
              <circle
                className="ocd-plunger-disc"
                cx="26"
                cy="25"
                r="10"
                fill="url(#shred-plunger-grad)"
                stroke="#374151"
                strokeWidth="0.9"
              />
              {/* Concentric Machined Texture Rings */}
              <circle cx="26" cy="25" r="8" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
              <circle cx="26" cy="25" r="5" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="0.6" />
              {/* Specular Glint */}
              <ellipse cx="23.5" cy="22" rx="3.5" ry="2" fill="rgba(255,255,255,0.45)" />
            </svg>
          </button>
        </div>

        {/* Embossed Marshall Script Logo */}
        <div className="shredmaster-logo-container">
          <svg viewBox="0 0 200 60" className="shredmaster-marshall-logo-svg">
            <defs>
              <filter id="marshall-emboss-filter" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="0.8" floodColor="rgba(255,255,255,0.25)" />
                <feDropShadow dx="0" dy="-2" stdDeviation="1.5" floodColor="rgba(0,0,0,0.95)" />
              </filter>
            </defs>
            <text
              x="50%"
              y="44"
              textAnchor="middle"
              fontFamily="'Brush Script MT', 'Lucida Calligraphy', cursive, serif"
              fontStyle="italic"
              fontWeight="bold"
              fontSize="48"
              letterSpacing="1"
              fill="#22252a"
              stroke="#0f1114"
              strokeWidth="1.2"
              filter="url(#marshall-emboss-filter)"
            >
              Marshall
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
};
