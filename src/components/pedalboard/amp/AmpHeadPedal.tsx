import React, { useMemo } from 'react';
import type { PedalInstance, PedalMetadata } from '../../../types/pedal';
import { AMP_MODELS, type AmpModelOption, ampModelToIndex, indexToAmpModel } from '../../../types/amp';
import { Knob } from '../../common/Knob';
import { X } from 'lucide-react';

interface AmpHeadPedalProps {
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

export const AmpHeadPedal: React.FC<AmpHeadPedalProps> = ({
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
  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  const modelIdx = instance.parameters.model ?? 0;
  const modelId = indexToAmpModel(modelIdx);
  const currentModel = AMP_MODELS.find((m) => m.id === modelId) || AMP_MODELS[0];

  const groupedModels = useMemo(() => {
    const groups: { [brand: string]: AmpModelOption[] } = {};
    for (const m of AMP_MODELS) {
      if (!groups[m.brand]) groups[m.brand] = [];
      groups[m.brand].push(m);
    }
    return groups;
  }, []);

  const gain = instance.parameters.gain ?? 5.0;
  const bass = instance.parameters.bass ?? 5.0;
  const mid = instance.parameters.mid ?? 5.0;
  const treble = instance.parameters.treble ?? 5.0;
  const presence = instance.parameters.presence ?? 5.0;
  const master = instance.parameters.master ?? 6.0;
  const isHighPower = (instance.parameters.powerMode ?? 1) >= 0.5;
  const isHighSens = (instance.parameters.inputSensitivity ?? 1) >= 0.5;

  // Format short classic series badge for the gold faceplate (strictly concise so width never shifts)
  const badgeTitle = useMemo(() => {
    const raw = currentModel.name.toUpperCase();
    if (raw.includes('JCM800') || raw.includes('JCM 800')) return 'JCM 800';
    if (raw.includes('JUBILEE') || raw.includes('2555')) return 'JUBILEE';
    if (raw.includes('PLEXI')) return '1959 SLP';
    if (raw.includes('AC30')) return 'AC30 TB';
    if (raw.includes('TWIN')) return "'65 TWIN";
    if (raw.includes('DELUXE')) return "'65 DLX";
    if (raw.includes('BASSMAN')) return "'59 TWEED";
    if (raw.includes('SLO')) return 'SLO-100';
    if (raw.includes('5150')) return '5150 III';
    if (raw.includes('DJENT') || raw.includes('INVECTIVE')) return 'INV-120';
    if (raw.includes('RECTIFIER') || raw.includes('DUAL REC')) return 'DUAL REC';
    if (raw.includes('MARK')) return 'MK IIC+';
    if (raw.includes('LONE STAR')) return 'LONESTAR';
    if (raw.includes('ECSTASY') || raw.includes('101B')) return 'XTC 101B';
    if (raw.includes('POWERBALL')) return 'E645 II';
    if (raw.includes('ROCKERVERB') || raw.includes('ORANGE')) return 'RV-50';
    if (raw.includes('JC-120') || raw.includes('JAZZ')) return 'JC-120';
    if (raw.includes('DUMBLE') || raw.includes('ODS')) return 'ODS-100';
    return raw.slice(0, 8);
  }, [currentModel.name]);

  const knobs = [
    { id: 'presence', label: 'PRESENCE', sub: '', val: presence, def: 5.0 },
    { id: 'bass', label: 'BASS', sub: '', val: bass, def: 5.0 },
    { id: 'mid', label: 'MIDDLE', sub: '', val: mid, def: 5.0 },
    { id: 'treble', label: 'TREBLE', sub: '', val: treble, def: 5.0 },
    { id: 'master', label: 'MASTER', sub: 'VOLUME', val: master, def: 6.0 },
    { id: 'gain', label: 'PRE-AMP', sub: 'VOLUME', val: gain, def: 5.0 },
  ];

  return (
    <div
      className={`stompbox-enclosure peaceamp-head-cabinet ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={{
        width: '720px',
        maxWidth: '720px',
        minWidth: '720px',
        height: '296px',
        minHeight: '296px',
        maxHeight: '296px',
        ...style,
      }}
      onPointerDown={onPointerDown}
    >
      {/* Top Leather Carry Handle with Gold End-Caps */}
      <div className="peaceamp-top-handle" aria-hidden="true">
        <div className="peaceamp-handle-cap cap-left">
          <span className="peaceamp-handle-rivet" />
        </div>
        <div className="peaceamp-handle-strap" />
        <div className="peaceamp-handle-cap cap-right">
          <span className="peaceamp-handle-rivet" />
        </div>
      </div>

      {/* Bottom Rubber Amplifier Feet */}
      <div className="peaceamp-foot foot-left" aria-hidden="true" />
      <div className="peaceamp-foot foot-right" aria-hidden="true" />

      {/* 1/4" Side Patch Jacks: Left = Output, Right = Input (top: 214px -> center 225px aligned with gold faceplate) */}
      <div
        className={`stompbox-side-jack jack-left ${isLeftPending ? 'is-jack-pending' : ''} ${hasLeftCable ? 'has-cable' : ''}`}
        style={{ top: '214px' }}
        title="PeaceAmp Speaker / Preamp Output Jack (to Cabinet IR, FX, or Output)"
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'out', e);
        }}
      />
      <div
        className={`stompbox-side-jack jack-right ${isRightPending ? 'is-jack-pending' : ''} ${hasRightCable ? 'has-cable' : ''}`}
        style={{ top: '214px' }}
        title="PeaceAmp Instrument Input Jack (from Guitar or Pre-Amp Pedals)"
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'in', e);
        }}
      />

      {/* 4 Molded Black Corner Protectors with Gold Brass Rivets */}
      <div className="peaceamp-corner corner-tl" aria-hidden="true">
        <span className="peaceamp-rivet r1" />
        <span className="peaceamp-rivet r2" />
      </div>
      <div className="peaceamp-corner corner-tr" aria-hidden="true">
        <span className="peaceamp-rivet r1" />
        <span className="peaceamp-rivet r2" />
      </div>
      <div className="peaceamp-corner corner-bl" aria-hidden="true">
        <span className="peaceamp-rivet r1" />
        <span className="peaceamp-rivet r2" />
      </div>
      <div className="peaceamp-corner corner-br" aria-hidden="true">
        <span className="peaceamp-rivet r1" />
        <span className="peaceamp-rivet r2" />
      </div>

      {/* Inner Recessed Front Baffle (Grill Cloth + Brushed Gold Control Panel) */}
      <div className="peaceamp-inner-baffle">
        {/* UPPER SECTION: Woven Black Grill Cloth + White Piping + PeaceAmp Script Logo */}
        <div className="peaceamp-grill-cloth">
          {/* Authentic White Piping Frame along Top, Left, Right with curved bottom tips */}
          <div className="peaceamp-white-piping" aria-hidden="true" />

          {/* Top-Right Compact Controls: Amp Voicing Selector & Remove Button */}
          <div
            className="peaceamp-grill-toolbar"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <select
              className="peaceamp-model-select"
              value={modelId}
              onChange={(e) => {
                const nextIdx = ampModelToIndex(e.target.value as typeof modelId);
                onChangeParam(instance.id, 'model', nextIdx);
              }}
              title={`${currentModel.brand} ${currentModel.name} — ${currentModel.description}`}
            >
              {Object.entries(groupedModels).map(([brand, models]) => (
                <optgroup key={brand} label={brand}>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.category})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            <button
              type="button"
              className="pedal-mini-btn peaceamp-close-btn"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(instance.id);
              }}
              title="Remove PeaceAmp Head from rig"
            >
              <X size={11} strokeWidth={2.2} />
            </button>
          </div>

          {/* Center Molded 3D White Cursive Script Badge: "PeaceAmp" */}
          <div className="peaceamp-script-logo" title={`${currentModel.brand} ${currentModel.name} — ${currentModel.character}`}>
            PeaceAmp
          </div>
        </div>

        {/* LOWER SECTION: Brushed Anodized Gold Control Faceplate */}
        <div className="peaceamp-gold-faceplate">
          {/* 1. Left Power & Standby Rocker Switches */}
          <div
            className="peaceamp-switches-group"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Red Illuminated POWER Rocker Switch */}
            <div className="peaceamp-switch-col">
              <span className={`peaceamp-sw-top-lbl ${!isEnabled ? 'is-selected' : ''}`}>OFF</span>
              <button
                type="button"
                className={`peaceamp-rocker-switch rocker-power ${isEnabled ? 'is-on' : 'is-off'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleEnabled(instance.id);
                }}
                title={isEnabled ? 'Power ON (Click to Bypass Amp)' : 'Power OFF / Bypassed (Click to Turn On)'}
              >
                <span className="rocker-lens" />
              </button>
              <span className={`peaceamp-sw-bot-lbl ${isEnabled ? 'is-selected' : ''}`}>ON</span>
              <span className="peaceamp-sw-main-lbl">POWER</span>
            </div>

            {/* Black LOW / HIGH Output Power Mode Rocker Switch */}
            <div className="peaceamp-switch-col">
              <span className={`peaceamp-sw-top-lbl ${!isHighPower ? 'is-selected' : ''}`}>LOW</span>
              <button
                type="button"
                className={`peaceamp-rocker-switch rocker-standby ${isHighPower ? 'mode-high' : 'mode-low'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeParam(instance.id, 'powerMode', isHighPower ? 0 : 1);
                }}
                title={
                  isHighPower
                    ? 'Output Power Mode: HIGH (Full Headroom & Punch) — Click for LOW (5W Studio Warm Sag)'
                    : 'Output Power Mode: LOW (5W Studio Warm Sag) — Click for HIGH (Full Headroom & Punch)'
                }
              >
                <span className="rocker-face" />
              </button>
              <span className={`peaceamp-sw-bot-lbl ${isHighPower ? 'is-selected' : ''}`}>HIGH</span>
              <span className="peaceamp-sw-main-lbl">STBY</span>
            </div>
          </div>

          {/* 2. Classic JCM 800 Lead Series Silkscreen Inscription */}
          <div className="peaceamp-series-badge" title={currentModel.description}>
            <div className="series-model-code">{badgeTitle}</div>
            <div className="series-sub-line">LEAD SERIES</div>
            <div className="series-studio-tag">STUDIO</div>
          </div>

          {/* 3. Six Horizontal Marshall Gold-Cap Knobs */}
          <div
            className="peaceamp-knobs-row"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {knobs.map((k) => (
              <div key={k.id} className="peaceamp-knob-cell">
                <div className="peaceamp-knob-title">{k.label}</div>
                <div className="peaceamp-dial-frame">
                  {/* Silkscreen 0..10 scale ticks around knob */}
                  <svg viewBox="0 0 56 56" className="peaceamp-scale-svg" aria-hidden="true">
                    {/* Tick marks at 11 radial positions (-135 deg to +135 deg) */}
                    {Array.from({ length: 11 }).map((_, idx) => {
                      const deg = -135 + idx * 27;
                      const rad = ((deg - 90) * Math.PI) / 180;
                      const x1 = 28 + Math.cos(rad) * 21.0;
                      const y1 = 28 + Math.sin(rad) * 21.0;
                      const x2 = 28 + Math.cos(rad) * 24.4;
                      const y2 = 28 + Math.sin(rad) * 24.4;
                      return (
                        <line
                          key={idx}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#18130a"
                          strokeWidth={idx % 2 === 0 ? '1.3' : '0.85'}
                        />
                      );
                    })}
                  </svg>
                  <span className="scale-num num-4">4</span>
                  <span className="scale-num num-6">6</span>
                  <span className="scale-num num-0">0</span>
                  <span className="scale-num num-10">10</span>
                  <Knob
                    label={k.label}
                    value={k.val}
                    min={0}
                    max={10}
                    step={0.1}
                    defaultValue={k.def}
                    onChange={(val) => onChangeParam(instance.id, k.id, val)}
                    variant="boss-gold"
                    size={36}
                    showLabel={false}
                    showValue={false}
                  />
                </div>
                <div className="peaceamp-knob-sub">{k.sub || '\u00A0'}</div>
              </div>
            ))}
          </div>

          {/* 4. Right Vertical Pair of 1/4" Input Jacks (HIGH / LOW Sensitivity Channel Selector) */}
          <div
            className="peaceamp-front-jacks"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div
              className={`peaceamp-jack-row ${isHighSens ? 'is-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onChangeParam(instance.id, 'inputSensitivity', 1);
              }}
              title="HIGH Sensitivity Input (+6dB Hotter Preamp Cascade) — Active when lit gold"
            >
              <div className={`peaceamp-hex-jack ${isHighSens ? 'is-plugged' : ''}`}>
                <div className="hex-jack-hole" />
              </div>
              <span className="jack-lbl">HIGH</span>
            </div>
            <div className="jack-mid-lbl">SENSITIVITY</div>
            <div
              className={`peaceamp-jack-row ${!isHighSens ? 'is-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onChangeParam(instance.id, 'inputSensitivity', 0);
              }}
              title="LOW Sensitivity Input (-6dB Clean Headroom Pad for Pedals) — Click to select"
            >
              <div className={`peaceamp-hex-jack ${!isHighSens ? 'is-plugged' : ''}`}>
                <div className="hex-jack-hole" />
              </div>
              <span className="jack-lbl">LOW</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
