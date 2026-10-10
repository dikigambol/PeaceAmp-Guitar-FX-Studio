import React, { useRef, useState, useCallback, useEffect } from 'react';

export interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  formatValue?: (val: number) => string;
  onChange: (val: number) => void;
  disabled?: boolean;
  size?: number;
  color?: string;
  variant?:
    | 'default'
    | 'mxr'
    | 'boss'
    | 'ross'
    | 'keeley'
    | 'ts808'
    | 'ts9'
    | 'boss-silver'
    | 'boss-gold'
    | 'boss-orange'
    | 'boss-black'
    | 'klon-oxblood'
    | 'ocd'
    | 'davies'
    | 'nobels'
    | 'archer'
    | 'bigmuff'
    | 'fuzzface'
    | 'tonebender'
    | 'fuzzfactory'
    | 'flatiron'
    | 'tsmini-small'
    | 'tsmini-large'
    | 'ibanez-tonelok';
  showLabel?: boolean;
  showValue?: boolean;
  subLabel?: string;
}

// Authentic SVG Dial Renderers for Pedal Knobs
// All dials use viewBox="0 0 100 100" with rotational center at (50, 50).
// Pointer indicators are strictly aligned on x=50 to guarantee 100% perpendicular, radial precision.

const MxrKnobDial: React.FC = () => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      <radialGradient id="mxr-body-grad" cx="42%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#373d48" />
        <stop offset="55%" stopColor="#1c2027" />
        <stop offset="100%" stopColor="#090b0e" />
      </radialGradient>
      <radialGradient id="mxr-cap-grad" cx="45%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#3d4452" />
        <stop offset="60%" stopColor="#20242c" />
        <stop offset="100%" stopColor="#11141a" />
      </radialGradient>
      <filter id="mxr-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.8" />
      </filter>
    </defs>
    {/* Scalloped outer body (6 flutes) */}
    <circle cx="50" cy="50" r="48" fill="url(#mxr-body-grad)" filter="url(#mxr-shadow)" />
    <g fill="#14171d" opacity="0.65">
      <circle cx="50" cy="3" r="6" />
      <circle cx="90.7" cy="26.5" r="6" />
      <circle cx="90.7" cy="73.5" r="6" />
      <circle cx="50" cy="97" r="6" />
      <circle cx="9.3" cy="73.5" r="6" />
      <circle cx="9.3" cy="26.5" r="6" />
    </g>
    {/* Inner raised fluted cap */}
    <circle cx="50" cy="50" r="34" fill="url(#mxr-cap-grad)" stroke="#090c10" strokeWidth="1.5" />
    <circle cx="50" cy="50" r="33" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
    {/* White Indicator Dot at Top Rim */}
    <circle cx="50" cy="9" r="2.8" fill="#ffffff" filter="drop-shadow(0 1px 1.5px rgba(0,0,0,0.9))" />
    {/* White Indicator Line down Center (guaranteed x=50, perpendicular) */}
    <line
      x1="50"
      y1="16"
      x2="50"
      y2="42"
      stroke="#ffffff"
      strokeWidth="3.2"
      strokeLinecap="round"
      filter="drop-shadow(0 1px 1.5px rgba(0,0,0,0.9))"
    />
  </svg>
);

const RossKnobDial: React.FC = () => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      <radialGradient id="ross-base-grad" cx="45%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#2c333c" />
        <stop offset="80%" stopColor="#161a20" />
        <stop offset="100%" stopColor="#0b0e12" />
      </radialGradient>
      <linearGradient id="ross-wedge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#181c22" />
        <stop offset="25%" stopColor="#374151" />
        <stop offset="50%" stopColor="#4b5563" />
        <stop offset="75%" stopColor="#374151" />
        <stop offset="100%" stopColor="#181c22" />
      </linearGradient>
    </defs>
    {/* Circular base */}
    <circle cx="50" cy="50" r="48" fill="url(#ross-base-grad)" stroke="#090c10" strokeWidth="1.5" />
    {/* Raised Pointer Wedge (symmetrical, centered) */}
    <path
      d="M 37 80 L 35 25 C 35 12 65 12 65 25 L 63 80 Z"
      fill="url(#ross-wedge-grad)"
      stroke="#0f1318"
      strokeWidth="1.2"
      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.75))"
    />
    {/* Gold/Yellow center stripe (guaranteed x=50, perpendicular) */}
    <line
      x1="50"
      y1="10"
      x2="50"
      y2="46"
      stroke="#fbbf24"
      strokeWidth="3.2"
      strokeLinecap="round"
      filter="drop-shadow(0 0 2px rgba(251,191,36,0.5))"
    />
  </svg>
);

const BossKnobDial: React.FC = () => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      <radialGradient id="boss-skirt-grad" cx="40%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#2d333f" />
        <stop offset="100%" stopColor="#0b0d12" />
      </radialGradient>
      <radialGradient id="boss-white-cap-grad" cx="45%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="65%" stopColor="#f1f5f9" />
        <stop offset="90%" stopColor="#cbd5e1" />
        <stop offset="100%" stopColor="#94a3b8" />
      </radialGradient>
    </defs>
    {/* Black ribbed skirt rim */}
    <circle cx="50" cy="50" r="48" fill="url(#boss-skirt-grad)" stroke="#05070a" strokeWidth="1.5" />
    {/* Outer teeth/notches */}
    {Array.from({ length: 18 }).map((_, i) => {
      const a = (i * 20 * Math.PI) / 180;
      const x1 = 50 + 43 * Math.sin(a);
      const y1 = 50 - 43 * Math.cos(a);
      const x2 = 50 + 48 * Math.sin(a);
      const y2 = 50 - 48 * Math.cos(a);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#11141a" strokeWidth="2.2" />;
    })}
    {/* Inner White Cap */}
    <circle cx="50" cy="50" r="35" fill="url(#boss-white-cap-grad)" stroke="#475569" strokeWidth="1.5" />
    <circle cx="50" cy="50" r="34" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.8" />
    {/* Black Pointer Line (guaranteed x=50, perpendicular) */}
    <line
      x1="50"
      y1="15"
      x2="50"
      y2="42"
      stroke="#0f172a"
      strokeWidth="3.5"
      strokeLinecap="round"
      filter="drop-shadow(0 0.5px 1px rgba(0,0,0,0.5))"
    />
  </svg>
);

