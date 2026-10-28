# Graph Report - guitar-fx-diy  (2026-10-28)

## Corpus Check
- 172 files · ~146,094 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 2, .ico 2, .css 2)

## Summary
- 1157 nodes · 3343 edges · 71 communities (35 shown, 36 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 139 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a0c5cf42`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- createPedalAudioNode
- Pedal UI Component Imports
- Compressor Models and Core
- Pedal DSP Node Classes
- EqdHoofNode
- App Shell and Audio Controls
- Project Docs and Architecture
- Custom Knob Dials
- AudioEngine Core
- Delay and Overdrive Nodes
- CompressorPedalNode
- Amp Head Voicing
- CabinetNode
- PedalInstance
- Tuner and Pitch Detection
- MxrUniVibeNode
- App TypeScript Config
- AudioEngine.ts
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
- XoticEpBoosterNode
- Stompbox Component
- react
- Pro Co RAT
- BossDm2Node
- EQD Hoof Fuzz
- TcGaussTapeEchoNode
- BossCh1Node
- BossGe7Node
- Boss DM-2 Delay
- createPedalAudioNode
- BossGe7Node
- Flatiron Fuzz
- Fuzz Face
- Tone Bender Fuzz
- Boss BD-2 Blues Driver
- Fulltone OCD
- Klon Centaur
- NobelsOdr1Pedal.tsx
- RossCompressorPedal.tsx
- BossRv6Node.ts
- TcGaussTapeEchoNode
- Bypass Audit Query Notes
- BossOd3Node
- BossCe2Node
- BossOd3Node
- BossAw3Node.ts
- MxrAnalogChorusNode
- FulltoneOcdPedal.tsx
- FuzzFaceNode
- TcGaussTapeEchoPedal.tsx
- Gibson Les Paul Icon
- EhxSmallClonePedal
- Preset Management
- BossAw3Node
- JhsHallReverbPedal.tsx
- MxrCarbonCopyNode
- BossTr2Node
- FulltoneSupaTremPedal.tsx
- MxrUniVibePedal.tsx
- EhxPitchForkPedal.tsx

## God Nodes (most connected - your core abstractions)
1. `Knob()` - 150 edges
2. `applyBypassCrossfade()` - 131 edges
3. `PedalInstance` - 124 edges
4. `PedalMetadata` - 114 edges
5. `createDcBlocker()` - 104 edges
6. `AudioPedalNode` - 103 edges
7. `react` - 77 edges
8. `lucide-react` - 71 edges
9. `Stompbox()` - 59 edges
10. `createPedalAudioNode()` - 58 edges

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

## Communities (71 total, 36 thin omitted)

### Community 0 - "createPedalAudioNode"
Cohesion: 0.10
Nodes (13): BossSd1Node, SD1_CONFIG, diodeCurveValue(), FeedbackClipperConfig, FeedbackClipperStage, TS808_CONFIG, Ts808Node, TS9_CONFIG (+5 more)

### Community 1 - "Pedal UI Component Imports"
Cohesion: 0.16
Nodes (14): CompressorSettings, HARD_CLIPPER_PRESETS, HardClipperConfig, HardClipperDiodeType, clamp(), createDcBlocker(), createOnePoleHighpass(), createOnePoleLowpass() (+6 more)

### Community 2 - "Compressor Models and Core"
Cohesion: 0.07
Nodes (33): lucide-react, ClassicStompSwitch(), ClassicStompSwitchProps, MxrMicroAmpPedal(), PedalProps, PedalProps, RangemasterPedal(), PedalProps (+25 more)

### Community 3 - "Pedal DSP Node Classes"
Cohesion: 0.07
Nodes (41): dependencies, lucide-react@^1.52.0, react@^19.2.8, react-dom@^19.2.8, devDependencies, eslint@^10.10.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1 (+33 more)

### Community 5 - "App Shell and Audio Controls"
Cohesion: 0.15
Nodes (5): EhxSmallStoneNode, MxrPhase90Node, FallbackState, PhaserEngine, PhaserEngineConfig

### Community 6 - "Project Docs and Architecture"
Cohesion: 0.11
Nodes (5): BossDs1Node, HardClipperStage, MarshallShredMasterNode, MxrDistortionPlusNode, ProCoRatNode

### Community 7 - "Custom Knob Dials"
Cohesion: 0.07
Nodes (28): Google Fonts Display Stack, PeaceAmp Page Title, manifest.webmanifest link, #root mount point and main.tsx entry, DesktopOnlyBlocker, Web MIDI Scaffold (MidiManager), PeaceAmp — Guitar FX Studio, 45-Model Pedal Catalog (+20 more)

### Community 8 - "AudioEngine Core"
Cohesion: 0.09
Nodes (39): ArcherKnobDial(), BigMuffKnobDial(), BossBlackKnobDial(), BossGoldKnobDial(), BossKnobDial(), BossOrangeKnobDial(), BossSilverKnobDial(), DaviesKnobDial() (+31 more)

### Community 9 - "Delay and Overdrive Nodes"
Cohesion: 0.08
Nodes (10): Answer, Apakah applyBypassCrossfade() menyembunyikan bug routing bypass sistemik?, Catatan, Outcome, Q: Does applyBypassCrossfade() hide a systemic bypass routing bug across its 59 call sites?, Satu-satunya inkonsistensi nyata (sudah diperbaiki), Source Nodes, BossBf2Node (+2 more)

### Community 10 - "CompressorPedalNode"
Cohesion: 0.10
Nodes (13): BossCs3Node, cs3Model(), autoMakeupDb(), CompressorCore, CompressorPedalFactory, CompressorPedalModel, CompressorPedalNode, KeeleyCompressorNode (+5 more)

### Community 11 - "Amp Head Voicing"
Cohesion: 0.10
Nodes (3): Yang diperiksa dan hasilnya, AudioEngine, SignalChain

### Community 12 - "CabinetNode"
Cohesion: 0.07
Nodes (27): Answer, Apakah aset cabinet IR nyata, dan apakah graph menemukan dead code?, Outcome, Perbaikan yang diterapkan, Q: Are the bundled cabinet impulse responses real, and did the graph expose dead code in the cabinet path?, Sisa gap, Source Nodes, Verifikasi (+19 more)

### Community 13 - "PedalInstance"
Cohesion: 0.07
Nodes (53): PedalProps, TcSparkMiniPedal(), BossCe2Pedal(), PedalProps, BossCh1Pedal(), PedalProps, BossCs3Pedal(), PedalProps (+45 more)

### Community 14 - "Tuner and Pitch Detection"
Cohesion: 0.10
Nodes (22): App(), defaultMeter, defaultMetrics, detectOutputSelectionSupport(), AudioHeader(), AudioHeaderProps, DesktopOnlyBlocker(), HeadphoneWarning() (+14 more)

### Community 16 - "App TypeScript Config"
Cohesion: 0.15
Nodes (15): AmpHeadNode, AmpHeadPanel(), AmpHeadPanelProps, AMP_VOICING, AmpVoicingProfile, buildCleanCurve(), buildTubeCurve(), CurveShape (+7 more)

### Community 17 - "AudioEngine.ts"
Cohesion: 0.12
Nodes (14): StateChangeCallback, InputImpedanceConfig, PRESETS, ActiveNodeEntry, ensureWorkletsRegistered(), registeredContexts, WORKLET_CODE, ChromaticTuner() (+6 more)

### Community 18 - "Boss AW-3 Wah"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 19 - "PitchEngine"
Cohesion: 0.18
Nodes (3): BossOc5Node, EhxPitchForkNode, PitchEngine

### Community 21 - "Pedalboard Layout Geometry"
Cohesion: 0.22
Nodes (13): VuMeter(), VuMeterProps, PassthroughPanel(), PassthroughPanelProps, CHANNEL_OPTIONS, InputPreampPanel(), InputPreampPanelProps, MasterOutputPanel() (+5 more)

### Community 23 - "BossMt2Node"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 25 - "Cabinet IR Docs Concepts"
Cohesion: 0.12
Nodes (7): BbdAnalogWarmthStage, BbdWarmthConfig, BossCe2Node, EhxSmallCloneNode, MxrAnalogChorusNode, applyBypassCrossfade(), BossVb2Node

### Community 26 - "React Core"
Cohesion: 0.15
Nodes (5): MidiActivityCallback, MidiDevice, MidiDevicesCallback, midiManager, MidiMessageEventLike

### Community 27 - "Boss DS-1 Distortion"
Cohesion: 0.31
Nodes (12): PEDAL_DEFINITIONS, PatchConnection, Pedalboard(), PedalboardProps, Position, calculateNextPedalPosition(), doBoxesOverlap(), findNearestFreePosition() (+4 more)

### Community 30 - "Stompbox Component"
Cohesion: 0.29
Nodes (7): Cabinet Configuration Set (1x8 to 4x12, open/closed back), Cabinet IR Simulation, Cabinet Panel UI Sketch, Mic Models and Position Control, Amp and Cabinet Modeling, Amp Simulator (preamp/tone stack/power amp), Cabinet Simulator via IR

### Community 31 - "react"
Cohesion: 0.16
Nodes (11): react, AW3_MODES, HUMANIZER_VOWELS, BossDualConcentricKnob(), BossDualConcentricKnobProps, EhxSmallClonePedal(), PedalProps, BossMt2Pedal() (+3 more)

### Community 39 - "createPedalAudioNode"
Cohesion: 0.05
Nodes (10): TcSparkMiniNode, NobelsOdr1Node, RockettArcherNode, createPedalAudioNode(), BossRv6Node, EhxHolyGrailNode, JhsHallReverbNode, ReverbEngine (+2 more)

### Community 47 - "NobelsOdr1Pedal.tsx"
Cohesion: 0.67
Nodes (3): NobelsDialRing(), NobelsOdr1Pedal(), PedalProps

### Community 49 - "BossRv6Node.ts"
Cohesion: 0.38
Nodes (4): RV6_MODES, HOLY_GRAIL_MODES, ReverbConfig, ReverbMode

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

### Community 55 - "BossAw3Node.ts"
Cohesion: 0.50
Nodes (3): AW3_INPUTS, Aw3InputMode, Aw3Mode

### Community 58 - "FulltoneOcdPedal.tsx"
Cohesion: 0.67
Nodes (3): FulltoneOcdPedal(), OcdRotationalArrow(), PedalProps

### Community 70 - "EhxPitchForkPedal.tsx"
Cohesion: 0.50
Nodes (3): EhxPitchForkPedal(), PedalProps, SHIFT_ITEMS

## Knowledge Gaps
- **13 isolated node(s):** `GitHub Actions CI/CD Pipeline`, `Silent Chromatic Tuner`, `Chromatic Tuner with Pitch Detection`, `#root mount point and main.tsx entry`, `DesktopOnlyBlocker` (+8 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 199 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createDcBlocker()` connect `Pedal UI Component Imports` to `createPedalAudioNode`, `EqdHoofNode`, `App Shell and Audio Controls`, `Project Docs and Architecture`, `Delay and Overdrive Nodes`, `Amp Head Voicing`, `MxrUniVibeNode`, `App TypeScript Config`, `AudioEngine.ts`, `PitchEngine`, `MIDI Manager`, `Flanger DSP and Bypass Notes`, `Cabinet IR Docs Concepts`, `Boss HM-2 Distortion`, `XoticEpBoosterNode`, `Pro Co RAT`, `BossDm2Node`, `EQD Hoof Fuzz`, `TcGaussTapeEchoNode`, `BossCh1Node`, `BossGe7Node`, `Boss DM-2 Delay`, `createPedalAudioNode`, `BossGe7Node`, `Flatiron Fuzz`, `Fuzz Face`, `Tone Bender Fuzz`, `Boss BD-2 Blues Driver`, `Fulltone OCD`, `Klon Centaur`, `BossRv6Node.ts`, `BossOd3Node`, `BossAw3Node.ts`, `FuzzFaceNode`, `MxrCarbonCopyNode`, `BossTr2Node`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `applyBypassCrossfade()` (e.g. with `Satu-satunya inkonsistensi nyata (sudah diperbaiki)` and `Yang diperiksa dan hasilnya`) actually correct?**
  _`applyBypassCrossfade()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `GitHub Actions CI/CD Pipeline`, `Silent Chromatic Tuner`, `Chromatic Tuner with Pitch Detection` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `createPedalAudioNode` be split into smaller, more focused modules?**
  _Cohesion score 0.09982174688057041 - nodes in this community are weakly interconnected._
- **Why does `AudioPedalNode` connect `Pedal UI Component Imports` to `createPedalAudioNode`, `EqdHoofNode`, `App Shell and Audio Controls`, `Project Docs and Architecture`, `Delay and Overdrive Nodes`, `CompressorPedalNode`, `Amp Head Voicing`, `MxrUniVibeNode`, `AudioEngine.ts`, `PitchEngine`, `MIDI Manager`, `Flanger DSP and Bypass Notes`, `Cabinet IR Docs Concepts`, `Boss HM-2 Distortion`, `XoticEpBoosterNode`, `Pro Co RAT`, `BossDm2Node`, `EQD Hoof Fuzz`, `TcGaussTapeEchoNode`, `BossCh1Node`, `BossGe7Node`, `Boss DM-2 Delay`, `createPedalAudioNode`, `BossGe7Node`, `Flatiron Fuzz`, `Fuzz Face`, `Tone Bender Fuzz`, `Boss BD-2 Blues Driver`, `Fulltone OCD`, `Klon Centaur`, `BossRv6Node.ts`, `BossOd3Node`, `BossAw3Node.ts`, `FuzzFaceNode`, `MxrCarbonCopyNode`, `BossTr2Node`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Should `Compressor Models and Core` be split into smaller, more focused modules?**
  _Cohesion score 0.07372549019607844 - nodes in this community are weakly interconnected._
- **Why does `applyBypassCrossfade()` connect `Cabinet IR Docs Concepts` to `createPedalAudioNode`, `Pedal UI Component Imports`, `EqdHoofNode`, `App Shell and Audio Controls`, `Project Docs and Architecture`, `Delay and Overdrive Nodes`, `CompressorPedalNode`, `Amp Head Voicing`, `MxrUniVibeNode`, `App TypeScript Config`, `PitchEngine`, `MIDI Manager`, `Flanger DSP and Bypass Notes`, `Boss HM-2 Distortion`, `XoticEpBoosterNode`, `Pro Co RAT`, `BossDm2Node`, `EQD Hoof Fuzz`, `TcGaussTapeEchoNode`, `BossCh1Node`, `BossGe7Node`, `Boss DM-2 Delay`, `createPedalAudioNode`, `BossGe7Node`, `Flatiron Fuzz`, `Fuzz Face`, `Tone Bender Fuzz`, `Boss BD-2 Blues Driver`, `Fulltone OCD`, `Klon Centaur`, `BossRv6Node.ts`, `BossOd3Node`, `BossAw3Node.ts`, `FuzzFaceNode`, `MxrCarbonCopyNode`, `BossTr2Node`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._