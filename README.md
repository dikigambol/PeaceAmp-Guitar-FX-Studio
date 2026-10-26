# PeaceAmp — Guitar FX Studio

PeaceAmp is a browser-based, real-time guitar effects studio built with React and TypeScript. It uses the Web Audio API to build a virtual pedalboard, an amp head, and a cabinet IR simulator — no backend, no audio leaves the browser.

The UI is designed as a studio-style control surface with a free-form pedalboard canvas, patch cables, live meters, a chromatic tuner, and preset management.

## Overview

PeaceAmp lets you:

- build a custom signal chain on a drag-and-drop pedalboard canvas
- add, remove, reorder, and bypass pedals in real time
- shape tone with 45 pedal models across 11 categories
- run the signal through an amp head and cabinet IR simulator
- tune silently with the built-in chromatic tuner
- monitor input/output levels, peak hold, clipping, and latency
- save, rename, delete, export, and import presets
- install the app as a PWA for offline use

## Tech Stack

| Layer | Technology |
| --- | --- |
| UI | React 19 + TypeScript 6 (`.tsx`) |
| Build | Vite 8 + `@vitejs/plugin-react` |
| Audio | Web Audio API + custom AudioWorklet processors |
| DSP | Hand-written distortion/amp curves, pitch detection, IR generation |
| Cabinet | Convolution reverb with generated IRs, bundled WAV IRs, or custom IR upload |
| Icons | `lucide-react` |
| Styling | Plain CSS (`src/index.css`, `src/App.css`) — no CSS framework |
| State | React hooks only — no Redux/Zustand/Router |
| Persistence | `localStorage` for presets, pedal positions, and patch cables |
| Lint | ESLint 10 (flat config) + `typescript-eslint`, `react-hooks`, `react-refresh` |
| PWA | `manifest.webmanifest` + service worker (production only) |
| MIDI | Web MIDI API scaffold (`src/midi/MidiManager.ts`) |

## Requirements

- **Node.js `^20.19.0 || >=22.12.0`** — required by Vite 8. Older Node versions (including Node 18/16) will fail to start the dev server.
- npm (the repo ships with `package-lock.json`)
- A modern Chromium-based desktop browser (Chrome or Edge recommended)
- An audio input (guitar, audio interface, or microphone)
- Headphones or studio monitors

> The app is intentionally desktop-only. `DesktopOnlyBlocker` shows a blocker on mobile/tablet viewports.

## Getting Started

```bash
git clone <repository-url>
cd guitar-fx-diy
npm install
npm run dev
```

Open the URL printed by Vite, usually <http://localhost:5173>.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check with `tsc -b`, then build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint over the project |

The service worker is registered only in production (`import.meta.env.PROD`), so use `npm run build && npm run preview` to test PWA/offline behavior.

## Using PeaceAmp

1. **Power the engine** — click the power button in the top bar and allow microphone/audio input access.
2. **Select devices and set input level** — pick input/output devices, choose the input channel mode (`sum`, `left`, `right`), adjust input gain, and tune the noise gate.
3. **Build the pedalboard** — add pedals from the pedal picker, drag them anywhere on the canvas, and wire them with patch cables.
4. **Shape the amp** — set gain, bass, mid, treble, presence, and master on the amp head.
5. **Choose a cabinet and mic** — select a cabinet, microphone, mic position, distance, mix, and output trim, or upload your own IR.
6. **Tune** — enable the chromatic tuner; output is muted automatically for silent tuning.
7. **Save presets** — save/overwrite the current rig, create a new preset, rename, delete, or export/import presets as JSON.
8. **Open the manual** — the in-app **MANUAL BOOK** button opens the full operation guide.

## Signal Flow

```text
Input device
  → stereo-to-mono fold (sum / left / right)
  → 30 Hz high-pass filter
  → input gain
  → noise gate (AudioWorklet)
  → pedal chain (ordered)
  → DC blocker
  → amp head (preamp / tone stack / power stage)
  → cabinet IR (ConvolverNode)
  → master gain
  → safety limiter (DynamicsCompressor)
  → output analyser → destination
```

The pedal chain is rebuilt in `src/audio/SignalChain.ts`. Nodes are reused when the topology is unchanged, and rewiring applies a short micro-fade to avoid clicks.

## Pedal Catalog

45 models are registered in `src/audio/pedals/registry.ts`:

| Category | Count | Models |
| --- | --- | --- |
| Compressor / Dynamics | 4 | MXR Dyna Comp, Ross Compressor, Boss CS-3, Keeley Compressor |
| Overdrive | 10 | Tube Screamer TS-808, Ibanez TS9, Boss SD-1, Boss OD-3, Boss BD-2, Klon Centaur, Fulltone OCD, Tube Screamer Mini, Nobels ODR-1, Rockett Archer |
| Distortion | 7 | Boss DS-1, Boss HM-2, Boss MT-2, Ibanez SM7, Marshall ShredMaster, MXR Distortion+, ProCo RAT 2 |
| Fuzz | 6 | EHX Big Muff, Fuzz Face, Tone Bender, ZVEX Fuzz Factory, EHX Flatiron Fuzz, EQD Hoof |
| Boost | 4 | MXR Micro Amp, Rangemaster Treble Booster, TC Spark Mini, Xotic EP Booster |
| Wah | 1 | Boss AW-3 Dynamic Wah |
| EQ | 1 | Boss GE-7 (7-band graphic EQ) |
| Chorus | 4 | Boss CE-2, Boss CH-1, EHX Small Clone, MXR Analog Chorus |
| Delay | 3 | Boss DM-2, MXR Carbon Copy, TC Gauss Tape Echo |
| Flanger | 3 | Boss BF-2, EHX Electric Mistress, MXR M117R |
| Phaser | 2 | EHX Small Stone, MXR Phase 90 |