const KeeleyKnobDial: React.FC = () => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      <radialGradient id="keeley-skirt-grad" cx="45%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#374151" />
        <stop offset="85%" stopColor="#181c22" />
        <stop offset="100%" stopColor="#0c0e12" />
      </radialGradient>
      <linearGradient id="keeley-bar-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#1c2027" />
        <stop offset="35%" stopColor="#3d4654" />
        <stop offset="65%" stopColor="#3d4654" />
        <stop offset="100%" stopColor="#1c2027" />
      </linearGradient>
    </defs>
    {/* Circular skirt with flutes */}
    <circle cx="50" cy="50" r="48" fill="url(#keeley-skirt-grad)" stroke="#090c10" strokeWidth="1.2" />
    {/* Raised Pointer Bar (Davies 1900h) */}
    <path
      d="M 36 78 C 36 84 64 84 64 78 L 62 30 C 62 16 50 10 50 10 C 50 10 38 16 38 30 Z"
      fill="url(#keeley-bar-grad)"
      stroke="#0f1318"
      strokeWidth="1.2"
      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
    />
    {/* Crisp White Indicator Line down center of pointer (guaranteed x=50, perpendicular) */}
    <line
      x1="50"
      y1="12"
      x2="50"
      y2="46"
      stroke="#ffffff"
      strokeWidth="3"
      strokeLinecap="round"
      filter="drop-shadow(0 1px 1.5px rgba(0,0,0,0.85))"
    />
  </svg>
);

const Ts808KnobDial: React.FC = () => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      <radialGradient id="ts808-body-grad" cx="42%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#2c333f" />
        <stop offset="65%" stopColor="#181d26" />
        <stop offset="100%" stopColor="#0b0e14" />
      </radialGradient>
      <radialGradient id="ts808-center-dome" cx="45%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#222834" />
        <stop offset="85%" stopColor="#12161f" />
        <stop offset="100%" stopColor="#080a0f" />
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#ts808-body-grad)" stroke="#05070a" strokeWidth="1.5" />
    {/* 18 Outer Flutes */}
    {Array.from({ length: 18 }).map((_, i) => {
      const a = (i * 20 * Math.PI) / 180;
      const x1 = 50 + 42 * Math.sin(a);
      const y1 = 50 - 42 * Math.cos(a);
      const x2 = 50 + 48 * Math.sin(a);
      const y2 = 50 - 48 * Math.cos(a);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#090c10" strokeWidth="2.5" />;
    })}
    {/* Smooth Center Cap */}
    <circle cx="50" cy="50" r="34" fill="url(#ts808-center-dome)" stroke="#334155" strokeWidth="1.2" />
    <circle cx="50" cy="50" r="33" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
    {/* Crisp White Indicator Line down center (x=50) */}
    <line
      x1="50"
      y1="14"
      x2="50"
      y2="42"
      stroke="#ffffff"
      strokeWidth="3.2"
      strokeLinecap="round"
      filter="drop-shadow(0 1px 1.5px rgba(0,0,0,0.9))"
    />
  </svg>
);

const Ts9KnobDial: React.FC = () => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      <radialGradient id="ts9-skirt-grad" cx="45%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#2c333e" />
        <stop offset="100%" stopColor="#0b0e14" />
      </radialGradient>
      <radialGradient id="ts9-silver-cap" cx="45%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="30%" stopColor="#f1f5f9" />
        <stop offset="65%" stopColor="#cbd5e1" />
        <stop offset="90%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#64748b" />
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#ts9-skirt-grad)" stroke="#06090e" strokeWidth="1.5" />
    {/* 18 Outer Flutes */}
    {Array.from({ length: 18 }).map((_, i) => {
      const a = (i * 20 * Math.PI) / 180;
      const x1 = 50 + 42 * Math.sin(a);
      const y1 = 50 - 42 * Math.cos(a);
      const x2 = 50 + 48 * Math.sin(a);
      const y2 = 50 - 48 * Math.cos(a);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#11151d" strokeWidth="2.5" />;
    })}
    {/* Spun Aluminum Disc */}
    <circle cx="50" cy="50" r="34" fill="url(#ts9-silver-cap)" stroke="#475569" strokeWidth="1.2" />
    <circle cx="50" cy="50" r="33" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.8" />
    <circle cx="50" cy="50" r="22" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.6" />
    <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.6" />
    {/* Black Pointer Line down center (x=50) */}
    <line
      x1="50"
      y1="14"
      x2="50"
      y2="42"
      stroke="#0f172a"
      strokeWidth="3.2"
      strokeLinecap="round"
      filter="drop-shadow(0 0.5px 1px rgba(0,0,0,0.5))"
    />
  </svg>
);

const BossSilverKnobDial: React.FC = () => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      <radialGradient id="boss-slv-skirt" cx="40%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#2d333f" />
        <stop offset="100%" stopColor="#0b0d12" />
      </radialGradient>
      <radialGradient id="boss-slv-cap" cx="45%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#e2e8f0" />
        <stop offset="85%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#64748b" />
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#boss-slv-skirt)" stroke="#05070a" strokeWidth="1.5" />
    {Array.from({ length: 18 }).map((_, i) => {
      const a = (i * 20 * Math.PI) / 180;
      const x1 = 50 + 43 * Math.sin(a);
      const y1 = 50 - 43 * Math.cos(a);
      const x2 = 50 + 48 * Math.sin(a);
      const y2 = 50 - 48 * Math.cos(a);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#11141a" strokeWidth="2.2" />;
    })}
    <circle cx="50" cy="50" r="35" fill="url(#boss-slv-cap)" stroke="#475569" strokeWidth="1.5" />
    <circle cx="50" cy="50" r="34" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.8" />
    <line
      x1="50"
      y1="15"
      x2="50"
      y2="42"
      stroke="#0f172a"
      strokeWidth="3.5"
      strokeLinecap="round"
      filter="drop-shadow(0 0.5px 1px rgba(0,0,0,0.5))"
    />
  </svg>
);

