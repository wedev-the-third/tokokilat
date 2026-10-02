# Catatan pengukuran P3 — transaksi dan data

Catatan ini memuat baseline S2 (TK-1044) dan S3 (TK-1052) sebelum kode P3
diperbaiki. Baseline direkam dari commit awal `113af2b`; kode perbaikan belum
diterapkan. Angka utama diambil dari tiga rekaman panel Performance dan keluaran
alat ukur. Hasil akhir sesudah perbaikan akan ditambahkan setelah prediksi
di-commit dan implementasi selesai.

## Lingkungan dan metode

- Tanggal pengukuran: 2 Oktober 2026.
- Sistem operasi: Windows 64-bit (`10.0.26200.0`).
- Prosesor: 11th Gen Intel(R) Core(TM) i5-1135G7 @ 2.40 GHz.
- RAM: 12 GB.
- Browser: Chrome `150.0.7871.130`.
- Mode: Incognito, tanpa ekstensi dan tab lain ditutup.
- Device toolbar: `412 × 915`; trace merekam area konten `412 × 852` dengan
  device pixel ratio 2.
- CPU throttling: 4× slowdown; jaringan tanpa throttling.
- Aplikasi: `http://localhost:3000/?ukur=1`, 3.000 produk (`npm start`).
- Baseline kode: commit `113af2b`.
- Setiap skenario dijalankan tiga kali pada produk yang sama, yaitu **Mentari
  Granola Panggang Best Seller Edisi Terbatas**. ID produk tidak tersedia dalam
  metadata trace dan tidak diperlukan untuk membandingkan ketiga run.
- Tombol alat ukur (`#au-reset` dan `#au-salin`) bukan bagian dari skenario dan
  dikeluarkan dari angka interaksi produk.

## S2 — TK-1044: tombol "+ Keranjang" terlambat memberi umpan balik

### Langkah

Keranjang dikosongkan, alat ukur di-reset, lalu tombol `+ Keranjang` pada produk
**Mentari Granola Panggang Best Seller Edisi Terbatas** ditekan satu kali.
Rekaman dihentikan setelah lencana, teks tombol, dan toast selesai diperbarui.

### Hasil baseline

| Run | Durasi interaksi produk dari trace | Processing handler dari trace | Long task terlama dari alat ukur |
|---|---:|---:|---:|
| 1 | 112 ms | 38,5 ms | 122 ms |
| 2 | 151 ms | 63,6 ms | 121 ms |
| 3 | 133 ms | 64,2 ms | 126 ms |
| **Median** | **133 ms** | **63,6 ms** | **122 ms** |

Median durasi interaksi masih memenuhi target INP `<= 200 ms`, tetapi median
long task 122 ms belum memenuhi target tidak ada long task `> 100 ms`. Run ke-3
pada keluaran alat ukur menampilkan INP 160 ms, tetapi targetnya adalah
`#au-reset`; interaksi produk pada trace run tersebut adalah 133 ms (alat ukur:
pointerup 136 ms), sehingga 160 ms tidak dipakai sebagai hasil S2.

Nilai `frameTerburuk` 74.296 ms pada run pertama juga tidak dipakai: metrik
frame bukan metrik utama S2 dan jeda tersebut tidak berada pada interaksi produk.

### Diagnosis awal

Trace menunjukkan event klik menghabiskan sekitar 38–64 ms di handler sebelum
browser dapat menyelesaikan presentasi; pada run median, task yang menaungi
interaksi sekitar 115 ms dan diikuti Layout sekitar 33 ms. Pada kode asli,
`tambahKeKeranjang()` membaca serta mem-parsing keranjang dan riwayat, lalu
mengirim event `add_to_cart` berisi produk, seluruh keranjang, dan seluruh
riwayat melalui SDK analitik. Penyimpanan ke `localStorage`, perubahan lencana,
teks tombol, dan toast baru dilakukan setelah pemanggilan SDK itu selesai.

Karena pekerjaan tersebut berlangsung sinkron dalam task klik yang sama, event
loop belum memperoleh rendering opportunity untuk menggambar umpan balik.
Pengguna dapat menafsirkan jeda sebagai tombol yang tidak bekerja dan menekan
tombol lagi. Trace mengatribusikan wrapper handler ke listener di `katalog.js`;
kontribusi rinci SDK yang sudah diminifikasi akan diuji melalui perbandingan
sebelum/sesudah, bukan diasumsikan hanya dari nama fungsi.

