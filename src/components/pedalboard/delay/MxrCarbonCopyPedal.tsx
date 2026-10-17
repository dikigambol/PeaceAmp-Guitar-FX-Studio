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

export const MxrCarbonCopyPedal: React.FC<PedalProps> = ({
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
  const regenVal = instance.parameters['regen'] ?? 4.5;
  const mixVal = instance.parameters['mix'] ?? 5.0;
  const delayVal = instance.parameters['delay'] ?? 5.0;
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
      className={`pedal-custom-enclosure pedal-mxr-carbon-copy ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      data-pedal-id={instance.id}
    >
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

      {/* Stamped Side Port Labels (top: 180px) */}
      <div className="mxr-side-label-left">OUTPUT</div>
      <div className="mxr-side-label-right">INPUT</div>

      {/* Small MOD Pushbutton & Blue LED indicator (Top Left) */}
      <div className="mxr-cc-mod-section">
        <button
          type="button"
          className={`mxr-cc-mod-btn ${isModOn ? 'active' : ''}`}
          onClick={handleToggleMod}
          onPointerDown={(e) => e.stopPropagation()}
          title="Toggle Modulation (Chorus Shimmer on repeats)"
        >
          <div className={`mxr-cc-mod-led ${isModOn ? 'lit' : 'off'}`} />
          <span className="mxr-cc-mod-label">MOD</span>
        </button>
      </div>

      {/* 1. TOP ROW: REGEN (Left) and MIX (Right) */}
      <div className="mxr-cc-top-knobs">
        <div className="mxr-knob-col">
          <Knob
            label="REGEN"
            value={regenVal}
            min={0}
            max={10}
            step={0.1}
            defaultValue={4.5}
            formatValue={(v) => (v >= 9.5 ? 'RUNAWAY' : v.toFixed(1))}
            onChange={(val) => onChangeParam(instance.id, 'regen', val)}
            variant="mxr"
            size={38}
            showLabel={false}
            showValue={false}
          />
          <span className="mxr-knob-title">REGEN</span>
        </div>

        <div className="mxr-knob-col">
          <Knob
            label="MIX"
            value={mixVal}
            min={0}
            max={10}
            step={0.1}
            defaultValue={5.0}
            formatValue={(v) => `${Math.round((v / 10) * 100)}%`}
            onChange={(val) => onChangeParam(instance.id, 'mix', val)}
            variant="mxr"
            size={38}
            showLabel={false}
            showValue={false}
          />
          <span className="mxr-knob-title">MIX</span>
        </div>
      </div>

      {/* 2. LOWER CENTER: DELAY TIME */}
      <div className="mxr-cc-center-knob">
        <div className="mxr-knob-col">
          <Knob
            label="DELAY"
            value={delayVal}
            min={0}
            max={10}
            step={0.1}
            defaultValue={5.0}
            formatValue={(v) => `${Math.round(40 + (v / 10) * 560)} ms`}
            onChange={(val) => onChangeParam(instance.id, 'delay', val)}
            variant="mxr"
            size={38}
            showLabel={false}
            showValue={false}
          />
          <span className="mxr-knob-title">DELAY</span>
        </div>
      </div>

      {/* 3. CENTER STATUS BEZEL LED (Bright Electric Blue) */}
      <div
        className="mxr-led-mount"
        onClick={(e) => {
          e.stopPropagation();
          onToggleEnabled(instance.id);
        }}
        title="Status LED (Click to toggle bypass)"
      >
        <div className={`mxr-bezel-led mxr-cc-bezel-led ${isEnabled ? 'lit' : 'off'}`}>
          <div className="mxr-led-core" />
        </div>
      </div>

      {/* 4. ICONIC MXR LOGO BOX */}
      <div className="mxr-logo-box">
        <span className="mxr-logo-text">MXR</span>
      </div>

      {/* 5. CLASSIC 3PDT CHROME FOOTSWITCH */}
      <ClassicStompSwitch
        isEnabled={isEnabled}
        onToggle={() => onToggleEnabled(instance.id)}
        title="Toggle MXR Carbon Copy Delay Bypass"
        idPrefix="mxr-carboncopy"
        size={46}
      />

      {/* 6. BOTTOM TITLE: carbon copy analog delay */}
      <div className="mxr-bottom-title mxr-cc-bottom-title">
        <span className="mxr-cc-model">carbon copy</span>
        <span className="mxr-cc-sub">analog delay</span>
      </div>
    </div>
  );
};