const BossGoldKnobDial: React.FC = () => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      <radialGradient id="boss-gld-skirt" cx="40%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#2d333f" />
        <stop offset="100%" stopColor="#0b0d12" />
      </radialGradient>
      <radialGradient id="boss-gld-cap" cx="45%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#fef3c7" />
        <stop offset="45%" stopColor="#fde68a" />
        <stop offset="80%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#92400e" />
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#boss-gld-skirt)" stroke="#05070a" strokeWidth="1.5" />
    {Array.from({ length: 18 }).map((_, i) => {
      const a = (i * 20 * Math.PI) / 180;
      const x1 = 50 + 43 * Math.sin(a);
      const y1 = 50 - 43 * Math.cos(a);
      const x2 = 50 + 48 * Math.sin(a);
      const y2 = 50 - 48 * Math.cos(a);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#11141a" strokeWidth="2.2" />;
    })}
    <circle cx="50" cy="50" r="35" fill="url(#boss-gld-cap)" stroke="#78350f" strokeWidth="1.5" />
    <circle cx="50" cy="50" r="34" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" />
    <line
      x1="50"
      y1="15"
      x2="50"
      y2="42"
      stroke="#1c1917"
      strokeWidth="3.5"
      strokeLinecap="round"
      filter="drop-shadow(0 0.5px 1px rgba(0,0,0,0.5))"
    />
  </svg>
);

const BossOrangeKnobDial: React.FC = () => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      <radialGradient id="boss-org-skirt" cx="40%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#2d333f" />
        <stop offset="100%" stopColor="#0b0d12" />
      </radialGradient>
      <radialGradient id="boss-org-cap" cx="45%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#ff9a3c" />
        <stop offset="50%" stopColor="#f97316" />
        <stop offset="85%" stopColor="#ea580c" />
        <stop offset="100%" stopColor="#c2410c" />
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#boss-org-skirt)" stroke="#05070a" strokeWidth="1.5" />
    {Array.from({ length: 18 }).map((_, i) => {
      const a = (i * 20 * Math.PI) / 180;
      const x1 = 50 + 43 * Math.sin(a);
      const y1 = 50 - 43 * Math.cos(a);
      const x2 = 50 + 48 * Math.sin(a);
      const y2 = 50 - 48 * Math.cos(a);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#11141a" strokeWidth="2.2" />;
    })}
    <circle cx="50" cy="50" r="35" fill="url(#boss-org-cap)" stroke="#9a3412" strokeWidth="1.5" />
    <circle cx="50" cy="50" r="34" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
    <line
      x1="50"
      y1="15"
      x2="50"
      y2="42"
      stroke="#0f172a"
      strokeWidth="3.5"
      strokeLinecap="round"
      filter="drop-shadow(0 0.5px 1px rgba(0,0,0,0.5))"
    />
  </svg>
);

const BossBlackKnobDial: React.FC = () => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      <radialGradient id="boss-blk-skirt" cx="40%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#2d333f" />
        <stop offset="100%" stopColor="#0b0d12" />
      </radialGradient>
      <radialGradient id="boss-blk-cap" cx="45%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#30353d" />
        <stop offset="45%" stopColor="#1e2229" />
        <stop offset="85%" stopColor="#12151b" />
        <stop offset="100%" stopColor="#0a0c10" />
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#boss-blk-skirt)" stroke="#05070a" strokeWidth="1.5" />
    {Array.from({ length: 18 }).map((_, i) => {
      const a = (i * 20 * Math.PI) / 180;
      const x1 = 50 + 43 * Math.sin(a);
      const y1 = 50 - 43 * Math.cos(a);
      const x2 = 50 + 48 * Math.sin(a);
      const y2 = 50 - 48 * Math.cos(a);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#11141a" strokeWidth="2.2" />;
    })}
    <circle cx="50" cy="50" r="35" fill="url(#boss-blk-cap)" stroke="#3f4550" strokeWidth="1.2" />
    <circle cx="50" cy="50" r="34" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.8" />
    {/* Crisp White Indicator Line down center (guaranteed x=50, perpendicular) */}
    <line
      x1="50"
      y1="14"
      x2="50"
      y2="42"
      stroke="#ffffff"
      strokeWidth="3.4"
      strokeLinecap="round"
      filter="drop-shadow(0 0.5px 1.5px rgba(0,0,0,0.85))"
    />
  </svg>
);

