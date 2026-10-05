# 🎸 Web Guitar FX
## Free, Browser-Based Real-Time Guitar Effects Processor

> Project codename: **Web Guitar FX**  
> Goal: membangun aplikasi efek gitar digital berbasis web yang dapat digunakan secara real-time, gratis, dan sebisa mungkin berjalan tanpa backend.

---

# 1. Gambaran Proyek

**Web Guitar FX** adalah aplikasi web untuk memproses sinyal gitar secara real-time menggunakan teknologi browser.

Aplikasi dirancang sebagai alternatif gratis untuk software guitar effects berbayar, dengan konsep **virtual pedalboard**.

Pengguna dapat:

- memilih audio input dari audio interface/microphone,
- menyusun pedal efek,
- mengubah parameter efek,
- mengaktifkan/nonaktifkan pedal,
- mendengarkan hasil secara real-time,
- menyimpan preset,
- membuat chain efek sendiri,
- menggunakan tuner,
- menggunakan looper pada tahap pengembangan lanjutan.

Prinsip utama:

> **Audio diproses sedekat mungkin dengan perangkat pengguna dan tidak dikirim ke server.**

---

# 2. Tujuan

## Tujuan utama

Membangun guitar effects processor yang:

1. Gratis digunakan.
2. Berjalan langsung di browser.
3. Memproses audio secara real-time.
4. Memiliki latency serendah mungkin.
5. Memiliki sistem pedalboard modular.
6. Bisa menyimpan preset secara lokal.
7. Dapat dikembangkan menjadi project portfolio serius.
8. Tidak bergantung pada layanan audio cloud berbayar.

## Tujuan portfolio

Project ini diharapkan menunjukkan kemampuan:

- Frontend engineering
- TypeScript
- React
- Web Audio API
- AudioWorklet
- Digital Signal Processing (DSP)
- WebAssembly (opsional)
- State management
- UI/UX
- Performance optimization
- Testing
- CI/CD
- Deployment
- DevOps

---

# 3. Konsep Arsitektur

```text
                 ┌──────────────────────┐
                 │      GITAR           │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │   AUDIO INTERFACE    │
                 └──────────┬───────────┘
                            │ USB
                            ▼
                 ┌──────────────────────┐
                 │      BROWSER        │
                 │                      │
                 │  Web Audio API      │
                 │       ↓              │
                 │  AudioWorklet       │
                 │       ↓              │
                 │    DSP ENGINE       │
                 └──────────┬───────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   EFFECTS     │
                    │               │
                    │ Gate           │
                    │ Compressor    │
                    │ OD / Dist     │
                    │ EQ             │
                    │ Modulation    │
                    │ Delay          │
                    │ Reverb         │
                    │ Amp            │
                    │ Cabinet        │
                    └───────┬───────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │      OUTPUT          │
                 │ Headphone / Speaker  │
                 └──────────────────────┘
```

---

# 4. Prinsip Arsitektur

Aplikasi dibagi menjadi beberapa lapisan:

```text
┌────────────────────────────────────┐
│              UI Layer              │
│ React + Tailwind + Components      │
├────────────────────────────────────┤
│           Application Layer        │
│ Preset / Pedalboard / State        │
├────────────────────────────────────┤
│            Audio Layer             │
│ Web Audio API / AudioWorklet       │
├────────────────────────────────────┤
│             DSP Layer              │
│ Filters / Waveshaping / Delay etc. │
└────────────────────────────────────┘
```

UI tidak boleh melakukan DSP berat secara langsung pada main thread.

Pemrosesan real-time diprioritaskan pada:

- `AudioWorklet`
- native Web Audio nodes
- WebAssembly jika dibutuhkan

---

# 5. Tech Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui (opsional)

## Audio

- Web Audio API
- AudioContext
- AudioNode
- AudioWorklet
- AnalyserNode
- BiquadFilterNode
- DelayNode
- ConvolverNode
- GainNode
- DynamicsCompressorNode

## DSP

Tahap awal:

- JavaScript/TypeScript
- AudioWorklet

Tahap lanjutan:

- WebAssembly
- C/C++ atau Rust untuk DSP tertentu

## Storage

Tidak membutuhkan database untuk MVP.

Gunakan:

- LocalStorage untuk konfigurasi sederhana
- IndexedDB untuk preset/asset yang lebih besar

## Deployment

Target:

