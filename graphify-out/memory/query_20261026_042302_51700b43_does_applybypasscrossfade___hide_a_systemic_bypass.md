---
type: "query"
date: "2026-10-26T04:23:02.746144+00:00"
question: "Does applyBypassCrossfade() hide a systemic bypass routing bug across its 59 call sites?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["applyBypassCrossfade()", "SignalChain", "BossBf2Node", "EhxElectricMistressNode", "MxrFlangerNode", "EhxSmallStoneNode", "MxrPhase90Node"]
---

# Q: Does applyBypassCrossfade() hide a systemic bypass routing bug across its 59 call sites?

## Answer

# Apakah applyBypassCrossfade() menyembunyikan bug routing bypass sistemik?

Tidak. Audit 59 call site + routing graph menemukan **0 bug bypass nyata**.

## Yang diperiksa dan hasilnya

1. **Urutan argumen** — 59/59 memanggil `(wetGain, dryGain, enabled, ctx[, fade])` dengan benar. Tidak ada wet/dry yang tertukar.
2. **Path dry hilang** — tidak ada. Semua pedal bypass-style (`bypassWet`/`bypassDry`) dan semua pedal drive/fuzz/compressor (`wetGain`/`dryGain`) punya jalur `inputNode -> dry/clean -> outputNode` dan `... -> wet -> outputNode`.
3. **Loop / double-bypass** — tidak ada. `SignalChain.rebuild()` hanya mendelegasikan ke `node.setEnabled()`; ia tidak punya crossfade sendiri. Fast-path dan full-rebuild konsisten memanggil `setEnabled` sekali per instance.
4. **State awal** — setiap kelas sudah menyetel gain awal secara eksplisit (`setValueAtTime`) atau lewat `applyBypassCrossfade` di constructor, jadi tidak ada kondisi dry+wet aktif bersamaan secara permanen saat insert.
5. **Nama gain internal vs bypass** — flanger/phaser/chorus/delay memakai `dryGain`/`wetGain` untuk mix internal dan `bypassWet`/`bypassDry` untuk bypass; tidak tertukar.

## Satu-satunya inkonsistensi nyata (sudah diperbaiki)

Flanger (`BossBf2Node`, `EhxElectricMistressNode`, `MxrFlangerNode`) dan phaser (`EhxSmallStoneNode`, `MxrPhase90Node`) memanggil `applyBypassCrossfade` di constructor **tanpa fadeTime**, sehingga memakai default **12 ms**, sedangkan pedal bypass-style lain memakai **1 ms**. Akibatnya fade dry->0 saat insert berlangsung 12 ms dan melewati window mute `SignalChain` (3 ms mute, unmute selesai di 8 ms), menyisakan ~4 ms sinyal dry+wet berlebih saat pedal baru dimasukkan. Kini kelima file memakai `0.001` di constructor, konsisten dengan pedal lain. Fade saat toggle tetap 12 ms (default) / 15 ms untuk pedal bypass-style dan AmpHead — perbedaan 12 vs 15 ms tidak terdengar dan sengaja tidak diubah.

## Catatan

Hub 100-edge ini (59 `calls` + 40 `imports` + 1 `contains`, 0 outgoing) adalah artefak pola shared-utility, sama seperti `createDcBlocker()`. Tingginya jumlah edge mencerminkan banyaknya pedal, bukan bug tersembunyi. Verifikasi: `tsc -b` 0 error, `eslint .` 0 error, `vite build` sukses.

## Outcome

- Signal: useful

## Source Nodes

- applyBypassCrossfade()
- SignalChain
- BossBf2Node
- EhxElectricMistressNode
- MxrFlangerNode
- EhxSmallStoneNode
- MxrPhase90Node