const IbanezToneLokKnobDial: React.FC = () => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      <radialGradient id="tonelok-skirt" cx="42%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="45%" stopColor="#64748b" />
        <stop offset="85%" stopColor="#475569" />
        <stop offset="100%" stopColor="#334155" />
      </radialGradient>
      <radialGradient id="tonelok-dome" cx="40%" cy="36%" r="64%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="25%" stopColor="#e2e8f0" />
        <stop offset="60%" stopColor="#94a3b8" />
        <stop offset="90%" stopColor="#64748b" />
        <stop offset="100%" stopColor="#475569" />
      </radialGradient>
      <filter id="tonelok-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.2" floodColor="#000000" floodOpacity="0.75" />
      </filter>
    </defs>
    {/* Base rim */}
    <circle cx="50" cy="50" r="48" fill="url(#tonelok-skirt)" filter="url(#tonelok-shadow)" stroke="#334155" strokeWidth="1.2" />
    {/* 24 knurled outer notches */}
    {Array.from({ length: 24 }).map((_, i) => {
      const a = (i * 15 * Math.PI) / 180;
      const x1 = 50 + 43 * Math.sin(a);
      const y1 = 50 - 43 * Math.cos(a);
      const x2 = 50 + 48 * Math.sin(a);
      const y2 = 50 - 48 * Math.cos(a);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#334155" strokeWidth="2.2" />;
    })}
    {/* Raised Spun Aluminum Dome */}
    <circle cx="50" cy="50" r="38" fill="url(#tonelok-dome)" stroke="#475569" strokeWidth="1.2" />
    <circle cx="50" cy="50" r="37" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" />
    {/* Fine concentric lathe groove rings */}
    <circle cx="50" cy="50" r="26" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.6" />
    <circle cx="50" cy="50" r="14" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.6" />
    {/* Dark Recessed Indicator Slot down center (guaranteed x=50, perpendicular) */}
    <line
      x1="50"
      y1="14"
      x2="50"
      y2="44"
      stroke="#1e293b"
      strokeWidth="3.2"
      strokeLinecap="round"
      filter="drop-shadow(0 0.5px 0.5px rgba(255,255,255,0.4))"
    />
  </svg>
);

const KlonOxbloodKnobDial: React.FC = () => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      <radialGradient id="klon-oxblood-grad" cx="45%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#7f1d1d" />
        <stop offset="60%" stopColor="#450a0a" />
        <stop offset="100%" stopColor="#260404" />
      </radialGradient>
      <linearGradient id="klon-nose-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#450a0a" />
        <stop offset="50%" stopColor="#991b1b" />
        <stop offset="100%" stopColor="#450a0a" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#klon-oxblood-grad)" stroke="#1a0202" strokeWidth="1.5" />
    {/* Raised pointer wedge/nose */}
    <path
      d="M 37 78 L 35 25 C 35 12 65 12 65 25 L 63 78 Z"
      fill="url(#klon-nose-grad)"
      stroke="#1a0202"
      strokeWidth="1.2"
      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.7))"
    />
    <line
      x1="50"
      y1="10"
      x2="50"
      y2="46"
      stroke="#fef3c7"
      strokeWidth="3.2"
      strokeLinecap="round"
      filter="drop-shadow(0 1px 1px rgba(0,0,0,0.8))"
    />
  </svg>
);

const OcdKnobDial: React.FC = () => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      <radialGradient id="ocd-skirt-grad" cx="42%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#2e333c" />
        <stop offset="55%" stopColor="#181a1f" />
        <stop offset="100%" stopColor="#090a0d" />
      </radialGradient>
      <linearGradient id="ocd-pointer-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#14171b" />
        <stop offset="25%" stopColor="#282d36" />
        <stop offset="50%" stopColor="#3d4450" />
        <stop offset="75%" stopColor="#282d36" />
        <stop offset="100%" stopColor="#121417" />
      </linearGradient>
      <radialGradient id="ocd-cap-highlight" cx="50%" cy="30%" r="55%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
        <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
      </radialGradient>
      <filter id="ocd-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.85" />
      </filter>
    </defs>
    {/* Fluted Base Skirt */}
    <circle cx="50" cy="50" r="47" fill="url(#ocd-skirt-grad)" stroke="#060709" strokeWidth="1.5" filter="url(#ocd-shadow)" />
    <circle cx="50" cy="50" r="45.5" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
    <circle cx="50" cy="50" r="34" fill="#111317" stroke="#0a0c0e" strokeWidth="1" />

    {/* Authentic Davies 1900H Fluted Pointer Body */}
    <path
      d="M 50 10 C 53 10 59 18 61 28 C 63 36 61 42 63 48 C 65 54 66 60 66 67 C 66 77 59 84 50 84 C 41 84 34 77 34 67 C 34 60 35 54 37 48 C 39 42 37 36 39 28 C 41 18 47 10 50 10 Z"
      fill="url(#ocd-pointer-grad)"
      stroke="#080a0d"
      strokeWidth="1.2"
      filter="url(#ocd-shadow)"
    />

    {/* Top Surface Highlight Overlay */}
    <path
      d="M 50 11 C 52.5 11 57.5 18.5 59.5 28 C 61.5 35.5 59.5 41.5 61.5 47.5 C 63.5 53.5 64.5 59.5 64.5 66.5 C 64.5 75.5 58 82 50 82 C 42 82 35.5 75.5 35.5 66.5 C 35.5 59.5 36.5 53.5 38.5 47.5 C 40.5 41.5 38.5 35.5 40.5 28 C 42.5 18.5 47.5 11 50 11 Z"
      fill="url(#ocd-cap-highlight)"
    />

    {/* White Indicator Line (perpendicular along x=50) */}
    <line
      x1="50"
      y1="12"
      x2="50"
      y2="44"
      stroke="#ffffff"
      strokeWidth="3.2"
      strokeLinecap="round"
      filter="drop-shadow(0 1px 1.5px rgba(0,0,0,0.9))"
    />
  </svg>
);

