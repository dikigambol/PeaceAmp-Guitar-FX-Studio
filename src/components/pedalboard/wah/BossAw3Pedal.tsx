import React from 'react';
import type { PedalInstance, PedalMetadata } from '../../../types/pedal';
import { Knob } from '../../common/Knob';
import { X } from 'lucide-react';
import { HUMANIZER_VOWELS, AW3_MODES } from '../../../audio/pedals/wah/BossAw3Node';

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

export const BossAw3Pedal: React.FC<PedalProps> = ({
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
  const decayVal = instance.parameters['decay'] ?? 5;
  const manualVal = instance.parameters['manual'] ?? 4;
  const sensVal = instance.parameters['sens'] ?? 6;
  const modeVal = instance.parameters['mode'] ?? 0;

  const isLeftPending = isJackPending?.(instance.id, 'out') ?? false;
  const isRightPending = isJackPending?.(instance.id, 'in') ?? false;
  const hasLeftCable = hasJackCable?.(instance.id, 'out') ?? false;
  const hasRightCable = hasJackCable?.(instance.id, 'in') ?? false;

  const currentModeIndex = Math.min(4, Math.max(0, Math.round(modeVal)));
  const currentModeLabel = AW3_MODES[currentModeIndex] || 'UP';

  // Dynamic names & sub-labels based on Active Mode
  const isHumanizer = currentModeIndex === 3;
  const isTempo = currentModeIndex === 4;

  const v1Idx = Math.min(4, Math.max(0, Math.floor((manualVal / 10) * 4.99)));
  const v2Idx = Math.min(4, Math.max(0, Math.floor((sensVal / 10) * 4.99)));
  const vowel1Label = HUMANIZER_VOWELS[v1Idx]?.label || 'A';
  const vowel2Label = HUMANIZER_VOWELS[v2Idx]?.label || 'O';

  const knob1Name = isTempo ? 'RATE' : 'DECAY';
  const knob1Sub = isTempo
    ? `${(0.5 + (decayVal / 10) * 8.0).toFixed(1)}Hz`
    : `${(0.1 + (decayVal / 10) * 1.9).toFixed(2)}s`;

  const knob2Name = isHumanizer ? 'VOWEL 1' : 'MANUAL';
  const knob2Sub = isHumanizer ? `"${vowel1Label}"` : `${Math.round(350 + (manualVal / 10) * 600)}Hz`;

  const knob3Name = isHumanizer ? 'VOWEL 2' : isTempo ? 'DEPTH' : 'SENS';
  const knob3Sub = isHumanizer ? `"${vowel2Label}"` : isTempo ? `${Math.round((sensVal / 10) * 100)}%` : `x${(1.5 + (sensVal / 10) * 6.5).toFixed(1)}`;

  return (
    <div
      className={`pedal-custom-enclosure pedal-boss-aw3 ${isEnabled ? 'pedal-active' : 'pedal-bypassed'} ${isDragging ? 'is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
    >
      {/* 1/4" Side Phone Jacks (Aligned with JACK_Y_OFFSET = 57, top: 46px) */}
      <div
        className={`stompbox-side-jack jack-left ${isLeftPending ? 'is-jack-pending' : ''} ${hasLeftCable ? 'has-cable' : ''}`}
        title="Audio Output Jack - Click to patch cable"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'out', e);
        }}
      />
      <div
        className={`stompbox-side-jack jack-right ${isRightPending ? 'is-jack-pending' : ''} ${hasRightCable ? 'has-cable' : ''}`}
        title="Audio Input Jack - Click to patch cable"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onJackClick?.(instance.id, 'in', e);
        }}
      />

      {/* Top Header Toolstrip */}
      <div className="boss-top-bar">
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

      {/* Top Recessed Black Control Plate (All Controls & Selectors Self-Contained) */}
      <div className="boss-control-cavity">
        {/* CHECK LED */}
        <div
          className="boss-check-led-wrap"
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(instance.id);
          }}
          title="CHECK LED (Click to toggle bypass)"
        >
          <span className="boss-check-text">CHECK</span>
          <div className={`boss-check-led ${isEnabled ? 'lit' : 'off'}`} />
        </div>

        {/* 4 Knobs in a Row */}
        <div className="boss-knobs-row">
          {/* Knob 1: DECAY */}
          <div className="boss-knob-col">
            <span className="boss-knob-name">{knob1Name}</span>
            <Knob
              label={knob1Name}
              value={decayVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={5}
              formatValue={(v) => v.toFixed(1)}
              onChange={(val) => onChangeParam(instance.id, 'decay', val)}
              variant="boss"
              size={32}
              showLabel={false}
              showValue={false}
            />
            <span className="boss-sub-ticks">{knob1Sub}</span>
          </div>

          {/* Knob 2: MANUAL / VOWEL 1 */}
          <div className="boss-knob-col">
            <span className="boss-knob-name">{knob2Name}</span>
            <Knob
              label={knob2Name}
              value={manualVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={4}
              formatValue={(v) => v.toFixed(1)}
              onChange={(val) => onChangeParam(instance.id, 'manual', val)}
              variant="boss"
              size={32}
              showLabel={false}
              showValue={false}
            />
            <span className={`boss-sub-ticks ${isHumanizer ? 'vowel-active-text' : ''}`}>{knob2Sub}</span>
          </div>

          {/* Knob 3: SENS / VOWEL 2 */}
          <div className="boss-knob-col">
            <span className="boss-knob-name">{knob3Name}</span>
            <Knob
              label={knob3Name}
              value={sensVal}
              min={0}
              max={10}
              step={0.1}
              defaultValue={6}
              formatValue={(v) => v.toFixed(1)}
              onChange={(val) => onChangeParam(instance.id, 'sens', val)}
              variant="boss"
              size={32}
              showLabel={false}
              showValue={false}
            />
            <span className={`boss-sub-ticks ${isHumanizer ? 'vowel-active-text' : ''}`}>{knob3Sub}</span>
          </div>

          {/* Knob 4: MODE Rotary Switch */}
          <div className="boss-knob-col">
            <span className="boss-knob-name">MODE</span>
            <Knob
              label="MODE"
              value={modeVal}
              min={0}
              max={4}
              step={1}
              defaultValue={0}
              formatValue={(v) => AW3_MODES[Math.round(v)] || 'UP'}
              onChange={(val) => onChangeParam(instance.id, 'mode', Math.round(val))}
              variant="boss"
              size={32}
              showLabel={false}
              showValue={false}
            />
            <span className="boss-sub-ticks mode-active-text">{currentModeLabel}</span>
          </div>
        </div>

        {/* Humanizer Vowel Bracket Subtext */}
        <div className="boss-aw3-vowel-bracket-wrap">
          <div className="boss-aw3-vowel-bracket">
            <span className="bracket-title">
              {isHumanizer
                ? `TALKING VOWEL MORPH: ${vowel1Label} → ${vowel2Label}`
                : isTempo
                ? 'RHYTHMIC TEMPO LFO WAH'
                : 'DYNAMIC ENVELOPE WAH'}
            </span>
          </div>
        </div>

      </div>

      {/* Middle Stamped Graphic Section (Clean Authentic Stamped Chassis) */}
      <div className="boss-mid-graphics boss-aw3-mid">
        {/* I/O Labels */}
        <div className="boss-io-arrows">
          <div className="boss-io-left">
            <span>&larr; OUTPUT</span>
          </div>
          <div className="boss-io-right">
            <span>INPUT &larr;</span>
          </div>
        </div>

        {/* Boss Model Typography (SD-1 Authentic Style) */}
        <div className="boss-aw3-typography">
          <div className="boss-aw3-dynamic">Dynamic</div>
          <div className="boss-aw3-wah">Wah</div>
          <div className="boss-aw3-model">AW-3</div>
        </div>
      </div>

      {/* Bottom Boss Treadle Rubber Footplate with Clean Embossed Logo */}
      <div
        className={`boss-treadle-plate ${isEnabled ? 'engaged' : ''}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggleEnabled(instance.id);
        }}
        title="Boss Treadle Footswitch (Click to toggle bypass)"
      >
        <div className="boss-rubber-pad">
          <div className="boss-embossed-logo">BOSS</div>
          <div className="boss-grip-lines">
            <div className="boss-grip-line" />
            <div className="boss-grip-line" />
            <div className="boss-grip-line" />
          </div>
        </div>

        {/* Bottom knurled thumb-screw */}
        <div className="boss-thumb-screw" />
      </div>
    </div>
  );
};
