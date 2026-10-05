import React from 'react';
import type { PedalInstance, PedalMetadata } from '../../types/pedal';
import { Knob } from '../common/Knob';
import { Power, X, Disc } from 'lucide-react';
import { getActiveCab } from '../../audio/pedals/CabPedalNode';

interface StompboxProps {
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

export const Stompbox: React.FC<StompboxProps> = ({
  instance,
  metadata,
  index,
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

  const isLeftPending = isJackPending?.(instance.id, 'in') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'out') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'in') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'out') ?? false;

  return (
    <div 
      className={`stompbox-enclosure ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={{
        '--pedal-accent': metadata.accentColor,
        background: metadata.chassisColor,
        ...style,
      } as React.CSSProperties}
      onPointerDown={onPointerDown}
    >
      {/* 1/4" Phone Jacks on sides */}
      <div 
        className={`stompbox-side-jack jack-left ${isLeftPending ? 'is-jack-pending' : ''} ${hasLeftCable ? 'has-cable' : ''}`}
        title="Audio Input Jack (1/4 in) - Click to connect or unplug cable"
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'in', e);
        }}
      />
      <div 
        className={`stompbox-side-jack jack-right ${isRightPending ? 'is-jack-pending' : ''} ${hasRightCable ? 'has-cable' : ''}`}
        title="Audio Output Jack (1/4 in) - Click to connect or unplug cable"
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'out', e);
        }}
      />

      {/* Corner screws */}
      <div className="pedal-screw screw-tl" />
      <div className="pedal-screw screw-tr" />
      <div className="pedal-screw screw-bl" />
      <div className="pedal-screw screw-br" />

      {/* Top Header Bar */}
      <div className="pedal-top-bar">
        <span className="pedal-index-badge">#{String(index).padStart(2, '0')}</span>

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

      {/* Pedal Name & Subtitle */}
      <div className="pedal-header-section">
        <h4 className="pedal-name">{metadata.name}</h4>
        <span className="pedal-subtitle">{metadata.subtitle}</span>
      </div>

      {/* Vintage Jewel Pilot Light Indicator */}
      <div 
        className="pedal-led-section"
        onClick={(e) => {
          e.stopPropagation();
          onToggleEnabled(instance.id);
        }}
        title={`Status: ${isEnabled ? 'ON (ACTIVE)' : 'OFF (BYPASS)'} - Click to toggle`}
      >
        <div className={`pedal-jewel-led ${isEnabled ? 'lit' : 'off'}`}>
          <div className="jewel-inner-facet" />
        </div>
        <span className={`led-label ${isEnabled ? 'label-on' : 'label-off'}`}>
          {isEnabled ? 'ACTIVE • ON' : 'BYPASS • OFF'}
        </span>
      </div>

      {/* Compact Parameter Knobs Grid */}
      <div className="pedal-knobs-section">
        <div className="pedal-knobs-grid">
          {metadata.parameters.map((p) => {
            const currentVal = instance.parameters[p.id] ?? p.defaultValue;
            return (
              <Knob
                key={p.id}
                label={p.name}
                value={currentVal}
                min={p.min}
                max={p.max}
                step={p.step}
                defaultValue={p.defaultValue}
                unit={p.unit}
                formatValue={p.formatValue}
                onChange={(newVal) => onChangeParam(instance.id, p.id, newVal)}
                disabled={false}
                color={metadata.accentColor}
                size={32}
              />
            );
          })}
        </div>

        {/* Custom IR Uploader for Cabinet Pedal */}
        {instance.type === 'cab' && (
          <div className="pedal-ir-uploader-wrap">
            <label className="pedal-ir-btn" title="Load custom cabinet impulse response (.wav)">
              <Disc size={11} strokeWidth={1.5} />
              <span>LOAD IR (.WAV)</span>
              <input
                type="file"
                accept=".wav,.mp3,.ogg"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const arrayBuffer = await file.arrayBuffer();
                    const cab = getActiveCab(instance.id);
                    if (cab) {
                      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                      const tempCtx = new AudioCtx();
                      const decoded = await tempCtx.decodeAudioData(arrayBuffer);
                      cab.setCustomIR(decoded, file.name);
                      onChangeParam(instance.id, 'model', 3);
                      await tempCtx.close();
                    }
                  } catch (err) {
                    console.error('Failed to load IR:', err);
                    alert('Failed to load IR file. Please ensure standard .wav audio format.');
                  }
                }}
              />
            </label>
          </div>
        )}
      </div>

      {/* Footswitch Stomp Section */}
      <div className="pedal-footswitch-section" onPointerDown={(e) => e.stopPropagation()}>
        <button
          className={`pedal-footswitch ${isEnabled ? 'engaged' : ''}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title={`Click to ${isEnabled ? 'Bypass' : 'Engage'} pedal`}
        >
          <div className="footswitch-washer" />
          <div className="footswitch-plunger">
            <Power size={13} strokeWidth={1.5} className="footswitch-icon" />
          </div>
        </button>
        <span className="footswitch-label">TRUE BYPASS</span>
      </div>
    </div>
  );
};