const DaviesKnobDial: React.FC = () => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      <radialGradient id="davies-skirt-grad" cx="42%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#27272a" />
        <stop offset="55%" stopColor="#18181b" />
        <stop offset="100%" stopColor="#09090b" />
      </radialGradient>
      <linearGradient id="davies-pointer-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#18181b" />
        <stop offset="25%" stopColor="#27272a" />
        <stop offset="50%" stopColor="#3f3f46" />
        <stop offset="75%" stopColor="#27272a" />
        <stop offset="100%" stopColor="#09090b" />
      </linearGradient>
      <radialGradient id="davies-cap-highlight" cx="50%" cy="28%" r="55%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
        <stop offset="50%" stopColor="rgba(255,255,255,0.06)" />
        <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
      </radialGradient>
      <radialGradient id="davies-brass-screw" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="60%" stopColor="#ca8a04" />
        <stop offset="100%" stopColor="#713f12" />
      </radialGradient>
      <filter id="davies-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.85" />
      </filter>
    </defs>
    {/* Fluted Base Skirt with Flutes & Brass Screw */}
    <circle cx="50" cy="50" r="47.5" fill="url(#davies-skirt-grad)" stroke="#09090b" strokeWidth="1.5" filter="url(#davies-shadow)" />
    <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.8" />
    {/* Skirt Flute Notches */}
    {Array.from({ length: 24 }).map((_, i) => {
      const a = (i * 15 * Math.PI) / 180;
      const x1 = 50 + 44 * Math.sin(a);
      const y1 = 50 - 44 * Math.cos(a);
      const x2 = 50 + 47.5 * Math.sin(a);
      const y2 = 50 - 47.5 * Math.cos(a);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#09090b" strokeWidth="1.2" opacity={0.7} />;
    })}
    {/* Inner collar step */}
    <circle cx="50" cy="50" r="35" fill="#18181b" stroke="#09090b" strokeWidth="1" />

    {/* Authentic Davies 1900H Fluted Pointer Beak / Body */}
    <path
      d="M 50 10 C 53 10 59 18 61 28 C 63 36 61 42 63 48 C 65 54 66 60 66 67 C 66 77 59 84 50 84 C 41 84 34 77 34 67 C 34 60 35 54 37 48 C 39 42 37 36 39 28 C 41 18 47 10 50 10 Z"
      fill="url(#davies-pointer-grad)"
      stroke="#09090b"
      strokeWidth="1.2"
      filter="url(#davies-shadow)"
    />

    {/* Top Surface Highlight Overlay */}
    <path
      d="M 50 11 C 52.5 11 57.5 18.5 59.5 28 C 61.5 35.5 59.5 41.5 61.5 47.5 C 63.5 53.5 64.5 59.5 64.5 66.5 C 64.5 75.5 58 82 50 82 C 42 82 35.5 75.5 35.5 66.5 C 35.5 59.5 36.5 53.5 38.5 47.5 C 40.5 41.5 38.5 35.5 40.5 28 C 42.5 18.5 47.5 11 50 11 Z"
      fill="url(#davies-cap-highlight)"
    />

    {/* Crisp White Radial Indicator Line */}
    <line
      x1="50"
      y1="11"
      x2="50"
      y2="44"
      stroke="#ffffff"
      strokeWidth="3.4"
      strokeLinecap="round"
      filter="drop-shadow(0 1px 1.5px rgba(0,0,0,0.95))"
    />
  </svg>
);

const NobelsKnobDial: React.FC = () => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      <radialGradient id="nobels-grad" cx="42%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#374151" />
        <stop offset="65%" stopColor="#1f2937" />
        <stop offset="100%" stopColor="#0b0f17" />
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#nobels-grad)" stroke="#05070a" strokeWidth="1.5" />
    {Array.from({ length: 16 }).map((_, i) => {
      const a = (i * 22.5 * Math.PI) / 180;
      const x1 = 50 + 41 * Math.sin(a);
      const y1 = 50 - 41 * Math.cos(a);
      const x2 = 50 + 48 * Math.sin(a);
      const y2 = 50 - 48 * Math.cos(a);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#111827" strokeWidth="2.5" />;
    })}
    <circle cx="50" cy="50" r="33" fill="#181e28" stroke="#0e131b" strokeWidth="1.2" />
    <line
      x1="50"
      y1="12"
      x2="50"
      y2="44"
      stroke="#ffffff"
      strokeWidth="3.2"
      strokeLinecap="round"
      filter="drop-shadow(0 1px 1px rgba(0,0,0,0.8))"
    />
  </svg>
);

const ArcherKnobDial: React.FC = () => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      <radialGradient id="archer-base-grad" cx="45%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#7a141d" />
        <stop offset="60%" stopColor="#480a10" />
        <stop offset="100%" stopColor="#220306" />
      </radialGradient>
      <radialGradient id="archer-dome-grad" cx="42%" cy="38%" r="60%">
        <stop offset="0%" stopColor="#8c1b25" />
        <stop offset="50%" stopColor="#560d15" />
        <stop offset="85%" stopColor="#35060a" />
        <stop offset="100%" stopColor="#1a0204" />
      </radialGradient>
      <linearGradient id="archer-ridge-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#b91c1c" />
        <stop offset="60%" stopColor="#7f1d1d" />
        <stop offset="100%" stopColor="#450a0a" />
      </linearGradient>
    </defs>
    {/* Base Skirt */}
    <circle cx="50" cy="50" r="47" fill="url(#archer-base-grad)" stroke="#1a0205" strokeWidth="1.8" />
    <circle cx="50" cy="50" r="44.5" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="0.8" />

    {/* Iconic Domed Pointer Body with Molded Beak along x=50 */}
    <path
      d="M 50 8 
         C 53.5 14, 63 18, 71 25 
         C 81 34, 85 47, 85 58 
         C 85 75, 69 88, 50 88 
         C 31 88, 15 75, 15 58 
         C 15 47, 19 34, 29 25 
         C 37 18, 46.5 14, 50 8 Z"
      fill="url(#archer-dome-grad)"
      stroke="#140103"
      strokeWidth="1.5"
    />

    {/* Raised Center Convex Dome */}
    <circle cx="50" cy="56" r="30" fill="url(#archer-dome-grad)" stroke="#200306" strokeWidth="1" />
    <circle cx="48" cy="53" r="28" fill="none" stroke="rgba(255, 255, 255, 0.18)" strokeWidth="0.8" />

    {/* Molded Sharp Pointer Beak Ridge (centered strictly along x=50) */}
    <line
      x1="50"
      y1="9"
      x2="50"
      y2="34"
      stroke="url(#archer-ridge-grad)"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
    <line
      x1="50"
      y1="10"
      x2="50"
      y2="28"
      stroke="#fca5a5"
      strokeWidth="1"
      strokeLinecap="round"
      opacity="0.6"
    />
  </svg>
);