- Cloudflare Pages
- Vercel
- GitHub Pages

Semua dapat digunakan dengan tier gratis.

---

# 6. Struktur Project

Rancangan awal:

```text
web-guitar-fx/
│
├── public/
│   ├── icons/
│   └── impulse-responses/
│
├── src/
│   │
│   ├── app/
│   │   ├── App.tsx
│   │   └── routes/
│   │
│   ├── components/
│   │   ├── pedalboard/
│   │   ├── pedals/
│   │   ├── tuner/
│   │   ├── meters/
│   │   ├── settings/
│   │   └── common/
│   │
│   ├── audio/
│   │   ├── AudioEngine.ts
│   │   ├── AudioInput.ts
│   │   ├── AudioOutput.ts
│   │   ├── SignalChain.ts
│   │   ├── AudioAnalyzer.ts
│   │   └── worklets/
│   │
│   ├── dsp/
│   │   ├── filters/
│   │   ├── distortion/
│   │   ├── dynamics/
│   │   ├── modulation/
│   │   ├── delay/
│   │   └── reverb/
│   │
│   ├── pedals/
│   │   ├── registry.ts
│   │   ├── types.ts
│   │   └── implementations/
│   │
│   ├── presets/
│   │   ├── presetStore.ts
│   │   ├── defaultPresets.ts
│   │   └── presetSchema.ts
│   │
│   ├── store/
│   │   ├── pedalboardStore.ts
│   │   └── settingsStore.ts
│   │
│   ├── types/
│   │
│   ├── utils/
│   │
│   └── main.tsx
│
├── tests/
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

# 7. Audio Engine

Audio engine merupakan inti aplikasi.

Konsep:

```text
AudioContext
    │
    ▼
Input
    │
    ▼
Input Gain
    │
    ▼
Pedal 1
    │
    ▼
Pedal 2
    │
    ▼
Pedal 3
    │
    ▼
...
    │
    ▼
Master Gain
    │
    ▼
Limiter / Safety
    │
    ▼
Output
```

## AudioEngine

Tanggung jawab:

- membuat `AudioContext`,
- mengatur input/output,
- menghubungkan signal chain,
- mengatur master volume,
- mengatur bypass,
- memantau latency,
- mengelola lifecycle audio.

Contoh interface konseptual:

```ts
interface AudioEngine {
  start(): Promise<void>;
  stop(): void;

  setInput(deviceId: string): Promise<void>;

  setMasterVolume(value: number): void;

  connectChain(chain: EffectNode[]): void;

  disconnectChain(): void;

  getLatency(): number;
}
```

---

# 8. Signal Chain

Pedalboard harus bersifat modular.

Contoh:

```text
Input
 ↓
Noise Gate
 ↓
Compressor
 ↓
Overdrive
 ↓
Amp
 ↓
Cabinet
 ↓
Chorus
 ↓
Delay
 ↓
Reverb
 ↓
Output
```

User dapat mengubah urutan.

Misalnya:

```text
Compressor → Overdrive → Amp
```

menjadi:

```text
Overdrive → Compressor → Amp
```

Perubahan chain harus langsung diterapkan ke audio engine.

---

# 9. Pedal System

Setiap pedal harus memiliki interface standar.

Konsep:

```ts
interface Pedal {
  id: string;
  type: string;
  name: string;

  enabled: boolean;

  parameters: Record<string, number>;

  createNode(
    context: AudioContext
  ): AudioNode;

  updateParameter(
    name: string,
    value: number
  ): void;

