# Laporan audit performa dan interaksi TokoKilat

Tim: ....  Anggota: ....  Tanggal: ....
Panjang maksimal setara 6 halaman (tidak termasuk lampiran gambar).

## 1. Ringkasan eksekutif (maks. 150 kata)
Apa masalah terbesar, apa yang dilakukan, berapa hasilnya. Tulis untuk manajer produk, bukan untuk engineer.

## 2. Lingkungan pengukuran
Spesifikasi laptop, versi Chrome, jumlah produk (`npm start` atau varian lain), tingkat throttling,
dan penyimpangan apa pun dari protokol di TUGAS.md bagian 7.

## 3. Hasil sebelum dan sesudah

| Skenario | Metrik | Sebelum (median) | Sesudah (median) | Target | Tercapai? |
|---|---|---|---|---|---|
| S0 | CLS | | | <= 0,1 | |
| S0 | Jumlah permintaan gambar dalam 10 dtk pertama | | | sebanding dengan yang terlihat | |
| S1 | INP | | | <= 200 ms | |
| S1 | Long task terlama | | | <= 100 ms | |
| S2 | INP | | | <= 200 ms | |
| S3 | Jumlah pesanan dari 3 klik | | | 1 | |
| S4 | INP / progres tergambar bertahap? | | | | |
| S5 | Frame > 50 ms per 10 dtk | | | <= 2 | |
| S6 | Frame > 50 ms per 10 dtk | | | <= 2 | |

## 4. Temuan

Urutkan berdasarkan dampak, bukan urutan tiket. Blok T-01 s.d. T-03 di bawah adalah kontribusi
draf P1 (angka `[DIISI]` menunggu pengukuran; integrasi akhir oleh P3; blok P2 dan P3 menyusul).

### T-01: Kolom pencarian membeku setiap ketikan
- **Tiket terkait:** TK-1041 (Bu Wulan: "hurufnya munculnya telat-telat, kadang HP seperti hang").
- **Gejala bagi pengguna:** teks yang diketik baru muncul lama; halaman terasa mati saat mencari;
  pembeli menyerah dan pindah toko.
- **Bukti:** [DIISI: trace S1 sebelum — track Interactions + flame chart. Tandai: (1) task panjang
  pada tiap event `input`, (2) blok besar `Lacak.kirim` dari lacak.min.js (fingerprint +-2 juta
  iterasi hash per panggilan), (3) `buatKartu`/`append` ribuan node, (4) `samakanTinggiJudul`
  dengan layout sinkron berulang]. Angka: INP sebelum [DIISI] ms.
- **Akar masalah dan mekanismenya:** handler `input` (`pencarian.js`) menjalankan semuanya sinkron
  dalam satu task: (1) `cocok()` menormalkan ulang 4 field x 3000 produk dengan NFD + 2 regex pada
  SETIAP ketikan; (2) `renderProduk` (`katalog.js`) mengosongkan lalu membangun ulang seluruh kisi
  DOM; (3) `samakanTinggiJudul` membaca `offsetHeight` bergantian dengan menulis `style.height` —
  tulisan mengotorkan layout sehingga tiap pembacaan memaksa layout sinkron; (4) `Lacak.kirim('search')`
  dipanggil per ketikan. Akibatnya event loop tidak mendapat rendering opportunity di antara
  ketikan: input berikutnya mengantri dan teks telat dicat.
- **Kualitas yang terdampak (ISO/IEC 25010):** *performance efficiency* — time behaviour (durasi
  respons pencarian melonjak). *Interaction capability* — operability (kolom cari tidak dapat
  diandalkan pada perangkat lambat), user engagement (kepercayaan hilang, pembeli pergi — persis
  keluhan tiket).
- **Perbaikan:** (a) cache teks ternormalkan per produk, dipanaskan sekali saat muat (`ae92f15`);
  (b) render progresif: potongan pertama 60 kartu sinkron, sisanya per bingkai via
  `requestAnimationFrame` dengan token pembatal, `DocumentFragment` per potongan (`05f0a57`);
  (c) penyamaan tinggi judul dua fase: baca semua dulu, tulis semua kemudian — satu layout per
  potongan, bukan per judul (`05f0a57`); (d) event `search` dikirim 500 ms setelah ketikan
  berhenti (`529287a`).
- **Trade-off:** seluruh kartu kini masuk DOM bertahap (+-1-2 dtk) — masih dijangkau dengan
  menggulir dan jumlah hasil tetap benar; debounce pada kolom cari ditolak karena memindah biaya
  ke pengguna (operability); virtualisasi penuh ditolak karena berisiko melanggar aturan jangkauan
  gulir.
- **Hasil:** INP S1 [DIISI] -> [DIISI] ms; long task saat mengetik [DIISI] -> [DIISI].

### T-02: Tiga ribu permintaan gambar untuk satu layar
- **Tiket terkait:** TK-1081 (Pak Hendra: "gambar lama sekali munculnya... kuota saya cepat habis").
- **Gejala bagi pengguna:** kotak abu-abu lama; gulir cepat memperburuk; kuota terkuras padahal
  hanya membuka satu halaman.
