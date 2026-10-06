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

// Calibrated Radial Dial Ring with Ticks and Numbers (0 to 10) for Nobels Knobs
const NobelsDialRing: React.FC = () => (
  <svg viewBox="0 0 54 54" className="nobels-dial-scale-svg" aria-hidden="true">
    {/* Radial tick marks around 280-degree rotation arc */}
    {Array.from({ length: 11 }).map((_, i) => {
      // 0 is at 220 deg, 10 is at 320 deg (span of 260 deg)
      const angleDeg = 140 + i * 26;
      const angleRad = (angleDeg * Math.PI) / 180;
      const rInner = i % 2 === 0 ? 19 : 20.5;
      const rOuter = 22.5;
      const x1 = 27 + rInner * Math.cos(angleRad);
      const y1 = 27 + rInner * Math.sin(angleRad);
      const x2 = 27 + rOuter * Math.cos(angleRad);
      const y2 = 27 + rOuter * Math.sin(angleRad);
      return (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#e5e7eb"
          strokeWidth={i % 2 === 0 ? 1.1 : 0.8}
          opacity={0.85}
        />
      );
    })}
    {/* Key Numbers around the perimeter */}
    <text x="7" y="42" fill="#e5e7eb" fontSize="5.2" fontWeight="700" textAnchor="middle" opacity="0.9">0</text>
    <text x="6" y="27" fill="#e5e7eb" fontSize="5.2" fontWeight="700" textAnchor="middle" opacity="0.9">2</text>
    <text x="14" y="12" fill="#e5e7eb" fontSize="5.2" fontWeight="700" textAnchor="middle" opacity="0.9">4</text>
    <text x="40" y="12" fill="#e5e7eb" fontSize="5.2" fontWeight="700" textAnchor="middle" opacity="0.9">6</text>
    <text x="48" y="27" fill="#e5e7eb" fontSize="5.2" fontWeight="700" textAnchor="middle" opacity="0.9">8</text>
    <text x="47" y="42" fill="#e5e7eb" fontSize="5.2" fontWeight="700" textAnchor="middle" opacity="0.9">10</text>
  </svg>
);

