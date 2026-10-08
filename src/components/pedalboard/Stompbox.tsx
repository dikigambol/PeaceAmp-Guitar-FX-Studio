import React from 'react';
import type { PedalInstance, PedalMetadata } from '../../types/pedal';
import { Knob } from '../common/Knob';
import { Power, X } from 'lucide-react';
import { MxrDynaCompPedal } from './compressors/MxrDynaCompPedal';
import { RossCompressorPedal } from './compressors/RossCompressorPedal';
import { BossCs3Pedal } from './compressors/BossCs3Pedal';
import { KeeleyCompressorPedal } from './compressors/KeeleyCompressorPedal';

// Overdrive Components
import { Ts808Pedal } from './overdrives/Ts808Pedal';
import { Ts9Pedal } from './overdrives/Ts9Pedal';
import { BossSd1Pedal } from './overdrives/BossSd1Pedal';
import { BossOd3Pedal } from './overdrives/BossOd3Pedal';
import { BossBd2Pedal } from './overdrives/BossBd2Pedal';
import { KlonCentaurPedal } from './overdrives/KlonCentaurPedal';
import { FulltoneOcdPedal } from './overdrives/FulltoneOcdPedal';
import { TsMiniPedal } from './overdrives/TsMiniPedal';
import { NobelsOdr1Pedal } from './overdrives/NobelsOdr1Pedal';
import { RockettArcherPedal } from './overdrives/RockettArcherPedal';
import { BigMuffPedal } from './fuzz/BigMuffPedal';
import { FuzzFacePedal } from './fuzz/FuzzFacePedal';
import { ToneBenderPedal } from './fuzz/ToneBenderPedal';
import { FuzzFactoryPedal } from './fuzz/FuzzFactoryPedal';
import { FlatironFuzzPedal } from './fuzz/FlatironFuzzPedal';
import { EqdHoofPedal } from './fuzz/EqdHoofPedal';

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

export const Stompbox: React.FC<StompboxProps> = (props) => {
  const {
    instance,
    metadata,
    onToggleEnabled,
    onChangeParam,
    onRemove,
    onPointerDown,
    style,
    isDragging = false,
    onJackClick,
    isJackPending,
    hasJackCable,
  } = props;

  // Render authentic pedal hardware components
  switch (instance.type) {
    // Category 1: Compressors
    case 'comp-dynacomp':
      return <MxrDynaCompPedal {...props} />;
    case 'comp-ross':
      return <RossCompressorPedal {...props} />;
    case 'comp-cs3':
      return <BossCs3Pedal {...props} />;
    case 'comp-keeley':
      return <KeeleyCompressorPedal {...props} />;

    // Category 2: Overdrives
    case 'od-ts808':
      return <Ts808Pedal {...props} />;
    case 'od-ts9':
      return <Ts9Pedal {...props} />;
    case 'od-sd1':
      return <BossSd1Pedal {...props} />;
    case 'od-od3':
      return <BossOd3Pedal {...props} />;
    case 'od-bd2':
      return <BossBd2Pedal {...props} />;
    case 'od-klon':
      return <KlonCentaurPedal {...props} />;
    case 'od-ocd':
      return <FulltoneOcdPedal {...props} />;
    case 'od-tsmini':
      return <TsMiniPedal {...props} />;
    case 'od-odr1':
      return <NobelsOdr1Pedal {...props} />;
    case 'od-archer':
      return <RockettArcherPedal {...props} />;

    // Category 4: Fuzz
    case 'fuzz-bigmuff':
      return <BigMuffPedal {...props} />;
    case 'fuzz-fuzzface':
      return <FuzzFacePedal {...props} />;
    case 'fuzz-tonebender':
      return <ToneBenderPedal {...props} />;
    case 'fuzz-fuzzfactory':
      return <FuzzFactoryPedal {...props} />;
    case 'fuzz-flatiron':
      return <FlatironFuzzPedal {...props} />;
    case 'fuzz-hoof':
      return <EqdHoofPedal {...props} />;
  }

  // Fallback for standard analog enclosure
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
                size={34}
              />
            );
          })}
        </div>
      </div>

      {/* Footswitch Stomp Section */}
      <div className="pedal-footswitch-section" onPointerDown={(e) => e.stopPropagation()}>
        <button
          className={`pedal-footswitch ${isEnabled ? 'engaged' : ''}`}
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
