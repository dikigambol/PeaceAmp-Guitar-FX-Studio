import React, { useState } from 'react';
import { ArrowRight, Volume2, Sliders, Layers } from 'lucide-react';

export const DesktopOnlyBlocker: React.FC = () => {
  const [bypassed, setBypassed] = useState(false);

  if (bypassed) return null;

  return (
    <div className="desktop-blocker-overlay" role="alertdialog" aria-modal="true">
      <div className="desktop-blocker-fullscreen">
        {/* Vintage Guitar Icon Artwork */}
        <div className="desktop-classic-hero">
          <div className="desktop-guitar-glow-wrap">
            <img 
              src="/ikon.png" 
              alt="Vintage Gibson Les Paul Guitar" 
              className="desktop-classic-guitar-img" 
            />
          </div>
        </div>

        {/* Studio Branding */}
        <div className="desktop-hero-brand">
          <span className="desktop-hero-title">PeaceAmp</span>
          <span className="desktop-hero-subtitle">VIRTUAL TUBE AMPLIFIER & MODULAR PEDALBOARD</span>
        </div>

        {/* Notice Heading */}
        <h1 className="desktop-screen-heading">
          Widescreen Desktop Display Required
        </h1>

        <p className="desktop-screen-message">
          PeaceAmp is an authentic analog-modeled guitar workstation built for multi-pedal signal chain patching, zero-latency DSP processing, and studio rack control.
        </p>

        {/* Vintage Audio Hardware Pillar Indicators */}
        <div className="desktop-classic-badges-row">
          <div className="desktop-classic-pill">
            <Layers size={13} />
            <span>MODULAR PEDALBOARD CANVAS</span>
          </div>
          <div className="desktop-classic-pill">
            <Sliders size={13} />
            <span>DUAL VU ANALOG PREAMP</span>
          </div>
          <div className="desktop-classic-pill">
            <Volume2 size={13} />
            <span>PRECISION CHROMATIC TUNER</span>
          </div>
        </div>

        <div className="desktop-screen-instruction">
          Please open <strong>PeaceAmp</strong> on a <strong>Desktop PC or Laptop</strong> for the full interactive studio experience.
        </div>

        {/* Emergency Preview Button */}
        <button 
          className="desktop-preview-anyway-btn"
          onClick={() => setBypassed(true)}
          title="Preview interface on this screen"
        >
          <span>Continue anyway in preview mode</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};