  dispose(): void;
}
```

Dengan sistem ini pedal baru dapat ditambahkan tanpa mengubah keseluruhan aplikasi.

---

# 10. Pedal Registry

Semua pedal didaftarkan melalui registry.

Contoh:

```ts
const pedalRegistry = {
  noiseGate: NoiseGatePedal,
  compressor: CompressorPedal,
  overdrive: OverdrivePedal,
  distortion: DistortionPedal,
  fuzz: FuzzPedal,
  eq: EqPedal,
  chorus: ChorusPedal,
  flanger: FlangerPedal,
  phaser: PhaserPedal,
  tremolo: TremoloPedal,
  delay: DelayPedal,
  reverb: ReverbPedal,
  amp: AmpPedal,
  cabinet: CabinetPedal,
};
```

---

# 11. Roadmap Effects

## Phase 1 — Basic Effects

Prioritas:

- [ ] Gain
- [ ] Volume
- [ ] EQ
- [ ] Noise Gate
- [ ] Compressor

## Phase 2 — Drive

- [ ] Overdrive
- [ ] Distortion
- [ ] Fuzz

## Phase 3 — Modulation

- [ ] Chorus
- [ ] Flanger
- [ ] Phaser
- [ ] Tremolo
- [ ] Vibrato

## Phase 4 — Time Effects

- [ ] Delay
- [ ] Ping-pong delay
- [ ] Reverb

## Phase 5 — Guitar Rig

- [ ] Amp simulator
- [ ] Cabinet simulator
- [ ] Impulse response loader

## Phase 6 — Advanced

- [ ] Looper
- [ ] Tuner
- [ ] Preset manager
- [ ] MIDI controller
- [ ] Automation
- [ ] WebAssembly DSP
- [ ] Advanced amp modeling

---

# 12. DSP — Distortion

Distortion tidak harus dimulai dengan model amplifier kompleks.

MVP dapat menggunakan waveshaping.

Konsep:

```text
Input
  ↓
Pre Gain
  ↓
Waveshaper
  ↓
Tone Filter
  ↓
Output Gain
```

Contoh fungsi waveshaping:

```text
y = tanh(x * drive)
```

Kemudian dikembangkan menjadi beberapa karakter:

- Soft clipping
- Hard clipping
- Tube-like saturation
- Asymmetric clipping
- Fuzz

Tujuan awal bukan meniru amplifier tertentu, tetapi membuat engine DSP yang benar dan playable.

---

# 13. EQ

Gunakan:

```text
BiquadFilterNode
```

Jenis:

- Low-pass
- High-pass
- Low shelf
- High shelf
- Peaking

MVP EQ:

```text
Bass
Middle
Treble
```

Advanced EQ:

```text
Parametric EQ
Multiple Bands
Frequency Analyzer
```

---

# 14. Compressor

Parameter:

```text
Threshold
Ratio
Attack
Release
Knee
Makeup Gain
```

UI:

```text
┌──────────────────────┐
│     COMPRESSOR       │
│                      │
│ Threshold   -18 dB   │
│ Ratio       4:1      │
│ Attack      10 ms    │
│ Release     100 ms   │
│ Makeup      +3 dB    │
│                      │
│ [ ON ]               │
└──────────────────────┘
```

---

# 15. Delay

Parameter:

```text
Time
Feedback
Mix
```

Advanced:

```text
Stereo
Ping-Pong
Tempo Sync
Filter
```

---

# 16. Reverb

MVP:

- algorithmic reverb

Advanced:

- Convolution reverb
- Impulse Response loading
- Room
- Hall
- Plate
- Spring

Catatan:

Impulse response pihak ketiga harus diperiksa lisensinya sebelum didistribusikan.

---

# 17. Amp Simulator

Amp simulator merupakan salah satu bagian tersulit.

Tahap awal:

```text
Input
 ↓
Preamp
 ↓
Tone Stack
 ↓
Power Amp Approximation
 ↓
Cabinet
```

Model sederhana dapat menggunakan:

- gain stages,
- waveshaping,
- EQ,
- filtering,
- saturation.

Tidak meniru brand/model komersial secara langsung pada tahap awal.

---

# 18. Cabinet Simulator

Cabinet dapat menggunakan:

```text
Convolution
```

Pipeline:

```text
Amp
 ↓
Cabinet IR
 ↓
Output
```

User nantinya dapat memilih IR:

```text
4x12
2x12
1x12
8x10
```

Namun file IR harus berasal dari sumber yang memiliki lisensi yang mengizinkan penggunaan tersebut.

---

# 19. Tuner

Tuner menggunakan analisis frekuensi untuk mencari fundamental frequency.

Contoh:

```text
E2 = 82.41 Hz
A2 = 110.00 Hz
D3 = 146.83 Hz
G3 = 196.00 Hz
B3 = 246.94 Hz
E4 = 329.63 Hz
```

UI:

```text
        E

   ←────●────→

       +3 cents

       82.55 Hz
```

Status:

```text
FLAT
IN TUNE
SHARP
```

---

# 20. Audio Input

Browser meminta permission:

```text
navigator.mediaDevices
    .getUserMedia()
```

Konfigurasi:

```text
echoCancellation: false
noiseSuppression: false
autoGainControl: false
```

Untuk guitar input, processing otomatis browser sebaiknya diminimalkan.

Device selector:

```text
Input Device
[ USB Audio Interface ▼ ]