export const NobelsOdr1Pedal: React.FC<PedalProps> = ({
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
  const driveVal = instance.parameters['drive'] ?? 5;
  const specVal = instance.parameters['spectrum'] ?? 5;
  const levelVal = instance.parameters['level'] ?? 5;
  const bassCutVal = instance.parameters['bassCut'] ?? 0;
  const gainBoostVal = instance.parameters['gainBoost'] ?? 0;

  const isLeftPending = isJackPending?.(instance.id, 'in') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'out') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'in') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'out') ?? false;

  const isGainBoost = gainBoostVal >= 0.5;

  return (
    <div
      className={`pedal-custom-enclosure pedal-nobels-odr1 ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* 4 Chassis Corner Screws */}
      <div className="pedal-screw screw-tl" />
      <div className="pedal-screw screw-tr" />
      <div className="pedal-screw screw-bl" />
      <div className="pedal-screw screw-br" />

      {/* 1/4" Side Audio Phone Jacks */}
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

      {/* Top Header Bar */}
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

      {/* Top Matte Black Recessed Control Faceplate */}
      <div className="nobels-black-plate">
        {/* Top Silkscreen Banner */}
        <div className="nobels-top-banner">
          <span className="nobels-txt">OUT</span>
          <span className="nobels-txt">REMOTE</span>
          <span className="nobels-txt">DC 9-18V</span>
          <span className="nobels-txt">IN</span>
        </div>
        <div className="nobels-banner-divider" />

        {/* Auxiliary Controls Row: BASS CUT Mini Knob, GAIN BOOST Push/Toggle, and ON LED */}
        <div className="nobels-aux-row">
          {/* 1. BASS CUT Mini Rotary Knob */}
          <div className="nobels-basscut-group">
            <span className="nobels-aux-title">BASS CUT</span>
            <div className="nobels-basscut-control">
              <span className="nobels-sub-lbl">FULL</span>
              <div className="nobels-mini-knob-wrap">
                <Knob
                  label="BASS CUT"
                  value={bassCutVal}
                  min={0}
                  max={10}
                  step={0.1}
                  size={22}
                  variant="nobels"
                  showLabel={false}
                  showValue={false}
                  onChange={(v) => onChangeParam(instance.id, 'bassCut', v)}
                />
              </div>
              <span className="nobels-sub-lbl">CUT</span>
            </div>
          </div>

          {/* 2. GAIN BOOST Tactile Push/Toggle Switch */}
          <div className="nobels-gainboost-group">
            <span className="nobels-aux-title">GAIN BOOST</span>
            <button
              type="button"
              className={`nobels-mini-push nobels-gainboost-btn ${isGainBoost ? 'is-active' : ''}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onChangeParam(instance.id, 'gainBoost', isGainBoost ? 0 : 1);
              }}
              title={`Gain Boost: ${isGainBoost ? 'ON (+5dB)' : 'OFF'} - Click to toggle`}
            >
              <div className="nobels-push-collar">
                <div className="nobels-push-dot" />
              </div>
            </button>
          </div>

          {/* 3. Yellow-Green Power/Status LED */}
          <div
            className="nobels-led-mount"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleEnabled(instance.id);
            }}
            title="Click to toggle bypass"
          >
            <div className={`nobels-green-led ${isEnabled ? 'lit' : 'off'}`} />
            <span className="nobels-led-txt">ON</span>
          </div>
        </div>

        {/* Main Knobs Row: DRIVE, SPECTRUM, LEVEL with Calibrated Dial Scales */}
        <div className="nobels-knobs-row">
          {/* Drive Knob */}
          <div className="nobels-knob-col">
            <div className="nobels-knob-ring-wrap">
              <NobelsDialRing />
              <Knob
                label="DRIVE"
                value={driveVal}
                min={0}
                max={10}
                step={0.1}
                size={34}
                variant="nobels"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'drive', v)}
              />
            </div>
            <span className="nobels-knob-lbl">DRIVE</span>
          </div>

          {/* Spectrum Knob */}
          <div className="nobels-knob-col">
            <div className="nobels-knob-ring-wrap">
              <NobelsDialRing />
              <Knob
                label="SPECTRUM"
                value={specVal}
                min={0}
                max={10}
                step={0.1}
                size={34}
                variant="nobels"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'spectrum', v)}
              />
            </div>
            <span className="nobels-knob-lbl">SPECTRUM</span>
          </div>

          {/* Level Knob */}
          <div className="nobels-knob-col">
            <div className="nobels-knob-ring-wrap">
              <NobelsDialRing />
              <Knob
                label="LEVEL"
                value={levelVal}
                min={0}
                max={10}
                step={0.1}
                size={34}
                variant="nobels"
                showLabel={false}
                showValue={false}
                onChange={(v) => onChangeParam(instance.id, 'level', v)}
              />
            </div>
            <span className="nobels-knob-lbl">LEVEL</span>
          </div>
        </div>

        {/* ODR-1X Bottom Left Model Badge */}
        <div className="nobels-plate-footer">
          <span className="nobels-sub-badge">ODR-1X</span>
        </div>
      </div>

      {/* Middle Hinged Battery Compartment Door with Red Starburst Sticker */}
      <div className="nobels-mid-lid">
        <div className="nobels-lid-content">
          <div className="nobels-brand-row">
            <span className="nobels-brand">Nobels</span>
          </div>
          <div className="nobels-lid-divider" />
          <div className="nobels-model-line">
            <div className="nobels-model-left">
              <span className="nobels-odr1">ODR-1</span>
              <span className="nobels-x">X</span>
            </div>
            {/* Red Starburst True Bypass Badge */}
            <div className="nobels-starburst-wrap" title="True Bypass Switch Inside">
              <svg viewBox="0 0 46 46" className="nobels-starburst-svg" aria-hidden="true">
                {/* 16-point serrated starburst */}
                <polygon
                  points="23,1 27,8 35,5 36,13 44,14 42,22 46,27 41,33 42,41 34,40 31,46 23,43 15,46 12,40 4,41 5,33 0,27 4,22 2,14 10,13 11,5 19,8"
                  fill="#dc2626"
                  stroke="#b91c1c"
                  strokeWidth="0.8"
                />
                <text x="23" y="16" fill="#ffffff" fontSize="4" fontWeight="800" textAnchor="middle">TRUE BYPASS</text>
                <text x="23" y="23" fill="#ffffff" fontSize="4.2" fontWeight="900" textAnchor="middle">SWITCH</text>
                <text x="23" y="30" fill="#ffffff" fontSize="4" fontWeight="800" textAnchor="middle">INSIDE</text>
              </svg>
            </div>
          </div>
          <div className="nobels-desc">Natural OVERDRIVE</div>
        </div>

        {/* Molded Right Door Hinge Knuckles */}
        <div className="nobels-hinge-col">
          <div className="nobels-hinge-knuckle" />
          <div className="nobels-hinge-knuckle" />
        </div>
      </div>

      {/* Lower Rubber Foot Treadle Button with Embossed Nobels "N" Logo */}
      <button
        type="button"
        className={`nobels-treadle ${isEnabled ? 'pressed' : ''}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggleEnabled(instance.id);
        }}
        title="Click to toggle ODR-1 bypass"
      >
        <div className="nobels-treadle-inner">
          {/* Authentic Nobels cursive "N" / Greek eta embossed mark */}
          <svg viewBox="0 0 60 70" className="nobels-n-logo-svg" aria-hidden="true">
            {/* Drop Shadow / Emboss Underlay */}
            <path
              d="M 19 50 C 17 36, 18 24, 24 16 C 28 10, 34 11, 36 18 C 38 26, 37 40, 37 50"
              fill="none"
              stroke="rgba(0,0,0,0.8)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M 29 46 L 45 40"
              fill="none"
              stroke="rgba(0,0,0,0.8)"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            {/* Top Highlight Highlight */}
            <path
              d="M 18.5 49 C 16.5 35.5, 17.5 23.5, 23.5 15.5 C 27.5 9.5, 33.5 10.5, 35.5 17.5 C 37.5 25.5, 36.5 39.5, 36.5 49"
              fill="none"
              stroke="#0f141c"
              strokeWidth="4.2"
              strokeLinecap="round"
            />
            <path
              d="M 28.5 45 L 44.5 39"
              fill="none"
              stroke="#0f141c"
              strokeWidth="3.8"
              strokeLinecap="round"
            />
            {/* Bevel Rim Light */}
            <path
              d="M 18 48 C 16 35, 17 23, 23 15 C 27 9, 33 10, 35 17 C 37 25, 36 39, 36 48"
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </button>
    </div>
  );
};
