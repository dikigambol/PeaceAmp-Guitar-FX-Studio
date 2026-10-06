import React from 'react';

interface ClassicStompSwitchProps {
  isEnabled: boolean;
  onToggle: () => void;
  title?: string;
  className?: string;
  idPrefix?: string;
  size?: number;
}

export const ClassicStompSwitch: React.FC<ClassicStompSwitchProps> = ({
  isEnabled,
  onToggle,
  title = 'Toggle Pedal Bypass',
  className = '',
  idPrefix = 'stomp',
  size = 48,
}) => {
  return (
    <div className={`classic-stomp-wrap ${className}`}>
      <button
        type="button"
        className={`classic-stomp-switch ${isEnabled ? 'active' : ''}`}
        style={{ width: size, height: size }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        title={title}
      >
        <svg
          viewBox="0 0 52 52"
          className="classic-stomp-svg"
          style={{ width: size, height: size }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`${idPrefix}-hex-grad`} x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="25%" stopColor="#d1d5db" />
              <stop offset="50%" stopColor="#9ca3af" />
              <stop offset="75%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#4b5563" />
            </linearGradient>
            <linearGradient id={`${idPrefix}-hex-chamfer`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
            </linearGradient>
            <radialGradient id={`${idPrefix}-collar-grad`} cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor="#e5e7eb" />
              <stop offset="75%" stopColor="#9ca3af" />
              <stop offset="100%" stopColor="#4b5563" />
            </radialGradient>
            <radialGradient id={`${idPrefix}-plunger-grad`} cx="38%" cy="35%" r="62%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#e2e8f0" />
              <stop offset="65%" stopColor="#94a3b8" />
              <stop offset="90%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </radialGradient>
            <filter id={`${idPrefix}-stomp-shadow`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.45" />
            </filter>
          </defs>
          {/* Hex Nut Outer with Shadow */}
          <polygon
            points="43.2,35.5 26,46 8.8,35.5 8.8,14.5 26,4 43.2,14.5"
            fill={`url(#${idPrefix}-hex-grad)`}
            stroke="#374151"
            strokeWidth="1"
            filter={`url(#${idPrefix}-stomp-shadow)`}
          />
          {/* Inner Hex Chamfer Bevel */}
          <polygon
            points="41.5,34.5 26,44 10.5,34.5 10.5,15.5 26,6 41.5,15.5"
            fill="none"
            stroke={`url(#${idPrefix}-hex-chamfer)`}
            strokeWidth="1.2"
          />
          {/* Threaded Collar Ring */}
          <circle cx="26" cy="25" r="14.5" fill={`url(#${idPrefix}-collar-grad)`} stroke="#374151" strokeWidth="1" />
          <circle cx="26" cy="25" r="13" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.8" />
          {/* Collar Alignment Key Notch at 12 o'clock */}
          <rect x="24.8" y="10.5" width="2.4" height="3" fill="#1f2937" rx="0.5" />
          {/* Central Plunger Actuator Button */}
          <circle
            className="classic-plunger-disc"
            cx="26"
            cy="25"
            r="10"
            fill={`url(#${idPrefix}-plunger-grad)`}
            stroke="#374151"
            strokeWidth="0.9"
          />
          {/* Concentric Machined Texture Rings */}
          <circle cx="26" cy="25" r="8" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
          <circle cx="26" cy="25" r="5" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="0.6" />
          {/* Specular Glint */}
          <ellipse cx="23.5" cy="22" rx="3.5" ry="2" fill="rgba(255,255,255,0.45)" />
        </svg>
      </button>
    </div>
  );
};