Output Device
[ Headphones ▼ ]
```

Dukungan device output bergantung pada browser dan platform.

---

# 21. Latency

Latency adalah salah satu requirement paling penting.

Target awal:

```text
< 20 ms
```

Target ideal:

```text
< 10 ms
```

Optimasi:

- AudioWorklet
- buffer kecil
- sample rate sesuai device
- menghindari main-thread DSP
- menghindari garbage collection dalam audio callback
- tidak melakukan operasi berat pada audio thread
- menggunakan native Web Audio nodes jika memungkinkan
- WebAssembly untuk DSP berat jika diperlukan

Jangan mengorbankan stabilitas audio hanya untuk mengejar angka latency.

---

# 22. Sample Rate

Aplikasi harus mendeteksi sample rate dari AudioContext.

Contoh:

```text
44.1 kHz
48 kHz
96 kHz
```

Jangan mengasumsikan sample rate tertentu secara hard-code.

---

# 23. UI / UX

Konsep visual:

```text
┌────────────────────────────────────────────────────┐
│ WEB GUITAR FX                    🔊 -6 dB          │
├────────────────────────────────────────────────────┤
│ INPUT                                               │
│ [USB Audio Interface ▼]                            │
│                                                     │
│ ┌────────┐  ┌────────┐  ┌────────┐                 │
│ │ GATE   │→ │ COMP   │→ │  OD    │                 │
│ │   ON   │  │   ON   │  │   ON   │                 │
│ └────────┘  └────────┘  └────────┘                 │
│                            ↓                        │
│ ┌────────┐  ┌────────┐  ┌────────┐                 │
│ │  AMP   │→ │  CAB   │→ │ DELAY  │                 │
│ │   ON   │  │   ON   │  │  OFF   │                 │
│ └────────┘  └────────┘  └────────┘                 │
│                            ↓                        │
│                       ┌────────┐                    │
│                       │ REVERB │                    │
│                       │   ON   │                    │
│                       └────────┘                    │
├────────────────────────────────────────────────────┤
│ Preset: [ Clean Rock ▼ ]     [SAVE] [LOAD]         │
└────────────────────────────────────────────────────┘
```

---

# 24. Pedal Interaction

Setiap pedal:

- dapat diaktifkan/nonaktifkan,
- dapat dipindahkan,
- dapat dihapus,
- dapat diduplikasi,
- memiliki parameter,
- memiliki bypass,
- dapat di-reset.

Drag & drop:

```text
[Gate] → [Compressor] → [OD] → [Amp]
          ↑
       drag here
```

Urutan UI harus merepresentasikan urutan audio chain.

---

# 25. State Management

State utama:

```ts
interface PedalboardState {
  pedals: PedalInstance[];
  selectedPedalId: string | null;
  masterVolume: number;
  inputGain: number;
  outputGain: number;
}
```

Pedal:

```ts
interface PedalInstance {
  id: string;
  type: string;
  enabled: boolean;
  parameters: Record<string, number>;
}
```

UI state dan audio state harus dipisahkan dengan jelas.

---

# 26. Preset System

Preset disimpan sebagai JSON.

Contoh:

```json
{
  "version": 1,
  "name": "Clean Ambient",
  "pedals": [
    {
      "type": "compressor",
      "enabled": true,
      "parameters": {
        "threshold": -18,
        "ratio": 3
      }
    },
    {
      "type": "chorus",
      "enabled": true,
      "parameters": {
        "rate": 0.8,
        "depth": 0.4,
        "mix": 0.3
      }
    },
    {
      "type": "reverb",
      "enabled": true,
      "parameters": {
        "mix": 0.35
      }
    }
  ]
}
```

Preset dapat:

- save
- load
- rename
- duplicate
- delete
- export JSON
- import JSON

---

# 27. Preset Compatibility

Preset memiliki version:

```json
{
  "version": 1
}
```

Jika format berubah:

```text
v1 → v2 migration
```

Dengan demikian preset lama tidak langsung rusak ketika aplikasi berkembang.

---

# 28. Offline-First

Target aplikasi:

> Setelah aplikasi pertama kali dimuat, fungsi utama dapat digunakan tanpa koneksi internet.

Gunakan:

- PWA
- Service Worker
- local assets
- IndexedDB
- local presets

Namun initial deployment tetap membutuhkan internet untuk membuka aplikasi pertama kali.

---

# 29. Tidak Membutuhkan Backend untuk MVP

MVP:

```text
Browser
  │
  ├── Audio Processing
  ├── Pedalboard
  ├── Preset
  └── Settings
