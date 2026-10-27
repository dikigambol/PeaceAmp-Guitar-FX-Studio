# Graph Report - guitar-fx-diy  (2026-10-27)

## Corpus Check
- 163 files · ~137,802 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 2, .ico 2, .css 2)

## Summary
- 1094 nodes · 3123 edges · 75 communities (36 shown, 39 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 109 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cb7481cd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- TubeScreamerNode
- Pedal UI Component Imports
- Compressor Models and Core
- Pedal DSP Node Classes
- Boost Pedal UI Components
- App Shell and Audio Controls
- Project Docs and Architecture
- Custom Knob Dials
- AudioEngine Core
- Delay and Overdrive Nodes
- CompressorPedalNode.ts
- Amp Head Voicing
- CabinetNode
- PedalInstance
- Tuner and Pitch Detection
- Audio Device Panels
- App TypeScript Config
- Ibanez SM7 Distortion
- Boss AW-3 Wah
- PitchEngine
- MIDI Manager
- Pedalboard Layout Geometry
- Flanger DSP and Bypass Notes
- BossMt2Node
- Marshall Shredmaster
- Cabinet IR Docs Concepts
- React Core
- Boss DS-1 Distortion
- Boss HM-2 Distortion
- driveDependentTrimDb
- Stompbox Component
- react
- Pro Co RAT
- TubeScreamerNode.ts
- EQD Hoof Fuzz
- FuzzFactoryNode
- CompressorPedalNode
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
- ChromaticTuner.tsx
- TcGaussTapeEchoNode
- Bypass Audit Query Notes
- BossOd3Node
- BossCe2Node
- BossOd3Node
- BossVb2Node
- MxrAnalogChorusNode
- InputImpedanceNode
- FuzzFaceNode
- Shared Distortion Curves
- Gibson Les Paul Icon
- EhxSmallClonePedal
- Preset Management
- BossAw3Node
- FulltoneSupaTremNode
- MxrCarbonCopyNode
- BossTr2Node
- KeeleyCompressorNode.ts
- MxrDynaCompNode.ts
- EhxPitchForkPedal.tsx
- RangemasterPedal.tsx
- EhxSmallClonePedal.tsx
- TcGaussTapeEchoPedal.tsx
- KlonCentaurPedal.tsx

## God Nodes (most connected - your core abstractions)
1. `Knob()` - 140 edges
2. `applyBypassCrossfade()` - 123 edges
3. `PedalInstance` - 116 edges
4. `PedalMetadata` - 106 edges
5. `AudioPedalNode` - 95 edges
6. `createDcBlocker()` - 94 edges
7. `react` - 73 edges
8. `lucide-react` - 67 edges
9. `Stompbox()` - 55 edges
10. `createPedalAudioNode()` - 54 edges

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

## Communities (75 total, 39 thin omitted)

### Community 0 - "TubeScreamerNode"
Cohesion: 0.15
Nodes (6): diodeCurveValue(), FeedbackClipperStage, Ts808Node, Ts9Node, TsMiniNode, TubeScreamerNode

### Community 1 - "Pedal UI Component Imports"
Cohesion: 0.19
Nodes (7): clamp(), createDcBlocker(), levelToGain(), PITCH_FORK_INTERVALS, ActiveNodeEntry, AudioPedalNode, PedalParameterDef

### Community 2 - "Compressor Models and Core"
Cohesion: 0.08
Nodes (30): lucide-react, ClassicStompSwitch(), ClassicStompSwitchProps, MxrMicroAmpPedal(), PedalProps, PedalProps, XoticEpBoosterPedal(), MxrAnalogChorusPedal() (+22 more)

### Community 3 - "Pedal DSP Node Classes"
Cohesion: 0.07
Nodes (41): dependencies, lucide-react@^1.52.0, react@^19.2.8, react-dom@^19.2.8, devDependencies, eslint@^10.10.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1 (+33 more)

### Community 4 - "Boost Pedal UI Components"
Cohesion: 0.11
Nodes (21): TcSparkMiniPedal(), BossCe2Pedal(), BossCh1Pedal(), BossCs3Pedal(), PedalProps, IbanezSm7Pedal(), PedalProps, MarshallShredMasterPedal() (+13 more)

### Community 5 - "App Shell and Audio Controls"
Cohesion: 0.15
Nodes (5): EhxSmallStoneNode, MxrPhase90Node, FallbackState, PhaserEngine, PhaserEngineConfig

### Community 6 - "Project Docs and Architecture"
Cohesion: 0.13
Nodes (3): MarshallShredMasterNode, MxrDistortionPlusNode, ProCoRatNode

### Community 7 - "Custom Knob Dials"
Cohesion: 0.07
Nodes (28): Google Fonts Display Stack, PeaceAmp Page Title, manifest.webmanifest link, #root mount point and main.tsx entry, DesktopOnlyBlocker, Web MIDI Scaffold (MidiManager), PeaceAmp — Guitar FX Studio, 45-Model Pedal Catalog (+20 more)

### Community 8 - "AudioEngine Core"
Cohesion: 0.09
Nodes (37): ArcherKnobDial(), BigMuffKnobDial(), BossBlackKnobDial(), BossGoldKnobDial(), BossKnobDial(), BossOrangeKnobDial(), BossSilverKnobDial(), DaviesKnobDial() (+29 more)

### Community 9 - "Delay and Overdrive Nodes"
Cohesion: 0.08
Nodes (11): Answer, Apakah applyBypassCrossfade() menyembunyikan bug routing bypass sistemik?, Catatan, Outcome, Q: Does applyBypassCrossfade() hide a systemic bypass routing bug across its 59 call sites?, Satu-satunya inkonsistensi nyata (sudah diperbaiki), Source Nodes, Yang diperiksa dan hasilnya (+3 more)

### Community 10 - "CompressorPedalNode.ts"
Cohesion: 0.21
Nodes (8): BossCs3Node, cs3Model(), autoMakeupDb(), CompressorPedalFactory, CompressorPedalModel, CompressorSettings, RossCompressorNode, rossModel()

### Community 12 - "CabinetNode"
Cohesion: 0.08
Nodes (26): Answer, Apakah aset cabinet IR nyata, dan apakah graph menemukan dead code?, Outcome, Perbaikan yang diterapkan, Q: Are the bundled cabinet impulse responses real, and did the graph expose dead code in the cabinet path?, Sisa gap, Source Nodes, Verifikasi (+18 more)

### Community 13 - "PedalInstance"
Cohesion: 0.10
Nodes (27): PedalProps, PedalProps, PedalProps, BossDm2Pedal(), PedalProps, BossHm2Pedal(), PedalProps, BigMuffPedal() (+19 more)

### Community 14 - "Tuner and Pitch Detection"
Cohesion: 0.12
Nodes (19): App(), defaultMeter, defaultMetrics, detectOutputSelectionSupport(), DesktopOnlyBlocker(), HeadphoneWarning(), ManualModal(), ManualModalProps (+11 more)

### Community 15 - "Audio Device Panels"
Cohesion: 0.08
Nodes (8): BossCh1Node, BossDm2Node, TcGaussTapeEchoNode, applyBypassCrossfade(), BossGe7Node, GE7_BANDS, Ge7BandConfig, MxrUniVibeNode

### Community 16 - "App TypeScript Config"
Cohesion: 0.15
Nodes (15): AmpHeadNode, AmpHeadPanel(), AmpHeadPanelProps, AMP_VOICING, AmpVoicingProfile, buildCleanCurve(), buildTubeCurve(), CurveShape (+7 more)

### Community 17 - "Ibanez SM7 Distortion"
Cohesion: 0.18
Nodes (11): StateChangeCallback, ensureWorkletsRegistered(), registeredContexts, WORKLET_CODE, AudioHeader(), AudioHeaderProps, AudioEngineMetrics, AudioEngineState (+3 more)

### Community 18 - "Boss AW-3 Wah"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 19 - "PitchEngine"
Cohesion: 0.18
Nodes (3): BossOc5Node, EhxPitchForkNode, PitchEngine

### Community 20 - "MIDI Manager"
Cohesion: 0.17
Nodes (6): AW3_INPUTS, AW3_MODES, Aw3InputMode, Aw3Mode, BossAw3Node, HUMANIZER_VOWELS

### Community 21 - "Pedalboard Layout Geometry"
Cohesion: 0.21
Nodes (12): VuMeter(), VuMeterProps, PassthroughPanel(), PassthroughPanelProps, CHANNEL_OPTIONS, InputPreampPanel(), InputPreampPanelProps, MasterOutputPanel() (+4 more)

### Community 23 - "BossMt2Node"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 24 - "Marshall Shredmaster"
Cohesion: 0.19
Nodes (3): InputImpedanceConfig, InputImpedanceNode, PRESETS

### Community 25 - "Cabinet IR Docs Concepts"
Cohesion: 0.14
Nodes (5): BbdAnalogWarmthStage, BbdWarmthConfig, BossCe2Node, EhxSmallCloneNode, MxrAnalogChorusNode

### Community 26 - "React Core"
Cohesion: 0.15
Nodes (5): MidiActivityCallback, MidiDevice, MidiDevicesCallback, midiManager, MidiMessageEventLike

### Community 27 - "Boss DS-1 Distortion"
Cohesion: 0.31
Nodes (12): PEDAL_DEFINITIONS, PatchConnection, Pedalboard(), PedalboardProps, Position, calculateNextPedalPosition(), doBoxesOverlap(), findNearestFreePosition() (+4 more)

### Community 29 - "driveDependentTrimDb"
Cohesion: 0.21
Nodes (8): BossDs1Node, HARD_CLIPPER_PRESETS, HardClipperConfig, HardClipperDiodeType, HardClipperStage, createOnePoleHighpass(), createOnePoleLowpass(), driveDependentTrimDb()

### Community 30 - "Stompbox Component"
Cohesion: 0.29
Nodes (7): Cabinet Configuration Set (1x8 to 4x12, open/closed back), Cabinet IR Simulation, Cabinet Panel UI Sketch, Mic Models and Position Control, Amp and Cabinet Modeling, Amp Simulator (preamp/tone stack/power amp), Cabinet Simulator via IR

### Community 31 - "react"
Cohesion: 0.17
Nodes (11): react, BossDualConcentricKnob(), BossDualConcentricKnobProps, BossMt2Pedal(), PedalProps, FulltoneOcdPedal(), OcdRotationalArrow(), PedalProps (+3 more)

### Community 33 - "TubeScreamerNode.ts"
Cohesion: 0.19
Nodes (7): BossSd1Node, SD1_CONFIG, FeedbackClipperConfig, TS808_CONFIG, TS9_CONFIG, TS_MINI_CONFIG, TubeScreamerConfig

### Community 49 - "ChromaticTuner.tsx"
Cohesion: 0.36
Nodes (5): ChromaticTuner(), ChromaticTunerProps, detectPitch(), NOTE_NAMES, TunerResult

### Community 50 - "TcGaussTapeEchoNode"
Cohesion: 0.50
Nodes (4): BossGe7Pedal(), Ge7Slider(), PedalProps, SliderProps

### Community 51 - "Bypass Audit Query Notes"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Why does createDcBlocker() connect all pedal DSP communities - intentional design or side effect of shared helper reuse?, Source Nodes

### Community 52 - "BossOd3Node"
Cohesion: 0.67
Nodes (3): PedalProps, ProCoRatPedal(), RatDialScale()

### Community 53 - "BossCe2Node"
Cohesion: 0.67
Nodes (3): EqdHoofPedal(), HoofLogoSvg(), PedalProps

### Community 70 - "EhxPitchForkPedal.tsx"
Cohesion: 0.50
Nodes (3): EhxPitchForkPedal(), PedalProps, SHIFT_ITEMS

## Knowledge Gaps
- **13 isolated node(s):** `GitHub Actions CI/CD Pipeline`, `Silent Chromatic Tuner`, `Chromatic Tuner with Pitch Detection`, `#root mount point and main.tsx entry`, `DesktopOnlyBlocker` (+8 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 191 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **39 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AudioPedalNode` connect `Pedal UI Component Imports` to `TubeScreamerNode`, `App Shell and Audio Controls`, `Project Docs and Architecture`, `Delay and Overdrive Nodes`, `CompressorPedalNode.ts`, `Amp Head Voicing`, `Audio Device Panels`, `PitchEngine`, `MIDI Manager`, `Flanger DSP and Bypass Notes`, `Cabinet IR Docs Concepts`, `Boss HM-2 Distortion`, `driveDependentTrimDb`, `Pro Co RAT`, `TubeScreamerNode.ts`, `EQD Hoof Fuzz`, `FuzzFactoryNode`, `CompressorPedalNode`, `BossGe7Node`, `Boss DM-2 Delay`, `Xotic EP Booster`, `Big Muff Fuzz`, `Flatiron Fuzz`, `Fuzz Face`, `Tone Bender Fuzz`, `Boss BD-2 Blues Driver`, `Fulltone OCD`, `Klon Centaur`, `PhaserEngine`, `Rockett Archer`, `BossOd3Node`, `BossVb2Node`, `FuzzFaceNode`, `FulltoneSupaTremNode`, `MxrCarbonCopyNode`, `BossTr2Node`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `applyBypassCrossfade()` (e.g. with `Satu-satunya inkonsistensi nyata (sudah diperbaiki)` and `Yang diperiksa dan hasilnya`) actually correct?**
  _`applyBypassCrossfade()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `GitHub Actions CI/CD Pipeline`, `Silent Chromatic Tuner`, `Chromatic Tuner with Pitch Detection` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Compressor Models and Core` be split into smaller, more focused modules?**
  _Cohesion score 0.08282828282828283 - nodes in this community are weakly interconnected._
- **Why does `createDcBlocker()` connect `Pedal UI Component Imports` to `TubeScreamerNode`, `App Shell and Audio Controls`, `Project Docs and Architecture`, `Delay and Overdrive Nodes`, `Amp Head Voicing`, `Audio Device Panels`, `App TypeScript Config`, `Ibanez SM7 Distortion`, `PitchEngine`, `MIDI Manager`, `Flanger DSP and Bypass Notes`, `Cabinet IR Docs Concepts`, `Boss HM-2 Distortion`, `driveDependentTrimDb`, `Pro Co RAT`, `TubeScreamerNode.ts`, `EQD Hoof Fuzz`, `FuzzFactoryNode`, `BossGe7Node`, `Boss DM-2 Delay`, `Xotic EP Booster`, `Big Muff Fuzz`, `Flatiron Fuzz`, `Fuzz Face`, `Tone Bender Fuzz`, `Boss BD-2 Blues Driver`, `Fulltone OCD`, `Klon Centaur`, `PhaserEngine`, `Rockett Archer`, `BossOd3Node`, `BossVb2Node`, `FuzzFaceNode`, `FulltoneSupaTremNode`, `MxrCarbonCopyNode`, `BossTr2Node`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Should `Pedal DSP Node Classes` be split into smaller, more focused modules?**
  _Cohesion score 0.06553911205073996 - nodes in this community are weakly interconnected._
- **Why does `applyBypassCrossfade()` connect `Audio Device Panels` to `TubeScreamerNode`, `Pedal UI Component Imports`, `App Shell and Audio Controls`, `Project Docs and Architecture`, `Delay and Overdrive Nodes`, `CompressorPedalNode.ts`, `App TypeScript Config`, `PitchEngine`, `MIDI Manager`, `Flanger DSP and Bypass Notes`, `Cabinet IR Docs Concepts`, `Boss HM-2 Distortion`, `driveDependentTrimDb`, `Pro Co RAT`, `TubeScreamerNode.ts`, `EQD Hoof Fuzz`, `FuzzFactoryNode`, `CompressorPedalNode`, `BossGe7Node`, `Boss DM-2 Delay`, `Xotic EP Booster`, `Big Muff Fuzz`, `Flatiron Fuzz`, `Fuzz Face`, `Tone Bender Fuzz`, `Boss BD-2 Blues Driver`, `Fulltone OCD`, `Klon Centaur`, `PhaserEngine`, `Rockett Archer`, `BossOd3Node`, `BossVb2Node`, `FuzzFaceNode`, `FulltoneSupaTremNode`, `MxrCarbonCopyNode`, `BossTr2Node`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._