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

// Distortion Components
import { BossDs1Pedal } from './distortion/BossDs1Pedal';
import { BossHm2Pedal } from './distortion/BossHm2Pedal';
import { BossMt2Pedal } from './distortion/BossMt2Pedal';
import { IbanezSm7Pedal } from './distortion/IbanezSm7Pedal';
import { MarshallShredMasterPedal } from './distortion/MarshallShredMasterPedal';
import { MxrDistortionPlusPedal } from './distortion/MxrDistortionPlusPedal';
import { ProCoRatPedal } from './distortion/ProCoRatPedal';

// Boost Components
import { MxrMicroAmpPedal } from './boost/MxrMicroAmpPedal';
import { RangemasterPedal } from './boost/RangemasterPedal';
import { TcSparkMiniPedal } from './boost/TcSparkMiniPedal';
import { XoticEpBoosterPedal } from './boost/XoticEpBoosterPedal';

// Wah / Filter Components
import { BossAw3Pedal } from './wah/BossAw3Pedal';

// Equalizer Components
import { BossGe7Pedal } from './eq/BossGe7Pedal';

// Chorus Components
import { BossCe2Pedal } from './chorus/BossCe2Pedal';
import { BossCh1Pedal } from './chorus/BossCh1Pedal';
import { EhxSmallClonePedal } from './chorus/EhxSmallClonePedal';
import { MxrAnalogChorusPedal } from './chorus/MxrAnalogChorusPedal';
import { BossDm2Pedal } from './delay/BossDm2Pedal';
import { MxrCarbonCopyPedal } from './delay/MxrCarbonCopyPedal';
import { TcGaussTapeEchoPedal } from './delay/TcGaussTapeEchoPedal';
import { BossBf2Pedal } from './flanger/BossBf2Pedal';
import { EhxElectricMistressPedal } from './flanger/EhxElectricMistressPedal';
import { MxrFlangerPedal } from './flanger/MxrFlangerPedal';
import { EhxSmallStonePedal } from './phaser/EhxSmallStonePedal';
import { MxrPhase90Pedal } from './phaser/MxrPhase90Pedal';
import { BossOc5Pedal } from './pitch/BossOc5Pedal';
import { EhxPitchForkPedal } from './pitch/EhxPitchForkPedal';
import { BossTr2Pedal } from './tremolo/BossTr2Pedal';
import { FulltoneSupaTremPedal } from './tremolo/FulltoneSupaTremPedal';
import { BossVb2Pedal } from './vibrato/BossVb2Pedal';
import { MxrUniVibePedal } from './vibrato/MxrUniVibePedal';

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

    // Category 3: Distortion
    case 'dist-ds1':
      return <BossDs1Pedal {...props} />;
    case 'dist-hm2':
      return <BossHm2Pedal {...props} />;
    case 'dist-mt2':
      return <BossMt2Pedal {...props} />;
    case 'dist-sm7':
      return <IbanezSm7Pedal {...props} />;
    case 'dist-shredmaster':
      return <MarshallShredMasterPedal {...props} />;
    case 'dist-mxrdistplus':
      return <MxrDistortionPlusPedal {...props} />;
    case 'dist-procorat':
      return <ProCoRatPedal {...props} />;

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

    // Category 5: Boost
    case 'boost-mxr-microamp':
      return <MxrMicroAmpPedal {...props} />;
    case 'boost-rangemaster':
      return <RangemasterPedal {...props} />;
    case 'boost-spark-mini':
      return <TcSparkMiniPedal {...props} />;
    case 'boost-xotic-ep':
      return <XoticEpBoosterPedal {...props} />;

    // Category 6: Wah / Filter
    case 'wah-boss-aw3':
      return <BossAw3Pedal {...props} />;

    // Category 7: Equalizer
    case 'eq-boss-ge7':
      return <BossGe7Pedal {...props} />;

    // Category 8: Chorus
    case 'chorus-boss-ce2':
      return <BossCe2Pedal {...props} />;
    case 'chorus-boss-ch1':
      return <BossCh1Pedal {...props} />;
    case 'chorus-ehx-smallclone':
      return <EhxSmallClonePedal {...props} />;
    case 'chorus-mxr-analog':
      return <MxrAnalogChorusPedal {...props} />;

    // Category 14: Delay
    case 'delay-boss-dm2':
      return <BossDm2Pedal {...props} />;
    case 'delay-mxr-carbon-copy':
      return <MxrCarbonCopyPedal {...props} />;
    case 'delay-tce-gauss':
      return <TcGaussTapeEchoPedal {...props} />;

    // Category 15: Flanger
    case 'flanger-boss-bf2':
      return <BossBf2Pedal {...props} />;
    case 'flanger-ehx-electric-mistress':
      return <EhxElectricMistressPedal {...props} />;
    case 'flanger-mxr':
      return <MxrFlangerPedal {...props} />;

    // Category 16: Phaser
    case 'phaser-ehx-smallstone':
      return <EhxSmallStonePedal {...props} />;
    case 'phaser-mxr-phase90':
      return <MxrPhase90Pedal {...props} />;

    // Category 17: Pitch / Octave
    case 'pitch-boss-oc5':
      return <BossOc5Pedal {...props} />;
    case 'pitch-ehx-pitchfork':
      return <EhxPitchForkPedal {...props} />;

    // Category 18: Tremolo
    case 'tremolo-boss-tr2':
      return <BossTr2Pedal {...props} />;
    case 'tremolo-fulltone-supatrem':
      return <FulltoneSupaTremPedal {...props} />;

    // Category 19: Vibrato
    case 'vibrato-boss-vb2':
      return <BossVb2Pedal {...props} />;
    case 'vibrato-mxr-univibe':
      return <MxrUniVibePedal {...props} />;
  }

  // Fallback for standard analog enclosure
  const isEnabled = instance.enabled;
  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

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
        title="Audio Output Jack (1/4 in) - Click to connect or unplug cable"
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'out', e);
        }}
      />
      <div 
        className={`stompbox-side-jack jack-right ${isRightPending ? 'is-jack-pending' : ''} ${hasRightCable ? 'has-cable' : ''}`}
        title="Audio Input Jack (1/4 in) - Click to connect or unplug cable"
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'in', e);
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