```

Tidak perlu:

```text
API Server
Database
Authentication
Cloud Audio Processing
```

Backend baru dipertimbangkan jika nanti membutuhkan:

- akun pengguna,
- cloud preset,
- preset sharing,
- community preset,
- marketplace,
- analytics.

---

# 30. Security & Privacy

Audio gitar harus diproses lokal.

Prinsip:

```text
🎸 Audio
  ↓
Browser
  ↓
Local Processing
  ↓
🔊 Output
```

Tidak ada upload audio ke server pada MVP.

Permission microphone hanya diminta ketika pengguna menekan tombol start.

---

# 31. Performance Requirements

Target:

- UI tetap responsive.
- Audio tidak crackling.
- Tidak terjadi drop-out.
- DSP tidak berjalan di main thread jika berat.
- Tidak ada memory leak.
- Pedal dapat ditambah/dihapus tanpa merusak AudioContext.
- Chain dapat diubah secara real-time dengan aman.

Monitoring:

```text
CPU usage
Audio latency
Buffer underrun
Input level
Output level
```

---

# 32. Audio Meter

Input meter:

```text
INPUT
██████████░░░░
       -6 dB
```

Output meter:

```text
OUTPUT
████████░░░░░░
       -8 dB
```

Tambahkan clipping indicator:

```text
CLIP
```

Jika output mendekati clipping, UI memberikan warning.

---

# 33. Safety Limiter

Output harus memiliki safety stage.

Contoh:

```text
Pedals
 ↓
Master Gain
 ↓
Limiter
 ↓
Output
```

Tujuannya mencegah output digital clipping yang dapat menghasilkan suara sangat keras.

---

# 34. Development Roadmap

## Milestone 0 — Project Setup

- [ ] Initialize Vite
- [ ] React
- [ ] TypeScript
- [ ] Tailwind
- [ ] Basic layout
- [ ] Git repository
- [ ] README

---

## Milestone 1 — Audio Passthrough

Target:

> Gitar masuk → browser → headphone.

Implementasi:

- [ ] AudioContext
- [ ] getUserMedia
- [ ] Input selector
- [ ] Output
- [ ] Start/Stop
- [ ] Input meter
- [ ] Output meter

Belum ada efek.

---

## Milestone 2 — First Effect

Buat:

- [ ] Gain
- [ ] EQ
- [ ] Bypass

Target:

```text
Gitar → Gain → EQ → Output
```

---

## Milestone 3 — Pedal Architecture

- [ ] Pedal interface
- [ ] Pedal registry
- [ ] Signal chain
- [ ] Add pedal
- [ ] Remove pedal
- [ ] Reorder pedal
- [ ] Enable/disable

---

## Milestone 4 — Drive

- [ ] Overdrive
- [ ] Distortion
- [ ] Fuzz

---

## Milestone 5 — Modulation

- [ ] Chorus
- [ ] Phaser
- [ ] Flanger
- [ ] Tremolo

---

## Milestone 6 — Time Effects

- [ ] Delay
- [ ] Reverb

---

## Milestone 7 — Guitar Rig

- [ ] Amp
- [ ] Cabinet
- [ ] IR loader

---

## Milestone 8 — Preset

- [ ] Save
- [ ] Load
- [ ] Delete
- [ ] Import
- [ ] Export
- [ ] Preset versioning

---

## Milestone 9 — Tuner

- [ ] Pitch detection
- [ ] Note detection
- [ ] Cents calculation
- [ ] Tuner UI

---

## Milestone 10 — Looper

- [ ] Record
- [ ] Play
- [ ] Overdub
- [ ] Stop
- [ ] Clear
- [ ] Loop length

---

## Milestone 11 — PWA

- [ ] Service worker
- [ ] Offline cache
- [ ] Installable app
- [ ] Local assets

---

## Milestone 12 — Advanced DSP

- [ ] AudioWorklet optimization
- [ ] WebAssembly
- [ ] Advanced distortion
- [ ] Amp modeling
- [ ] Cabinet IR
- [ ] Performance profiling

---

# 35. Testing Strategy

## Unit Test

Test:

- parameter conversion,
- preset serialization,
- preset migration,
- DSP utility,
- pedal configuration.

## Audio Test

Test:

- signal chain,
- bypass,
- gain,
- clipping,
- latency,
- channel configuration.

## Browser Test

Minimal target:

- Chrome/Chromium
- Edge
- Firefox

Safari compatibility dapat ditambahkan setelah MVP stabil.

---

# 36. Git Workflow

Branch:

```text
main
develop

