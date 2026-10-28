import React, { useRef, useState } from 'react';
import type { PedalInstance, PedalMetadata } from '../../../types/pedal';
import {
  CABINET_OPTIONS,
  MIC_OPTIONS,
  cabinetModelToIndex,
  indexToCabinetModel,
  micModelToIndex,
  indexToMicModel,
  type CabinetModelId,
  type MicModelId,
} from '../../../types/cabinet';
import { Knob } from '../../common/Knob';
import { X } from 'lucide-react';

interface CabinetIrPedalProps {
  instance: PedalInstance;
  metadata: PedalMetadata;
  index: number;
  onToggleEnabled: (id: string) => void;
  onChangeParam: (id: string, paramId: string, val: number) => void;
  onRemove: (id: string) => void;
  onLoadCustomIR?: (pedalId: string, file: File) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  style?: React.CSSProperties;
  isDragging?: boolean;
  onJackClick?: (pedalId: string, port: 'in' | 'out', e: React.MouseEvent) => void;
  isJackPending?: (pedalId: string, port: 'in' | 'out') => boolean;
  hasJackCable?: (pedalId: string, port: 'in' | 'out') => boolean;
}

const SAMPLE_WAV_IRS = [
  { label: 'VOX AC30 212', file: 'Vox_AC30_2x12_Alnico_SM57.wav' },
  { label: 'MARS 1960AX', file: 'Marshall_1960AX_4x12_Greenback_MD421.wav' },
  { label: 'MESA V30 412', file: 'Mesa_Rectifier_4x12_V30_SM57.wav' },
  { label: 'TWIN 212 RIB', file: 'Fender_Twin_2x12_Ribbon_Warm.wav' },
  { label: 'JC-120 STUDIO', file: 'Roland_JC120_2x12_Studio_SM7.wav' },
  { label: 'ORANGE PPC412', file: 'Orange_PPC412_V30_SM57.wav' },
];

