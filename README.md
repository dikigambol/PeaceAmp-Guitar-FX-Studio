# PeaceAmp — Guitar FX Studio

PeaceAmp is a browser-based guitar effects studio built with React and TypeScript. It uses the Web Audio API to create a real-time pedalboard and digital guitar processing chain, allowing musicians to experiment with effects, custom signal flow, tuner, MIDI control, and loop recording directly in the browser.

This project is designed for guitarists who want a flexible virtual pedalboard without needing physical hardware. The interface is built as a studio-style control surface with real-time meters, effect controls, preset management, and a looping workflow.

## Overview

PeaceAmp lets you:

- build a virtual guitar signal chain with multiple effects
- adjust parameters in real time
- use a chromatic tuner while playing
- add a looping station for practice or performance
- save and load preset configurations
- connect to external MIDI controllers
- monitor input and output levels from the browser

## Key Features

- Virtual pedalboard with dynamic effect ordering
- Integrated guitar effects including:
  - Noise Gate
  - Compressor
  - Gain / Booster
  - Overdrive
  - Distortion
  - Fuzz
  - 3-band EQ
  - Chorus
  - Tremolo
  - Phaser
  - Flanger
  - Delay
  - Reverb
  - Amp and cabinet modeling
- Real-time parameter control for each pedal
- Input gain, master volume, and mute controls
- Chromatic tuner with live pitch feedback
- Phrase looper for recording and overdubbing audio loops
- Browser-based preset system with import/export support
- Web MIDI support for hardware control
- Real-time RMS/peak metering and engine status
- Desktop-oriented UI optimized for studio workflow

## Tech Stack

- React 19
- TypeScript
- Vite
- Web Audio API
- Custom CSS and component-driven UI
- Browser MIDI API
- LocalStorage for preset persistence

## Project Structure

```bash
root/
├── public/
│   ├── manifest.webmanifest
│   └── sw.js
├── src/
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── assets/
│   │   └── audio/
│   │       ├── AudioEngine.ts
│   │       ├── SignalChain.ts
│   │       ├── pedals/
│   │       │   ├── AmpPedalNode.ts
│   │       │   ├── CabPedalNode.ts
│   │       │   ├── ChorusPedalNode.ts
│   │       │   ├── CompressorPedalNode.ts
│   │       │   ├── DelayPedalNode.ts
│   │       │   ├── DistortionPedalNode.ts
│   │       │   ├── Eq3BandPedalNode.ts
│   │       │   ├── FlangerPedalNode.ts
│   │       │   ├── FuzzPedalNode.ts
│   │       │   ├── GainPedalNode.ts
│   │       │   ├── LooperPedalNode.ts
│   │       │   ├── NoiseGatePedalNode.ts
│   │       │   ├── OverdrivePedalNode.ts
│   │       │   ├── PhaserPedalNode.ts
│   │       │   ├── ReverbPedalNode.ts
│   │       │   ├── TremoloPedalNode.ts
│   │       │   └── registry.ts
│   │       └── worklets/
│   │           └── workletBundle.ts
│   ├── components/
│   │   ├── AudioHeader.tsx
│   │   ├── HeadphoneWarning.tsx
│   │   ├── PassthroughPanel.tsx
│   │   ├── common/
│   │   ├── looper/
│   │   ├── manual/
│   │   ├── meters/
│   │   ├── midi/
│   │   ├── pedalboard/
│   │   ├── presets/
│   │   └── tuner/
│   ├── dsp/
│   │   ├── amp/
│   │   ├── distortion/
│   │   └── tuner/
│   ├── midi/
│   │   └── MidiManager.ts
│   ├── presets/
│   │   ├── defaultPresets.ts
│   │   └── presetStorage.ts
│   └── types/
│       ├── audio.ts
│       ├── pedal.ts
│       └── preset.ts
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── README.md
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── web-guitar-fx-rancangan.md
└── package-lock.json
```

## Core Architecture

### Audio Engine
The main audio processing logic is located in:

- `src/assets/audio/AudioEngine.ts`
- `src/assets/audio/SignalChain.ts`

This layer handles:

- audio context creation
- input streaming
- signal chain processing
- meter calculations
- engine state and status

### Pedal Registry
Pedal definitions and metadata are centralized in:

- `src/assets/audio/pedals/registry.ts`

This registers each effect type, default values, display names, and parameter configuration.

### Preset Management
Preset storage is handled in:

- `src/presets/presetStorage.ts`

The app stores user presets in `localStorage`, making settings persist across browser sessions.

## Getting Started

### Prerequisites

Before running the app, make sure you have:

- Node.js 18 or newer
- npm installed
- a modern browser such as Chrome or Edge
- audio input available from a guitar, interface, or mic
- headphones or speakers for monitoring

> This project is optimized for desktop usage. It is designed for a more stable studio-style workflow and uses browser audio and MIDI features that are most reliable on desktop browsers.

### Installation

Clone the repository:

```bash
git clone <repository-url>
cd guitar-fx-diy
```

Install dependencies:

```bash
npm install
```

Start the app in development mode:

```bash
npm run dev
```

Then open the local URL shown in the terminal, usually:

```bash
http://localhost:5173
```

## How to Use

### 1. Power the Audio Engine

- click the power button in the top header
- allow browser access to your audio input
- select the audio device you want to use

### 2. Adjust Input and Output Levels

- set the input gain to match your guitar signal level
- adjust master volume for output level
- use mute when needed during setup or breaks

### 3. Build Your Signal Chain

- add pedals from the virtual pedalboard
- change their order to shape the overall tone
- tweak values such as gain, tone, level, threshold, attack, and decay

### 4. Use the Tuner

- the chromatic tuner updates in real time while the engine is running
- use it to quickly tune the guitar before recording or performing

### 5. Record Loops

- add the looper to the chain
- use record, play, overdub, stop, undo, and clear functions
- useful for practice, rhythm ideas, or layered textures

### 6. Save and Load Presets

- save the current pedal chain and settings as a preset
- reload previous setups instantly
- export/import presets for backup or sharing

### 7. MIDI Control

- if a MIDI device is connected, the app can respond to controller input
- this includes preset switching, pedal toggling, and volume control

## Audio Workflow

A typical signal chain may look like this:

Input -> Noise Gate -> Compressor -> Overdrive/Distortion -> EQ -> Chorus/Phaser/Tremolo -> Delay -> Reverb -> Output

This makes it easy to experiment with classic rock, clean amp tones, crunchy distortion, ambient textures, and modulation-heavy effects.

## Compatibility Notes

- best experience: Chrome or Edge on desktop
- headphones are strongly recommended during live monitoring
- some browser audio permissions may block input until granted
- MIDI support depends on the browser and connected controller
- mobile/tablet layouts are intentionally restricted for a more stable studio workflow

## Project Status

This project is a functional guitar pedalboard and effects prototype designed for experimentation, learning, and creative sound design in the browser.

## Contributing

Contributions are welcome. If you want to improve the pedal architecture, add new effects, refine the UI, or improve audio behavior, feel free to fork the project and open a pull request.

## Summary

PeaceAmp combines a virtual pedalboard, real-time digital signal processing, tuner, looper, presets, and MIDI support in a single browser-based guitar FX environment. It is meant as a practical and creative tool for exploring tone shaping without requiring traditional hardware pedals.
