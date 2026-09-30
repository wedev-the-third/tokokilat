# Catatan pengukuran P1

Protokol acuan (TUGAS.md bag. 7): Incognito, viewport 412x915, CPU 4x slowdown, `?ukur=1`,
Reset sebelum tiap skenario, 3 run, median.

## Hasil analisis berkas trace (diekstrak dari trace, bukan alat ukur)

Sumber: `trace-S1-TK1041-sebelum-1.json.gz`, `trace-S1-TK1041-sesudah-1.json.gz`,
`trace-S0-TK1081-sesudah-1.json.gz`. Kondisi perekaman sesudah: [KONFIRMASI 4x+412].
Angka per-run tunggal (bukan median 3) — ditandai demikian di LAPORAN.

| Metrik | Sebelum (kode asli) | Sesudah (main) |
|---|---|---|
| S1 interaksi terburuk (keydown) | **14.318 ms** | **4.755 ms** |
| S1 long task > 50 ms: jumlah / terlama | 34 / **14.810 ms** | 10 / **2.909 ms** |
| S1 permintaan `/img/p/` selama rekaman | **3.000 dilepas, 0 selesai** (antrean jenuh) | **206 diminta & selesai** |
| S0 permintaan `/img/p/` saat muat (412x915) | belum terukur (run gagal, lihat gambar) | **8** — sebanding kartu terlihat |
| S0 CLS | belum terukur | **0,4716** (alat ukur: 0,472 — cocok) |
| `/api/produk` di trace S0 | - | **1 permintaan** (bantahan Rudi #2) |

Pencocokan silang CLS trace vs alat ukur (0,4716 vs 0,472) memvalidasi cara hitung.

## Status

| Kode | Kondisi run | Run | Status |
|---|---|---|---|
| S1-sebelum | protokol (4x + 412) | 1/3 + trace | ada angka + trace; 2 run lagi opsional |
| S1-sesudah | [KONFIRMASI 4x+412] | 1/3 + trace | ada angka + trace; 2 run lagi opsional |
| S0-sesudah | protokol (4x + 412) | 1/3 + trace | ada angka + trace; 2 run lagi opsional |
| S0-sebelum | protokol (4x + 412) | 0/3 | **run gagal -> tab about:blank** (bukti: `../gambar/s0-sebelum-about-blank.png`); ulangi: Record -> F5 -> Stop +-15-20 dtk, atau minimal catat Network panel tanpa merekam |

## Inventaris berkas (folder ini dan ../gambar)

| Berkas | Isi |
|---|---|
| `trace-S1-TK1041-sebelum-1.json.gz` | S1 sebelum (kode asli) — 325 ribu event |
| `trace-S1-TK1041-sesudah-1.json.gz` | S1 sesudah (main) |
| `trace-S0-TK1081-sesudah-1.json.gz` | S0 sesudah (main) — load di 412x915 |
| `../gambar/s0-sebelum-about-blank.png` | tab mati saat merekam pemuatan pada 4x (bukti pendukung TK-1081) |
| `trace-S0-TK1081-sebelum-*.json.gz` | TODO (lihat Status) |

Pola `trace-*.json` dan `trace-*.json.gz` diabaikan git; pasangan resmi ditambah `git add -f`
atau tautan awan.

## Catatan penting

1. INP 1560 ms pada S0-sesudah (alat ukur) berasal dari klik tombol "Kecilkan" alat ukur
   (`#au-kecil`) — bukan skenario; abaikan.
2. CLS 0,472 sesudah = sisa CLS dominan dari banner promo (`/api/promo` ditunda 1800 ms,
   bagian P2 di promo.js) — konsisten prediksi P-02.
3. Angka Network S0-sebelum masih kosong; walau trace gagal, panel Network tetap bisa dicatat
   tanpa merekam: buka halaman, diam sampai spinner selesai, catat jumlah `/img/p/` + waktu
   gambar terakhir + total transfer + `/api/produk`.
4. Interaksi terburuk S1-sesudah (4.755 ms) kemungkinan mencakup fase render bertahap;
   lihat analisis jujur di PREDIKSI P-01 dan rekomendasi di LAPORAN bagian 6.

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