const TsMiniSmallDial: React.FC = () => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      <radialGradient id="tsmini-sm-grad" cx="40%" cy="38%" r="62%">
        <stop offset="0%" stopColor="#374151" />
        <stop offset="65%" stopColor="#1f2937" />
        <stop offset="100%" stopColor="#0b0f17" />
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#tsmini-sm-grad)" stroke="#05070a" strokeWidth="2" />
    {Array.from({ length: 16 }).map((_, i) => {
      const a = (i * 22.5 * Math.PI) / 180;
      const x1 = 50 + 42 * Math.sin(a);
      const y1 = 50 - 42 * Math.cos(a);
      const x2 = 50 + 48 * Math.sin(a);
      const y2 = 50 - 48 * Math.cos(a);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#111827" strokeWidth="2.2" />;
    })}
    <circle cx="50" cy="50" r="36" fill="#111827" stroke="#000000" strokeWidth="1" />
    <circle cx="50" cy="50" r="30" fill="#1f2937" />
    <line
      x1="50"
      y1="10"
      x2="50"
      y2="42"
      stroke="#ffffff"
      strokeWidth="4"
      strokeLinecap="round"
      filter="drop-shadow(0 0.5px 1px rgba(0,0,0,0.8))"
    />
  </svg>
);

const TsMiniLargeDial: React.FC = () => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      <radialGradient id="tsmini-lg-body" cx="45%" cy="38%" r="60%">
        <stop offset="0%" stopColor="#374151" />
        <stop offset="60%" stopColor="#181c24" />
        <stop offset="100%" stopColor="#080a0f" />
      </radialGradient>
      <radialGradient id="tsmini-lg-inner" cx="42%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#252a33" />
        <stop offset="70%" stopColor="#14171d" />
        <stop offset="100%" stopColor="#090b0e" />
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#tsmini-lg-body)" stroke="#05070a" strokeWidth="1.5" />
    {Array.from({ length: 6 }).map((_, i) => {
      const a = (i * 60 * Math.PI) / 180;
      const cx = 50 + 44 * Math.sin(a);
      const cy = 50 - 44 * Math.cos(a);
      return <circle key={i} cx={cx} cy={cy} r="12" fill="#0c0e14" opacity="0.6" />;
    })}
    <circle cx="50" cy="50" r="38" fill="url(#tsmini-lg-inner)" stroke="#000000" strokeWidth="1.5" />
    <line
      x1="50"
      y1="14"
      x2="50"
      y2="44"
      stroke="#ffffff"
      strokeWidth="4.5"
      strokeLinecap="round"
      filter="drop-shadow(0 1px 1.5px rgba(0,0,0,0.9))"
    />
    <circle cx="50" cy="50" r="2.5" fill="#ffffff" />
  </svg>
);

const DefaultKnobDial: React.FC<{ color: string }> = ({ color }) => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      <radialGradient id="default-metal-grad" cx="45%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#475569" />
        <stop offset="35%" stopColor="#334155" />
        <stop offset="70%" stopColor="#1e293b" />
        <stop offset="100%" stopColor="#0f172a" />
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="47" fill="url(#default-metal-grad)" stroke="#64748b" strokeWidth="1.5" />
    <circle cx="50" cy="38" r="37" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
    <line
      x1="50"
      y1="6"
      x2="50"
      y2="22"
      stroke={color}
      strokeWidth="3.2"
      strokeLinecap="round"
      filter="drop-shadow(0 0 3px currentColor)"
    />
  </svg>
);

const BigMuffKnobDial: React.FC = () => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      <radialGradient id="bm-body-grad" cx="42%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#32363e" />
        <stop offset="50%" stopColor="#181a20" />
        <stop offset="100%" stopColor="#08090c" />
      </radialGradient>
      <radialGradient id="bm-cap-grad" cx="45%" cy="40%" r="55%">
        <stop offset="0%" stopColor="#252930" />
        <stop offset="65%" stopColor="#14161b" />
        <stop offset="100%" stopColor="#0b0d11" />
      </radialGradient>
      <filter id="bm-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.85" />
      </filter>
    </defs>
    {/* Outer Cylindrical Puck Body */}
    <circle cx="50" cy="50" r="48" fill="url(#bm-body-grad)" filter="url(#bm-shadow)" stroke="#050608" strokeWidth="1" />
    {/* Beveled Rim Ring */}
    <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.2" />
    {/* Recessed Top Face */}
    <circle cx="50" cy="50" r="39" fill="url(#bm-cap-grad)" stroke="#08090d" strokeWidth="1.2" />
    {/* Crisp White Indicator Line (perpendicular, radial from center to rim) */}
    <line
      x1="50"
      y1="13"
      x2="50"
      y2="38"
      stroke="#ffffff"
      strokeWidth="3.6"
      strokeLinecap="round"
      filter="drop-shadow(0 1px 1.5px rgba(0,0,0,0.9))"
    />
  </svg>
);

