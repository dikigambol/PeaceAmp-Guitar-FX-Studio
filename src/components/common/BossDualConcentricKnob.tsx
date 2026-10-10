import React, { useRef, useState, useCallback, useEffect } from 'react';

export interface BossDualConcentricKnobProps {
  // Inner Knob (Center Dome) - e.g. HIGH or MIDDLE
  innerLabel: string;
  innerValue: number;
  innerMin?: number;
  innerMax?: number;
  innerStep?: number;
  innerDefault?: number;
  onInnerChange: (val: number) => void;
  innerFormat?: (val: number) => string;

  // Outer Ring (Knurled Perimeter) - e.g. LOW or MID FREQ
  outerLabel: string;
  outerValue: number;
  outerMin?: number;
  outerMax?: number;
  outerStep?: number;
  outerDefault?: number;
  onOuterChange: (val: number) => void;
  outerFormat?: (val: number) => string;

  size?: number; // Total outer diameter, default 38px
}

/**
 * BossDualConcentricKnob
 * 
 * Authentic dual concentric stacked potentiometer knob as found on the Boss MT-2 Metal Zone:
 * - Inner Knob: Elevated center cylinder rotating strictly around (50, 50) with white indicator line.
 * - Outer Ring: Base knurled ring rotating strictly around (50, 50) with white indicator notch.
 * 
 * Single unified SVG coordinate space ensures zero orbital wobble and 100% concentric precision.
 * 3D shadows remain stationary facing downward as the knobs rotate.
 */
