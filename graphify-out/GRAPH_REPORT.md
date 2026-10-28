# Graph Report - guitar-fx-diy  (2026-10-28)

## Corpus Check
- 84 files · ~156,869 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1188 nodes · 3275 edges · 77 communities (35 shown, 42 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 132 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Architecture Queries & Outcomes
- Pedal DSP Audio Nodes (57 nodes)
- Amp Head & Tone Voicing
- Custom Knob & Dial Dials
- AudioEngine Core & Conditioning
- Project Config & Dependencies
- Architecture Queries & Outcomes
- Project Config & Dependencies
- Google Fonts Display Stack / PeaceAmp Page Title
- Amp Head & Tone Voicing
- Pedal DSP Audio Nodes (34 nodes)
- Custom Knob & Dial Dials
- Pedal DSP Audio Nodes (33 nodes)
- Pedal DSP Audio Nodes (28 nodes)
- Pedal UI Components (25 nodes)
- AudioEngine Core & Conditioning
- Pedal DSP Audio Nodes (24 nodes)
- Pedal DSP Audio Nodes (23 nodes)
- Pedal DSP Audio Nodes (22 nodes)
- Pedal DSP Audio Nodes (21 nodes)
- tsconfig.app.json / compilerOptions
- Rig & Artist Presets
- Pedal DSP Audio Nodes (17 nodes)
- tsconfig.node.json / compilerOptions
- Rig & Artist Presets
- Pedal DSP Audio Nodes (15 nodes)
- MidiManager.ts / MidiActivityCallback
- AudioEngine Core & Conditioning
- Pedal DSP Audio Nodes (14 nodes)
- Pedalboard Canvas & Routing
- Pedal DSP Audio Nodes (12 nodes)
- Pedal DSP Audio Nodes (11 nodes)
- Pedal DSP Audio Nodes (11 nodes)
- Cabinet IR Simulation
- Pedal DSP Audio Nodes (10 nodes)
- Pedal DSP Audio Nodes (10 nodes)
- Pedal DSP Audio Nodes (9 nodes)
- Pedal DSP Audio Nodes (8 nodes)
- Pedal DSP Audio Nodes (8 nodes)
- Pedal DSP Audio Nodes (8 nodes)
- Pedal DSP Audio Nodes (8 nodes)
- Pedal DSP Audio Nodes (8 nodes)
- Pedal UI Components (8 nodes)
- Pedal DSP Audio Nodes (7 nodes)
- Pedal DSP Audio Nodes (7 nodes)
- Pedal DSP Audio Nodes (7 nodes)
- Pedal DSP Audio Nodes (7 nodes)
- Pedal DSP Audio Nodes (7 nodes)
- Pedal DSP Audio Nodes (7 nodes)
- Pedal DSP Audio Nodes (7 nodes)
- Pedal DSP Audio Nodes (7 nodes)
- Pedal DSP Audio Nodes (7 nodes)
- Pedal DSP Audio Nodes (7 nodes)
- Pedal DSP Audio Nodes (7 nodes)
- Pedal DSP Audio Nodes (7 nodes)
- Pedal DSP Audio Nodes (7 nodes)
- Pedal DSP Audio Nodes (7 nodes)
- Pedal DSP Audio Nodes (7 nodes)
- Guitar Tuner & Pitch DSP
- Pedal DSP Audio Nodes (6 nodes)
- Pedal DSP Audio Nodes (6 nodes)
- Pedal DSP Audio Nodes (6 nodes)
- Pedal DSP Audio Nodes (6 nodes)
- Architecture Queries & Outcomes
- Pedal UI Components (4 nodes)
- Pedal UI Components (4 nodes)
- Pedal UI Components (4 nodes)
- workletBundle.ts / registeredContexts
- GibsonLesPaulIcon.tsx / GibsonLesPaulIcon()
- Pedal UI Components (3 nodes)
- Pedal UI Components (3 nodes)
- Pedal UI Components (3 nodes)
- tsconfig.json / files
- GitHub Actions CI/CD Pipeline / Definition of Done
- sw.js / STATIC_ASSETS
- Silent Chromatic Tuner / Chromatic Tuner with Pitch Detection

## God Nodes (most connected - your core abstractions)
1. `Knob()` - 156 edges
2. `PedalInstance` - 130 edges
3. `PedalMetadata` - 120 edges
4. `AudioPedalNode` - 110 edges
5. `react` - 80 edges
6. `applyBypassCrossfade()` - 78 edges
7. `lucide-react` - 74 edges
8. `createDcBlocker()` - 73 edges
9. `levelToGain()` - 41 edges
10. `AudioEngine` - 41 edges

## Surprising Connections (you probably didn't know these)
- `Catatan` --references--> `createDcBlocker()`  [INFERRED]
  graphify-out/memory/query_20261026_042302_51700b43_does_applybypasscrossfade___hide_a_systemic_bypass.md → src/audio/pedals/dspUtils.ts
- `Satu-satunya inkonsistensi nyata (sudah diperbaiki)` --references--> `applyBypassCrossfade()`  [INFERRED]
  graphify-out/memory/query_20261026_042302_51700b43_does_applybypasscrossfade___hide_a_systemic_bypass.md → src/audio/pedals/dspUtils.ts
- `Yang diperiksa dan hasilnya` --references--> `applyBypassCrossfade()`  [INFERRED]
  graphify-out/memory/query_20261026_042302_51700b43_does_applybypasscrossfade___hide_a_systemic_bypass.md → src/audio/pedals/dspUtils.ts
- `Satu-satunya inkonsistensi nyata (sudah diperbaiki)` --references--> `EhxSmallStoneNode`  [INFERRED]
  graphify-out/memory/query_20261026_042302_51700b43_does_applybypasscrossfade___hide_a_systemic_bypass.md → src/audio/pedals/phaser/EhxSmallStoneNode.ts
- `Satu-satunya inkonsistensi nyata (sudah diperbaiki)` --references--> `MxrPhase90Node`  [INFERRED]
  graphify-out/memory/query_20261026_042302_51700b43_does_applybypasscrossfade___hide_a_systemic_bypass.md → src/audio/pedals/phaser/MxrPhase90Node.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Offline-First / No-Backend Privacy Stance** — web_guitar_fx_rancangan_local_processing_principle, web_guitar_fx_rancangan_no_backend_mvp, web_guitar_fx_rancangan_offline_first, web_guitar_fx_rancangan_development_principles, readme_pwa_offline, index_html_pwa_manifest [EXTRACTED 0.85]
- **PeaceAmp Realtime Signal Pipeline** — readme_signal_flow, web_guitar_fx_rancangan_signal_chain, web_guitar_fx_rancangan_audioengine, web_guitar_fx_rancangan_safety_limiter, web_guitar_fx_rancangan_audio_meter [EXTRACTED 0.85]
- **Cabinet IR Modeling Group** — cabinet_instalation_cabinet_ir, cabinet_instalation_convolution, cabinet_instalation_cabinet_configs, cabinet_instalation_mic_positioning, web_guitar_fx_rancangan_cabinet_simulator, readme_amp_cabinet_modeling [INFERRED 0.85]

## Communities (77 total, 42 thin omitted)

### Community 0 - "Architecture Queries & Outcomes"
Cohesion: 0.07
Nodes (32): Answer, Apakah aset cabinet IR nyata, dan apakah graph menemukan dead code?, Outcome, Perbaikan yang diterapkan, Q: Are the bundled cabinet impulse responses real, and did the graph expose dead code in the cabinet path?, Sisa gap, Source Nodes, Verifikasi (+24 more)

### Community 1 - "Pedal DSP Audio Nodes (57 nodes)"
Cohesion: 0.17
Nodes (12): applyBypassCrossfade(), clamp(), createDcBlocker(), levelToGain(), PITCH_FORK_INTERVALS, RV6_MODES, HOLY_GRAIL_MODES, ReverbConfig (+4 more)

### Community 2 - "Amp Head & Tone Voicing"
Cohesion: 0.08
Nodes (35): AmpHeadPedalProps, PedalProps, CabinetIrPedalProps, PedalProps, EhxSmallClonePedal(), PedalProps, BossCs3Pedal(), PedalProps (+27 more)

### Community 3 - "Custom Knob & Dial Dials"
Cohesion: 0.08
Nodes (43): ArcherKnobDial(), BigMuffKnobDial(), BossBlackKnobDial(), BossGoldKnobDial(), BossKnobDial(), BossOrangeKnobDial(), BossSilverKnobDial(), DaviesKnobDial() (+35 more)

### Community 4 - "AudioEngine Core & Conditioning"
Cohesion: 0.07
Nodes (7): App(), AudioEngine, detectOutputSelectionSupport(), SignalChain, SignalEdge, ensureWorkletsRegistered(), AudioHeader()

### Community 5 - "Project Config & Dependencies"
Cohesion: 0.07
Nodes (41): dependencies, lucide-react@^1.52.0, react@^19.2.8, react-dom@^19.2.8, devDependencies, eslint@^10.10.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1 (+33 more)

### Community 6 - "Architecture Queries & Outcomes"
Cohesion: 0.09
Nodes (11): Answer, Apakah applyBypassCrossfade() menyembunyikan bug routing bypass sistemik?, Catatan, Outcome, Q: Does applyBypassCrossfade() hide a systemic bypass routing bug across its 59 call sites?, Satu-satunya inkonsistensi nyata (sudah diperbaiki), Source Nodes, Yang diperiksa dan hasilnya (+3 more)

### Community 7 - "Project Config & Dependencies"
Cohesion: 0.09
Nodes (28): lucide-react, ClassicStompSwitch(), ClassicStompSwitchProps, MxrMicroAmpPedal(), PedalProps, PedalProps, RangemasterPedal(), PedalProps (+20 more)

### Community 8 - "Google Fonts Display Stack / PeaceAmp Page Title"
Cohesion: 0.07
Nodes (28): Google Fonts Display Stack, PeaceAmp Page Title, manifest.webmanifest link, #root mount point and main.tsx entry, DesktopOnlyBlocker, Web MIDI Scaffold (MidiManager), PeaceAmp — Guitar FX Studio, 45-Model Pedal Catalog (+20 more)

### Community 9 - "Amp Head & Tone Voicing"
Cohesion: 0.14
Nodes (19): AmpHeadNode, AmpHeadPedal(), AmpHeadPanel(), AmpHeadPanelProps, AMP_VOICING, AmpVoicingProfile, buildCleanCurve(), buildTubeCurve() (+11 more)

### Community 10 - "Pedal DSP Audio Nodes (34 nodes)"
Cohesion: 0.10
Nodes (13): BossSd1Node, SD1_CONFIG, diodeCurveValue(), FeedbackClipperConfig, FeedbackClipperStage, TS808_CONFIG, Ts808Node, TS9_CONFIG (+5 more)

### Community 11 - "Custom Knob & Dial Dials"
Cohesion: 0.08
Nodes (24): react, BossDualConcentricKnob(), BossDualConcentricKnobProps, BossCe2Pedal(), BossCh1Pedal(), PedalProps, MxrAnalogChorusPedal(), PedalProps (+16 more)

### Community 12 - "Pedal DSP Audio Nodes (33 nodes)"
Cohesion: 0.11
Nodes (14): BossCs3Node, cs3Model(), autoMakeupDb(), CompressorCore, CompressorPedalFactory, CompressorPedalModel, CompressorPedalNode, CompressorSettings (+6 more)

### Community 13 - "Pedal DSP Audio Nodes (28 nodes)"
Cohesion: 0.15
Nodes (9): BossDs1Node, HARD_CLIPPER_PRESETS, HardClipperConfig, HardClipperDiodeType, HardClipperStage, MxrDistortionPlusNode, createOnePoleHighpass(), createOnePoleLowpass() (+1 more)

### Community 14 - "Pedal UI Components (25 nodes)"
Cohesion: 0.11
Nodes (16): TcSparkMiniPedal(), PedalProps, TcGaussTapeEchoPedal(), BossDs1Pedal(), PedalProps, BossHm2Pedal(), IbanezSm7Pedal(), PedalProps (+8 more)

### Community 15 - "AudioEngine Core & Conditioning"
Cohesion: 0.18
Nodes (18): StateChangeCallback, VuMeter(), VuMeterProps, PassthroughPanel(), PassthroughPanelProps, CHANNEL_OPTIONS, InputPreampPanel(), PICKUP_VOICING_OPTIONS (+10 more)

### Community 16 - "Pedal DSP Audio Nodes (24 nodes)"
Cohesion: 0.15
Nodes (5): EhxSmallStoneNode, MxrPhase90Node, FallbackState, PhaserEngine, PhaserEngineConfig

### Community 17 - "Pedal DSP Audio Nodes (23 nodes)"
Cohesion: 0.13
Nodes (5): BbdAnalogWarmthStage, BbdWarmthConfig, BossCe2Node, EhxSmallCloneNode, MxrAnalogChorusNode

### Community 18 - "Pedal DSP Audio Nodes (22 nodes)"
Cohesion: 0.18
Nodes (3): BossOc5Node, EhxPitchForkNode, PitchEngine

### Community 20 - "tsconfig.app.json / compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 21 - "Rig & Artist Presets"
Cohesion: 0.16
Nodes (13): defaultMeter, defaultMetrics, PEDAL_DEFINITIONS, DesktopOnlyBlocker(), ManualModal(), ManualModalProps, ManualTab, FACTORY_PRESETS (+5 more)

### Community 23 - "tsconfig.node.json / compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 24 - "Rig & Artist Presets"
Cohesion: 0.20
Nodes (11): InputImpedanceConfig, PickupPresetSpec, PickupVoicingType, PRESETS, AudioHeaderProps, CHANNEL_OPTIONS, PICKUP_VOICING_OPTIONS, PresetBarProps (+3 more)

### Community 26 - "MidiManager.ts / MidiActivityCallback"
Cohesion: 0.15
Nodes (5): MidiActivityCallback, MidiDevice, MidiDevicesCallback, midiManager, MidiMessageEventLike

### Community 29 - "Pedalboard Canvas & Routing"
Cohesion: 0.35
Nodes (11): PatchConnection, Pedalboard(), PedalboardProps, Position, calculateNextPedalPosition(), doBoxesOverlap(), findNearestFreePosition(), getPedalDimensions() (+3 more)

### Community 30 - "Pedal DSP Audio Nodes (12 nodes)"
Cohesion: 0.18
Nodes (3): BossCh1Node, BossDm2Node, createPedalAudioNode()

### Community 33 - "Cabinet IR Simulation"
Cohesion: 0.29
Nodes (7): Cabinet Configuration Set (1x8 to 4x12, open/closed back), Cabinet IR Simulation, Cabinet Panel UI Sketch, Mic Models and Position Control, Amp and Cabinet Modeling, Amp Simulator (preamp/tone stack/power amp), Cabinet Simulator via IR

### Community 37 - "Pedal DSP Audio Nodes (8 nodes)"
Cohesion: 0.25
Nodes (3): BossGe7Node, GE7_BANDS, Ge7BandConfig

### Community 42 - "Pedal UI Components (8 nodes)"
Cohesion: 0.25
Nodes (6): BossGe7Pedal(), Ge7Slider(), PedalProps, SliderProps, EhxElectricMistressPedal(), PedalProps

### Community 58 - "Guitar Tuner & Pitch DSP"
Cohesion: 0.38
Nodes (4): ChromaticTunerProps, detectPitch(), NOTE_NAMES, TunerResult

### Community 62 - "Pedal DSP Audio Nodes (6 nodes)"
Cohesion: 0.33
Nodes (5): AW3_INPUTS, AW3_MODES, Aw3InputMode, Aw3Mode, HUMANIZER_VOWELS

### Community 63 - "Architecture Queries & Outcomes"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Why does createDcBlocker() connect all pedal DSP communities - intentional design or side effect of shared helper reuse?, Source Nodes

### Community 64 - "Pedal UI Components (4 nodes)"
Cohesion: 0.67
Nodes (3): EqdHoofPedal(), HoofLogoSvg(), PedalProps

### Community 65 - "Pedal UI Components (4 nodes)"
Cohesion: 0.67
Nodes (3): NobelsDialRing(), NobelsOdr1Pedal(), PedalProps

### Community 66 - "Pedal UI Components (4 nodes)"
Cohesion: 0.50
Nodes (3): BossRv6Pedal(), PedalProps, RV6_MODE_LABELS

## Knowledge Gaps
- **13 isolated node(s):** `GitHub Actions CI/CD Pipeline`, `Silent Chromatic Tuner`, `Chromatic Tuner with Pitch Detection`, `#root mount point and main.tsx entry`, `DesktopOnlyBlocker` (+8 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 242 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **42 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AudioPedalNode` connect `Pedal DSP Audio Nodes (57 nodes)` to `Architecture Queries & Outcomes`, `AudioEngine Core & Conditioning`, `Architecture Queries & Outcomes`, `Amp Head & Tone Voicing`, `Pedal DSP Audio Nodes (34 nodes)`, `Pedal DSP Audio Nodes (33 nodes)`, `Pedal DSP Audio Nodes (28 nodes)`, `Pedal DSP Audio Nodes (24 nodes)`, `Pedal DSP Audio Nodes (23 nodes)`, `Pedal DSP Audio Nodes (22 nodes)`, `Pedal DSP Audio Nodes (21 nodes)`, `Pedal DSP Audio Nodes (17 nodes)`, `Pedal DSP Audio Nodes (15 nodes)`, `Pedal DSP Audio Nodes (14 nodes)`, `Pedal DSP Audio Nodes (12 nodes)`, `Pedal DSP Audio Nodes (11 nodes)`, `Pedal DSP Audio Nodes (11 nodes)`, `Pedal DSP Audio Nodes (10 nodes)`, `Pedal DSP Audio Nodes (10 nodes)`, `Pedal DSP Audio Nodes (9 nodes)`, `Pedal DSP Audio Nodes (8 nodes)`, `Pedal DSP Audio Nodes (8 nodes)`, `Pedal DSP Audio Nodes (8 nodes)`, `Pedal DSP Audio Nodes (8 nodes)`, `Pedal DSP Audio Nodes (8 nodes)`, `Pedal DSP Audio Nodes (7 nodes)`, `Pedal DSP Audio Nodes (7 nodes)`, `Pedal DSP Audio Nodes (7 nodes)`, `Pedal DSP Audio Nodes (7 nodes)`, `Pedal DSP Audio Nodes (7 nodes)`, `Pedal DSP Audio Nodes (7 nodes)`, `Pedal DSP Audio Nodes (7 nodes)`, `Pedal DSP Audio Nodes (7 nodes)`, `Pedal DSP Audio Nodes (7 nodes)`, `Pedal DSP Audio Nodes (7 nodes)`, `Pedal DSP Audio Nodes (7 nodes)`, `Pedal DSP Audio Nodes (7 nodes)`, `Pedal DSP Audio Nodes (7 nodes)`, `Pedal DSP Audio Nodes (7 nodes)`, `Pedal DSP Audio Nodes (7 nodes)`, `Pedal DSP Audio Nodes (6 nodes)`, `Pedal DSP Audio Nodes (6 nodes)`, `Pedal DSP Audio Nodes (6 nodes)`, `Pedal DSP Audio Nodes (6 nodes)`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **What connects `GitHub Actions CI/CD Pipeline`, `Silent Chromatic Tuner`, `Chromatic Tuner with Pitch Detection` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Architecture Queries & Outcomes` be split into smaller, more focused modules?**
  _Cohesion score 0.07456140350877193 - nodes in this community are weakly interconnected._
- **Why does `PedalMetadata` connect `Amp Head & Tone Voicing` to `Architecture Queries & Outcomes`, `Pedal DSP Audio Nodes (57 nodes)`, `Pedal UI Components (4 nodes)`, `Custom Knob & Dial Dials`, `Pedal UI Components (4 nodes)`, `Pedal UI Components (4 nodes)`, `Pedal UI Components (3 nodes)`, `Project Config & Dependencies`, `Pedal UI Components (3 nodes)`, `Amp Head & Tone Voicing`, `Pedal UI Components (8 nodes)`, `Custom Knob & Dial Dials`, `Pedal UI Components (3 nodes)`, `Pedal UI Components (25 nodes)`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Should `Amp Head & Tone Voicing` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Custom Knob & Dial Dials` to `Architecture Queries & Outcomes`, `Amp Head & Tone Voicing`, `Custom Knob & Dial Dials`, `Project Config & Dependencies`, `Project Config & Dependencies`, `Amp Head & Tone Voicing`, `Pedal UI Components (25 nodes)`, `AudioEngine Core & Conditioning`, `Rig & Artist Presets`, `Rig & Artist Presets`, `Pedalboard Canvas & Routing`, `Pedal UI Components (8 nodes)`, `Guitar Tuner & Pitch DSP`, `Pedal UI Components (4 nodes)`, `Pedal UI Components (4 nodes)`, `Pedal UI Components (4 nodes)`, `GibsonLesPaulIcon.tsx / GibsonLesPaulIcon()`, `Pedal UI Components (3 nodes)`, `Pedal UI Components (3 nodes)`, `Pedal UI Components (3 nodes)`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `Custom Knob & Dial Dials` be split into smaller, more focused modules?**
  _Cohesion score 0.07568027210884354 - nodes in this community are weakly interconnected._