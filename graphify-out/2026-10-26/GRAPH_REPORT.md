# Graph Report - guitar-fx-diy  (2026-10-26)

## Corpus Check
- 148 files · ~124,711 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 2, .ico 2, .css 2)

## Summary
- 1002 nodes · 2782 edges · 72 communities (31 shown, 41 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 79 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cc1f6d41`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Build and Dependency Config
- Pedal UI Component Imports
- Compressor Models and Core
- Pedal DSP Node Classes
- Boost Pedal UI Components
- App Shell and Audio Controls
- Project Docs and Architecture
- Custom Knob Dials
- AudioEngine Core
- Delay and Overdrive Nodes
- Cabinet Simulator
- Amp Head Voicing
- AudioEngine Implementation
- FeedbackClipperStage
- Tuner and Pitch Detection
- Audio Device Panels
- App TypeScript Config
- Ibanez SM7 Distortion
- Boss AW-3 Wah
- Node TypeScript Config
- MIDI Manager
- Pedalboard Layout Geometry
- Flanger DSP and Bypass Notes
- BossMt2Node
- Marshall Shredmaster
- Cabinet IR Docs Concepts
- react
- Boss DS-1 Distortion
- Boss HM-2 Distortion
- MXR Distortion Plus
- Stompbox.tsx
- TC Spark Mini Boost
- Pro Co RAT
- Nobels ODR-1
- EQD Hoof Fuzz
- FuzzFactoryNode
- MXR Micro Amp
- BossGe7Node
- Boss DM-2 Delay
- Xotic EP Booster
- Big Muff Fuzz
- Flatiron Fuzz
- Fuzz Face
- Tone Bender Fuzz
- Boss BD-2 Blues Driver
- Fulltone OCD
- Klon Centaur
- PhaserEngine
- Rockett Archer
- MXR Carbon Copy Delay
- TcGaussTapeEchoNode
- Bypass Audit Query Notes
- BossOd3Node
- BossCe2Node
- BossCh1Node
- lucide-react
- EhxSmallCloneNode
- MxrAnalogChorusNode
- InputImpedanceNode
- Nobels ODR-1 UI
- Gibson Les Paul Icon
- EhxSmallClonePedal
- preset.ts
- BossAw3Node.ts
- TcGaussTapeEchoPedal.tsx
- MxrFlangerPedal.tsx
- Root TypeScript Config
- Testing Strategy (unit/audio/browser)
- sw.js
- Silent Chromatic Tuner
- EhxSmallStonePedal.tsx

## God Nodes (most connected - your core abstractions)
1. `Knob()` - 128 edges
2. `PedalInstance` - 104 edges
3. `applyBypassCrossfade()` - 102 edges
4. `PedalMetadata` - 94 edges
5. `AudioPedalNode` - 83 edges
6. `createDcBlocker()` - 82 edges
7. `react` - 67 edges
8. `lucide-react` - 61 edges
9. `AudioEngine` - 51 edges
10. `Stompbox()` - 49 edges

## Surprising Connections (you probably didn't know these)
- `Catatan` --references--> `createDcBlocker()`  [INFERRED]
  graphify-out/memory/query_20261026_042302_51700b43_does_applybypasscrossfade___hide_a_systemic_bypass.md → src/audio/pedals/dspUtils.ts
- `Satu-satunya inkonsistensi nyata (sudah diperbaiki)` --references--> `SignalChain`  [INFERRED]
  graphify-out/memory/query_20261026_042302_51700b43_does_applybypasscrossfade___hide_a_systemic_bypass.md → src/audio/SignalChain.ts
- `Satu-satunya inkonsistensi nyata (sudah diperbaiki)` --references--> `applyBypassCrossfade()`  [INFERRED]
  graphify-out/memory/query_20261026_042302_51700b43_does_applybypasscrossfade___hide_a_systemic_bypass.md → src/audio/pedals/dspUtils.ts
- `Yang diperiksa dan hasilnya` --references--> `applyBypassCrossfade()`  [INFERRED]
  graphify-out/memory/query_20261026_042302_51700b43_does_applybypasscrossfade___hide_a_systemic_bypass.md → src/audio/pedals/dspUtils.ts
- `Satu-satunya inkonsistensi nyata (sudah diperbaiki)` --references--> `EhxSmallStoneNode`  [INFERRED]
  graphify-out/memory/query_20261026_042302_51700b43_does_applybypasscrossfade___hide_a_systemic_bypass.md → src/audio/pedals/phaser/EhxSmallStoneNode.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Offline-First / No-Backend Privacy Stance** — web_guitar_fx_rancangan_local_processing_principle, web_guitar_fx_rancangan_no_backend_mvp, web_guitar_fx_rancangan_offline_first, web_guitar_fx_rancangan_development_principles, readme_pwa_offline, index_html_pwa_manifest [EXTRACTED 0.85]
- **PeaceAmp Realtime Signal Pipeline** — readme_signal_flow, web_guitar_fx_rancangan_signal_chain, web_guitar_fx_rancangan_audioengine, web_guitar_fx_rancangan_safety_limiter, web_guitar_fx_rancangan_audio_meter [EXTRACTED 0.85]
- **Cabinet IR Modeling Group** — cabinet_instalation_cabinet_ir, cabinet_instalation_convolution, cabinet_instalation_cabinet_configs, cabinet_instalation_mic_positioning, web_guitar_fx_rancangan_cabinet_simulator, readme_amp_cabinet_modeling [INFERRED 0.85]

## Communities (72 total, 41 thin omitted)

### Community 0 - "Build and Dependency Config"
Cohesion: 0.07
Nodes (41): dependencies, lucide-react@^1.52.0, react@^19.2.8, react-dom@^19.2.8, devDependencies, eslint@^10.10.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1 (+33 more)

### Community 1 - "Pedal UI Component Imports"
Cohesion: 0.11
Nodes (25): PedalProps, BossCh1Pedal(), PedalProps, PedalProps, PedalProps, BossHm2Pedal(), PedalProps, IbanezSm7Pedal() (+17 more)

### Community 2 - "Compressor Models and Core"
Cohesion: 0.11
Nodes (14): BossCs3Node, cs3Model(), autoMakeupDb(), CompressorCore, CompressorPedalFactory, CompressorPedalModel, CompressorPedalNode, CompressorSettings (+6 more)

### Community 3 - "Pedal DSP Node Classes"
Cohesion: 0.22
Nodes (9): applyBypassCrossfade(), clamp(), createDcBlocker(), driveDependentTrimDb(), levelToGain(), GE7_BANDS, Ge7BandConfig, AudioPedalNode (+1 more)

### Community 4 - "Boost Pedal UI Components"
Cohesion: 0.09
Nodes (25): ClassicStompSwitch(), ClassicStompSwitchProps, MxrMicroAmpPedal(), PedalProps, PedalProps, RangemasterPedal(), PedalProps, XoticEpBoosterPedal() (+17 more)

### Community 5 - "App Shell and Audio Controls"
Cohesion: 0.14
Nodes (16): App(), defaultMeter, defaultMetrics, detectOutputSelectionSupport(), DesktopOnlyBlocker(), HeadphoneWarning(), ManualModal(), ManualModalProps (+8 more)

### Community 6 - "Project Docs and Architecture"
Cohesion: 0.07
Nodes (28): Google Fonts Display Stack, PeaceAmp Page Title, manifest.webmanifest link, #root mount point and main.tsx entry, DesktopOnlyBlocker, Web MIDI Scaffold (MidiManager), PeaceAmp — Guitar FX Studio, 45-Model Pedal Catalog (+20 more)

### Community 7 - "Custom Knob Dials"
Cohesion: 0.10
Nodes (35): ArcherKnobDial(), BigMuffKnobDial(), BossBlackKnobDial(), BossGoldKnobDial(), BossKnobDial(), BossOrangeKnobDial(), BossSilverKnobDial(), DaviesKnobDial() (+27 more)

### Community 8 - "AudioEngine Core"
Cohesion: 0.08
Nodes (4): Yang diperiksa dan hasilnya, AudioEngine, ActiveNodeEntry, SignalChain

### Community 9 - "Delay and Overdrive Nodes"
Cohesion: 0.17
Nodes (11): BossSd1Node, SD1_CONFIG, TS808_CONFIG, Ts808Node, TS9_CONFIG, Ts9Node, TS_MINI_CONFIG, TsMiniNode (+3 more)

### Community 10 - "Cabinet Simulator"
Cohesion: 0.08
Nodes (26): Answer, Apakah aset cabinet IR nyata, dan apakah graph menemukan dead code?, Outcome, Perbaikan yang diterapkan, Q: Are the bundled cabinet impulse responses real, and did the graph expose dead code in the cabinet path?, Sisa gap, Source Nodes, Verifikasi (+18 more)

### Community 11 - "Amp Head Voicing"
Cohesion: 0.16
Nodes (14): AmpHeadNode, AmpHeadPanelProps, AMP_VOICING, AmpVoicingProfile, buildCleanCurve(), buildTubeCurve(), CurveShape, getAmpVoicing() (+6 more)

### Community 12 - "AudioEngine Implementation"
Cohesion: 0.18
Nodes (11): StateChangeCallback, ensureWorkletsRegistered(), registeredContexts, WORKLET_CODE, AudioHeader(), AudioHeaderProps, AudioEngineMetrics, AudioEngineState (+3 more)

### Community 14 - "Tuner and Pitch Detection"
Cohesion: 0.36
Nodes (5): ChromaticTuner(), ChromaticTunerProps, detectPitch(), NOTE_NAMES, TunerResult

### Community 15 - "Audio Device Panels"
Cohesion: 0.24
Nodes (12): VuMeter(), VuMeterProps, PassthroughPanel(), PassthroughPanelProps, CHANNEL_OPTIONS, InputPreampPanel(), InputPreampPanelProps, MasterOutputPanel() (+4 more)

### Community 16 - "App TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 19 - "Node TypeScript Config"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 20 - "MIDI Manager"
Cohesion: 0.15
Nodes (5): MidiActivityCallback, MidiDevice, MidiDevicesCallback, midiManager, MidiMessageEventLike

### Community 21 - "Pedalboard Layout Geometry"
Cohesion: 0.31
Nodes (12): PEDAL_DEFINITIONS, PatchConnection, Pedalboard(), PedalboardProps, Position, calculateNextPedalPosition(), doBoxesOverlap(), findNearestFreePosition() (+4 more)

### Community 22 - "Flanger DSP and Bypass Notes"
Cohesion: 0.09
Nodes (10): Answer, Apakah applyBypassCrossfade() menyembunyikan bug routing bypass sistemik?, Catatan, Outcome, Q: Does applyBypassCrossfade() hide a systemic bypass routing bug across its 59 call sites?, Satu-satunya inkonsistensi nyata (sudah diperbaiki), Source Nodes, BossBf2Node (+2 more)

### Community 25 - "Cabinet IR Docs Concepts"
Cohesion: 0.29
Nodes (7): Cabinet Configuration Set (1x8 to 4x12, open/closed back), Cabinet IR Simulation, Cabinet Panel UI Sketch, Mic Models and Position Control, Amp and Cabinet Modeling, Amp Simulator (preamp/tone stack/power amp), Cabinet Simulator via IR

### Community 26 - "react"
Cohesion: 0.19
Nodes (10): react, BossDualConcentricKnob(), BossDualConcentricKnobProps, MxrDynaCompPedal(), PedalProps, BossMt2Pedal(), PedalProps, FulltoneOcdPedal() (+2 more)

### Community 27 - "Boss DS-1 Distortion"
Cohesion: 0.15
Nodes (5): RangemasterNode, BossDs1Node, createOnePoleHighpass(), createOnePoleLowpass(), FeedbackClipperConfig

### Community 30 - "Stompbox.tsx"
Cohesion: 0.12
Nodes (19): BossCe2Pedal(), BossCs3Pedal(), BossDm2Pedal(), BossDs1Pedal(), PedalProps, BigMuffPedal(), PedalProps, FuzzFactoryPedal() (+11 more)

### Community 47 - "PhaserEngine"
Cohesion: 0.15
Nodes (5): EhxSmallStoneNode, MxrPhase90Node, FallbackState, PhaserEngine, PhaserEngineConfig

### Community 51 - "Bypass Audit Query Notes"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Why does createDcBlocker() connect all pedal DSP communities - intentional design or side effect of shared helper reuse?, Source Nodes

### Community 55 - "lucide-react"
Cohesion: 0.14
Nodes (12): lucide-react, PedalProps, RossCompressorPedal(), BossGe7Pedal(), Ge7Slider(), PedalProps, SliderProps, EqdHoofPedal() (+4 more)

### Community 58 - "InputImpedanceNode"
Cohesion: 0.19
Nodes (3): InputImpedanceConfig, InputImpedanceNode, PRESETS

### Community 59 - "Nobels ODR-1 UI"
Cohesion: 0.67
Nodes (3): NobelsDialRing(), NobelsOdr1Pedal(), PedalProps

### Community 63 - "preset.ts"
Cohesion: 0.36
Nodes (4): PresetBarProps, FACTORY_PRESETS, PresetPatchConnection, PresetSchema

### Community 64 - "BossAw3Node.ts"
Cohesion: 0.33
Nodes (5): AW3_INPUTS, AW3_MODES, Aw3InputMode, Aw3Mode, HUMANIZER_VOWELS

## Knowledge Gaps
- **13 isolated node(s):** `#root mount point and main.tsx entry`, `DesktopOnlyBlocker`, `Web MIDI Scaffold (MidiManager)`, `Input/Output Audio Meter with Clip Indicator`, `AudioEngine Interface` (+8 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 190 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **41 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createDcBlocker()` connect `Pedal DSP Node Classes` to `AudioEngine Core`, `Delay and Overdrive Nodes`, `Amp Head Voicing`, `AudioEngine Implementation`, `FeedbackClipperStage`, `Ibanez SM7 Distortion`, `Boss AW-3 Wah`, `Flanger DSP and Bypass Notes`, `BossMt2Node`, `Marshall Shredmaster`, `Boss DS-1 Distortion`, `Boss HM-2 Distortion`, `MXR Distortion Plus`, `TC Spark Mini Boost`, `Pro Co RAT`, `Nobels ODR-1`, `EQD Hoof Fuzz`, `FuzzFactoryNode`, `MXR Micro Amp`, `BossGe7Node`, `Boss DM-2 Delay`, `Xotic EP Booster`, `Big Muff Fuzz`, `Flatiron Fuzz`, `Fuzz Face`, `Tone Bender Fuzz`, `Boss BD-2 Blues Driver`, `Fulltone OCD`, `Klon Centaur`, `PhaserEngine`, `Rockett Archer`, `MXR Carbon Copy Delay`, `TcGaussTapeEchoNode`, `BossOd3Node`, `BossCh1Node`, `EhxSmallCloneNode`, `MxrAnalogChorusNode`, `BossAw3Node.ts`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `applyBypassCrossfade()` (e.g. with `Satu-satunya inkonsistensi nyata (sudah diperbaiki)` and `Yang diperiksa dan hasilnya`) actually correct?**
  _`applyBypassCrossfade()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `#root mount point and main.tsx entry`, `DesktopOnlyBlocker`, `Web MIDI Scaffold (MidiManager)` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Build and Dependency Config` be split into smaller, more focused modules?**
  _Cohesion score 0.06553911205073996 - nodes in this community are weakly interconnected._
- **Why does `applyBypassCrossfade()` connect `Pedal DSP Node Classes` to `Compressor Models and Core`, `AudioEngine Core`, `Delay and Overdrive Nodes`, `Amp Head Voicing`, `Ibanez SM7 Distortion`, `Boss AW-3 Wah`, `Flanger DSP and Bypass Notes`, `BossMt2Node`, `Marshall Shredmaster`, `Boss DS-1 Distortion`, `Boss HM-2 Distortion`, `MXR Distortion Plus`, `TC Spark Mini Boost`, `Pro Co RAT`, `Nobels ODR-1`, `EQD Hoof Fuzz`, `FuzzFactoryNode`, `MXR Micro Amp`, `BossGe7Node`, `Boss DM-2 Delay`, `Xotic EP Booster`, `Big Muff Fuzz`, `Flatiron Fuzz`, `Fuzz Face`, `Tone Bender Fuzz`, `Boss BD-2 Blues Driver`, `Fulltone OCD`, `Klon Centaur`, `PhaserEngine`, `Rockett Archer`, `MXR Carbon Copy Delay`, `TcGaussTapeEchoNode`, `BossOd3Node`, `BossCe2Node`, `BossCh1Node`, `EhxSmallCloneNode`, `MxrAnalogChorusNode`, `BossAw3Node.ts`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Should `Pedal UI Component Imports` be split into smaller, more focused modules?**
  _Cohesion score 0.10960960960960961 - nodes in this community are weakly interconnected._
- **Why does `PedalInstance` connect `Pedal UI Component Imports` to `TcGaussTapeEchoPedal.tsx`, `MxrFlangerPedal.tsx`, `Pedal DSP Node Classes`, `Boost Pedal UI Components`, `App Shell and Audio Controls`, `Custom Knob Dials`, `AudioEngine Core`, `EhxSmallStonePedal.tsx`, `AudioEngine Implementation`, `lucide-react`, `Pedalboard Layout Geometry`, `Stompbox.tsx`, `react`, `Nobels ODR-1 UI`, `EhxSmallClonePedal`, `preset.ts`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._