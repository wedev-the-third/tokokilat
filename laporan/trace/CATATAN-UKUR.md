# Catatan pengukuran P1

Protokol acuan (TUGAS.md bag. 7): Incognito, viewport 412x915, CPU 4x slowdown, `?ukur=1`,
Reset sebelum tiap skenario, 3 run, median.

## Status

| Kode | Kondisi run | Run | Angka kunci | Status utk tabel laporan |
|---|---|---|---|---|
| S0-sesudah (TK-1078/1081) | **protokol (4x + 412)** | **1/3** | CLS **0,472**; LT terlama 1187 ms; 20 frame > 50 ms | kondisi sah — perlu 2 run lagi + angka Network |
| S1-sesudah (TK-1041) | native*, 1/3 | - | INP **584 ms**; LT terlama 256 ms; 47 LT | pendukung — perlu ulang 3 run protokol |
| S1-sebelum (TK-1041) | native*, 1/3 | - | INP **7680 ms**; LT terlama 4305 ms; 54 LT; tunda input s.d. 6030 ms | pendukung — perlu ulang 3 run protokol |
| S0-sebelum (TK-1078/1081) | protokol (4x + 412) | 0/3 | - | TODO: 3 run + angka Network + tangkapan about:blank bila terjadi |

\* native = tanpa device toolbar 412x915 dan tanpa CPU 4x. Angka native tetap dicatat sebagai
bukti arah, tetapi tabel utama LAPORAN.md hanya boleh memakai angka protokol; jangan dicampur
dengan angka 4x+412.

## Catatan penting dari data ini

1. INP 1560 ms pada S0-sesudah berasal dari klik tombol **"Kecilkan" milik alat ukur sendiri**
   (`#au-kecil`) — bukan interaksi skenario. Abaikan; jangan klik alat ukur selama jendela
   ukur (kecuali Reset sebelum mulai).
2. CLS 0,472 pada S0-sesudah **dikonfirmasi direkam pada kondisi protokol (CPU 4x, 412x915)**
   dan konsisten dengan prediksi P-02: sisa CLS dominan = banner promo yang di-prepend setelah
   `/api/promo` selesai (delay server 1800 ms) — bagian P2 di `promo.js`, placeholder belum
   ada. Atribusi per sumber dibaca dari track Layout Shifts pada run berikutnya.
3. Angka Network untuk S0 belum ada: jumlah permintaan `/img/p/`, waktu gambar terakhir
   selesai, total transfer, serta durasi & ukuran `/api/produk` (bahan bantahan Rudi #2).
   **Wajib dicatat di setiap run S0 berikutnya** (panel Network, Preserve log aktif).
4. `laporan/gambar/s1-sebelum-tangkapan-1.png` — ganti nama sesuai isinya bila ini flame chart
   (mis. `s1-sebelum-flamechart-1.png`).

## Inventaris berkas trace (folder ini)

| Berkas | Isi | Kondisi perekaman |
|---|---|---|
| `trace-S0-TK1081-sesudah-1.json.gz` | S0, kode perbaikan (TK-1078 + TK-1081) | **[KONFIRMASI: 4x+412 atau native?]** |
| `trace-S1-TK1041-sesudah-1.json.gz` | S1, kode perbaikan (TK-1041) | **[KONFIRMASI: 4x+412 atau native?]** |
| `trace-S1-TK1041-sebelum-*.json.gz` | TODO | protokol (4x + 412) |
| `trace-S0-TK1081-sebelum-*.json.gz` | TODO | protokol (4x + 412) |

Pola `trace-*.json` dan `trace-*.json.gz` diabaikan git (berkas besar). Pasangan resmi untuk
laporan ditambahkan dengan `git add -f` atau ditaruh tautan awan.

## Data mentah (tombol "Salin JSON" alat ukur — lengkap, apa adanya)

### S0-sesudah — 2026-09-30 04:08:05 UTC — kode perbaikan (main) — kondisi protokol (4x, 412)
```json
{
  "waktu": "2026-09-30T04:08:05.797Z",
  "jumlahLongTask": 17,
  "longTaskTerlama": 1187,
  "totalBlokir": 12895,
  "jumlahInteraksi": 1,
  "inp": 1560,
  "inpRinci": {
    "durasi": 1560, "jenis": "click", "target": "#au-kecil",
    "tundaInput": 659, "proses": 9, "presentasi": 892
  },
  "limaInteraksiTerlambat": [
    { "durasi": 1560, "jenis": "click", "target": "#au-kecil", "tundaInput": 659, "proses": 9, "presentasi": 892 }
  ],
  "cls": 0.472,
  "frameLambat": 20,
  "frameTerburuk": 1916
}
```

### S1-sesudah — 2026-09-30 04:10:36 UTC — kode perbaikan (main) — kondisi native
```json
{
  "waktu": "2026-09-30T04:10:36.944Z",
  "jumlahLongTask": 47,
  "longTaskTerlama": 256,
  "totalBlokir": 5467,
  "jumlahInteraksi": 15,
  "inp": 584,
  "inpRinci": {
    "durasi": 584, "jenis": "keyup", "target": "#kolom-cari",
    "tundaInput": 188, "proses": 0, "presentasi": 396
  },
  "limaInteraksiTerlambat": [
    { "durasi": 584, "jenis": "keyup", "target": "#kolom-cari", "tundaInput": 188, "proses": 0, "presentasi": 396 },
    { "durasi": 560, "jenis": "keydown", "target": "#kolom-cari", "tundaInput": 135, "proses": 0, "presentasi": 425 },
    { "durasi": 560, "jenis": "keyup", "target": "#kolom-cari", "tundaInput": 178, "proses": 0, "presentasi": 382 },
    { "durasi": 536, "jenis": "keydown", "target": "#kolom-cari", "tundaInput": 108, "proses": 0, "presentasi": 428 },
    { "durasi": 536, "jenis": "keydown", "target": "#kolom-cari", "tundaInput": 143, "proses": 0, "presentasi": 393 }
  ],
  "cls": 0,
  "frameLambat": 40,
  "frameTerburuk": 416
}
```

### S1-sebelum — 2026-09-30 03:55:30 UTC — kode asli (113af2b) — kondisi native
```json
{
  "waktu": "2026-09-30T03:55:30.717Z",
  "jumlahLongTask": 54,
  "longTaskTerlama": 4305,
  "totalBlokir": 14792,
  "jumlahInteraksi": 8,
  "inp": 7680,
  "inpRinci": {
    "durasi": 7680, "jenis": "keydown", "target": "#kolom-cari",
    "tundaInput": 48, "proses": 0, "presentasi": 7632
  },
  "limaInteraksiTerlambat": [
    { "durasi": 7680, "jenis": "keydown", "target": "#kolom-cari", "tundaInput": 48, "proses": 0, "presentasi": 7632 },
    { "durasi": 7456, "jenis": "keydown", "target": "#kolom-cari", "tundaInput": 4193, "proses": 0, "presentasi": 3263 },
    { "durasi": 7096, "jenis": "keydown", "target": "#kolom-cari", "tundaInput": 5765, "proses": 0, "presentasi": 1331 },
    { "durasi": 6872, "jenis": "keydown", "target": "#kolom-cari", "tundaInput": 5918, "proses": 0, "presentasi": 954 },
    { "durasi": 6696, "jenis": "keydown", "target": "#kolom-cari", "tundaInput": 6030, "proses": 0, "presentasi": 666 }
  ],
  "cls": 0,
  "frameLambat": 523,
  "frameTerburuk": 7598
}
```
