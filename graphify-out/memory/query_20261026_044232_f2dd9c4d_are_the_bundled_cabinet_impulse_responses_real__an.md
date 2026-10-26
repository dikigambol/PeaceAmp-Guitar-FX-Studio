---
type: "query"
date: "2026-10-26T04:42:32.645160+00:00"
question: "Are the bundled cabinet impulse responses real, and did the graph expose dead code in the cabinet path?"
contributor: "graphify"
outcome: "corrected"
correction: "The three demo IRs were synthetic 50 ms thumps, not measured cabinet captures; the second generateCabinetImpulseResponse in src/dsp/amp/tubeCurves.ts was dead code."
source_nodes: ["CabinetNode", "generateCabinetImpulseResponse()", "Cabinet Simulator", "tubeCurves.ts"]
---

# Q: Are the bundled cabinet impulse responses real, and did the graph expose dead code in the cabinet path?

## Answer

# Apakah aset cabinet IR nyata, dan apakah graph menemukan dead code?

Tidak keduanya seperti yang diklaim sebelumnya. Graph menandai `generateCabinetImpulseResponse()` kedua di `src/dsp/amp/tubeCurves.ts` sebagai simpul dengan hanya edge `contains` (0 outgoing); verifikasi grep menunjukkan file itu tidak diimpor di mana pun (89 baris dead code, generator IR versi lama berbasis damped-sine). File dihapus.

Tiga "FREE DEMO IR SAMPLES" di `public/sample-irs/` juga bukan capture kabinet: 50 ms, 24-bit mono, hanya 11–14 zero-crossing, 99% energi habis dalam 2.7–6.6 ms. Bentuknya thump sintetis, bukan respons kabinet. Label UI menyiratkan IR terukur.

## Perbaikan yang diterapkan

1. `src/dsp/amp/cabinetIRGenerator.ts` — IR diperpanjang 60 ms → 180 ms; ditambah decay cone-mode + diffuse tail berbasis noise deterministik; normalisasi loudness agar setara IR 60 ms sebelumnya (white-noise convolution RMS ≈ 0.56) supaya preset tidak melonjak. Hasil: peak 0.25 (sebelum 0.24–0.28), 99% energi 34–37 ms (sebelum 6.5–11 ms), 824–1006 zero-crossing (sebelum 11–16). Dokblock diubah: prosedural/sintetis, bukan capture terukur.
2. `public/sample-irs/*.wav` — diregenerasi dari generator baru, 48 kHz/24-bit, 180 ms, untuk Mesa 4x12 V30 + SM57, Marshall 1960AX Greenback + MD421, Fender Twin 2x12 + Ribbon.
3. `src/audio/cabinet/CabinetNode.ts` — rebuild IR di-debounce 90 ms (slider position/distance sebelumnya memicu rebuild + ConvolverNode baru tiap step 0.02); swap memakai crossfade 20 ms dan node lama di-retire setelah 60 ms, bukan diputus seketika. Custom IR upload tetap langsung.
4. `src/components/sidebar/CabinetSimulatorPanel.tsx` — label menjadi "SYNTHETIC DEMO IR SAMPLES", tooltip menyebut sintetis.
5. `src/dsp/amp/tubeCurves.ts` — dihapus.

## Verifikasi

`tsc -b` 0 error, `eslint .` 0 error, `vite build` sukses. Generator deterministik (max diff 0 pada dua render identik) dan model berbeda menghasilkan IR berbeda (max diff 0.077). WAV diverifikasi ulang: 1ch/48kHz/24-bit/8640 frame/180 ms.

## Sisa gap

IR masih prosedural, bukan capture nyata; kurva preamp 18 amp masih dipetakan ke 4 kurva; clipper drive masih memoryless di luar feedback loop.

## Outcome

- Signal: corrected
- Correction: The three demo IRs were synthetic 50 ms thumps, not measured cabinet captures; the second generateCabinetImpulseResponse in src/dsp/amp/tubeCurves.ts was dead code.

## Source Nodes

- CabinetNode
- generateCabinetImpulseResponse()
- Cabinet Simulator
- tubeCurves.ts