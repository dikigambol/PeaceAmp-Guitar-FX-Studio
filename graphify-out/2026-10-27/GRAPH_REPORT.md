# Graph Report - guitar-fx-diy  (2026-10-26)

## Corpus Check
- 21 files · ~125,789 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1016 nodes · 2753 edges · 66 communities (35 shown, 31 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 90 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

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
- React Core
- Boss DS-1 Distortion
- Boss HM-2 Distortion
- MXR Distortion Plus
- Stompbox Component
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
- Lucide React Icons
- MxrAnalogChorusNode
- InputImpedanceNode
- Nobels ODR-1 UI
- Shared Distortion Curves
- Gibson Les Paul Icon
- EhxSmallClonePedal
- Preset Management
- BossAw3Node

## God Nodes (most connected - your core abstractions)
1. `Knob()` - 128 edges
2. `PedalInstance` - 102 edges
3. `PedalMetadata` - 94 edges
4. `applyBypassCrossfade()` - 82 edges
5. `AudioPedalNode` - 71 edges
6. `createDcBlocker()` - 68 edges
7. `react` - 67 edges
8. `lucide-react` - 61 edges
9. `Stompbox()` - 49 edges
10. `createPedalAudioNode()` - 48 edges

## Surprising Connections (you probably didn't know these)
- `Catatan` --references--> `createDcBlocker()`  [INFERRED]
  graphify-out/memory/query_20261026_042302_51700b43_does_applybypasscrossfade___hide_a_systemic_bypass.md → src/audio/pedals/dspUtils.ts
- `Apakah aset cabinet IR nyata, dan apakah graph menemukan dead code?` --references--> `generateCabinetImpulseResponse()`  [INFERRED]
  graphify-out/memory/query_20261026_044232_f2dd9c4d_are_the_bundled_cabinet_impulse_responses_real__an.md → src/dsp/amp/cabinetIRGenerator.ts
- `Satu-satunya inkonsistensi nyata (sudah diperbaiki)` --references--> `applyBypassCrossfade()`  [INFERRED]
  graphify-out/memory/query_20261026_042302_51700b43_does_applybypasscrossfade___hide_a_systemic_bypass.md → src/audio/pedals/dspUtils.ts
- `Yang diperiksa dan hasilnya` --references--> `applyBypassCrossfade()`  [INFERRED]
  graphify-out/memory/query_20261026_042302_51700b43_does_applybypasscrossfade___hide_a_systemic_bypass.md → src/audio/pedals/dspUtils.ts
- `Satu-satunya inkonsistensi nyata (sudah diperbaiki)` --references--> `BossBf2Node`  [INFERRED]
  graphify-out/memory/query_20261026_042302_51700b43_does_applybypasscrossfade___hide_a_systemic_bypass.md → src/audio/pedals/flanger/BossBf2Node.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Offline-First / No-Backend Privacy Stance** — web_guitar_fx_rancangan_local_processing_principle, web_guitar_fx_rancangan_no_backend_mvp, web_guitar_fx_rancangan_offline_first, web_guitar_fx_rancangan_development_principles, readme_pwa_offline, index_html_pwa_manifest [EXTRACTED 0.85]
- **PeaceAmp Realtime Signal Pipeline** — readme_signal_flow, web_guitar_fx_rancangan_signal_chain, web_guitar_fx_rancangan_audioengine, web_guitar_fx_rancangan_safety_limiter, web_guitar_fx_rancangan_audio_meter [EXTRACTED 0.85]
- **Cabinet IR Modeling Group** — cabinet_instalation_cabinet_ir, cabinet_instalation_convolution, cabinet_instalation_cabinet_configs, cabinet_instalation_mic_positioning, web_guitar_fx_rancangan_cabinet_simulator, readme_amp_cabinet_modeling [INFERRED 0.85]

## Communities (66 total, 31 thin omitted)

### Community 0 - "Build and Dependency Config"
Cohesion: 0.07
Nodes (16): FuzzFaceNode, BossOd3Node, BossSd1Node, SD1_CONFIG, diodeCurveValue(), FeedbackClipperConfig, FeedbackClipperStage, TS808_CONFIG (+8 more)

### Community 1 - "Pedal UI Component Imports"
Cohesion: 0.19
Nodes (13): HARD_CLIPPER_PRESETS, HardClipperConfig, HardClipperDiodeType, clamp(), createDcBlocker(), createOnePoleHighpass(), createOnePoleLowpass(), driveDependentTrimDb() (+5 more)

### Community 2 - "Compressor Models and Core"
Cohesion: 0.08
Nodes (29): lucide-react, ClassicStompSwitch(), ClassicStompSwitchProps, MxrMicroAmpPedal(), PedalProps, PedalProps, RangemasterPedal(), PedalProps (+21 more)

### Community 3 - "Pedal DSP Node Classes"
Cohesion: 0.07
Nodes (41): dependencies, lucide-react@^1.52.0, react@^19.2.8, react-dom@^19.2.8, devDependencies, eslint@^10.10.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1 (+33 more)

### Community 4 - "Boost Pedal UI Components"
Cohesion: 0.10
Nodes (27): PedalProps, BossCe2Pedal(), PedalProps, PedalProps, PedalProps, BossDs1Pedal(), PedalProps, IbanezSm7Pedal() (+19 more)

### Community 5 - "App Shell and Audio Controls"
Cohesion: 0.08
Nodes (14): Answer, Apakah applyBypassCrossfade() menyembunyikan bug routing bypass sistemik?, Catatan, Outcome, Q: Does applyBypassCrossfade() hide a systemic bypass routing bug across its 59 call sites?, Satu-satunya inkonsistensi nyata (sudah diperbaiki), Source Nodes, Yang diperiksa dan hasilnya (+6 more)

### Community 6 - "Project Docs and Architecture"
Cohesion: 0.11
Nodes (5): BossDs1Node, HardClipperStage, MarshallShredMasterNode, MxrDistortionPlusNode, ProCoRatNode

### Community 7 - "Custom Knob Dials"
Cohesion: 0.07
Nodes (28): Google Fonts Display Stack, PeaceAmp Page Title, manifest.webmanifest link, #root mount point and main.tsx entry, DesktopOnlyBlocker, Web MIDI Scaffold (MidiManager), PeaceAmp — Guitar FX Studio, 45-Model Pedal Catalog (+20 more)

### Community 8 - "AudioEngine Core"
Cohesion: 0.11
Nodes (33): ArcherKnobDial(), BigMuffKnobDial(), BossBlackKnobDial(), BossGoldKnobDial(), BossKnobDial(), BossOrangeKnobDial(), BossSilverKnobDial(), DaviesKnobDial() (+25 more)

### Community 9 - "Delay and Overdrive Nodes"
Cohesion: 0.09
Nodes (4): BossCe2Node, MxrAnalogChorusNode, BossBf2Node, MxrFlangerNode

### Community 10 - "Cabinet Simulator"
Cohesion: 0.11
Nodes (14): BossCs3Node, cs3Model(), autoMakeupDb(), CompressorCore, CompressorPedalFactory, CompressorPedalModel, CompressorPedalNode, CompressorSettings (+6 more)

### Community 12 - "AudioEngine Implementation"
Cohesion: 0.12
Nodes (20): REAL_IR_MAP, PresetBarProps, CabinetSimulatorPanelProps, addDiffuseTail(), addResonantMode(), applyBiquad(), Biquad, CABINET_PROFILES (+12 more)

### Community 13 - "FeedbackClipperStage"
Cohesion: 0.12
Nodes (19): TcSparkMiniPedal(), BossCh1Pedal(), BossCs3Pedal(), BossDm2Pedal(), PedalProps, BossHm2Pedal(), PedalProps, BossBf2Pedal() (+11 more)

### Community 14 - "Tuner and Pitch Detection"
Cohesion: 0.15
Nodes (16): App(), defaultMeter, defaultMetrics, PEDAL_DEFINITIONS, DesktopOnlyBlocker(), HeadphoneWarning(), ManualModal(), ManualModalProps (+8 more)

### Community 15 - "Audio Device Panels"
Cohesion: 0.11
Nodes (5): BossCh1Node, BossDm2Node, MxrCarbonCopyNode, applyBypassCrossfade(), BossGe7Node

### Community 16 - "App TypeScript Config"
Cohesion: 0.18
Nodes (9): AmpHeadNode, AMP_VOICING, AmpVoicingProfile, buildCleanCurve(), buildTubeCurve(), CurveShape, getAmpVoicing(), makePowerAmpCurve() (+1 more)

### Community 17 - "Ibanez SM7 Distortion"
Cohesion: 0.13
Nodes (16): detectOutputSelectionSupport(), StateChangeCallback, ensureWorkletsRegistered(), registeredContexts, WORKLET_CODE, AudioHeader(), AudioHeaderProps, ChromaticTuner() (+8 more)

### Community 18 - "Boss AW-3 Wah"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 20 - "MIDI Manager"
Cohesion: 0.17
Nodes (6): AW3_INPUTS, AW3_MODES, Aw3InputMode, Aw3Mode, BossAw3Node, HUMANIZER_VOWELS

### Community 21 - "Pedalboard Layout Geometry"
Cohesion: 0.27
Nodes (13): VuMeter(), VuMeterProps, PassthroughPanel(), PassthroughPanelProps, CHANNEL_OPTIONS, InputPreampPanel(), InputPreampPanelProps, MasterOutputPanel() (+5 more)

### Community 23 - "BossMt2Node"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 24 - "Marshall Shredmaster"
Cohesion: 0.19
Nodes (3): InputImpedanceConfig, InputImpedanceNode, PRESETS

### Community 25 - "Cabinet IR Docs Concepts"
Cohesion: 0.20
Nodes (3): BbdAnalogWarmthStage, BbdWarmthConfig, EhxSmallCloneNode

### Community 26 - "React Core"
Cohesion: 0.15
Nodes (5): MidiActivityCallback, MidiDevice, MidiDevicesCallback, midiManager, MidiMessageEventLike

### Community 27 - "Boss DS-1 Distortion"
Cohesion: 0.39
Nodes (10): Pedalboard(), PedalboardProps, Position, calculateNextPedalPosition(), doBoxesOverlap(), findNearestFreePosition(), getPedalDimensions(), isPositionColliding() (+2 more)

### Community 30 - "Stompbox Component"
Cohesion: 0.29
Nodes (7): Cabinet Configuration Set (1x8 to 4x12, open/closed back), Cabinet IR Simulation, Cabinet Panel UI Sketch, Mic Models and Position Control, Amp and Cabinet Modeling, Amp Simulator (preamp/tone stack/power amp), Cabinet Simulator via IR

### Community 31 - "TC Spark Mini Boost"
Cohesion: 0.27
Nodes (7): react, BossDualConcentricKnob(), BossDualConcentricKnobProps, MxrAnalogChorusPedal(), PedalProps, BossMt2Pedal(), PedalProps

### Community 33 - "Nobels ODR-1"
Cohesion: 0.22
Nodes (8): Answer, Apakah aset cabinet IR nyata, dan apakah graph menemukan dead code?, Outcome, Perbaikan yang diterapkan, Q: Are the bundled cabinet impulse responses real, and did the graph expose dead code in the cabinet path?, Sisa gap, Source Nodes, Verifikasi

### Community 36 - "MXR Micro Amp"
Cohesion: 0.43
Nodes (6): AmpHeadPanel(), AmpHeadPanelProps, AMP_MODELS, AmpHeadSettings, AmpModelId, AmpModelOption

### Community 50 - "TcGaussTapeEchoNode"
Cohesion: 0.40
Nodes (5): GE7_BANDS, BossGe7Pedal(), Ge7Slider(), PedalProps, SliderProps

### Community 51 - "Bypass Audit Query Notes"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Why does createDcBlocker() connect all pedal DSP communities - intentional design or side effect of shared helper reuse?, Source Nodes

### Community 52 - "BossOd3Node"
Cohesion: 0.67
Nodes (3): PedalProps, ProCoRatPedal(), RatDialScale()

### Community 53 - "BossCe2Node"
Cohesion: 0.67
Nodes (3): EqdHoofPedal(), HoofLogoSvg(), PedalProps

### Community 54 - "BossCh1Node"
Cohesion: 0.67
Nodes (3): FulltoneOcdPedal(), OcdRotationalArrow(), PedalProps

### Community 55 - "Lucide React Icons"
Cohesion: 0.67
Nodes (3): NobelsDialRing(), NobelsOdr1Pedal(), PedalProps

## Knowledge Gaps
- **13 isolated node(s):** `GitHub Actions CI/CD Pipeline`, `Silent Chromatic Tuner`, `Chromatic Tuner with Pitch Detection`, `#root mount point and main.tsx entry`, `DesktopOnlyBlocker` (+8 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 206 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createDcBlocker()` connect `Pedal UI Component Imports` to `Build and Dependency Config`, `App Shell and Audio Controls`, `Audio Device Panels`, `App TypeScript Config`, `Ibanez SM7 Distortion`, `MIDI Manager`, `Flanger DSP and Bypass Notes`, `Cabinet IR Docs Concepts`, `Boss HM-2 Distortion`, `Pro Co RAT`, `EQD Hoof Fuzz`, `FuzzFactoryNode`, `BossGe7Node`, `Boss DM-2 Delay`, `Xotic EP Booster`, `Big Muff Fuzz`, `Flatiron Fuzz`, `Fuzz Face`, `Tone Bender Fuzz`, `Boss BD-2 Blues Driver`, `Fulltone OCD`, `Klon Centaur`, `PhaserEngine`, `Rockett Archer`, `MXR Carbon Copy Delay`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `applyBypassCrossfade()` (e.g. with `Satu-satunya inkonsistensi nyata (sudah diperbaiki)` and `Yang diperiksa dan hasilnya`) actually correct?**
  _`applyBypassCrossfade()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `GitHub Actions CI/CD Pipeline`, `Silent Chromatic Tuner`, `Chromatic Tuner with Pitch Detection` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Build and Dependency Config` be split into smaller, more focused modules?**
  _Cohesion score 0.06787330316742081 - nodes in this community are weakly interconnected._
- **Why does `PedalMetadata` connect `Boost Pedal UI Components` to `Pedal UI Component Imports`, `Compressor Models and Core`, `AudioEngine Core`, `FeedbackClipperStage`, `TcGaussTapeEchoNode`, `BossOd3Node`, `BossCe2Node`, `BossCh1Node`, `Lucide React Icons`, `MIDI Manager`, `InputImpedanceNode`, `Nobels ODR-1 UI`, `Shared Distortion Curves`, `TC Spark Mini Boost`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `Compressor Models and Core` be split into smaller, more focused modules?**
  _Cohesion score 0.08282828282828283 - nodes in this community are weakly interconnected._
- **Why does `react` connect `TC Spark Mini Boost` to `Compressor Models and Core`, `Pedal DSP Node Classes`, `Boost Pedal UI Components`, `AudioEngine Core`, `AudioEngine Implementation`, `FeedbackClipperStage`, `Tuner and Pitch Detection`, `Ibanez SM7 Distortion`, `MIDI Manager`, `Pedalboard Layout Geometry`, `Boss DS-1 Distortion`, `MXR Micro Amp`, `TcGaussTapeEchoNode`, `BossOd3Node`, `BossCe2Node`, `BossCh1Node`, `Lucide React Icons`, `MxrAnalogChorusNode`, `InputImpedanceNode`, `Nobels ODR-1 UI`, `Shared Distortion Curves`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._