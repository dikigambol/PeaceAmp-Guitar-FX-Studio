---
type: "query"
date: "2026-10-26T04:15:22.337424+00:00"
question: "Why does createDcBlocker() connect all pedal DSP communities - intentional design or side effect of shared helper reuse?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["createDcBlocker()", "dspUtils.ts", "AudioEngine", "CompressorPedalNode", "Pedal DSP Node Classes"]
---

# Q: Why does createDcBlocker() connect all pedal DSP communities - intentional design or side effect of shared helper reuse?

## Answer

Query expanded to (from graph vocab, 11 tokens): create blocker audio dsp node pedal bypass crossfade engine filter connect.

Jawaban: pemakaian createDcBlocker() memang disengaja, tetapi statusnya sebagai "god node" yang menghubungkan 40 komunitas sebagian besar adalah artefak pengukuran graph.

1. Kenapa dipakai di mana-mana (intentional)
- Hampir semua model pedal memakai nonlinearitas asimetris (diode silicon/germanium, JFET/MOSFET, OTA, saturasi tape) yang menghasilkan DC offset.
- DC offset menyebabkan klik/pop saat crossfade bypass, kehilangan headroom, thump di loop delay/chorus/flanger, dan pumping pada limiter.
- createDcBlocker() di src/audio/pedals/dspUtils.ts:40 adalah highpass biquad Q=0.707, default 12 Hz; pedal memakai 15-16 Hz sehingga tidak terdengar.
- Penempatannya tepat setelah clipper / di akhir wet chain, mis. BossMt2Node.ts:184 setelah diodeClipper2 dan BigMuffNode.ts:178 setelah stage2 Miller filter.
- AudioEngine.ts:446 juga memasang blocker di ujung chain sebagai jaring pengaman (defense in depth).
- Bukti bahwa ini bukan copy-paste buta: dari 39 kelas AudioPedalNode, hanya CompressorPedalNode yang tidak memakainya, dan file itu tidak punya WaveShaper/saturasi sama sekali.

2. Kenapa graph tampak menghubungkan 40 komunitas (artefak)
- 81 edge = 40 calls + 40 imports + 1 contains, dengan 0 outgoing edge.
- Setiap pemakaian dihitung dua kali: edge imports_from untuk file dan edge calls untuk simbol.
- 35 dari 81 tetangga berada di komunitas "Pedal DSP Node Classes"; itu node file (MxrMicroAmpNode.ts, BigMuffNode.ts, dst), bukan kelas pedalnya, karena komunitas tersebut menampung file yang mengimpor dspUtils.
- Betweenness tinggi karena tiap pedal adalah komunitas terpisah dan satu-satunya jalur antar mereka adalah helper bersama. Itu shared code, bukan shared signal: tidak ada aliran audio antar pedal lewat createDcBlocker.

Kesimpulan: desainnya intentional (normalisasi DC), tetapi label "bridge" sebagian besar muncul dari dua edge per pemakaian ditambah segmentasi komunitas per-pedal. Metrik yang lebih jujur adalah menghitung hanya edge calls (40 pemakai) atau memfilter imports saat query.

## Outcome

- Signal: useful

## Source Nodes

- createDcBlocker()
- dspUtils.ts
- AudioEngine
- CompressorPedalNode
- Pedal DSP Node Classes