- **Bukti:** [DIISI: panel Network pada S0 sebelum — jumlah permintaan `/img/p/*.svg` = +-3000,
  gambar terakhir selesai pada detik ke-[DIISI], total [DIISI] MB; bandingkan `/api/produk`:
  1 permintaan, selesai +-180 ms, [DIISI] KB].
- **Akar masalah dan mekanismenya:** `buatKartu` (`katalog.js`) memasang `img.src` untuk semua
  produk secara eager begitu kisi dirender. Server menunda tiap gambar 60-300 ms (simulasi CDN)
  dan browser hanya membuka +-6 koneksi paralel per host: 3000 x +-180 ms / 6 = +-90 detik
  antrean unduhan. Keluhan "server lemot" keliru arah: kemacetan diciptakan halaman sendiri.
- **Kualitas yang terdampak (ISO/IEC 25010):** *performance efficiency* — resource utilization
  (bandwidth/kuota terbuang untuk konten yang tidak dilihat), time behaviour (gambar terakhir),
  capacity (halaman membanjiri server/CDN dengan ribuan permintaan simultan).
  *Interaction capability* — inclusivity (pengguna jaringan lambat/kuota kecil terdampak paling
  parah, padahal mayoritas pembeli HP kelas bawah).
- **Perbaikan:** `loading="lazy"` + `decoding="async"` pada `img` kartu (`3fd334d`) — browser
  hanya meminta gambar yang mendekati viewport; dekode tidak menyela input.
- **Trade-off:** gambar jauh di bawah baru termuat saat digulir mendekat (kotak abu-abu sesaat —
  diinginkan); simpan/cetak halaman tidak lagi memuat semua gambar. Alternatif ditolak:
  `content-visibility` (memangkas render, bukan permintaan), gambar versi kecil (server milik tim
  lain), `IntersectionObserver` manual (meniru mekanisme native).
- **Hasil:** permintaan gambar S0 [DIISI] -> [DIISI]; total byte [DIISI] -> [DIISI]; gambar
  terakhir [DIISI] dtk -> [DIISI] dtk.

### T-03: Halaman melompat sendiri sampai pengguna salah klik
- **Tiket terkait:** TK-1078 (Kak Rara: "kepencet malah iklan promo").
- **Gejala bagi pengguna:** mau menekan barang paling atas, halaman turun sendiri, jari mengenai
  banner promo.
- **Bukti:** [DIISI: track Layout Shifts pada S0 sebelum — rangkaian shift kecil saat gambar
  termuat + satu shift besar pada detik ke-+-1,8 saat banner di-prepend].
- **Akar masalah dan mekanismenya:** (1) `img` tanpa dimensi intrinsik + CSS `width:100%;
  height:auto` membuat tinggi kotak gambar 0 saat layout pertama — setiap gambar yang selesai
  dimuat menambah tinggi kartu dan menggeser semua konten di bawahnya; (2) banner promo di-
  `prepend` ke `#utama` setelah `fetch('/api/promo')` selesai (server menunda 1800 ms) — seluruh
  daftar turun sekitar satu tinggi banner (bagian milik P2, `promo.js`).
- **Kualitas yang terdampak (ISO/IEC 25010):** *interaction capability* — user error protection
  (pergeseran tepat saat jari menekan = klik yang tidak diinginkan, persis keluhan tiket),
  operability (posisi konten tidak stabil). *Performance efficiency* — time behaviour (layout
  berulang saat gambar termuat).
- **Perbaikan (bagian P1):** atribut `width="480" height="480"` pada `img` kartu (`d258eb4`) —
  rasio 1:1 diketahui sejak layout pertama sehingga kotak gambar sudah dipesan sebelum gambar
  termuat. Bagian banner: placeholder setinggi banner sebelum fetch selesai — koordinasi dengan
  P2 di `promo.js`.
- **Trade-off:** atribut dipilih dibanding `aspect-ratio` CSS (setara hasil, atribut juga menjadi
  sinyal rasio bagi pemuatan malas). CLS total baru dinilai setelah bagian P2 menyatu.
- **Hasil:** CLS S0 [DIISI] -> [DIISI] (catat juga berapa kontribusi masing-masing: gambar vs banner).

## 5. Dugaan yang ternyata keliru
Dugaan dari catatan serah terima, tiket, atau tim sendiri yang terbantah pengukuran. Sertakan angkanya.

- **Rudi #2 — "API produk lambat, minta backend tambah server"** (kontribusi P1): terbantah.
  `/api/produk` adalah satu permintaan yang selesai +-180 ms (delay simulasi server) dengan ukuran
  [DIISI], sementara waktu tunggu yang dirasakan pengguna berasal dari +-3000 permintaan gambar
  yang dilepas halaman sendiri (lihat T-02). Menambah server backend tidak akan mengubah apa pun.

## 6. Yang belum beres dan rekomendasi
Masalah yang tersisa, risiko, dan usulan untuk tim lain (backend, vendor SDK, desain).

## 7. Pernyataan penggunaan AI dan pembagian kerja
Alat AI yang dipakai dan untuk apa. Kontribusi tiap anggota.
