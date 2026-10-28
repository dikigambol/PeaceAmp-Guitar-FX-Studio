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
  Box,
  Zap
} from 'lucide-react';

interface ManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ManualTab =
  | 'quickstart'
  | 'preamp'
  | 'amphead'
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
              <span>2. Input, Gate & Master I/O</span>
            </button>
            <button
              className={`manual-nav-link ${activeTab === 'amphead' ? 'active' : ''}`}
              onClick={() => setActiveTab('amphead')}
            >
              <Zap size={14} />
              <span>3. Guitar Amp Head</span>
            </button>
            <button
              className={`manual-nav-link ${activeTab === 'cabinet' ? 'active' : ''}`}
              onClick={() => setActiveTab('cabinet')}
            >
              <Box size={14} />
              <span>4. Cabinet IR Simulator</span>
            </button>
            <button
              className={`manual-nav-link ${activeTab === 'pedalboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('pedalboard')}
            >
              <Layers size={14} />
              <span>5. Modular Rig Canvas (58 FX)</span>
            </button>
            <button
              className={`manual-nav-link ${activeTab === 'presets' ? 'active' : ''}`}
              onClick={() => setActiveTab('presets')}
            >
              <Bookmark size={14} />
              <span>6. Preset Rigs & Storage</span>
            </button>
            <button
              className={`manual-nav-link ${activeTab === 'tuner' ? 'active' : ''}`}
              onClick={() => setActiveTab('tuner')}
            >
              <Music size={14} />
              <span>7. Chromatic Tuner</span>
            </button>
            <button
              className={`manual-nav-link ${activeTab === 'troubleshooting' ? 'active' : ''}`}
              onClick={() => setActiveTab('troubleshooting')}
            >
              <HelpCircle size={14} />
              <span>8. Troubleshooting</span>
            </button>
          </nav>

          <div className="manual-sidebar-footer-tip">
            <span>Tip: Double-click any knob to reset it to its default studio value.</span>
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
                    <strong>Always Wear Headphones:</strong> When testing using built-in laptop microphones or speakers, wear wired headphones to prevent immediate high-pitched acoustic feedback.
                  </div>
                </div>

                <div className="manual-doc-steps">
                  <div className="manual-doc-step">
                    <div className="manual-step-counter">01</div>
                    <div className="manual-step-text">
                      <h3>Power On the Audio Engine & Select I/O</h3>
                      <p>Click the <code>POWER ON</code> button in the top-right studio header and allow microphone/interface access. Once active, the button displays <code>ENGINE ON</code> alongside real-time telemetry (sample rate in <code>kHz</code> and round-trip latency in <code>ms</code>). Select your USB audio interface channel (<code>L+R</code>, <code>IN 1</code>, or <code>IN 2</code>) in the left rack.</p>
                    </div>
                  </div>

                  <div className="manual-doc-step">
                    <div className="manual-step-counter">02</div>
                    <div className="manual-step-text">
                      <h3>Build Your Rig on the Modular Canvas</h3>
                      <p>Your workspace starts with a clean, zero-scroll 100vh canvas displaying <code>NO CONFIGURATION</code>. Click <code>+ ADD PEDAL</code> on the canvas toolbar to choose from <strong>58 boutique models</strong> across 16 categories—including the <strong>Guitar Amp Head</strong>, <strong>PEACE IR-200 Cabinet</strong>, <strong>MXR Smart Gate</strong>, and 55 analog stompboxes. Units can be freely arranged and patched with custom 1/4&quot; cables.</p>
                    </div>
                  </div>

                  <div className="manual-doc-step">
                    <div className="manual-step-counter">03</div>
                    <div className="manual-step-text">
                      <h3>Dial in Your Tone or Load Artist Signature Presets</h3>
                      <p>Use the preset dropdown in the top header to immediately audition curated rigs (like <em>Brian May Bohemian Lead</em>, <em>Slash Appetite JCM800</em>, or <em>SRV Texas Flood Blues</em>). Tweak the 6-knob tone stack on your Amp Head, mic placement on your Cabinet IR, and monitor signal health via the real-time VU telemetry.</p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'preamp' && (
              <section className="manual-doc-section">
                <div className="manual-doc-chapter-tag">CHAPTER 02 / GAIN STAGING & I/O</div>
                <h2 className="manual-doc-heading">Input Preamp, Pickup Voicing & Master Output</h2>
                <p className="manual-doc-lead">
                  The top studio header and pre-FX processing chain manage hardware device routing, mono channel selection, 35 Hz studio sub-cut, reactive pickup impedance modeling, and 4x oversampled brickwall output protection.
                </p>

                <div className="manual-doc-grid">
                  <div className="manual-doc-card">
                    <h4>Input Device & Channel Mode</h4>
                    <p>
                      Choose your USB audio interface or microphone and click <code>[↻]</code> to hot-scan newly plugged hardware. Use <strong>INPUT CH</strong> to select <code>L+R</code> (mono sum), <code>IN 1</code> (left jack only), or <code>IN 2</code> (right jack only / Hi-Z instrument).
                    </p>
                  </div>
                  <div className="manual-doc-card">
                    <h4>Stage Gain & Pickup Voicing</h4>
                    <p>
                      Adjust input gain from <code>0.0x</code> to <code>3.0x (+9.5 dB)</code> while watching the <code>IN VU</code> meter. The <strong>Pickup Voicing</strong> selector configures reactive source impedance and resonant peaks for <code>Single-Coil</code>, <code>Humbucker</code>, <code>P90</code>, <code>Tri-Sonic Series</code>, or <code>Flat</code>.
                    </p>
                  </div>
                  <div className="manual-doc-card">
                    <h4>Studio Sub-Cut & Noise Suppression</h4>
                    <p>
                      An internal <strong>35 Hz highpass filter</strong> strips sub-audible DC rumble and handling thumps without attenuating low E2 (82.4 Hz) or drop-tuning fundamentals. Noise gating is handled dynamically by the modular <strong>MXR M135 Smart Gate</strong> pedal with Hiss, Mid, and Full filter modes.
                    </p>
                  </div>
                  <div className="manual-doc-card">
                    <h4>Master Output & 4x Oversampled Limiter</h4>
                    <p>
                      Select your dedicated headphone/monitor output (via browser <code>setSinkId</code>), adjust <strong>MASTER VOLUME</strong>, or click <code>MUTE</code>. A transparent <strong>4x oversampled safety limiter</strong> with zero makeup gain prevents digital clipping without adding aliasing fizz.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'amphead' && (
              <section className="manual-doc-section">
                <div className="manual-doc-chapter-tag">CHAPTER 03 / TUBE PREAMP & POWER AMP</div>
                <h2 className="manual-doc-heading">Guitar Amp Head Simulator</h2>
                <p className="manual-doc-lead">
                  Available as a full-featured modular unit on the canvas, the Guitar Amp Head models multi-stage vacuum tube clipping, authentic passive tone stacks, reactive power-amp sag, and negative-feedback presence with zero crossover distortion.
                </p>

                <div className="manual-doc-grid">
                  <div className="manual-doc-card">
                    <h4>18 Legendary Amplifier Voicings</h4>
                    <p>
                      • <strong>Roland®</strong>: JC-120 Jazz Chorus (Ultra Clean)
                      <br />• <strong>Fender®</strong>: &apos;65 Twin Reverb, &apos;59 Bassman Tweed, &apos;65 Deluxe Reverb
                      <br />• <strong>Vox®</strong>: AC30 Top Boost (Class-A EL84 Chime)
                      <br />• <strong>Marshall®</strong>: 1959 Super Lead Plexi, JCM800 2203, 2555 Silver Jubilee
                    </p>
                  </div>
                  <div className="manual-doc-card">
                    <h4>Boutique & High-Gain Icons</h4>
                    <p>
                      • <strong>Orange®</strong>: Rockerverb 50 MKIII
                      <br />• <strong>Mesa/Boogie®</strong>: Dual Rectifier, Mark IIC+ / IV Lead, Lone Star Special
                      <br />• <strong>Dumble® / Soldano® / Bogner®</strong>: Overdrive Special (ODS), SLO-100, Ecstasy 101B
                      <br />• <strong>EVH® / Peavey® / ENGL®</strong>: 5150 III 100W, Modern Djent / Invective, Powerball II
                    </p>
                  </div>
                  <div className="manual-doc-card">
                    <h4>Analog Touch Sensitivity & 4x Oversampling</h4>
                    <p>
                      Features asymmetric V1A grid-conduction compression without artificial threshold gating. Rolling back your guitar&apos;s volume knob cleans up smoothly from high-gain crunch to edge-of-breakup and pure cleans with full dynamic decay.
                    </p>
                  </div>
                  <div className="manual-doc-card">
                    <h4>Sensitivity & Power Modes</h4>
                    <p>
                      Toggle between <strong>High</strong> (modern punch) and <strong>Low</strong> sensitivity inputs, switch between <strong>Full</strong>, <strong>Half</strong>, or <strong>Triode</strong> power modes, and shape your rig with <strong>GAIN</strong>, <strong>BASS</strong>, <strong>MID</strong>, <strong>TREBLE</strong>, <strong>PRESENCE</strong>, and <strong>MASTER</strong>.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'cabinet' && (
              <section className="manual-doc-section">
                <div className="manual-doc-chapter-tag">CHAPTER 04 / END-OF-CHAIN ACOUSTICS</div>
                <h2 className="manual-doc-heading">Cabinet IR (Impulse Response) Simulator</h2>
                <p className="manual-doc-lead">
                  Available as a dedicated modular pedal (PEACE IR-200) on the canvas, the Cabinet Simulator performs real-time zero-latency convolution and acoustic modeling of physical speaker enclosures, studio microphones, and room air.
                </p>

                <div className="manual-doc-grid">
                  <div className="manual-doc-card">
                    <h4>16 Iconic Speaker Enclosures</h4>
                    <p>
                      • <strong>Fender®</strong>: 1×8 Champ, 1×10 Princeton, 1×12 Deluxe, 2×12 Twin, 4×10 Bassman
                      <br />• <strong>Vox® & Roland®</strong>: 2×12 AC30 Alnico Blue, 2×12 JC-120 Stereo
                      <br />• <strong>Marshall® & Orange®</strong>: 1960AX Greenback, 1960A Vintage 30, PPC412 Birch
                      <br />• <strong>Mesa®, Dumble® & EVH®</strong>: 1×12 Thiele, 2×12 Recto, 4×12 Recto Oversized, 1×12 Dumble Oval, 4×12 5150 III Stealth
                    </p>
                  </div>
                  <div className="manual-doc-card">
                    <h4>6 Studio Microphones & Studio WAVs</h4>
                    <p>
                      • <strong>Dynamic</strong>: Shure® SM57 (5 kHz presence bite), SM7B (smooth thick body), Sennheiser® MD421 (punchy low-mid authority)
                      <br />• <strong>Ribbon</strong>: Royer® R-121 (creamy warm top-end), Beyerdynamic® M160
                      <br />• <strong>Condenser</strong>: AKG® C414 (full-bandwidth air & sparkle)
                      <br />Includes 6 bundled studio WAV captures with fallback physical modeling.
                    </p>
                  </div>
                  <div className="manual-doc-card">
                    <h4>Mic Position, Distance & Zero Double-Filtering</h4>
                    <p>
                      Sweep <strong>Position</strong> (Cap Edge for dark warmth ↔ Dust Cap Center for aggressive bite) and <strong>Distance</strong> (<code>0.5&quot;</code> close proximity punch ↔ <code>6.0&quot;</code> ambient room air). Synthetic models compute responses directly in the impulse with zero redundant post-EQ muffling.
                    </p>
                  </div>
                  <div className="manual-doc-card">
                    <h4>Mix, Level, Stereo Pan & Custom WAVs</h4>
                    <p>
                      Features <strong>Convolution Mix</strong> (<code>0%–100%</code>), <strong>Level Trim</strong> (<code>-12 dB</code> to <code>+6 dB</code>), and true <strong>Stereo Pan</strong>. Click <strong>LOAD IR</strong> to drag-and-drop any third-party <code>.wav</code> cabinet impulse response directly into your rig.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'pedalboard' && (
              <section className="manual-doc-section">
                <div className="manual-doc-chapter-tag">CHAPTER 05 / MODULAR STAGE & 58 UNITS</div>
                <h2 className="manual-doc-heading">Virtual Modular Rig & Pedalboard</h2>
                <p className="manual-doc-lead">
                  A freeform modular canvas with authentic right-to-left guitar signal flow (<code>FROM GUITAR</code> → Stompboxes → Amp Heads → Cabinets → <code>TO MASTER OUT</code>), custom 1/4&quot; cable patching, and 58 hand-crafted units across 16 categories.
                </p>

                <div className="manual-doc-grid" style={{ marginBottom: '16px' }}>
                  <div className="manual-doc-card">
                    <h4>Amps, Cabinets, Gates, Dynamics & Drives</h4>
                    <p>
                      • <strong>Amp & Cab (2)</strong>: PEACE Amp Head, PEACE IR-200 Cabinet Simulator
                      <br />• <strong>Noise Gate (1)</strong>: MXR M135 Smart Gate (Hiss / Mid / Full)
                      <br />• <strong>Compressor (4)</strong>: MXR Dyna Comp, Ross, Boss CS-3, Keeley C4
                      <br />• <strong>Overdrive (10)</strong>: TS-808, TS9, TS Mini, Boss SD-1, OD-3, BD-2, Klon Centaur, Rockett Archer, Fulltone OCD, Nobels ODR-1
                      <br />• <strong>Distortion (7)</strong>: Boss DS-1, HM-2, MT-2 Metal Zone, Ibanez SM7, Marshall ShredMaster, MXR Distortion+, ProCo RAT 2
                      <br />• <strong>Fuzz (6) & Boost (4)</strong>: Big Muff, Fuzz Face, Tone Bender, Fuzz Factory, Flatiron, EQD Hoof, MXR Micro Amp, Dallas Rangemaster, Spark Mini, Xotic EP
                    </p>
                  </div>
                  <div className="manual-doc-card">
                    <h4>Filter, EQ, Modulation, Pitch, Delay & Reverb</h4>
                    <p>
                      • <strong>Wah & EQ (2)</strong>: Boss AW-3 Dynamic Wah, Boss GE-7 7-Band Graphic EQ
                      <br />• <strong>Chorus (4) & Vibrato (2)</strong>: Boss CE-2, CH-1, EHX Small Clone, MXR Analog Chorus, Boss VB-2, MXR Uni-Vibe
                      <br />• <strong>Flanger (3), Phaser (2) & Tremolo (2)</strong>: Boss BF-2, EHX Electric Mistress, MXR M117R, Small Stone, Phase 90, Boss TR-2, Supa-Trem
                      <br />• <strong>Pitch (2), Delay (3) & Reverb (4)</strong>: Boss OC-5, EHX Pitch Fork, Boss DM-2, Carbon Copy, Gauss Tape Echo, Boss RV-6, Holy Grail, JHS Hall, TC Drip
                    </p>
                  </div>
                </div>

                <div className="manual-doc-list">
                  <div className="manual-doc-list-item">
                    <strong>Search & Category Filtering:</strong> Click <code>+ ADD PEDAL</code> to search all 58 units by model name or filter across all 16 categories.
                  </div>
                  <div className="manual-doc-list-item">
                    <strong>Manual & Auto Patching:</strong> Click any pedal&apos;s <code>OUT</code> jack and then another pedal&apos;s <code>IN</code> jack to route custom patch cables. Click an existing cable to unplug it, or use <code>DEFAULT WIRING</code> and <code>UNPLUG ALL</code> in the top bar.
                  </div>
                  <div className="manual-doc-list-item">
                    <strong>Compact 100vh Zero-Scroll Workspace:</strong> Enjoy a clean, centered <code>NO CONFIGURATION</code> indicator on empty boards with zero viewport scroll-y. Drag pedals freely with magnetic 20px grid snap and automatic collision avoidance.
                  </div>
                  <div className="manual-doc-list-item">
                    <strong>Precision Controls:</strong> Drag rotary knobs or EQ sliders vertically, scroll with your mouse wheel for fine adjustments, or <strong>double-click any knob</strong> to snap back to its default setting. Click footswitches to toggle bypass.
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'presets' && (
              <section className="manual-doc-section">
                <div className="manual-doc-chapter-tag">CHAPTER 06 / COMPLETE RIG MEMORY</div>
                <h2 className="manual-doc-heading">Preset Rigs & JSON Library Management</h2>
                <p className="manual-doc-lead">
                  Save, overwrite, rename, and share complete studio snapshots—including all active pedals, 2D canvas positions, custom patch cable routing, Input Gain, Master Volume, Amp Head settings, and Cabinet IR configuration.
                </p>

                <div className="manual-doc-grid">
                  <div className="manual-doc-card">
                    <h4>Save & Smart Overwrite</h4>
                    <p>
                      Click <code>SAVE</code> in the top header toolbar. If no preset is selected, you will be prompted to name a new preset. If a user preset is active, clicking <code>SAVE</code> immediately overwrites it with your latest tweaks (confirming with <code>SAVED!</code>).
                    </p>
                  </div>
                  <div className="manual-doc-card">
                    <h4>Save As Copy, Rename & Delete</h4>
                    <p>
                      When a user preset is loaded, use the quick action icons next to <code>SAVE</code>: click the <strong>Pencil</strong> icon to rename, the <strong>Plus (+)</strong> icon to duplicate/Save As a new rig, or the <strong>Trash</strong> icon to delete it.
                    </p>
                  </div>
                  <div className="manual-doc-card">
                    <h4>JSON Export & Import</h4>
                    <p>
                      Click the <strong>Download</strong> icon to export your entire preset bank to a portable <code>.json</code> file, or click the <strong>Upload</strong> icon to import single or multi-preset JSON packs from other sessions or musicians.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'tuner' && (
              <section className="manual-doc-section">
                <div className="manual-doc-chapter-tag">CHAPTER 07 / SILENT STAGE PITCH DETECTION</div>
                <h2 className="manual-doc-heading">Precision Chromatic Tuner</h2>
                <p className="manual-doc-lead">
                  High-accuracy real-time pitch detector powered by the YIN autocorrelation algorithm, tapped directly from your clean pre-FX input signal.
                </p>

                <div className="manual-doc-callout info">
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
                  <div>
                    <strong>Automatic Silent Tuning Mode:</strong> Clicking the tuner&apos;s <code>BYPASS</code> button to switch it to <code>ACTIVE</code> automatically mutes the Master Output so you can tune silently on stage or in the studio. Switching back to <code>BYPASS</code> restores your audio output.
                  </div>
                </div>

                <div className="manual-doc-list">
                  <div className="manual-doc-list-item">
                    <strong>Note & Octave Readout:</strong> Displays the detected musical pitch, octave number (e.g., <code>E2</code>, <code>A2</code>, <code>D3</code>, <code>G3</code>, <code>B3</code>, <code>E4</code>), and exact fundamental frequency in <code>Hz</code>.
                  </div>
                  <div className="manual-doc-list-item">
                    <strong>Cents Deviation Gauge:</strong> Tracks pitch accuracy across a <code>-50¢</code> to <code>+50¢</code> scale. A needle to the left means flat (tighten string); to the right means sharp (loosen string).
                  </div>
                  <div className="manual-doc-list-item">
                    <strong>Emerald In-Tune Lock:</strong> When your string is within <code>±5 cents</code> of concert pitch, the note readout and status badge illuminate emerald green (<code>IN TUNE</code>).
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'troubleshooting' && (
              <section className="manual-doc-section">
                <div className="manual-doc-chapter-tag">CHAPTER 08 / SYSTEM SUPPORT</div>
                <h2 className="manual-doc-heading">Troubleshooting & Pro Studio Tips</h2>

                <div className="manual-doc-card" style={{ marginBottom: '12px' }}>
                  <h4>Guitar plugged into USB Audio Interface produces no sound or only plays on one side</h4>
                  <p>
                    Check the <strong>INPUT CH</strong> selector in the top studio console bar. If your guitar is plugged into Input 1, select <code>IN 1</code>; if plugged into Input 2 (Hi-Z instrument input on many 2-channel interfaces), select <code>IN 2</code>, or use <code>L+R</code> to sum both channels to mono.
                  </p>
                </div>

                <div className="manual-doc-card" style={{ marginBottom: '12px' }}>
                  <h4>High-pitched squealing, hum, or audio feedback</h4>
                  <p>
                    Acoustic feedback happens when an open microphone picks up sound from speakers—always wear wired headphones. For single-coil hum or high-gain hiss, patch in the <strong>MXR M135 Smart Gate</strong> pedal. Use <code>HISS</code> mode for transparent preamp de-hissing, or <code>FULL</code> mode for tight high-gain gating, dialing the <strong>TRIGGER</strong> knob until background noise is silenced when muting strings.
                  </p>
                </div>

                <div className="manual-doc-card" style={{ marginBottom: '12px' }}>
                  <h4>&quot;No active microphone or audio interface detected&quot;</h4>
                  <p>
                    Connect your USB audio interface or headset before starting, click the refresh button <code>[↻]</code> next to the device selector to grant browser permissions and rescan hardware, then click <code>POWER ON</code>.
                  </p>
                </div>

                <div className="manual-doc-card">
                  <h4>Achieving Ultra-Low Latency</h4>
                  <p>
                    Always use wired headphones or studio monitors connected directly to your audio interface. Avoid Bluetooth headphones or wireless speakers, as Bluetooth codecs introduce 100ms–200ms of transmission delay outside the Web Audio DSP engine.
                  </p>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
