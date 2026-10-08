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

export const FuzzFactoryPedal: React.FC<PedalProps> = ({
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
  const volVal = instance.parameters['vol'] ?? 5;
  const gateVal = instance.parameters['gate'] ?? 4;
  const compVal = instance.parameters['comp'] ?? 3;
  const driveVal = instance.parameters['drive'] ?? 6;
  const stabVal = instance.parameters['stab'] ?? 8.5;

  const isLeftPending = isJackPending?.(instance.id, 'in') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'out') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'in') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'out') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-fuzzfactory ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* 1/4" Side Phone Jacks for Patching Cables */}
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

      {/* Top Header Toolstrip with Big Muff style close button */}
      <div className="pedal-top-bar ff-top-bar">
        <button
          className="pedal-mini-btn pedal-close-btn"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(instance.id);
          }}
          title="Remove Fuzz Factory"
        >
          <X size={12} strokeWidth={1.5} />
        </button>
      </div>

      {/* Main Brushed Silver Horizontal Faceplate Card */}
      <div className="fuzzfactory-faceplate">
        {/* Top 5 Knobs Row: Vol, Gate, Comp, Drive, Stab */}
        <div className="ff-knobs-row">
          <div className="ff-knob-col">
            <Knob
              label=""
              value={volVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5}
              size={38}
              variant="fuzzfactory"
              showValue={false}
              showLabel={false}
              onChange={(val) => onChangeParam(instance.id, 'vol', val)}
            />
            <span className="ff-knob-name">Vol</span>
          </div>

          <div className="ff-knob-col">
            <Knob
              label=""
              value={gateVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={4}
              size={38}
              variant="fuzzfactory"
              showValue={false}
              showLabel={false}
              onChange={(val) => onChangeParam(instance.id, 'gate', val)}
            />
            <span className="ff-knob-name">gate</span>
          </div>

          <div className="ff-knob-col">
            <Knob
              label=""
              value={compVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={3}
              size={38}
              variant="fuzzfactory"
              showValue={false}
              showLabel={false}
              onChange={(val) => onChangeParam(instance.id, 'comp', val)}
            />
            <span className="ff-knob-name">comp</span>
          </div>

          <div className="ff-knob-col">
            <Knob
              label=""
              value={driveVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={6}
              size={38}
              variant="fuzzfactory"
              showValue={false}
              showLabel={false}
              onChange={(val) => onChangeParam(instance.id, 'drive', val)}
            />
            <span className="ff-knob-name">drive</span>
          </div>

          <div className="ff-knob-col">
            <Knob
              label=""
              value={stabVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={8.5}
              size={38}
              variant="fuzzfactory"
              showValue={false}
              showLabel={false}
              onChange={(val) => onChangeParam(instance.id, 'stab', val)}
            />
            <span className="ff-knob-name">stab</span>
          </div>
        </div>

        {/* Lower Graphic & Control Deck */}
        <div className="ff-bottom-deck">
          {/* Left: Psychedelic Bubble Typography "FUZZ FACTORY" */}
          <div className="ff-psychedelic-logo">
            <div className="ff-bubble-fuzz">FUZZ</div>
            <div className="ff-bubble-factory">FACTORY</div>
          </div>

          {/* Center: Saturn Planet Symbol, Red Pilot LED, and 3PDT Chrome Switch */}
          <div className="ff-center-actuator">
            <div className="ff-saturn-led-mount">
              {/* Saturn Orbit Graphic */}
              <svg viewBox="0 0 28 14" className="ff-saturn-svg" aria-hidden="true">
                <ellipse cx="14" cy="7" rx="12" ry="4.5" fill="none" stroke="#1e293b" strokeWidth="1.2" transform="rotate(-15 14 7)" />
                <circle cx="14" cy="7" r="4.2" fill="#1e293b" />
                <line x1="12" y1="5.5" x2="16" y2="8.5" stroke="#ffffff" strokeWidth="0.8" />
              </svg>
              {/* Red Indicator Pilot LED */}
              <div className={`ff-pilot-led ${isEnabled ? 'lit' : 'off'}`} />
            </div>

            {/* Classic 3PDT Chrome Footswitch (Exact Big Muff Stomp Assembly) */}
            <div className="classic-stomp-wrap" onPointerDown={(e) => e.stopPropagation()}>
              <button
                className={`classic-stomp-switch ocd-stomp-switch ${isEnabled ? 'active' : ''}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleEnabled(instance.id);
                }}
                title={isEnabled ? 'Click to bypass' : 'Click to engage Fuzz Factory'}
              >
                <svg viewBox="0 0 52 52" className="classic-stomp-svg ocd-stomp-svg" aria-hidden="true">
                  <defs>
                    <linearGradient id="ff-hex-grad" x1="20%" y1="0%" x2="80%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="25%" stopColor="#d1d5db" />
                      <stop offset="50%" stopColor="#9ca3af" />
                      <stop offset="75%" stopColor="#6b7280" />
                      <stop offset="100%" stopColor="#4b5563" />
                    </linearGradient>
                    <linearGradient id="ff-hex-chamfer" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
                      <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
                    </linearGradient>
                    <radialGradient id="ff-collar-grad" cx="40%" cy="35%" r="60%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="45%" stopColor="#e5e7eb" />
                      <stop offset="75%" stopColor="#9ca3af" />
                      <stop offset="100%" stopColor="#4b5563" />
                    </radialGradient>
                    <radialGradient id="ff-plunger-grad" cx="38%" cy="35%" r="62%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="35%" stopColor="#e2e8f0" />
                      <stop offset="65%" stopColor="#94a3b8" />
                      <stop offset="90%" stopColor="#64748b" />
                      <stop offset="100%" stopColor="#475569" />
                    </radialGradient>
                    <filter id="ff-stomp-shadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.5" />
                    </filter>
                  </defs>
                  {/* Hex Nut Outer with Shadow */}
                  <polygon
                    points="43.2,35.5 26,46 8.8,35.5 8.8,14.5 26,4 43.2,14.5"
                    fill="url(#ff-hex-grad)"
                    stroke="#374151"
                    strokeWidth="1"
                    filter="url(#ff-stomp-shadow)"
                  />
                  {/* Inner Hex Chamfer Bevel */}
                  <polygon
                    points="41.5,34.5 26,44 10.5,34.5 10.5,15.5 26,6 41.5,15.5"
                    fill="none"
                    stroke="url(#ff-hex-chamfer)"
                    strokeWidth="1.2"
                  />
                  {/* Threaded Collar Ring */}
                  <circle cx="26" cy="25" r="14.5" fill="url(#ff-collar-grad)" stroke="#374151" strokeWidth="1" />
                  <circle cx="26" cy="25" r="13" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.8" />
                  {/* Collar Alignment Key Notch at 12 o'clock */}
                  <rect x="24.8" y="10.5" width="2.4" height="3" fill="#1f2937" rx="0.5" />
                  {/* Central Plunger Actuator Button */}
                  <g className="classic-plunger-disc ocd-plunger-disc">
                    <circle cx="26" cy="25" r="10.5" fill="url(#ff-plunger-grad)" stroke="#1e293b" strokeWidth="1" />
                    <circle cx="24.5" cy="23.5" r="8" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" />
                    <ellipse cx="23" cy="21.5" rx="3.5" ry="2" fill="rgba(255,255,255,0.5)" />
                  </g>
                </svg>
              </button>
            </div>
          </div>

          {/* Right: VEXTER SERIES ZVEX EFFECTS Branding */}
          <div className="ff-branding-right">
            <span className="ff-vexter-label">VEXTER SERIES</span>
            <span className="ff-zvex-logo">ZVEX</span>
            <span className="ff-effects-label">EFFECTS</span>
          </div>
        </div>

        {/* Hand-drawn OUT and IN labels by side jacks */}
        <span className="ff-io-handwrite left">OUT</span>
        <span className="ff-io-handwrite right">IN</span>
      </div>
    </div>
  );
};
