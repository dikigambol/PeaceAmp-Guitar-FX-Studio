import React, { useState } from 'react';
import {
  Power,
  Sliders,
  Layers,
  Bookmark,
  Music,
  HelpCircle,
  Headphones,
  CheckCircle2,
  ArrowLeft,
  Box
} from 'lucide-react';

interface ManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ManualTab =
  | 'quickstart'
  | 'preamp'
  | 'cabinet'
  | 'pedalboard'
  | 'presets'
  | 'tuner'
  | 'troubleshooting';

export const ManualModal: React.FC<ManualModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<ManualTab>('quickstart');

  if (!isOpen) return null;

  return (
    <div className="manual-fullscreen-screen" role="dialog" aria-modal="true" aria-labelledby="manual-main-title">
      {/* Top Studio Control Bar */}
      <header className="manual-fullscreen-header">
        <div className="manual-header-brand">
          <div className="manual-brand-badge">
            <img src="/ikon.png" alt="PeaceAmp Guitar" className="manual-brand-img" />
          </div>
          <div>
            <h1 id="manual-main-title" className="manual-main-title">PeaceAmp Operation Manual</h1>
            <span className="manual-meta-edition">ANALOG MODELING WORKSTATION • OFFICIAL USER REFERENCE</span>
          </div>
        </div>

        <button
          className="manual-return-btn"
          onClick={onClose}
          title="Return to PeaceAmp Studio Workspace"
        >
          <ArrowLeft size={16} />
          <span>BACK TO STUDIO</span>
        </button>
      </header>

      {/* Main Fullscreen Workspace Layout */}
      <div className="manual-fullscreen-body">
        {/* Left Chapter Navigator Sidebar */}
        <aside className="manual-fullscreen-sidebar">
          <div className="manual-sidebar-heading">CHAPTERS</div>
          <nav className="manual-nav-list">
            <button
              className={`manual-nav-link ${activeTab === 'quickstart' ? 'active' : ''}`}
              onClick={() => setActiveTab('quickstart')}
            >
              <Power size={14} />
              <span>1. Quick Start Guide</span>
            </button>
            <button
              className={`manual-nav-link ${activeTab === 'preamp' ? 'active' : ''}`}
              onClick={() => setActiveTab('preamp')}
            >
              <Sliders size={14} />
              <span>2. Master Preamp & I/O</span>
            </button>
            <button
              className={`manual-nav-link ${activeTab === 'cabinet' ? 'active' : ''}`}
              onClick={() => setActiveTab('cabinet')}
            >
              <Box size={14} />
              <span>3. Cabinet IR Simulator</span>
            </button>
            <button
              className={`manual-nav-link ${activeTab === 'pedalboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('pedalboard')}
            >
              <Layers size={14} />
              <span>4. Virtual Pedalboard</span>
            </button>
            <button
              className={`manual-nav-link ${activeTab === 'presets' ? 'active' : ''}`}
              onClick={() => setActiveTab('presets')}
            >
              <Bookmark size={14} />
              <span>5. Preset Rigs</span>
            </button>
            <button
              className={`manual-nav-link ${activeTab === 'tuner' ? 'active' : ''}`}
              onClick={() => setActiveTab('tuner')}
            >
              <Music size={14} />
              <span>6. Chromatic Tuner</span>
            </button>
            <button
              className={`manual-nav-link ${activeTab === 'troubleshooting' ? 'active' : ''}`}
              onClick={() => setActiveTab('troubleshooting')}
            >
              <HelpCircle size={14} />
              <span>7. Troubleshooting</span>
            </button>
          </nav>

          <div className="manual-sidebar-footer-tip">
            <span>Tip: Use <code>+ ADD PEDAL</code> to build your custom chain.</span>
          </div>
        </aside>

        {/* Right Documentation Reader Workspace */}
        <main className="manual-fullscreen-content">
          <div className="manual-content-inner">
            {activeTab === 'quickstart' && (
              <section className="manual-doc-section">
                <div className="manual-doc-chapter-tag">CHAPTER 01 / ESSENTIALS</div>
                <h2 className="manual-doc-heading">Quick Start Guide (Getting Started in 60 Seconds)</h2>

                <div className="manual-doc-callout warning">
                  <Headphones size={20} className="shrink-0 text-slate-300" />
                  <div>
                    <strong>Always Wear Headphones:</strong> When testing using built-in laptop microphones or speakers, wear headphones to avoid immediate high-pitched audio acoustic feedback.
                  </div>
                </div>

                <div className="manual-doc-steps">
                  <div className="manual-doc-step">
                    <div className="manual-step-counter">01</div>
                    <div className="manual-step-text">
                      <h3>Power On the Audio Engine</h3>
                      <p>Click the <code>POWER</code> button in the top-right studio header. When your browser requests microphone access, click <em>"Allow"</em>. The button illuminates green (<code>RUNNING</code>) indicating the real-time DSP pipeline is active.</p>
                    </div>
                  </div>

                  <div className="manual-doc-step">
                    <div className="manual-step-counter">02</div>
                    <div className="manual-step-text">
                      <h3>Select a Curated Rig Preset</h3>
                      <p>In the header preset bar, choose from curated factory rigs. The pedalboard instantly auto-arranges and cables the pedals in optimal studio order.</p>
                    </div>
                  </div>

                  <div className="manual-doc-step">
                    <div className="manual-step-counter">03</div>
                    <div className="manual-step-text">
                      <h3>Play Guitar or Speak Into the Mic</h3>
                      <p>Connect your guitar via an audio interface or make sound into your mic. The dual VU meters will immediately respond and you will hear your analog effects with ultra-low latency.</p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'preamp' && (
              <section className="manual-doc-section">
                <div className="manual-doc-chapter-tag">CHAPTER 02 / GAIN STAGING</div>
                <h2 className="manual-doc-heading">Master Preamp & I/O Rack Unit</h2>
                <p className="manual-doc-lead">The left master rack handles input calibration, analog impedance emulation, and brickwall output protection.</p>

                <div className="manual-doc-grid">
                  <div className="manual-doc-card">
                    <h4>Audio Device Selector</h4>
                    <p>Select your dedicated USB audio interface or default microphone. Use the refresh icon [↻] to detect newly connected devices without reloading.</p>
                  </div>
                  <div className="manual-doc-card">
                    <h4>Input Preamp Gain</h4>
                    <p>Set the input level (0.0x to 3.0x / +9.5 dB) to match single-coil or humbucker pickups. Watch the PRE-FX VU meter to avoid excessive peaking.</p>
                  </div>
                  <div className="manual-doc-card">
                    <h4>Brickwall Limiter (-0.5 dB)</h4>
                    <p>An integrated studio limiter that operates continuously to eliminate transient clipping spikes, keeping your ears and monitors safe.</p>
                  </div>
                  <div className="manual-doc-card">
                    <h4>Master Output & Mute</h4>
                    <p>Adjust final monitor volume or hit <code>MUTE MASTER AUDIO</code> for an instantaneous output cut.</p>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'cabinet' && (
              <section className="manual-doc-section">
                <div className="manual-doc-chapter-tag">CHAPTER 03 / END-OF-CHAIN ACOUSTICS</div>
                <h2 className="manual-doc-heading">Cabinet IR (Impulse Response) Simulator</h2>
                <p className="manual-doc-lead">
                  Positioned at the very end of your pedal effects chain before the Master Output, the Cabinet Simulator performs real-time audio convolution between your amplified guitar signal and physical speaker box impulse responses.
                </p>

                <div className="manual-doc-grid">
                  <div className="manual-doc-card">
                    <h4>Speaker Enclosures</h4>
                    <p>
                      Choose between <strong>1×8, 1×10, 1×12, 2×12, 4×10, and 4×12</strong> configurations, tailored with authentic <strong>Open Back</strong> (airy 3D chime & room reflections) or <strong>Closed Back</strong> (tight acoustic suspension & heavy low-end thump).
                    </p>
                  </div>
                  <div className="manual-doc-card">
                    <h4>Studio Microphones</h4>
                    <p>
                      Tailor your guitar tone with modeled studio transducers:
                      <br />• <strong>SM57</strong>: Classic dynamic with mid-presence punch (~5 kHz).
                      <br />• <strong>Sennheiser-style (MD421)</strong>: Aggressive upper mids and deep cut.
                      <br />• <strong>Ribbon (R-121)</strong>: Warm body, smooth rolled-off treble without fizz.
                      <br />• <strong>Condenser (C414)</strong>: Flat wide-spectrum response with airy top-end.
                    </p>
                  </div>
                  <div className="manual-doc-card">
                    <h4>Microphone Placement</h4>
                    <p>
                      Sweep the <strong>Position</strong> slider from <strong>Edge</strong> (cone boundary for warm, mellow, darker response) to <strong>Center</strong> (on-axis dust cap for maximum bright bite and immediate attack).
                    </p>
                  </div>
                  <div className="manual-doc-card">
                    <h4>Convolution Mix</h4>
                    <p>
                      Blend between direct preamp sound and convolved speaker cabinet using the <strong>Mix</strong> slider (0% to 100%, default 80% for natural studio punch).
                    </p>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'pedalboard' && (
              <section className="manual-doc-section">
                <div className="manual-doc-chapter-tag">CHAPTER 04 / CANVAS & ROUTING</div>
                <h2 className="manual-doc-heading">Virtual Modular Pedalboard</h2>
                <p className="manual-doc-lead">A freeform virtual stage where you can position, patch, and tweak boutique pedals.</p>

                <div className="manual-doc-list">
                  <div className="manual-doc-list-item">
                    <strong>Adding Pedals:</strong> Click <code>+ ADD PEDAL</code> on the stage toolbar to select from our boutique analog modeling library, including <strong>Category 1: Compressors</strong> (MXR Dyna Comp, Ross, Boss CS-3, Keeley C4) and <strong>Category 2: Overdrives</strong> (Tube Screamer TS-808, TS9, Boss SD-1, OD-3, BD-2 Blues Driver, Klon Centaur, Fulltone OCD, TS Mini, Nobels ODR-1, J. Rockett Archer).
                  </div>
                  <div className="manual-doc-list-item">
                    <strong>Drag & Position:</strong> Drag pedals anywhere on the pedalboard grid. Enable <code>GRID SNAP</code> for structured rack alignment.
                  </div>
                  <div className="manual-doc-list-item">
                    <strong>Footswitch Bypass:</strong> Click the heavy-duty 3PDT footswitch or the top LED on any pedal to toggle True Bypass on or off.
                  </div>
                  <div className="manual-doc-list-item">
                    <strong>Parametric Knobs:</strong> Drag knobs vertically or scroll with the mouse wheel for fluid, high-resolution parameter sweeps.
                  </div>
                  <div className="manual-doc-list-item">
                    <strong>Auto-Wiring:</strong> Click <code>DEFAULT WIRING</code> to automatically organize and route your active pedals into the proven studio chain order.
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'presets' && (
              <section className="manual-doc-section">
                <div className="manual-doc-chapter-tag">CHAPTER 05 / RIG MEMORY</div>
                <h2 className="manual-doc-heading">Rig Presets & Cloud JSON Storage</h2>
                <p className="manual-doc-lead">Capture, store, and transport entire pedalboard rigs with comprehensive knob settings.</p>

                <div className="manual-doc-grid">
                  <div className="manual-doc-card">
                    <h4>Factory Tones</h4>
                    <p>Instant studio setups covering Classic Rock, Texas Blues, High-Gain Metal, Funk, Ambient Shimmer, and Dry Direct Passthrough.</p>
                  </div>
                  <div className="manual-doc-card">
                    <h4>Saving Custom Rigs</h4>
                    <p>Click <code>+ SAVE</code> in the top preset toolbar, enter your custom preset name, and persist your rig into browser storage.</p>
                  </div>
                  <div className="manual-doc-card">
                    <h4>JSON Export & Import</h4>
                    <p>Export your full preset library to a clean <code>.json</code> file for permanent backups, sharing with other musicians, or migration.</p>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'tuner' && (
              <section className="manual-doc-section">
                <div className="manual-doc-chapter-tag">CHAPTER 06 / PITCH DETECTION</div>
                <h2 className="manual-doc-heading">Precision Chromatic Tuner</h2>
                <p className="manual-doc-lead">Real-time pitch detector built with the YIN autocorrelation algorithm.</p>

                <div className="manual-doc-callout info">
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
                  <div>
                    <strong>Hands-Free Passive Display:</strong> You do not need to click anything to tune. Simply pluck any string, and the tuner reads the note, frequency (Hz), and cents deviation automatically.
                  </div>
                </div>

                <div className="manual-doc-list">
                  <div className="manual-doc-list-item">
                    <strong>Note Name:</strong> Displays the detected musical note and octave (e.g., <code>E2</code>, <code>A2</code>, <code>D3</code>, <code>G3</code>, <code>B3</code>, <code>E4</code>).
                  </div>
                  <div className="manual-doc-list-item">
                    <strong>Cents Deviation:</strong> A needle to the left indicates flat (tune up); to the right indicates sharp (tune down).
                  </div>
                  <div className="manual-doc-list-item">
                    <strong>In-Tune Indicator:</strong> When pitch accuracy is within ±5 cents, the center diamond turns solid emerald green.
                  </div>
                  <div className="manual-doc-list-item">
                    <strong>Tuner Mute:</strong> Hit <code>MUTE</code> on the tuner module for silent stage tuning.
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'troubleshooting' && (
              <section className="manual-doc-section">
                <div className="manual-doc-chapter-tag">CHAPTER 07 / SYSTEM SUPPORT</div>
                <h2 className="manual-doc-heading">Troubleshooting & Pro Studio Tips</h2>

                <div className="manual-doc-card" style={{ marginBottom: '12px' }}>
                  <h4>"No active microphone or audio interface detected"</h4>
                  <p>Your operating system does not see a plugged-in audio input device. Connect headphones with a mic, an audio interface, or a USB mic, then click <code>POWER</code> again.</p>
                </div>

                <div className="manual-doc-card" style={{ marginBottom: '12px' }}>
                  <h4>High-pitched squealing or audio feedback</h4>
                  <p>Your microphone is picking up sound from your laptop speakers. Wear headphones or turn down the <code>INPUT GAIN</code> knob on the left panel.</p>
                </div>

                <div className="manual-doc-card">
                  <h4>Lowest Possible Audio Latency</h4>
                  <p>Always use wired headphones or studio monitors. Bluetooth audio transmits over wireless codecs adding 100ms–200ms latency, whereas wired audio achieves true sub-10ms performance.</p>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