export const BossDualConcentricKnob: React.FC<BossDualConcentricKnobProps> = ({
  innerLabel,
  innerValue,
  innerMin = 0,
  innerMax = 10,
  innerStep = 0.1,
  innerDefault = 5,
  onInnerChange,
  innerFormat,

  outerLabel,
  outerValue,
  outerMin = 0,
  outerMax = 10,
  outerStep = 0.1,
  outerDefault = 5,
  onOuterChange,
  outerFormat,

  size = 38,
}) => {
  const [activeDrag, setActiveDrag] = useState<'inner' | 'outer' | null>(null);
  const dragStartY = useRef(0);
  const dragStartVal = useRef(0);

  // Normalization & Angles (-135deg to +135deg)
  const normInner = Math.min(1, Math.max(0, (innerValue - innerMin) / (innerMax - innerMin)));
  const innerAngle = -135 + normInner * 270;

  const normOuter = Math.min(1, Math.max(0, (outerValue - outerMin) / (outerMax - outerMin)));
  const outerAngle = -135 + normOuter * 270;

  // Inner knob drag
  const handleInnerPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveDrag('inner');
    dragStartY.current = e.clientY;
    dragStartVal.current = innerValue;
    document.body.style.cursor = 'ns-resize';
  };

  // Outer ring drag
  const handleOuterPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveDrag('outer');
    dragStartY.current = e.clientY;
    dragStartVal.current = outerValue;
    document.body.style.cursor = 'ns-resize';
  };

  const handlePointerMove = useCallback(
    (e: MouseEvent) => {
      if (!activeDrag) return;
      const deltaY = dragStartY.current - e.clientY;
      const dragDistance = 140; // 140px for full travel

      if (activeDrag === 'inner') {
        const range = innerMax - innerMin;
        const stepDelta = (deltaY / dragDistance) * range;
        let newVal = dragStartVal.current + stepDelta;
        newVal = Math.max(innerMin, Math.min(innerMax, newVal));
        if (innerStep) {
          newVal = Math.round(newVal / innerStep) * innerStep;
        }
        onInnerChange(newVal);
      } else if (activeDrag === 'outer') {
        const range = outerMax - outerMin;
        const stepDelta = (deltaY / dragDistance) * range;
        let newVal = dragStartVal.current + stepDelta;
        newVal = Math.max(outerMin, Math.min(outerMax, newVal));
        if (outerStep) {
          newVal = Math.round(newVal / outerStep) * outerStep;
        }
        onOuterChange(newVal);
      }
    },
    [activeDrag, innerMax, innerMin, innerStep, onInnerChange, outerMax, outerMin, outerStep, onOuterChange]
  );

  const handlePointerUp = useCallback(() => {
    setActiveDrag(null);
    document.body.style.cursor = '';
  }, []);

  useEffect(() => {
    if (activeDrag) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [activeDrag, handlePointerMove, handlePointerUp]);

  // Wheel scroll
  const handleInnerWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : -1;
    const delta = (innerMax - innerMin) * 0.05 * dir;
    let newVal = Math.max(innerMin, Math.min(innerMax, innerValue + delta));
    if (innerStep) newVal = Math.round(newVal / innerStep) * innerStep;
    onInnerChange(newVal);
  };

  const handleOuterWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : -1;
    const delta = (outerMax - outerMin) * 0.05 * dir;
    let newVal = Math.max(outerMin, Math.min(outerMax, outerValue + delta));
    if (outerStep) newVal = Math.round(newVal / outerStep) * outerStep;
    onOuterChange(newVal);
  };

  // Formatted labels
  const innerDisplay = innerFormat ? innerFormat(innerValue) : innerValue.toFixed(1);
  const outerDisplay = outerFormat ? outerFormat(outerValue) : outerValue.toFixed(1);

  return (
    <div
      className="boss-dual-knob-container"
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        touchAction: 'none',
      }}
      title={`${innerLabel} (Center): ${innerDisplay} | ${outerLabel} (Ring): ${outerDisplay}`}
    >
      <svg
        viewBox="0 0 100 100"
        style={{
          width: size,
          height: size,
          display: 'block',
          overflow: 'visible',
        }}
        className="boss-dual-concentric-svg"
      >
        <defs>
          {/* Outer ring radial base gradient */}
          <radialGradient id={`boss-dual-outer-base-${innerLabel}`} cx="42%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#323640" />
            <stop offset="70%" stopColor="#191c22" />
            <stop offset="100%" stopColor="#08090d" />
          </radialGradient>
          {/* Outer stationary downward drop shadow */}
          <filter id={`boss-outer-shadow-${innerLabel}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.8" floodColor="#000000" floodOpacity="0.85" />
          </filter>

          {/* Inner dome radial lighting gradient */}
          <radialGradient id={`boss-dual-inner-dome-${innerLabel}`} cx="42%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#3d434e" />
            <stop offset="40%" stopColor="#252a32" />
            <stop offset="85%" stopColor="#14171d" />
            <stop offset="100%" stopColor="#0a0c10" />
          </radialGradient>
          {/* Inner stationary downward drop shadow */}
          <filter id={`boss-inner-shadow-${innerLabel}`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.9" />
          </filter>
        </defs>

        {/* ================= TIER 1: OUTER RING (BASE) ================= */}
        <g
          className={`boss-dual-outer-tier ${activeDrag === 'outer' ? 'is-active' : ''}`}
          onPointerDown={handleOuterPointerDown}
          onWheel={handleOuterWheel}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onOuterChange(outerDefault);
          }}
          style={{ cursor: 'ns-resize' }}
        >
          {/* Outer circular body with stationary downward shadow */}
          <circle
            cx="50"
            cy="50"
            r="48"
            fill={`url(#boss-dual-outer-base-${innerLabel})`}
            filter={`url(#boss-outer-shadow-${innerLabel})`}
            stroke={activeDrag === 'outer' ? '#ff6d1f' : '#090a0d'}
            strokeWidth={activeDrag === 'outer' ? '1.5' : '1.2'}
          />

          {/* Rotating Outer Ring features strictly pivoting at center (50, 50) */}
          <g transform={`rotate(${outerAngle}, 50, 50)`}>
            {/* 24 knurled edge serrations */}
            {Array.from({ length: 24 }).map((_, i) => {
              const a = (i * 15 * Math.PI) / 180;
              const x1 = 50 + 41 * Math.sin(a);
              const y1 = 50 - 41 * Math.cos(a);
              const x2 = 50 + 48 * Math.sin(a);
              const y2 = 50 - 48 * Math.cos(a);
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#101318" strokeWidth="2.0" />;
            })}

            {/* Concentric groove and inner flange */}
            <circle cx="50" cy="50" r="41" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
            <circle cx="50" cy="50" r="33" fill="#14171d" stroke="#090a0d" strokeWidth="0.8" />

            {/* White Indicator Notch on outer rim at noon */}
            <rect
              x="48"
              y="3"
              width="4"
              height="11"
              rx="1.5"
              fill="#ffffff"
              filter="drop-shadow(0 0.5px 1px rgba(0,0,0,0.9))"
            />
          </g>
        </g>

        {/* ================= TIER 2: INNER KNOB (ELEVATED CENTER) ================= */}
        <g
          className={`boss-dual-inner-tier ${activeDrag === 'inner' ? 'is-active' : ''}`}
          onPointerDown={handleInnerPointerDown}
          onWheel={handleInnerWheel}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onInnerChange(innerDefault);
          }}
          style={{ cursor: 'ns-resize' }}
        >
          {/* Stationary elevated dome with stationary downward shadow */}
          <circle
            cx="50"
            cy="50"
            r="26.5"
            fill={`url(#boss-dual-inner-dome-${innerLabel})`}
            filter={`url(#boss-inner-shadow-${innerLabel})`}
            stroke={activeDrag === 'inner' ? '#ffffff' : '#4a525f'}
            strokeWidth={activeDrag === 'inner' ? '1.5' : '1.2'}
          />
          <circle cx="50" cy="50" r="25" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
          <circle cx="50" cy="50" r="20.5" fill="#1b1e25" stroke="#0d0f13" strokeWidth="0.8" />

          {/* Rotating Inner Features strictly pivoting at (50, 50) */}
          <g transform={`rotate(${innerAngle}, 50, 50)`}>
            {/* 16 subtle grip notches on inner dome rim */}
            {Array.from({ length: 16 }).map((_, i) => {
              const a = (i * 22.5 * Math.PI) / 180;
              const x1 = 50 + 23 * Math.sin(a);
              const y1 = 50 - 23 * Math.cos(a);
              const x2 = 50 + 26.5 * Math.sin(a);
              const y2 = 50 - 26.5 * Math.cos(a);
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#101217" strokeWidth="1.5" />;
            })}

            {/* Crisp White Radial Indicator Line extending from center (50, 50) to top rim (50, 24) */}
            <line
              x1="50"
              y1="49"
              x2="50"
              y2="24"
              stroke="#ffffff"
              strokeWidth="3.2"
              strokeLinecap="round"
              filter="drop-shadow(0 0.5px 1px rgba(0,0,0,0.9))"
            />
          </g>

          {/* Transparent hit area over center for rock-solid inner click detection */}
          <circle cx="50" cy="50" r="26.5" fill="transparent" />
        </g>
      </svg>
    </div>
  );
};