const FuzzFaceKnobDial: React.FC = () => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      <radialGradient id="ff-dial-body-grad" cx="42%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#373d48" />
        <stop offset="45%" stopColor="#1e222a" />
        <stop offset="85%" stopColor="#101217" />
        <stop offset="100%" stopColor="#08090c" />
      </radialGradient>
      <radialGradient id="ff-dial-cap-grad" cx="44%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#404754" />
        <stop offset="55%" stopColor="#222630" />
        <stop offset="100%" stopColor="#0d0f14" />
      </radialGradient>
      <filter id="ff-dial-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.85" />
      </filter>
      <mask id="ff-scallop-mask">
        <rect x="0" y="0" width="100" height="100" fill="#ffffff" />
        {/* 6 authentic Dunlop/Arbiter scallop indentations */}
        <circle cx="50" cy="2" r="10.5" fill="#000000" />
        <circle cx="91.56" cy="26" r="10.5" fill="#000000" />
        <circle cx="91.56" cy="74" r="10.5" fill="#000000" />
        <circle cx="50" cy="98" r="10.5" fill="#000000" />
        <circle cx="8.44" cy="74" r="10.5" fill="#000000" />
        <circle cx="8.44" cy="26" r="10.5" fill="#000000" />
      </mask>
    </defs>
    {/* Scalloped outer skirt */}
    <circle
      cx="50"
      cy="50"
      r="48"
      fill="url(#ff-dial-body-grad)"
      filter="url(#ff-dial-shadow)"
      mask="url(#ff-scallop-mask)"
    />
    {/* Outer bevel ring */}
    <circle cx="50" cy="50" r="46.5" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
    {/* Inner smooth raised cap */}
    <circle cx="50" cy="50" r="33" fill="url(#ff-dial-cap-grad)" stroke="#090b0e" strokeWidth="1.2" />
    <circle cx="50" cy="50" r="31.5" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
    {/* Crisp White Radial Indicator Line */}
    <line
      x1="50"
      y1="8"
      x2="50"
      y2="42"
      stroke="#ffffff"
      strokeWidth="3.4"
      strokeLinecap="round"
      filter="drop-shadow(0 1px 1.5px rgba(0,0,0,0.9))"
    />
  </svg>
);

const ToneBenderChickenHeadDial: React.FC = () => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      {/* Glossy Bakelite Circular Base Gradient */}
      <radialGradient id="tb-base-grad" cx="42%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#374151" />
        <stop offset="55%" stopColor="#1e242d" />
        <stop offset="100%" stopColor="#0a0c10" />
      </radialGradient>
      {/* Chicken Head Left Bevel / Shadow Facet */}
      <linearGradient id="tb-facet-left" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#11151c" />
        <stop offset="60%" stopColor="#1f252e" />
        <stop offset="100%" stopColor="#2e3642" />
      </linearGradient>
      {/* Chicken Head Right Bevel / Specular Highlight Facet */}
      <linearGradient id="tb-facet-right" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#3a4452" />
        <stop offset="40%" stopColor="#252c38" />
        <stop offset="100%" stopColor="#0d1015" />
      </linearGradient>
      {/* Realistic Drop Shadow */}
      <filter id="tb-chicken-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="3" stdDeviation="2.8" floodColor="#000000" floodOpacity="0.85" />
      </filter>
    </defs>

    {/* Circular Skirt / Base Flange */}
    <circle
      cx="50"
      cy="50"
      r="44"
      fill="url(#tb-base-grad)"
      filter="url(#tb-chicken-shadow)"
    />
    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
    <circle cx="50" cy="50" r="32" fill="none" stroke="#090c10" strokeWidth="1.2" />

    {/* Raised Pointer Body / Beak - Main Silhouette */}
    <g filter="url(#tb-chicken-shadow)">
      {/* Left Half of Chicken Head (Darker faceted ridge) */}
      <path
        d="M 50 7 C 48 7, 45 12, 42 24 C 38 36, 32 46, 32 58 C 32 70, 40 78, 50 78 Z"
        fill="url(#tb-facet-left)"
        stroke="#090b0e"
        strokeWidth="1"
      />
      {/* Right Half of Chicken Head (Glossy specular facet) */}
      <path
        d="M 50 7 C 52 7, 55 12, 58 24 C 62 36, 68 46, 68 58 C 68 70, 60 78, 50 78 Z"
        fill="url(#tb-facet-right)"
        stroke="#090b0e"
        strokeWidth="1"
      />
    </g>

    {/* Center Spine highlight line */}
    <line
      x1="50"
      y1="9"
      x2="50"
      y2="76"
      stroke="rgba(255,255,255,0.18)"
      strokeWidth="0.75"
    />

    {/* Central Screw Boss / Center Cap */}
    <circle cx="50" cy="52" r="9" fill="#181c24" stroke="#090b0e" strokeWidth="1" />
    <circle cx="50" cy="52" r="7.5" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" />
    <circle cx="50" cy="52" r="3.2" fill="#080a0d" />

    {/* Crisp White Vintage Pointer Indicator Line (guaranteed x=50, perpendicular) */}
    <line
      x1="50"
      y1="8"
      x2="50"
      y2="38"
      stroke="#ffffff"
      strokeWidth="3.2"
      strokeLinecap="round"
      filter="drop-shadow(0 1px 1.5px rgba(0,0,0,0.95))"
    />
  </svg>
);

const FuzzFactoryKnobDial: React.FC = () => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      <radialGradient id="ffact-body-grad" cx="40%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#374151" />
        <stop offset="50%" stopColor="#181c24" />
        <stop offset="100%" stopColor="#080a0e" />
      </radialGradient>
      <radialGradient id="ffact-cap-grad" cx="42%" cy="38%" r="60%">
        <stop offset="0%" stopColor="#333b47" />
        <stop offset="60%" stopColor="#1a1e27" />
        <stop offset="100%" stopColor="#0c0e13" />
      </radialGradient>
      <filter id="ffact-dial-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.2" floodColor="#000000" floodOpacity="0.8" />
      </filter>
    </defs>
    {/* Fluted circular outer body */}
    <circle cx="50" cy="50" r="48" fill="url(#ffact-body-grad)" filter="url(#ffact-dial-shadow)" />
    {/* Davies 1900h flutes around rim */}
    <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
    {/* Inner raised smooth cap */}
    <circle cx="50" cy="50" r="33" fill="url(#ffact-cap-grad)" stroke="#080a0e" strokeWidth="1.2" />
    <circle cx="50" cy="50" r="31.5" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.75" />
    {/* Thick Crisp White Radial Pointer Line */}
    <line
      x1="50"
      y1="8"
      x2="50"
      y2="42"
      stroke="#ffffff"
      strokeWidth="3.6"
      strokeLinecap="round"
      filter="drop-shadow(0 1px 1.5px rgba(0,0,0,0.9))"
    />
  </svg>
);

