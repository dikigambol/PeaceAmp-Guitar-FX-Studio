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

export const RangemasterPedal: React.FC<PedalProps> = ({
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
  const setVal = instance.parameters['set'] ?? 5;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-rangemaster ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
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

      {/* Decorative Outer Border Frame */}
      <div className="rangemaster-border-frame">
        {/* Header Block */}
        <div className="rangemaster-header">
          <div className="rangemaster-title-row">
            <span className="rangemaster-bracket">[</span>
            <span className="rangemaster-title">RANGEMASTER</span>
            <span className="rangemaster-bracket">]</span>
          </div>
          <div className="rangemaster-subtitle">TREBLE BOOSTER</div>
        </div>

        {/* SET Label and Knob Stage */}
        <div className="rangemaster-knob-section">
          <span className="rangemaster-set-label">SET</span>

          <div className="rangemaster-knob-row">
            {/* Left Chassis Screw */}
            <div className="rangemaster-screw screw-left" title="Mounting hardware">
              <div className="screw-groove" />
            </div>

            {/* Authentic Vintage Bakelite Slotted Knob */}
            <div className="rangemaster-knob-wrap">
              <Knob
                label="SET"
                value={setVal}
                min={0}
                max={10}
                step={0.1}
                defaultValue={5}
                formatValue={(v) => `+${(v * 2.8).toFixed(1)} dB`}
                onChange={(val) => onChangeParam(instance.id, 'set', val)}
                variant="proco-rat"
                size={48}
                showLabel={false}
                showValue={false}
              />
            </div>

            {/* Right Chassis Screw */}
            <div className="rangemaster-screw screw-right" title="Mounting hardware">
              <div className="screw-groove" />
            </div>
          </div>
        </div>

        {/* Musical Stave & Treble Notes Art Graphic */}
        <div className="rangemaster-stave-art">
          <svg
            viewBox="0 0 140 68"
            className="rangemaster-stave-svg"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* 5 Angled Music Stave Lines */}
            <line x1="12" y1="56" x2="132" y2="39" stroke="#18181b" strokeWidth="1.6" />
            <line x1="12" y1="50" x2="132" y2="33" stroke="#18181b" strokeWidth="1.6" />
            <line x1="12" y1="44" x2="132" y2="27" stroke="#18181b" strokeWidth="1.6" />
            <line x1="12" y1="38" x2="132" y2="21" stroke="#18181b" strokeWidth="1.6" />
            <line x1="12" y1="32" x2="132" y2="15" stroke="#18181b" strokeWidth="1.6" />

            {/* Musical Notes Ascending */}
            {/* Note 1 (Low Left) */}
            <ellipse cx="28" cy="52" rx="4.5" ry="3.2" transform="rotate(-15 28 52)" fill="#18181b" />
            <line x1="31.5" y1="51" x2="31.5" y2="24" stroke="#18181b" strokeWidth="1.6" />

            {/* Note 2 */}
            <ellipse cx="50" cy="45" rx="4.5" ry="3.2" transform="rotate(-15 50 45)" fill="#18181b" />
            <line x1="53.5" y1="44" x2="53.5" y2="17" stroke="#18181b" strokeWidth="1.6" />

            {/* Note 3 */}
            <ellipse cx="74" cy="38" rx="4.5" ry="3.2" transform="rotate(-15 74 38)" fill="#18181b" />
            <line x1="77.5" y1="37" x2="77.5" y2="10" stroke="#18181b" strokeWidth="1.6" />
            <path d="M 77.5 10 Q 86 12 85 18" stroke="#18181b" strokeWidth="1.6" fill="none" />

            {/* Note 4 */}
            <ellipse cx="98" cy="31" rx="4.5" ry="3.2" transform="rotate(-15 98 31)" fill="#18181b" />
            <line x1="101.5" y1="30" x2="101.5" y2="3" stroke="#18181b" strokeWidth="1.6" />

            {/* Note 5 (High Right) */}
            <ellipse cx="118" cy="23" rx="4.5" ry="3.2" transform="rotate(-15 118 23)" fill="#18181b" />
            <line x1="121.5" y1="22" x2="121.5" y2="-3" stroke="#18181b" strokeWidth="1.6" />
          </svg>
        </div>

        {/* Vintage Pilot Jewel LED (Red / Amber Germanium Indicator) */}
        <div
          className="rangemaster-led-mount"
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title="Status Indicator (Click to toggle bypass)"
        >
          <div className={`rangemaster-led ${isEnabled ? 'lit' : 'off'}`}>
            <div className="rangemaster-led-reflection" />
          </div>
        </div>

        {/* Chrome Footswitch Assembly */}
        <div className="rangemaster-switch-wrap">
          <ClassicStompSwitch
            isEnabled={isEnabled}
            onToggle={() => onToggleEnabled(instance.id)}
            title="Toggle Rangemaster Treble Booster Bypass"
            idPrefix="rangemaster"
            size={46}
          />
        </div>

        {/* BOOST Label */}
        <div className="rangemaster-boost-label">BOOST</div>

        {/* British Pedal Company Script */}
        <div className="rangemaster-footer-script">
          <span>British Pedal Company</span>
        </div>
      </div>

      {/* Side Jack Stamped Text */}
      <div className="rangemaster-side-label-left">- OUTPUT -</div>
      <div className="rangemaster-side-label-right">- INPUT -</div>
    </div>
  );
};