export const CabinetIrPedal: React.FC<CabinetIrPedalProps> = ({
  instance,
  onToggleEnabled,
  onChangeParam,
  onRemove,
  onLoadCustomIR,
  onPointerDown,
  style,
  isDragging = false,
  onJackClick,
  isJackPending,
  hasJackCable,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sampleCursor, setSampleCursor] = useState<number>(0);

  const isEnabled = instance.enabled;
  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  const modelIdx = instance.parameters.model ?? 7;
  const micIdx = instance.parameters.mic ?? 0;
  const position = instance.parameters.position ?? 0.5;
  const distance = instance.parameters.distance ?? 0.15;
  const mix = instance.parameters.mix ?? 1.0;
  const level = instance.parameters.level ?? 0;
  const pan = instance.parameters.pan ?? 0;

  const modelId = indexToCabinetModel(modelIdx);
  const micId = indexToMicModel(micIdx);
  const currentCab = CABINET_OPTIONS.find((c) => c.id === modelId) || CABINET_OPTIONS[0];
  const mixPercent = Math.round(mix * 100);
  const posPercent = Math.round(position * 100);
  const distInches = `${(0.5 + distance * 5.5).toFixed(1)}"`;
  const levelFormatted = `${level >= 0 ? '+' : ''}${level.toFixed(1)} dB`;

  const formatPanLabel = (p: number) => {
    if (Math.abs(p) < 0.03) return 'CENTER';
    return p < 0 ? `L ${Math.round(Math.abs(p) * 100)}%` : `R ${Math.round(p * 100)}%`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onLoadCustomIR) {
      onLoadCustomIR(instance.id, file);
    }
    if (e.target) e.target.value = '';
  };

  const handleCycleSampleIr = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const target = SAMPLE_WAV_IRS[sampleCursor % SAMPLE_WAV_IRS.length];
    setSampleCursor((prev) => (prev + 1) % SAMPLE_WAV_IRS.length);
    try {
      const res = await fetch(`/sample-irs/${target.file}`);
      const blob = await res.blob();
      const file = new File([blob], target.file, { type: 'audio/wav' });
      onLoadCustomIR?.(instance.id, file);
    } catch (err) {
      console.error(err);
    }
  };

  const memorySlotNumber =
    modelId === 'custom'
      ? 'WAV'
      : String(Math.min(CABINET_OPTIONS.length, Math.max(1, Math.round(modelIdx) + 1))).padStart(3, '0');

  return (
    <div
      className={`stompbox-enclosure pedal-ir200-chassis ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={{
        width: '380px',
        maxWidth: '380px',
        minWidth: '380px',
        height: '420px',
        minHeight: '420px',
        maxHeight: '420px',
        ...style,
      }}
      onPointerDown={onPointerDown}
    >
      {/* 5 Top-Mounted Metallic 1/4" Hardware Jack Nuts (Authentic IR-200 Top Edge) */}
      <div className="ir200-top-jacks-row" aria-hidden="true">
        <div className="ir200-top-nut" />
        <div className="ir200-top-nut" />
        <div className="ir200-top-nut" />
        <div className="ir200-top-nut" />
        <div className="ir200-top-nut" />
      </div>

      {/* Functional Side Jacks for Canvas Cable Patching (Left = OUT, Right = IN) */}
      <div
        className={`stompbox-side-jack jack-left ${isLeftPending ? 'is-jack-pending' : ''} ${hasLeftCable ? 'has-cable' : ''}`}
        style={{ top: '49px' }}
        title="Cabinet IR Output Jack (to Post-FX Pedals or Board Output)"
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'out', e);
        }}
      />
      <div
        className={`stompbox-side-jack jack-right ${isRightPending ? 'is-jack-pending' : ''} ${hasRightCable ? 'has-cable' : ''}`}
        style={{ top: '49px' }}
        title="Cabinet IR Input Jack (from Amp Head or Pre-FX)"
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'in', e);
        }}
      />

      {/* Top-Right Close Button */}
      <button
        type="button"
        className="pedal-mini-btn ir200-close-btn"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(instance.id);
        }}
        title="Remove Cabinet IR from rig"
      >
        <X size={12} strokeWidth={2.2} />
      </button>

      {/* Hidden File Input for Custom WAV IR Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".wav,.wave,.aif,.aiff"
        style={{ display: 'none' }}
      />

      {/* UPPER CONTROL PANEL */}
      <div className="ir200-upper-panel">
        {/* ROW 1: Wide Blue Dot-Matrix LCD Screen + MEMORY Rotary Encoder */}
        <div className="ir200-top-deck">
          <div
            className="ir200-lcd-bezel"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className={`ir200-lcd-screen ${isEnabled ? 'is-lit' : 'is-dim'}`}>
              {/* Top LCD Zone: Inverted Slot Number [008] + Speaker Info + Cabinet Dropdown */}
              <div className="lcd-top-zone">
                <div className="lcd-slot-box">{memorySlotNumber}</div>
                <div className="lcd-top-right">
                  <div className="lcd-status-row">
                    <span>
                      {modelId === 'custom'
                        ? 'CUSTOM WAV IR'
                        : `${currentCab.category.toUpperCase()} • ${currentCab.speakers}`}
                    </span>
                  </div>
                  {/* Full-width Cabinet Selector inside LCD */}
                  <select
                    className="ir200-lcd-select lcd-cab-select"
                    value={modelId}
                    onChange={(e) => {
                      const nextIdx = cabinetModelToIndex(e.target.value as CabinetModelId);
                      onChangeParam(instance.id, 'model', nextIdx);
                    }}
                    title="Click to select Speaker Cabinet model"
                  >
                    {instance.customIrName && (
                      <optgroup label="Custom User WAV IR">
                        <option value="custom">★ {instance.customIrName}</option>
                      </optgroup>
                    )}
                    <optgroup label="Open Back Cabinets">
                      {CABINET_OPTIONS.filter((c) => c.category === 'Open Back').map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.brand} {c.name} ({c.speakers})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Closed Back Cabinets">
                      {CABINET_OPTIONS.filter((c) => c.category === 'Closed Back').map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.brand} {c.name} ({c.speakers})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="lcd-divider-line" />

              {/* Bottom LCD Zone: Full-width Studio Mic Selector */}
              <div className="lcd-bottom-zone">
                <span className="lcd-speaker-tag">MIC:</span>
                <select
                  className="ir200-lcd-select lcd-mic-select"
                  value={micId}
                  onChange={(e) => {
                    const nextIdx = micModelToIndex(e.target.value as MicModelId);
                    onChangeParam(instance.id, 'mic', nextIdx);
                  }}
                  title="Click to select Studio Microphone model"
                >
                  {MIC_OPTIONS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Right MEMORY Encoder Knob (Selects Cabinet Slot) */}
          <div
            className="ir200-memory-col"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="ir200-lbl-main">MEMORY</div>
            <div className="ir200-lbl-sub">(CAB SELECT)</div>
            <Knob
              label="MEMORY"
              value={Math.min(CABINET_OPTIONS.length - 1, Math.max(0, Math.round(modelIdx)))}
              min={0}
              max={CABINET_OPTIONS.length - 1}
              step={1}
              defaultValue={7}
              onChange={(val) => onChangeParam(instance.id, 'model', Math.round(val))}
              variant="boss-silver"
              size={42}
              showLabel={false}
              showValue={false}
            />
          </div>
        </div>

        {/* ROW 2: 2 Output/Blend Knobs (IR MIX, OUT LEVEL) + Custom IR Push Buttons (LOAD WAV & SAMPLE IR) */}
        <div
          className="ir200-mid-deck"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="ir200-mid-knobs">
            <div className="ir200-param-knob-col">
              <div className="ir200-lbl-main">IR MIX</div>
              <div className="ir200-dial-wrap">
                <span className="ir200-dot dot-min" />
                <span className="ir200-dot dot-max" />
                <Knob
                  label="IR MIX"
                  value={mix}
                  min={0}
                  max={1}
                  step={0.01}
                  defaultValue={1.0}
                  onChange={(val) => onChangeParam(instance.id, 'mix', val)}
                  variant="boss-silver"
                  size={38}
                  showLabel={false}
                  showValue={false}
                />
              </div>
              <div className="ir200-val-badge">{mixPercent}%</div>
            </div>

            <div className="ir200-param-knob-col">
              <div className="ir200-lbl-main">OUT LEVEL</div>
              <div className="ir200-dial-wrap">
                <span className="ir200-dot dot-min" />
                <span className="ir200-dot dot-max" />
                <Knob
                  label="OUT LEVEL"
                  value={level}
                  min={-12}
                  max={6}
                  step={0.5}
                  defaultValue={0}
                  onChange={(val) => onChangeParam(instance.id, 'level', val)}
                  variant="boss-silver"
                  size={38}
                  showLabel={false}
                  showValue={false}
                />
              </div>
              <div className="ir200-val-badge">{levelFormatted}</div>
            </div>
          </div>

          {/* Right Tactile Rectangular Push Buttons (LOAD WAV & SAMPLE IR) */}
          <div className="ir200-menu-buttons-block">
            <div className="ir200-btn-pair">
              <div className="ir200-btn-col">
                <span className="ir200-btn-lbl">LOAD WAV</span>
                <button
                  type="button"
                  className="ir200-push-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  title="Upload Custom .WAV Impulse Response file from your computer"
                />
              </div>
              <div className="ir200-btn-col">
                <span className="ir200-btn-lbl">SAMPLE IR</span>
                <button
                  type="button"
                  className="ir200-push-btn"
                  onClick={handleCycleSampleIr}
                  title="Cycle Studio Sample .WAV IRs (Vox AC30, Marshall 1960, Mesa V30, Twin, JC-120, Orange)"
                />
              </div>
            </div>
            <div className="ir200-write-bracket">
              <span>CUSTOM IR LOADER</span>
            </div>
          </div>
        </div>

        {/* ROW 3: 3 Acoustic Placement & Stereo Knobs (MIC POS, DISTANCE, STEREO PAN) */}
        <div
          className="ir200-three-knobs-row"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="ir200-param-knob-col">
            <div className="ir200-lbl-main">MIC POS (CAP/EDGE)</div>
            <div className="ir200-dial-wrap">
              <span className="ir200-dot dot-min" />
              <span className="ir200-dot dot-max" />
              <Knob
                label="MIC POS"
                value={position}
                min={0}
                max={1}
                step={0.02}
                defaultValue={0.5}
                onChange={(val) => onChangeParam(instance.id, 'position', val)}
                variant="boss-silver"
                size={38}
                showLabel={false}
                showValue={false}
              />
            </div>
            <div className="ir200-val-badge">{posPercent}%</div>
          </div>

          <div className="ir200-param-knob-col">
            <div className="ir200-lbl-main">MIC DISTANCE</div>
            <div className="ir200-dial-wrap">
              <span className="ir200-dot dot-min" />
              <span className="ir200-dot dot-max" />
              <Knob
                label="DISTANCE"
                value={distance}
                min={0}
                max={1}
                step={0.02}
                defaultValue={0.15}
                onChange={(val) => onChangeParam(instance.id, 'distance', val)}
                variant="boss-silver"
                size={38}
                showLabel={false}
                showValue={false}
              />
            </div>
            <div className="ir200-val-badge">{distInches}</div>
          </div>

          <div className="ir200-param-knob-col">
            <div className="ir200-lbl-main">STEREO PAN (L/C/R)</div>
            <div className="ir200-dial-wrap">
              <span className="ir200-dot dot-min" />
              <span className="ir200-dot dot-max" />
              <Knob
                label="STEREO PAN"
                value={pan}
                min={-1}
                max={1}
                step={0.05}
                defaultValue={0}
                onChange={(val) => onChangeParam(instance.id, 'pan', val)}
                variant="boss-silver"
                size={38}
                showLabel={false}
                showValue={false}
              />
            </div>
            <div
              className="ir200-val-badge is-clickable"
              onDoubleClick={() => onChangeParam(instance.id, 'pan', 0)}
              title="Double-click to reset Stereo Pan to CENTER"
            >
              {formatPanLabel(pan)}
            </div>
          </div>
        </div>

        {/* ROW 4: Classic IR-200 Branding Strip */}
        <div className="ir200-brand-strip">
          <div className="ir200-brand-left">
            <span className="ir200-logo-box">▣</span>
            <span className="ir200-logo-word">PEACE</span>
          </div>
          <div className="ir200-brand-right">
            <div className="ir200-sub-stack">
              <span>AMP &amp;</span>
              <span>IR CABINET</span>
            </div>
            <span className="ir200-model-big">IR-200</span>
          </div>
        </div>
      </div>

      {/* LOWER SLANTED FOOTSWITCH DECK (Single Centered BYPASS Switch) */}
      <div
        className="ir200-lower-deck"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="ir200-footswitch-col">
          <div className={`ir200-led ${isEnabled ? 'lit-red' : ''}`} />
          <button
            type="button"
            className="ir200-footswitch"
            onClick={(e) => {
              e.stopPropagation();
              onToggleEnabled(instance.id);
            }}
            title={isEnabled ? 'Cabinet IR Active (Click to Bypass)' : 'Cabinet IR Bypassed (Click to Engage)'}
          >
            <div className="ir200-sw-washer" />
            <div className="ir200-sw-plunger" />
          </button>
          <span className="ir200-bypass-label">BYPASS</span>
        </div>
      </div>
    </div>
  );
};