const FlatironKnobDial: React.FC = () => (
  <svg viewBox="0 0 100 100" className="knob-svg">
    <defs>
      <radialGradient id="fl-body-grad" cx="44%" cy="38%" r="62%">
        <stop offset="0%" stopColor="#374151" />
        <stop offset="45%" stopColor="#1f2937" />
        <stop offset="85%" stopColor="#111827" />
        <stop offset="100%" stopColor="#030712" />
      </radialGradient>
      <radialGradient id="fl-cap-grad" cx="42%" cy="36%" r="60%">
        <stop offset="0%" stopColor="#4b5563" />
        <stop offset="35%" stopColor="#29303d" />
        <stop offset="75%" stopColor="#131722" />
        <stop offset="100%" stopColor="#080a0e" />
      </radialGradient>
      <linearGradient id="fl-rim-bevel" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
        <stop offset="100%" stopColor="rgba(0,0,0,0.6)" />
      </linearGradient>
      <filter id="fl-dial-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.85" />
      </filter>
    </defs>
    {/* Smooth Round Cylindrical Outer Skirt */}
    <circle cx="50" cy="50" r="48" fill="url(#fl-body-grad)" filter="url(#fl-dial-shadow)" />
    <circle cx="50" cy="50" r="47.5" fill="none" stroke="url(#fl-rim-bevel)" strokeWidth="1" />
    {/* Inner Smooth Rounded Dome */}
    <circle cx="50" cy="50" r="36" fill="url(#fl-cap-grad)" stroke="#090c10" strokeWidth="1.2" />
    <circle cx="50" cy="50" r="34.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
    {/* Crisp White Radial Indicator Stripe */}
    <line
      x1="50"
      y1="7"
      x2="50"
      y2="38"
      stroke="#ffffff"
      strokeWidth="3.6"
      strokeLinecap="round"
      filter="drop-shadow(0 1px 1.5px rgba(0,0,0,0.9))"
    />
  </svg>
);

export const Knob: React.FC<KnobProps> = ({
  label,
  value,
  min,
  max,
  step = 0.01,
  defaultValue,
  unit = '',
  formatValue,
  onChange,
  disabled = false,
  size = 56,
  color = 'var(--accent-glow, #38bdf8)',
  variant = 'default',
  showLabel = true,
  showValue = true,
  subLabel,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartVal = useRef(0);

  // Map value to -135deg to +135deg
  const normalized = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const angle = -135 + normalized * 270;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartVal.current = value;
    document.body.style.cursor = 'ns-resize';
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || defaultValue === undefined) return;
    onChange(defaultValue);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaY = dragStartY.current - e.clientY;
      const range = max - min;
      // 150px drag for full range
      const stepDelta = (deltaY / 150) * range;
      let newVal = dragStartVal.current + stepDelta;
      newVal = Math.max(min, Math.min(max, newVal));

      if (step) {
        newVal = Math.round(newVal / step) * step;
      }
      onChange(newVal);
    },
    [isDragging, max, min, onChange, step]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = '';
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const displayVal = formatValue ? formatValue(value) : `${value.toFixed(1)}${unit}`;

  return (
    <div className={`knob-container knob-variant-${variant} ${disabled ? 'disabled' : ''}`}>
      {showLabel && <span className="knob-label">{label}</span>}
      <div
        className={`knob-dial-wrapper knob-wrap-${variant}`}
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        title={`${label}: ${displayVal}. Drag up/down to adjust. Double-click to reset.`}
      >
        <div 
          className={`knob-dial knob-dial-${variant}`}
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: '50% 50%',
            boxShadow: isDragging ? `0 0 10px ${color}` : undefined,
          }}
        >
          {variant === 'boss' && <BossKnobDial />}
          {variant === 'ross' && <RossKnobDial />}
          {variant === 'mxr' && <MxrKnobDial />}
          {variant === 'keeley' && <KeeleyKnobDial />}
          {variant === 'ts808' && <Ts808KnobDial />}
          {variant === 'ts9' && <Ts9KnobDial />}
          {variant === 'boss-silver' && <BossSilverKnobDial />}
          {variant === 'boss-gold' && <BossGoldKnobDial />}
          {variant === 'boss-orange' && <BossOrangeKnobDial />}
          {variant === 'boss-black' && <BossBlackKnobDial />}
          {variant === 'klon-oxblood' && <KlonOxbloodKnobDial />}
          {variant === 'ocd' && <OcdKnobDial />}
          {variant === 'davies' && <DaviesKnobDial />}
          {variant === 'nobels' && <NobelsKnobDial />}
          {variant === 'archer' && <ArcherKnobDial />}
          {variant === 'bigmuff' && <BigMuffKnobDial />}
          {variant === 'fuzzface' && <FuzzFaceKnobDial />}
          {variant === 'tonebender' && <ToneBenderChickenHeadDial />}
          {variant === 'fuzzfactory' && <FuzzFactoryKnobDial />}
          {variant === 'flatiron' && <FlatironKnobDial />}
          {variant === 'tsmini-small' && <TsMiniSmallDial />}
          {variant === 'tsmini-large' && <TsMiniLargeDial />}
          {variant === 'ibanez-tonelok' && <IbanezToneLokKnobDial />}
          {variant === 'default' && <DefaultKnobDial color={color} />}
        </div>
      </div>
      {subLabel && <span className="knob-sub-ticks">{subLabel}</span>}
      {showValue && <span className="knob-value">{displayVal}</span>}
    </div>
  );
};