feature/audio-engine
feature/overdrive
feature/pedalboard
feature/preset
feature/tuner
feature/amp
```

Commit:

```text
feat: add audio input engine
feat: add overdrive pedal
fix: prevent audio node leak
refactor: improve signal chain
perf: optimize distortion processor
```

---

# 37. CI/CD

GitHub Actions:

```text
Push
 ↓
Install
 ↓
Lint
 ↓
Type Check
 ↓
Unit Test
 ↓
Build
 ↓
Deploy
```

Contoh pipeline:

```text
GitHub
   ↓
GitHub Actions
   ├── npm ci
   ├── npm run lint
   ├── npm run typecheck
   ├── npm run test
   └── npm run build
            ↓
        Deployment
```

---

# 38. Deployment

Target utama:

```text
Cloudflare Pages
```

Alternatif:

```text
Vercel
GitHub Pages
```

Aplikasi harus berupa static frontend selama belum membutuhkan backend.

---

# 39. Cost Target

## Software

```text
React              Rp0
Vite               Rp0
TypeScript         Rp0
Web Audio API      Rp0
AudioWorklet       Rp0
GitHub             Rp0
Cloudflare Pages   Rp0
Vercel             Rp0
IndexedDB          Rp0
```

Target:

> **Software development cost = Rp0**

Hardware:

```text
Gitar              sudah ada / sesuai pengguna
Audio Interface    diperlukan untuk input gitar yang layak
Headphone/Speaker  sesuai kebutuhan
```

---

# 40. Lisensi

Code project dapat menggunakan:

```text
MIT License
```

Namun asset audio tidak otomatis mengikuti lisensi code.

Perhatikan lisensi:

- impulse response,
- sample,
- icon,
- font,
- preset,
- audio recording,
- third-party library.

Jangan memasukkan asset proprietary atau copyrighted tanpa izin.

---

# 41. MVP Definition

MVP dianggap berhasil apabila pengguna dapat:

```text
1. Membuka website
2. Memilih audio interface
3. Menekan START
4. Memainkan gitar
5. Mendengar gitar secara real-time
6. Mengaktifkan Gain
7. Mengaktifkan EQ
8. Mengaktifkan Overdrive
9. Mengubah parameter
10. Bypass efek
11. Mengubah urutan efek
12. Menyimpan preset
13. Memuat preset
```

Tanpa:

- akun,
- database,
- pembayaran,
- backend audio,
- subscription.

---

# 42. Versi Produk

## v0.1 — Audio Playground

```text
Input
 ↓
Gain
 ↓
EQ
 ↓
Output
```

## v0.2 — Virtual Pedalboard

```text
Input
 ↓
Gate
 ↓
Compressor
 ↓
Overdrive
 ↓
Output
```

## v0.3 — Effects Suite

```text
Gate
Compressor
OD
Distortion
Fuzz
EQ
Chorus
Flanger
Phaser
Tremolo
Delay
Reverb
```

## v0.4 — Guitar Rig

```text
Pedalboard
 ↓
Amp
 ↓
Cab
 ↓
Output
```

## v0.5 — Preset & Tuner

```text
Preset Manager
Tuner
Import/Export
```

## v0.6 — Looper

```text
Record
Overdub
Playback
```

## v1.0 — Full Web Guitar FX

```text
🎸
 ↓
Pedalboard
 ↓
Amp
 ↓
Cab / IR
 ↓
Modulation
 ↓
Delay
 ↓
Reverb
 ↓
Limiter
 ↓
