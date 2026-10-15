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

export const TcSparkMiniPedal: React.FC<PedalProps> = ({
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
  const levelVal = instance.parameters['level'] ?? 5;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  return (
    <div
      className={`pedal-custom-enclosure pedal-tc-spark ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={{ ...style, width: 140 }}
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

      {/* Main Filigree Gold Engraved Faceplate */}
      <div className="spark-faceplate-art">
        {/* Top LEVEL Arc Label */}
        <div className="spark-top-level-label">LEVEL</div>

        {/* Large Cream Knob */}
        <div className="spark-knob-container">
          <Knob
            label="LEVEL"
            value={levelVal}
            min={0}
            max={10}
            step={0.1}
            defaultValue={5}
            formatValue={(v) => `+${(v * 2.0).toFixed(1)} dB`}
            onChange={(val) => onChangeParam(instance.id, 'level', val)}
            variant="tc-spark"
            size={58}
            showLabel={false}
            showValue={false}
          />
        </div>

        {/* SPARK Gold Ribbon Banner */}
        <div className="spark-banner-wrap">
          <div className="spark-banner-gold">
            <span className="spark-banner-text">SPARK</span>
          </div>
          <div className="spark-sub-pill">
            <span>MINI BOOSTER</span>
          </div>
        </div>

        {/* Center Green LED Indicator */}
        <div
          className="spark-led-mount"
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title="Status Indicator (Click to toggle bypass)"
        >
          <div className="spark-led-bezel">
            <div className={`spark-green-led ${isEnabled ? 'lit' : 'off'}`} />
          </div>
        </div>

        {/* Middle Spec Badge: 20 dB DISCRETE ANALOG CIRCUIT */}
        <div className="spark-badges-row">
          <div className="spark-badge-col">
            <div className="spark-laurel-val">20</div>
            <div className="spark-ribbon-tag">DISCRETE</div>
          </div>

          <div className="spark-analog-center">ANALOG</div>

          <div className="spark-badge-col">
            <div className="spark-laurel-val">dB</div>
            <div className="spark-ribbon-tag">CIRCUIT</div>
          </div>
        </div>

        {/* TRUE BYPASS Arched Banner */}
        <div className="spark-true-bypass-ribbon">
          <span>TRUE BYPASS</span>
        </div>

        {/* TC Electronic PrimeTech Footswitch & Sunburst Ring */}
        <div className="spark-switch-section">
          <div className="spark-sunburst-halo">
            <button
              type="button"
              className={`spark-primetech-switch ${isEnabled ? 'active' : ''}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleEnabled(instance.id);
              }}
              title="Toggle Spark Mini Booster Bypass (PrimeTech)"
            >
              <div className="spark-switch-collar">
                <div className="collar-prong prong-top" />
                <div className="collar-prong prong-bottom" />
                <div className="collar-prong prong-left" />
                <div className="collar-prong prong-right" />
              </div>
              <div className="spark-switch-cap" />
            </button>
          </div>
        </div>

        {/* Bottom TC Electronic Logo */}
        <div className="spark-bottom-brand">
          <span className="spark-brand-logo">tc electronic</span>
        </div>
      </div>

      {/* Side Port Labels */}
      <div className="spark-side-label-out">OUT</div>
      <div className="spark-side-label-in">IN</div>
    </div>
  );
};
