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
    | 'klon-oxblood'
    | 'ocd'
    | 'nobels'
    | 'archer'
    | 'tsmini-small'
    | 'tsmini-large';
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
          {variant === 'klon-oxblood' && <KlonOxbloodKnobDial />}
          {variant === 'ocd' && <OcdKnobDial />}
          {variant === 'nobels' && <NobelsKnobDial />}
          {variant === 'archer' && <ArcherKnobDial />}
          {variant === 'tsmini-small' && <TsMiniSmallDial />}
          {variant === 'tsmini-large' && <TsMiniLargeDial />}
          {variant === 'default' && <DefaultKnobDial color={color} />}
        </div>
      </div>
      {subLabel && <span className="knob-sub-ticks">{subLabel}</span>}
      {showValue && <span className="knob-value">{displayVal}</span>}
    </div>
  );
};