🔊
```

---

# 43. Future Features

Setelah v1.0:

- MIDI controller support
- MIDI mapping
- Keyboard shortcuts
- Preset sharing
- Public preset library
- User accounts
- Cloud synchronization
- Community presets
- Recording
- Audio export
- Backing track player
- Metronome
- Drum machine
- Practice mode
- Scale/chord trainer
- Guitar chord recognition
- AI-assisted tone creation
- Mobile/tablet optimization

---

# 44. Non-Goals untuk MVP

Jangan langsung membuat:

- marketplace,
- login,
- subscription,
- social network,
- cloud processing,
- mobile native app,
- AI tone generator,
- kompleks amplifier modeling.

Fokus pertama:

> **Membuat gitar bisa masuk ke browser dan keluar lagi dengan efek secara real-time.**

---

# 45. Prinsip Pengembangan

## Rule 1

**Audio lebih penting daripada UI.**

UI cantik tetapi audio crackling = gagal.

## Rule 2

**Latency adalah fitur.**

Real-time guitar processor harus responsif.

## Rule 3

**Jangan over-engineering sejak awal.**

Mulai dari Web Audio API native.

## Rule 4

**Pisahkan UI dan audio engine.**

React tidak boleh menjadi audio processing engine.

## Rule 5

**Setiap pedal harus modular.**

Menambah pedal baru tidak boleh membutuhkan perubahan besar.

## Rule 6

**Offline-first.**

Tidak ada alasan mengirim audio gitar ke server untuk MVP.

## Rule 7

**Semua fitur harus dapat diuji.**

DSP dan signal chain harus memiliki test yang jelas.

---

# 46. Definition of Done

Sebuah fitur dianggap selesai apabila:

- [ ] Berfungsi secara audio
- [ ] Tidak menyebabkan audio drop-out
- [ ] Parameter dapat diubah
- [ ] Bypass bekerja
- [ ] State tersimpan dengan benar
- [ ] Tidak ada memory leak
- [ ] TypeScript tidak memiliki error
- [ ] Lint bersih
- [ ] Test tersedia jika relevan
- [ ] UI dapat digunakan
- [ ] Dokumentasi diperbarui

---

# 47. Target Akhir

Project ini bukan sekadar:

> "Website efek gitar."

Target akhirnya adalah:

> **A fully browser-based, low-latency, modular guitar effects platform capable of functioning as a free digital pedalboard and guitar rig.**

Arsitektur akhirnya:

```text
                         WEB GUITAR FX
                              │
          ┌───────────────────┴───────────────────┐
          │                                       │
       CONTROL                                  AUDIO
          │                                       │
      React UI                              AudioContext
          │                                       │
      State Store                            AudioWorklet
          │                                       │
      Preset System                           DSP Engine
          │                                       │
          └───────────────────┬───────────────────┘
                              │
                         SIGNAL CHAIN
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
       PEDALS                AMP                 CAB
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                           OUTPUT
                              │
                         🎧 / 🔊
```

---

# 48. Langkah Pertama

Jangan langsung membuat 15 pedal.

Urutan implementasi pertama:

```text
STEP 1
Create Vite + React + TypeScript

STEP 2
Create AudioContext

STEP 3
Request microphone/audio-interface permission

STEP 4
Create input → output passthrough

STEP 5
Add input/output meter

STEP 6
Add Gain node

STEP 7
Create first reusable Pedal interface

STEP 8
Create Overdrive

STEP 9
Create SignalChain

STEP 10
Create Pedalboard UI
```

Setelah **STEP 4 berhasil**, kita sudah punya fondasi paling penting:

```text
🎸 Guitar
   ↓
Audio Interface
   ↓
Browser
   ↓
Audio Engine
   ↓
🎧 Headphone
```

Baru setelah itu kita membangun efek satu per satu.

---

# 49. Status Project

```text
Project: Web Guitar FX
Version: Planning
Status: 🟡 Architecture Ready

Current Phase:
Planning → MVP Audio Engine

Next Implementation:
Audio Input / Output

Primary Goal:
Real-time guitar audio passthrough

Budget:
Rp0 software target

Architecture:
React + TypeScript + Web Audio API + AudioWorklet

Deployment:
Static Web App

Backend:
Not required for MVP
```

---

# 50. Catatan Penting

Web browser memiliki batasan dibanding aplikasi native/DAW.

Project ini harus realistis mengenai:

- latency,
- browser compatibility,
- audio device support,
- sample rate,
- CPU usage,
- AudioWorklet limitations,
- autoplay/audio permission,
- output device selection,
- mobile browser limitations.

Karena itu pengembangan harus dilakukan **incrementally**, dengan pengujian audio nyata pada perangkat pengguna.

---

## End of Specification

**Web Guitar FX — Build it. Play it. Own the signal. 🎸**
