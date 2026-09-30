# Catatan pengukuran P1

Protokol acuan (TUGAS.md bag. 7): Incognito, viewport 412x915, CPU 4x slowdown, `?ukur=1`,
Reset sebelum tiap skenario, 3 run, median.

## Status

| Kode | Kondisi run | Run sah | Angka kunci | Status utk tabel laporan |
|---|---|---|---|---|
| S1-sebelum (TK-1041) | native*, 1/3 | - | INP **7680 ms**; LT terlama 4305 ms; 54 long task; tunda input s.d. 6030 ms | pendukung — perlu ulang sesuai protokol (3 run, 4x, 412) |
| S1-sesudah (TK-1041) | native*, 1/3 | - | INP **584 ms**; LT terlama 256 ms | pendukung — perlu ulang sesuai protokol |
| S0-sesudah (TK-1078/1081) | **[KONFIRMASI: 4x+412 atau native?]**, 1/3 | - | CLS **0,472**; LT terlama 1187 ms; 20 frame > 50 ms | pendukung — perlu 2 run lagi + angka Network |
| S0-sebelum (TK-1078/1081) | belum direkam | - | - | TODO: 3 run + angka Network + tangkapan about:blank |

\* native = tanpa device toolbar 412x915 dan tanpa CPU 4x (dipakai karena alat ukur terasa
mati di 4x pada kode asli — itu sendiri gejala TK-1041). Angka native tetap dicatat sebagai
bukti arah, tetapi tabel utama LAPORAN.md hanya memakai angka protokol; jangan dicampur.

## Catatan penting dari data ini

1. INP 1560 ms pada S0-sesudah berasal dari klik tombol **"Kecilkan" milik alat ukur sendiri**
   (`#au-kecil`) — bukan interaksi skenario. Abaikan; jangan klik alat ukur selama jendela
   ukur (kecuali Reset sebelum mulai).
2. CLS 0,472 pada S0-sesudah konsisten dengan prediksi P-02: sisa CLS dominan = banner promo
   yang di-prepend setelah `/api/promo` (1800 ms) — bagian P2 di `promo.js`, placeholder belum
   ada. Atribusi per sumber (banner vs animasi kartu vs lainnya) dibaca dari track Layout
   Shifts pada run protokol.
3. Belum ada angka Network untuk S0: jumlah permintaan `/img/p/`, waktu gambar terakhir
   selesai, total transfer, serta durasi & ukuran `/api/produk` (bahan bantahan Rudi #2).
   **Wajib dicatat di setiap run S0 berikutnya** (panel Network, Preserve log aktif).
4. `laporan/gambar/s1-sebelum-tangkapan-1.png` — ganti nama sesuai isinya bila ini flame chart
   (mis. `s1-sebelum-flamechart-1.png`).

## Data mentah (tombol "Salin JSON" alat ukur)

### S1-sebelum — 2026-09-30 03:55:30 UTC — kode asli (113af2b)
```json
{
  "waktu": "2026-09-30T03:55:30.717Z",
  "jumlahLongTask": 54,
  "longTaskTerlama": 4305,
  "totalBlokir": 14792,
  "jumlahInteraksi": 8,
  "inp": 7680,
  "inpRinci": { "durasi": 7680, "jenis": "keydown", "target": "#kolom-cari", "tundaInput": 48, "proses": 0, "presentasi": 7632 },
  "cls": 0,
  "frameLambat": 523,
  "frameTerburuk": 7598
}
```

### S0-sesudah — 2026-09-30 04:08:05 UTC — kode perbaikan (main)
```json
{
  "waktu": "2026-09-30T04:08:05.797Z",
  "jumlahLongTask": 17,
  "longTaskTerlama": 1187,
  "totalBlokir": 12895,
  "jumlahInteraksi": 1,
  "inp": 1560,
  "inpRinci": { "durasi": 1560, "jenis": "click", "target": "#au-kecil", "tundaInput": 659, "proses": 9, "presentasi": 892 },
  "cls": 0.472,
  "frameLambat": 20,
  "frameTerburuk": 1916
}
```

### S1-sesudah — 2026-09-30 04:10:36 UTC — kode perbaikan (main)
```json
{
  "waktu": "2026-09-30T04:10:36.944Z",
  "jumlahLongTask": 47,
  "longTaskTerlama": 256,
  "totalBlokir": 5467,
  "jumlahInteraksi": 15,
  "inp": 584,
  "inpRinci": { "durasi": 584, "jenis": "keyup", "target": "#kolom-cari", "tundaInput": 188, "proses": 0, "presentasi": 396 },
  "cls": 0,
  "frameLambat": 40,
  "frameTerburuk": 416
}
```
