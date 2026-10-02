# Catatan pengukuran P3 — transaksi dan data

Catatan ini memuat baseline S2 (TK-1044) dan S3 (TK-1052) sebelum kode P3
diperbaiki. Baseline direkam dari commit awal `113af2b`; kode perbaikan belum
diterapkan. Angka utama diambil dari tiga rekaman panel Performance dan keluaran
alat ukur. Pengukuran sesudah TK-1044 mengikuti tiga run, sedangkan pengukuran
sesudah TK-1052 dicatat sebagai uji pesanan berurutan karena penguji menunggu
tombol aktif kembali di antara pesanan; penyimpangan ini dijelaskan apa adanya.

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

## Hasil sesudah perbaikan

### S2 — TK-1044

Perbaikan: commit `817ab1d`. Riwayat 9.000+ entri dan analitik dipindahkan ke
task setelah kesempatan paint, sedangkan payload `add_to_cart` diringkas.

| Run | Durasi interaksi produk dari trace | Processing handler dari trace | Long task terlama dari alat ukur |
|---|---:|---:|---:|
| 1 | 283 ms | 1,9 ms | 516 ms |
| 2 | 173 ms | 2,1 ms | 116 ms |
| 3 | 199 ms | 2,3 ms | 145 ms |
| **Median** | **199 ms** | **2,1 ms** | **145 ms** |

Dibanding baseline, processing handler turun dari median 63,6 ms menjadi 2,1 ms.
Hal ini sesuai mekanisme perbaikan: parse/stringify riwayat dan SDK tidak lagi
berada di dalam jalur langsung handler. Namun durasi interaksi total berubah dari
133 ms menjadi 199 ms dan long task median berubah dari 122 ms menjadi 145 ms.
Target INP <= 200 ms tercapai tepat di batas, sedangkan target tidak ada long task
> 100 ms belum tercapai. Trace menunjukkan waktu presentasi masih dipengaruhi
kontensi main thread dari `promo.js`, pemeriksaan gulir, serta task riwayat/SDK
yang tetap berat setelah paint dijadwalkan. Prediksi < 100 ms dinyatakan meleset.

### S3 — TK-1052

Perbaikan: commit `2ebae43`. Tombol diberi guard per produk, langsung disabled
dan berstatus `Memproses…`, lalu dipulihkan setelah transaksi selesai.

Tiga rekaman sesudah bukan tiga run skenario baku "tiga klik secepat mungkin".
Penguji sengaja menunggu animasi selesai dan tombol aktif kembali sebelum membuat
pesanan selanjutnya. Oleh karena itu, setiap rekaman berisi tiga tindakan pembelian
berurutan yang sah:

| Run | POST `/api/pesanan` | Respons `201` | GET penyegaran | Pesanan |
|---|---:|---:|---:|---:|
| 1 | 3 | 3 | 3 | 3 |
| 2 | 3 | 3 | 3 | 3 |
| 3 | 3 | 3 | 3 | 3 |

Angka tersebut tidak menunjukkan regresi atau kegagalan guard. Pada run pertama,
trace memperlihatkan burst awal tiga upaya tap sekitar detik 18,3–19,0. Hanya tap
pertama menjadi `click` dan menghasilkan POST; dua tap ketika tombol disabled
tidak menghasilkan click/POST. Klik berikutnya baru terjadi sekitar detik 27,1
dan 29,8, setelah tombol dipulihkan, sehingga masing-masing memang boleh membuat
pesanan baru. Run kedua dan ketiga juga memiliki jarak sekitar 2,5–2,7 detik
antar-click.

Kesimpulan terbatas: guard terbukti bekerja selama transaksi aktif dan pembelian
berulang secara sengaja tetap berfungsi. Akan tetapi, karena tidak tersedia tiga
run skenario baku sesudah, median target "tiga klik cepat menghasilkan satu
pesanan" tidak diklaim tercapai berdasarkan trace ini. Uji otomatis terpisah
memastikan tiga invocation cepat pada fungsi hanya memulai satu POST, tetapi bukti
tersebut bukan pengganti trace Performance yang diwajibkan protokol.

## Inventaris bukti mentah

### S2

- `laporan/trace/p3/sebelum/trace-S2-TK1044-sebelum-1.json.gz` — baseline run 1.
- `laporan/trace/p3/sebelum/trace-S2-TK1044-sebelum-2.json.gz` — baseline run 2.
- `laporan/trace/p3/sebelum/trace-S2-TK1044-sebelum-3.json.gz` — baseline run 3.
- `laporan/trace/p3/sebelum/hasil-alat-S2-TK1044.txt` — keluaran alat ukur baseline.
- `laporan/trace/p3/sesudah/trace-S2-TK1044-sesudah-1.json.gz` — sesudah run 1.
- `laporan/trace/p3/sesudah/trace-S2-TK1044-sesudah-2.json.gz` — sesudah run 2.
- `laporan/trace/p3/sesudah/trace-S2-TK1044-sesudah-3.json.gz` — sesudah run 3.
- `laporan/trace/p3/sesudah/hasil-alat-S2-TK1044.txt` — keluaran alat ukur sesudah.

### S3

- `laporan/trace/p3/sebelum/trace-S3-TK1052-sebelum-1.json.gz` — baseline run 1.
- `laporan/trace/p3/sebelum/trace-S3-TK1052-sebelum-2.json.gz` — baseline run 2.
- `laporan/trace/p3/sebelum/trace-S3-TK1052-sebelum-3.json.gz` — baseline run 3.
- `laporan/trace/p3/sebelum/hasil-alat-S3-TK1052.txt` — keluaran alat ukur baseline.
- `laporan/trace/p3/sesudah/trace-S3-TK1052-sesudah-1.json.gz` — sesudah uji berurutan 1.
- `laporan/trace/p3/sesudah/trace-S3-TK1052-sesudah-2.json.gz` — sesudah uji berurutan 2.
- `laporan/trace/p3/sesudah/trace-S3-TK1052-sesudah-3.json.gz` — sesudah uji berurutan 3.
- `laporan/trace/p3/sesudah/hasil-alat-S3-TK1052.txt` — keluaran alat ukur sesudah.

Versi `.json` tanpa kompresi adalah salinan dari trace yang sama dan tidak perlu
dimasukkan ke Git bila versi `.json.gz` disimpan. Prediksi TK-1044 dan TK-1052
telah di-commit sebelum perbaikan pada `a488fdd`; hash perbaikannya masing-masing
`817ab1d` dan `2ebae43`.