### Dampak kualitas

- *Performance efficiency — time behaviour:* task klik dan presentasi menunda
  respons yang terlihat.
- *Interaction capability — operability:* tombol terasa tidak dapat diandalkan.
- *Interaction capability — user error protection:* ketiadaan umpan balik cepat
  mendorong klik berulang yang menambah kuantitas tanpa disengaja.

## S3 — TK-1052: tiga klik membuat tiga pesanan

### Langkah

Daftar pesanan server dikosongkan sebelum setiap run. Tombol `Beli sekarang`
pada produk **Mentari Granola Panggang Best Seller Edisi Terbatas** ditekan tiga
kali secepat mungkin, kemudian rekaman dilanjutkan sampai seluruh request dan
pembaruan lencana selesai.

### Hasil baseline

| Run | Interaksi klik terburuk dari trace | INP alat ukur | Long task terlama | POST `/api/pesanan` | Respons `201` | Pesanan tercipta |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 115 ms | 112 ms | 101 ms | 3 | 3 | 3 |
| 2 | 111 ms | 112 ms | 96 ms | 3 | 3 | 3 |
| 3 | 109 ms | 112 ms | 97 ms | 3 | 3 | 3 |
| **Median** | **111 ms** | **112 ms** | **97 ms** | **3** | **3** | **3** |

Ketiga trace masing-masing memperlihatkan tiga `POST /api/pesanan`; seluruhnya
mendapat status `201 application/json`. Setelah itu muncul tiga `GET
/api/pesanan`, konsisten dengan tiga invocation yang masing-masing menyegarkan
lencana ketika respons POST selesai. Target S3 adalah tepat satu pesanan dari
tiga klik cepat, sehingga baseline gagal secara deterministik: median dan setiap
run sama-sama menghasilkan tiga pesanan.

INP bukan akar utama TK-1052 karena median 112 ms sudah di bawah 200 ms. Masalah
utamanya adalah proteksi transaksi dan urutan perubahan state, bukan sekadar
kecepatan handler. Satu run memiliki long task 101 ms (sedikit melewati batas),
sedangkan median long task 97 ms.

### Diagnosis awal

`beliSekarang()` tidak memiliki penanda *in-flight*, tidak menonaktifkan tombol,
dan tidak menggunakan kunci idempotensi. Setiap klik segera memulai invocation
baru dan mengirim POST tersendiri. Teks tombol baru berubah menjadi `Dipesan`
setelah `await fetch(...)` selesai sekitar 350 ms kemudian; selama jendela itu
tombol tetap terlihat aktif dan dapat ditekan kembali. Akibatnya tiga invocation
berjalan bersamaan dan server, yang menerima tiga permintaan sah, membuat tiga
pesanan berbeda.

### Dampak kualitas

- *Interaction capability — user error protection:* tidak ada pencegahan klik
  ganda pada operasi yang berdampak finansial.
- *Interaction capability — self-descriptiveness dan operability:* antarmuka
  tidak memberi tahu bahwa pesanan sedang diproses.
- *Performance efficiency — resource utilization:* tiga POST dan tiga GET
  dilakukan untuk satu niat pembelian.

## Inventaris bukti mentah

### S2

- `laporan/S2 — TK-1044/Trace-20261002T085432.json.gz` — run 1.
- `laporan/S2 — TK-1044/Trace-20261002T101250.json.gz` — run 2.
- `laporan/S2 — TK-1044/Trace-20261002T102014.json.gz` — run 3.
- `laporan/S2 — TK-1044/note.txt` — keluaran alat ukur tiga run.

### S3

- `laporan/S3 — TK-1052/Trace-20261002T124326.json.gz` — run 1.
- `laporan/S3 — TK-1052/Trace-20261002T124810.json.gz` — run 2.
- `laporan/S3 — TK-1052/Trace-20261002T125643.json.gz` — run 3.
- `laporan/S3 — TK-1052/note.txt` — keluaran alat ukur tiga run.

Versi `.json` tanpa kompresi adalah salinan dari trace yang sama dan tidak perlu
dimasukkan ke Git bila versi `.json.gz` disimpan. Sebelum commit, berkas
terkompresi sebaiknya dipindahkan ke `laporan/trace/` dan diberi nama baku sesuai
protokol. Catatan ini belum berisi prediksi perbaikan; prediksi TK-1044 dan
TK-1052 harus ditulis serta di-commit terpisah sebelum `keranjang.js` diubah.
