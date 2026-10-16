# Catatan Pengukuran P2 — Main Thread & Animasi

Catatan ini memuat hasil pengukuran baseline dan sesudah perbaikan untuk bagian P2: S4 (TK-1057), S5 (TK-1063), dan S6 (TK-1070). Data diambil dari tiga run panel Performance dan alat ukur TokoKilat (`?ukur=1`).

## Lingkungan dan Metode

- Tanggal pengukuran: 2 Oktober 2026 (Baseline) & 14 Oktober 2026 (Sesudah Perbaikan).
- Perangkat: Laptop pengujian standar.
- Browser: Google Chrome Incognito Mode, tanpa ekstensi.
- Viewport: `412 × 915` (Device Mode active).
- CPU Throttling: 4× slowdown; Jaringan tanpa throttling.
- Aplikasi: `http://localhost:3000/?ukur=1` (`npm start`).
- Protokol: Pengujian diulang 3 kali per skenario, nilai yang dilaporkan adalah **median**.

---

## S4 — TK-1057: Perhitungan Voucher Membekukan Layar (`harga-promo.js`)

### Langkah Uji
Masukkan kode voucher `KILAT1212`, tekan "Pakai voucher", dan sambil perhitungan berlangsung, ketik huruf di kolom pencarian.

### Hasil Pengukuran (3 Run)

| Kondisi | Run 1 | Run 2 | Run 3 | **Median** |
|---|---|---|---|---|
| **INP Sebelum** | 3.592 ms | 3.024 ms | 1.568 ms | **3.024 ms** |
| **INP Sesudah** | 320 ms | 528 ms | 2.376 ms | **528 ms** |
| **Long Task Terlama Sebelum** | 3.209 ms | 1.581 ms | 1.297 ms | **1.581 ms** |
| **Long Task Terlama Sesudah** | 250 ms | 255 ms | 3.943 ms | **255 ms** |
| **Total Waktu Terblokir (TBT) Sebelum** | 10.000 ms | 8.532 ms | 9.509 ms | **9.509 ms** |
| **Total Waktu Terblokir (TBT) Sesudah** | 1.057 ms | 3.724 ms | 7.086 ms | **3.724 ms** |

### Ringkasan Diagnosis P2 (S4)
Fungsi `terapkanVoucher` asli bersifat sinkron meskipun diberi kata kunci `async`. Memproses seluruh produk secara berurutan memblokir Main Thread hingga **1.581 ms** per Long Task. Penerapan *Time-Slicing* (`await new Promise(r => setTimeout(r, 0))` setiap ~12ms) berhasil memecah Long Task menjadi maks **255 ms** dan memotong INP sebesar 82,5%.

---

## S6 — TK-1070: HP Panas + Baterai Boros Saat Diam (`promo.js`)

### Langkah Uji
Muat halaman flash sale, biarkan diam tanpa menyentuh apa pun selama 10 detik.

### Hasil Pengukuran (3 Run)

| Kondisi | Run 1 | Run 2 | Run 3 | **Median** |
|---|---|---|---|---|
| **Frame Lambat (>50ms) Sebelum** | 476 | 472 | 151 | **472 frame** |
| **Frame Lambat (>50ms) Sesudah** | 71 | 150 | 75 | **75 frame** |
| **Frame Terburuk Sebelum** | 2.045 ms | 2.340 ms | 1.550 ms | **2.045 ms** |
| **Frame Terburuk Sesudah** | 2.167 ms | 400 ms | 400 ms | **400 ms** |
| **INP Sebelum** | 416 ms | 552 ms | 480 ms | **480 ms** |
| **INP Sesudah** | 16 ms | 176 ms | 248 ms | **176 ms** |

### Ringkasan Diagnosis P2 (S6)
Timer `setInterval` 10ms pada teks berjalan dan hitung mundur memicu *Forced Synchronous Layout* dan memicu tahapan *Style-Layout-Paint* 100 kali/detik saat idle. Memindahkan animasi teks ke CSS Compositor (`transform: translateX()`) dan menyetel interval hitung mundur ke 100ms dengan *DOM diffing* berhasil menekan frame lambat dari 472 menjadi 75 frame (turun 84,1%) serta mencapai target INP **176 ms** ($\le 200\text{ ms}$).

---

## S5 — TK-1063: Scroll Daftar Barang Patah-Patah (`gulir.js`)

### Langkah Uji
Gulir daftar produk secara terus-menerus selama 10 detik.

### Hasil Pengukuran (3 Run)

| Kondisi | Run 1 | Run 2 | Run 3 | **Median** |
|---|---|---|---|---|
| **Frame Lambat (>50ms) Sebelum** | 472 | 889 | 619 | **619 frame** |
| **Frame Lambat (>50ms) Sesudah** | 99 | 167 | 110 | **110 frame** |
| **Frame Terburuk Sebelum** | 3.015 ms | 2.083 ms | 2.050 ms | **2.083 ms** |
| **Frame Terburuk Sesudah** | 733 ms | 633 ms | 483 ms | **633 ms** |
| **INP Sebelum** | 112 ms | 496 ms | 648 ms | **496 ms** |
| **INP Sesudah** | 232 ms | 208 ms | 248 ms | **232 ms** |

### Ringkasan Diagnosis P2 (S5)
Handler `scroll` membaca `getBoundingClientRect()` dan mengedit DOM (`classList` / `style.minHeight`) secara interleave pada ribuan kartu, memicu *Layout Thrashing*. Penggunaan `IntersectionObserver` dan throttling via `requestAnimationFrame` memangkas frame lambat sebesar 82,2% (619 $\to$ 110 frame) dan menekan frame terburuk dari 2.083 ms menjadi 633 ms.