Each pedal has its own audio node under `src/audio/pedals/<category>/` and its own UI component under `src/components/pedalboard/<category>/`.

## Amp & Cabinet Modeling

- **18 amp voicings** (`src/types/amp.ts`), including Fender, Vox, Marshall, Orange, Mesa/Boogie, Dumble, Soldano, Bogner, EVH/Peavey, and ENGL-style models.
- **16 built-in cabinets + custom IR** (`src/types/cabinet.ts`): 1×8, 1×10, 1×12, 2×12, 4×10, and 4×12 configurations, open and closed back.
- **6 microphone models**: SM57, SM7B, MD421, Royer R-121, Beyerdynamic M160, and a large-diaphragm condenser.
- Cabinet EQ/IR is generated procedurally in `src/dsp/amp/cabinetIRGenerator.ts`; three ready-to-use WAV IRs are bundled in `public/sample-irs/`.

## Presets

Presets are stored in `localStorage` under `web_guitar_fx_user_presets_v1`. A preset captures:

- pedal instances, ordering, and parameters
- pedal canvas positions
- patch cable connections
- input gain and master volume
- amp head and cabinet settings

Factory presets are currently empty (`src/presets/defaultPresets.ts`), so the board starts clean on a fresh load. You can create presets, overwrite the active one, rename/delete user presets, and import/export the full preset list as JSON.

## Project Structure

```text
.
├── public/
│   ├── manifest.webmanifest
│   ├── sw.js                     # PWA service worker (stale-while-revalidate)
│   ├── pedals-pic/               # Pedal artwork
│   ├── sample-irs/               # Bundled cabinet IR WAV files
│   └── icons / favicons
├── src/
│   ├── App.tsx                   # App state, engine wiring, layout
│   ├── main.tsx                  # React entry + production SW registration
│   ├── index.css / App.css       # Studio UI styling
│   ├── audio/
│   │   ├── AudioEngine.ts        # AudioContext, input conditioning, metering
│   │   ├── SignalChain.ts        # Pedal graph rebuild / node reuse
│   │   ├── amp/AmpHeadNode.ts    # Amp preamp + tone stack + power stage
│   │   ├── cabinet/CabinetNode.ts# Convolver-based cabinet IR
│   │   ├── pedals/
│   │   │   ├── registry.ts       # Pedal metadata + node factory
│   │   │   ├── dspUtils.ts
│   │   │   └── boost|chorus|compressor|delay|distortion|eq|
│   │   │       flanger|fuzz|overdrive|phaser|wah/
│   │   └── worklets/workletBundle.ts  # Noise gate / compressor (+ looper DSP) worklets
│   ├── components/
│   │   ├── AudioHeader.tsx
│   │   ├── pedalboard/
│   │   │   ├── Pedalboard.tsx    # Canvas, cables, pedal picker
│   │   │   ├── Stompbox.tsx
│   │   │   └── boost|chorus|compressors|delay|distortion|eq|
│   │   │       flanger|fuzz|overdrives|phaser|wah/
│   │   ├── sidebar/              # Input, amp head, cabinet, master output
│   │   ├── common/               # Knobs, stomp switch, desktop blocker
│   │   ├── manual/               # In-app operation manual
│   │   ├── meters/               # VU meter
│   │   ├── presets/              # Preset bar
│   │   └── tuner/                # Chromatic tuner
│   ├── dsp/
│   │   ├── amp/                  # Tube curves + cabinet IR generator
│   │   ├── distortion/curves.ts
│   │   └── tuner/pitchDetector.ts
│   ├── midi/MidiManager.ts       # Web MIDI scaffold (not wired to UI yet)
│   ├── presets/                  # Preset storage + factory presets
│   └── types/                    # audio, amp, cabinet, pedal, preset types
├── eslint.config.js
├── index.html
├── package.json
├── tsconfig*.json
└── vite.config.ts
```

## Compatibility Notes

- Best experience: **Chrome or Edge on desktop**.
- Requires **AudioWorklet** support (noise gate and compressor processors).
- Output-device selection uses `AudioContext.setSinkId`; unsupported browsers fall back to the system default output and show a notice.
- The tuner mutes the output while active (silent tuning).
- Browser audio permissions may block input until granted.
- Mobile/tablet layouts are blocked on purpose.

## Status & Known Limitations

Working: pedalboard, 45 pedal models, amp head, cabinet IR, noise gate, tuner, metering, presets, PWA.

Partial / not yet exposed in the UI:

- **Looper** — a `looper-processor` AudioWorklet exists in `workletBundle.ts`, but there is no looper panel or engine wiring.
- **MIDI** — `MidiManager` can request MIDI access and maps CCs, but it is not imported by the app yet.
- **Factory presets** — the factory list is intentionally empty.
- **Tests** — no automated test suite is configured.

## Contributing

Contributions are welcome. To add a pedal:

1. Implement the audio node in `src/audio/pedals/<category>/`.
2. Register metadata and the node factory case in `src/audio/pedals/registry.ts`.
3. Build the UI component in `src/components/pedalboard/<category>/`.
4. Add the pedal to the pedalboard picker and, if needed, extend the preset types.

## Summary

PeaceAmp combines a modular virtual pedalboard, real-time Web Audio DSP, amp and cabinet modeling, a chromatic tuner, preset management, and a PWA shell in one browser-only application. It is a practical environment for exploring guitar tone without physical hardware — and a substantial frontend/audio-DSP portfolio project.
