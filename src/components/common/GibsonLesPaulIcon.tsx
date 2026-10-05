import React from 'react';

interface GibsonLesPaulIconProps {
  size?: number;
  className?: string;
}

export const GibsonLesPaulIcon: React.FC<GibsonLesPaulIconProps> = ({ size = 24, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Gibson Les Paul Classic Guitar"
    >
      <defs>
        {/* Vintage Sunburst / Goldtop Gradient */}
        <radialGradient id="lpBodyGrad" cx="62%" cy="65%" r="48%" fx="56%" fy="56%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="35%" stopColor="#d97706" />
          <stop offset="70%" stopColor="#92400e" />
          <stop offset="100%" stopColor="#451a03" />
        </radialGradient>
        <linearGradient id="lpNeckGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
      </defs>

      {/* Headstock & Tuners (Classic Gibson 3+3 Open-Book) */}
      <g transform="translate(1, 1)">
        {/* 3 Tuners Left */}
        <circle cx="3.5" cy="4.5" r="0.8" fill="#f59e0b" stroke="#78350f" strokeWidth="0.5" />
        <circle cx="5" cy="2.5" r="0.8" fill="#f59e0b" stroke="#78350f" strokeWidth="0.5" />
        <circle cx="6.8" cy="1.2" r="0.8" fill="#f59e0b" stroke="#78350f" strokeWidth="0.5" />

        {/* 3 Tuners Right */}
        <circle cx="5.5" cy="6.5" r="0.8" fill="#f59e0b" stroke="#78350f" strokeWidth="0.5" />
        <circle cx="7.2" cy="4.8" r="0.8" fill="#f59e0b" stroke="#78350f" strokeWidth="0.5" />
        <circle cx="9" cy="3.5" r="0.8" fill="#f59e0b" stroke="#78350f" strokeWidth="0.5" />

        {/* Headstock */}
        <path
          d="M4.5 5.5 L7.8 2.2 C8.2 2.6 8.8 2.6 9.2 2.2 L8.2 6.5 Z"
          fill="#1c1917"
          stroke="#d97706"
          strokeWidth="0.6"
        />

        {/* Neck */}
        <path
          d="M7 6 L14.5 13.5 L13 15 L5.5 7.5 Z"
          fill="url(#lpNeckGrad)"
          stroke="#451a03"
          strokeWidth="0.5"
        />
        {/* Frets */}
        <line x1="8" y1="7" x2="6.8" y2="8.2" stroke="#fde68a" strokeWidth="0.4" />
        <line x1="10" y1="9" x2="8.8" y2="10.2" stroke="#fde68a" strokeWidth="0.4" />
        <line x1="12" y1="11" x2="10.8" y2="12.2" stroke="#fde68a" strokeWidth="0.4" />
        <line x1="13.8" y1="12.8" x2="12.6" y2="14" stroke="#fde68a" strokeWidth="0.4" />

        {/* Iconic Single-Cutaway Gibson Les Paul Body */}
        <path
          d="M13.5 13.5 
             C12 12, 10 14, 11.5 16 
             C9.5 17, 9.5 20, 11.5 22.5 
             C13 24.5, 15 27.5, 19 28.5 
             C23 29.5, 26.5 27.5, 28 24.5 
             C29.5 21.5, 29 18, 26.5 15.5 
             C24 13.5, 21.5 14, 20 12.5 
             C18.8 11.2, 18 10.5, 17 11.5 
             C16 12.5, 16.5 14.5, 15 15 
             Z"
          fill="url(#lpBodyGrad)"
          stroke="#fde68a"
          strokeWidth="0.7"
        />

        {/* Cream Pickguard */}
        <path
          d="M13.8 16.5 C14.5 15.5, 16.5 16, 17.5 17.5 L16.5 21 C15.5 19.5, 14 18, 13.8 16.5 Z"
          fill="#fef3c7"
          stroke="#d97706"
          strokeWidth="0.4"
        />

        {/* Dual Humbucker Pickups (Chrome / Nickel Covers) */}
        {/* Neck Pickup */}
        <rect
          x="16.5"
          y="15.5"
          width="3.2"
          height="1.8"
          transform="rotate(45 16.5 15.5)"
          fill="#e2e8f0"
          stroke="#1e293b"
          strokeWidth="0.4"
          rx="0.3"
        />
        {/* Bridge Pickup */}
        <rect
          x="19"
          y="18"
          width="3.2"
          height="1.8"
          transform="rotate(45 19 18)"
          fill="#e2e8f0"
          stroke="#1e293b"
          strokeWidth="0.4"
          rx="0.3"
        />

        {/* Tune-O-Matic Bridge & Stopbar Tailpiece */}
        <line x1="20" y1="21.5" x2="22.5" y2="19" stroke="#f8fafc" strokeWidth="0.7" strokeLinecap="round" />
        <line x1="21.5" y1="23" x2="24" y2="20.5" stroke="#94a3b8" strokeWidth="0.9" strokeLinecap="round" />

        {/* 4 Gold Top-Hat Volume / Tone Knobs */}
        <circle cx="21" cy="25" r="0.7" fill="#fbbf24" stroke="#78350f" strokeWidth="0.3" />
        <circle cx="23" cy="26" r="0.7" fill="#fbbf24" stroke="#78350f" strokeWidth="0.3" />
        <circle cx="23.5" cy="24" r="0.7" fill="#fbbf24" stroke="#78350f" strokeWidth="0.3" />
        <circle cx="25.5" cy="25" r="0.7" fill="#fbbf24" stroke="#78350f" strokeWidth="0.3" />

        {/* 3-Way Pickup Toggle Switch with Ivory Tip */}
        <circle cx="13" cy="14" r="0.6" fill="#fef3c7" stroke="#78350f" strokeWidth="0.3" />
      </g>
    </svg>
  );
};
