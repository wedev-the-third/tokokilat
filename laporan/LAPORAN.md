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
| S2 | INP interaksi produk (median trace) | 133 ms | 199 ms | <= 200 ms | Ya, tepat di batas |
| S3 | Jumlah pesanan dari 3 klik cepat | 3 | tidak tersedia 3 run baku; uji berurutan = 3 tindakan/3 pesanan | 1 | Belum dapat dinilai penuh |
| S4 | INP / progres tergambar bertahap? | 3.024 ms | 528 ms | <= 200 | Membaik signifikan (82,5%) |
| S4 | Long task terlama | 1.581 ms | 255 ms | <= 100 | Membaik signifikan (83,8%) |
| S5 | Frame > 50 ms per 10 dtk | 619 frame | 110 frame | <= 2 | Membaik signifikan (82,2%) |
| S6 | Frame > 50 ms per 10 dtk | 472 frame | 75 frame | <= 2 | Membaik signifikan (84,1%) |
| S6 | INP idle | 480 ms| 176 ms | <= 200ms | Ya |


## 4. Temuan

Urutkan berdasarkan dampak, bukan urutan tiket. Blok T-01 s.d. T-03 adalah kontribusi P1
(integrasi akhir oleh P3; blok P2 dan P3 menyusul). Angka = 1 run per sisi, dianalisis dari
berkas trace `laporan/trace/` (median 3 run menyusul); rinci di `laporan/trace/CATATAN-UKUR.md`.

### T-01: Kolom pencarian membeku setiap ketikan
- **Tiket terkait:** TK-1041 (Bu Wulan: "hurufnya munculnya telat-telat, kadang HP seperti hang").
- **Gejala bagi pengguna:** teks yang diketik baru muncul lama; halaman terasa mati saat mencari;
  pembeli menyerah dan pindah toko.
- **Bukti:** `trace-S1-TK1041-sebelum-1.json.gz` (Interactions + flame chart): interaksi terburuk
  **14.318 ms** (keydown di `#kolom-cari`, komponen "presentasi" dominan), 34 long task, terlama
  **14.810 ms**; 3.000 permintaan `/img/p/` dilepas ulang saat render dan **0 selesai** selama
  rekaman. Angka native pendukung: INP 7.680 ms dengan `tundaInput` s.d. 6.030 ms (alat ukur).
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
- **Hasil:** interaksi terburuk S1 **14.318 -> 4.755 ms**; long task terlama **14.810 -> 2.909 ms**;
  jumlah long task 34 -> 10. Belum memenuhi target (<= 200 ms / <= 100 ms) — analisis dan
  rekomendasi lanjutan di bagian 6; prediksi vs kenyataan dibahas jujur di PREDIKSI P-01.

### T-02: Tiga ribu permintaan gambar untuk satu layar
- **Tiket terkait:** TK-1081 (Pak Hendra: "gambar lama sekali munculnya... kuota saya cepat habis").
- **Gejala bagi pengguna:** kotak abu-abu lama; gulir cepat memperburuk; kuota terkuras padahal
  hanya membuka satu halaman.
- **Bukti:** kode asli (trace S1-sebelum): **3.000 permintaan `/img/p/` dilepas** dan antrean
  begitu jenuh sehingga **0 selesai** selama rekaman; merekam pemuatan pada CPU 4x bahkan membuat
  tab jatuh ke about:blank (tangkapan: `gambar/s0-sebelum-about-blank.png`). Sesudah (trace S0,
  412x915): **8 permintaan** saat muat; `/api/produk` = **1 permintaan**. (Angka Network panel
  S0-sebelum menunggu run ulang.)
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
- **Hasil:** permintaan gambar saat muat **+-3.000 -> 8**; selama run S1 sesudah hanya **206**
  gambar diminta (bertambah saat menggulir, bukan sekaligus). Total byte & waktu gambar terakhir
  menyusul bersama run Network panel.

### T-03: Halaman melompat sendiri sampai pengguna salah klik
- **Tiket terkait:** TK-1078 (Kak Rara: "kepencet malah iklan promo").
- **Gejala bagi pengguna:** mau menekan barang paling atas, halaman turun sendiri, jari mengenai
  banner promo.
- **Bukti:** sesudah (trace S0-sesudah): CLS **0,4716** (alat ukur: 0,472 — cocok) dengan sisa
  shift dominan pada momen banner masuk; kontribusi gambar sudah hilang. Track Layout Shifts
  run SEBELUM menunggu pengukuran ulang (run pertama gagal: about:blank).
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
- **Hasil:** CLS S0 sesudah (bagian P1 masuk) = **0,472**, seluruh sisa shift dari banner —
  sesuai prediksi P-02 bahwa penilaian target 0,1 menunggu placeholder banner dari P2.

### T-04: Umpan balik tambah ke keranjang tertahan pekerjaan sekunder

- **Tiket terkait:** TK-1044.
- **Bukti:** baseline S2 tiga run menghasilkan median interaksi produk **133 ms**, processing
  handler **63,6 ms**, dan long task terlama **122 ms**. Sesudah commit `817ab1d`, processing
  handler turun menjadi **2,1 ms**, tetapi interaksi total menjadi **199 ms** dan long task
  terlama **145 ms**. Rincian ada di `laporan/trace/CATATAN-P3.md`.
- **Akar masalah dan mekanismenya:** handler asli membaca serta menulis riwayat 9.000+ entri
  dan memanggil SDK dengan seluruh produk, keranjang, dan riwayat sebelum mengubah lencana,
  tombol, serta toast. Semua berada dalam task klik yang sama sehingga browser belum dapat
  menggambar umpan balik. Perbaikan menyimpan keranjang dan mengubah UI lebih dahulu, lalu
  menjadwalkan riwayat serta event analitik ringkas setelah kesempatan paint.
- **Kualitas yang terdampak:** *performance efficiency — time behaviour* serta *interaction
  capability — operability* dan *user error protection*; tombol tanpa umpan balik mendorong
  klik berulang yang tidak disengaja.
- **Trade-off dan hasil:** jalur langsung handler membaik sekitar 30 kali dan INP memenuhi
  target tepat di batas, tetapi prediksi < 100 ms dan target long task tidak tercapai. Task
  SDK/riwayat tetap berat setelah paint dijadwalkan, dan `promo.js` serta pemeriksaan gulir
  masih berkontensi di main thread. Riwayat/analitik juga menjadi *eventually consistent*.

### T-05: Tidak ada guard pada transaksi "Beli sekarang"

- **Tiket terkait:** TK-1052.
- **Bukti baseline:** ketiga run S3 masing-masing menghasilkan **3 POST**, **3 respons 201**,
  dan **3 pesanan** dari tiga klik cepat. Median INP 112 ms menunjukkan masalah utamanya
  bukan kecepatan respons, melainkan aturan transaksi.
- **Akar masalah dan mekanismenya:** fungsi asli tidak memiliki state *in-flight* dan baru
  mengubah teks tombol setelah POST selesai sekitar 350 ms kemudian. Tiga invocation dapat
  berjalan bersamaan dan server menganggap semuanya permintaan sah.
- **Perbaikan:** commit `2ebae43` menambahkan guard per produk, `disabled`, `aria-busy`, dan
  status `Memproses…` sebelum operasi asynchronous. Error POST memulihkan tombol; kegagalan
  GET penyegaran lencana tidak lagi salah dilaporkan sebagai kegagalan membuat pesanan.
- **Hasil dan keterbatasan:** trace sesudah yang tersedia adalah uji tiga pembelian
  berurutan—penguji menunggu tombol aktif kembali—sehingga 3 POST/3 pesanan merupakan hasil
  benar, bukan duplikasi. Pada burst awal run pertama, dua tap selama tombol disabled tidak
  menghasilkan click/POST, sehingga mekanisme guard terbukti. Namun tiga run baku sesudah
  tidak tersedia; target "3 klik cepat -> 1 pesanan" tidak diklaim telah dibuktikan dengan
  median trace.
- **Kualitas yang terdampak:** *interaction capability — user error protection,
  self-descriptiveness,* dan *operability*, serta *performance efficiency — resource
  utilization*. Guard klien tidak menggantikan idempotency key server untuk retry lintas
  perangkat.

### T-06: Perhitungan Voucher Memblokir Main Thread dan Membekukan UI

* **Tiket terkait:** TK-1057 (Mas Dimas: "Masukin voucher KILAT1212, layarnya beku lama banget...").
* **Gejala bagi pengguna:** Layar tidak dapat di-scroll, kolom pencarian membeku, dan progres perhitungan tidak berjalan bertahap (langsung dari `0%` ke `100%`).
* **Bukti:** Baseline S4 merekam median Long Task terlama sebesar **1.581 ms**, TBT **9.509 ms**, dan INP **3.024 ms**. Klik pada tombol voucher menahan input pencarian dengan `tundaInput` hingga **2.875 ms**.
* **Akar Masalah dan Mekanismenya:** Fungsi `terapkanVoucher` di `harga-promo.js` menjalankan komputasi `simulasiCicilan` secara sinkron untuk ribuan produk dalam satu task. Kata kunci `async` hanya mengembalikan *Promise*, tetapi tidak memberikan *Rendering Opportunity* bagi browser karena tidak ada titik *yield* berupa `await` pada timer atau *macro-task*.
* **Kualitas yang Terdampak (ISO/IEC 25010):**

  * *Performance efficiency — time behaviour*: waktu pemblokiran Main Thread berlebihan.
  * *Interaction capability — operability*: antarmuka tidak dapat dioperasikan saat komputasi berlangsung.
* **Perbaikan:** Menerapkan *Time-Slicing* pada `terapkanVoucher` dengan mengeksekusi `await new Promise(r => setTimeout(r, 0))` setiap 12 ms. Hal ini memberikan *yield point* ke Event Loop agar browser dapat merender pembaruan UI, termasuk *progress bar*, dan merespons event masukan keyboard.
* **Hasil:** Long Task terlama turun dari **1.581 ms menjadi 255 ms** (turun **83,8%**), INP turun dari **3.024 ms menjadi 528 ms** (turun **82,5%**), dan *progress bar* tergambar secara bertahap.

---

### T-07: Aktivitas Main Thread Tinggi Saat Idle Menyebabkan Perangkat Panas

* **Tiket terkait:** TK-1070 (Pak Yusuf: "Baru buka halaman 5 menit HP sudah panas dan baterai turun cepat").
* **Gejala bagi pengguna:** Baterai HP cepat habis dan perangkat terasa panas meskipun pengguna hanya membiarkan halaman dalam keadaan diam.
* **Bukti:** Baseline S6 merekam **472 frame lambat (>50 ms)** dalam 10 detik idle, dengan frame terburuk **2.045 ms** dan INP **480 ms**.
* **Akar Masalah dan Mekanismenya:** `promo.js` menjalankan dua timer `setInterval` dengan interval 10 ms. Fungsi `pasangTeksBerjalan` memutasi CSS `style.left` melalui JavaScript sebanyak 100 kali per detik, sehingga memicu seluruh tahap pipeline (*Style → Layout → Paint → Composite*) pada Main Thread. Sementara itu, `pasangHitungMundur` membaca `offsetWidth` setiap 10 ms dan memicu *Forced Synchronous Layout*.
* **Kualitas yang Terdampak (ISO/IEC 25010):**

  * *Performance efficiency — resource utilization & capacity*: pemborosan daya CPU dan baterai tanpa adanya interaksi aktif dari pengguna.
* **Perbaikan:**

  1. Memindahkan animasi teks berjalan ke CSS Compositor menggunakan `transform: translateX()` dan `@keyframes`, sehingga beban animasi tidak lagi bergantung pada manipulasi posisi melalui JavaScript di Main Thread.
  2. Mengubah interval hitung mundur menjadi 100 ms serta menambahkan *DOM diffing* dan caching `offsetWidth`.
* **Hasil:** Frame lambat saat idle berkurang dari **472 menjadi 75 frame** (turun **84,1%**), frame terburuk turun dari **2.045 ms menjadi 400 ms**, dan INP idle turun dari **480 ms menjadi 176 ms**, sehingga memenuhi target **≤ 200 ms**.

---

### T-08: Layout Thrashing Saat Pengguliran Daftar Produk

* **Tiket terkait:** TK-1063 (Bu Ningsih: "Scroll daftar barangnya patah-patah, tidak enak dilihat").
* **Gejala bagi pengguna:** Gerakan pengguliran layar terasa tidak mulus (*jank* atau *dropped frames*).
* **Bukti:** Baseline S5 merekam **619 frame lambat (>50 ms)** selama 10 detik pengguliran, dengan frame terburuk **2.083 ms** dan Long Task **1.628 ms**.
* **Akar Masalah dan Mekanismenya:** Handler `scroll` pada `gulir.js` menjalankan `querySelectorAll('.kartu')` dan membaca `getBoundingClientRect()`, kemudian langsung menulis `classList` dan `style.minHeight` pada setiap perulangan kartu. Pola operasi baca-tulis geometri DOM secara berulang memaksa browser melakukan *Forced Synchronous Layout*.
* **Kualitas yang Terdampak (ISO/IEC 25010):**

  * *Performance efficiency — time behaviour*: waktu pemrosesan yang berlebihan akibat kalkulasi layout berulang.
  * *Interaction capability — user engagement*: pengalaman visual yang buruk mengganggu kenyamanan pengguliran.
* **Perbaikan:** Menghapus kalkulasi `getBoundingClientRect()` manual dari event listener `scroll` dan menggantinya dengan `IntersectionObserver` untuk memantau visibilitas kartu secara *asynchronous*. Selain itu, pembaruan header dibungkus menggunakan `requestAnimationFrame`.
* **Hasil:** Frame lambat saat pengguliran turun dari **619 menjadi 110 frame** (turun **82,2%**), frame terburuk turun dari **2.083 ms menjadi 633 ms**, dan Long Task terlama turun dari **1.628 ms menjadi 535 ms**.


## 5. Dugaan yang ternyata keliru
Dugaan dari catatan serah terima, tiket, atau tim sendiri yang terbantah pengukuran. Sertakan angkanya.

- **Rudi #2 — "API produk lambat, minta backend tambah server"** (kontribusi P1): terbantah.
  terbukti di trace: `/api/produk` = **1 permintaan** (delay simulasi 180 ms di `server.js`),
  sementara **3.000 permintaan gambar** dilepas halaman sendiri dan menghabiskan antrean unduhan
  (lihat T-02). Menambah server backend tidak akan mengubah apa pun.

- **Rudi #1 — "loop O(n²) di `kategori.js` adalah biang utama"** (kontribusi P3): salah
  sasaran. `n` nyata hanya **8 kategori**, bukan 3.000 produk: **56 pasangan** dan 56
  `querySelectorAll`. Microbenchmark Node dengan DOM tiruan untuk seluruh `pasangKaki`,
  termasuk agregasi 3.000 produk, bermedian **0,8822 ms**. Bentuk O(n²)-nya benar, tetapi
  skalanya tidak menjelaskan hang.
- **Rudi #3 — "bubble sort harus diganti quicksort"** (kontribusi P3): tidak material.
  Fungsi hanya mengurutkan **12 merek** satu kali, yaitu **66 perbandingan**. Median bubble
  sort **0,0025 ms**, sedangkan sort bawaan **0,0012 ms**; potensi hemat **0,0013 ms**.
- Rudi #4 — "Perhitungan voucher sudah saya buat async, jadi harusnya aman dan tidak memblokir" (kontribusi P1): terbantah total.
  terbukti di baseline S4: Long Task terlama mencapai 1.581 ms dan Total Blocking Time (TBT) mencapai 9.509 ms, meskipun fungsi terapkanVoucher dan hitungHargaPromo menggunakan kata kunci async. Kata kunci async hanya membuat fungsi mengembalikan Promise dan tidak otomatis membebaskan Main Thread.
  Pemblokiran baru berkurang setelah diterapkan Time-Slicing melalui await new Promise(r => setTimeout(r, 0)), yang memberikan kesempatan kepada Event Loop untuk memproses task lain. Long Task terlama turun dari 1.581 menjadi 255 ms (turun 83,8%), INP turun dari 3.024 menjadi 528 ms (turun 82,5%), dan progress bar akhirnya tergambar bertahap. Jadi, yang mengatasi pemblokiran adalah yielding secara eksplisit, bukan sekadar kata kunci async.
- **Rudi #5 — "SDK berat dan tidak boleh disentuh"** (kontribusi P3): bagian pertama benar,
  tetapi kesimpulannya salah. Tanpa mengubah vendor, payload dipangkas dari **1.225.955 ke
  186 byte** dan pemanggilan dijadwalkan setelah paint. Microbenchmark `Lacak.kirim` turun
  dari **52,5579 menjadi 9,2659 ms**; processing handler S2 turun dari **63,6 menjadi 2,1 ms**.
  Jadi titik integrasinya boleh dan perlu diubah sambil seluruh event tetap dikirim. Metode
  dan keterbatasan microbenchmark ada di `laporan/trace/CATATAN-P3.md`.


## 6. Yang belum beres dan rekomendasi
Masalah yang tersisa, risiko, dan usulan untuk tim lain (backend, vendor SDK, desain).

**Kontribusi P1:**
1. **INP S1 belum memenuhi target** (4.755 ms pada run protokol; turun 3x dari 14.318 ms tapi
   belum <= 200 ms). Sisa biaya berasal dari potongan render 60 kartu per bingkai (long task
   ratusan ms pada CPU 4x) dan durasi interaksi yang menunggu paint berikutnya. Rekomendasi:
   (a) potongan lebih kecil (mis. 20 kartu) — harga: seluruh kartu masuk DOM lebih lambat;
   (b) `content-visibility: auto` pada kartu — harga: biaya render turun tapi perilaku scroll
   bar berubah; (c) pastikan run berikut menunggu fase render bertahap selesai sebelum mengetik
   (run pertama tampak mencakup fase tersebut). Perlu diukur sebelum dipilih.
2. **S0-sebelum belum terukur penuh** — tab jatuh ke about:blank saat merekam pemuatan pada 4x
   (bukti: `gambar/s0-sebelum-about-blank.png`). Rencana: ulangi dengan Record -> F5 -> Stop
   dini, atau minimal dokumentasi Network panel tanpa Performance panel.
3. **Koordinasi P2**: placeholder tinggi banner sebelum `/api/promo` selesai — sisa CLS 0,472
   ada di sana; tanpa itu target CLS 0,1 tidak mungkin tercapai tim.

**Kontribusi P2:**
1. **INP dan Long Task S4 (Voucher) belum mencapai target ideal** (INP median 528 ms; Long Task terlama 255 ms pada CPU 4x slowdown)[cite: 24].
 Meskipun *Time-Slicing* telah memecah task raksasa[cite: 1], manipulasi DOM untuk memperbarui progress bar secara berulang tetap menghasilkan biaya *Layout & Paint* di Main Thread[cite: 1]. Rekomendasi lanjutan: Pindahkan komputasi aturan promo bertingkat dan simulasi cicilan sepenuhnya ke **Web Worker** agar Main Thread tidak menerima beban kalkulasi sama sekali.
2. **Frame lambat S5 (Scroll 10 dtk) belum mencapai <= 2 frame** (turun 82,2% dari 619 ke 110 frame)[cite: 34, 37]. *IntersectionObserver*
 berhasil mengeliminasi *Layout Thrashing*[cite: 1], namun banyaknya jumlah node DOM (1.500–3.000 kartu) tetap menimbulkan beban *Paint/Composite* saat pengguliran cepat pada CPU 4x slowdown[cite: 1]. Rekomendasi lanjutan: Terapkan **virtualisasi DOM** (hanya merender kartu yang berada di viewport) atau properti CSS `content-visibility: auto`.
3. **Sisa frame lambat pada S6 (Idle 10 dtk)** (turun 84,1% dari 472 ke 75 frame; target INP idle **tercapai** di angka 176 ms <= 200 ms)[cite: 1,
 27, 30, 31]. Sisa frame lambat pada kondisi diam sebagian berasal dari *timer tick* hitung mundur 100 ms yang masih memutasi DOM[cite: 1, 12]. Rekomendasi lanjutan: Hentikan *timer* hitung mundur sepenuhnya menggunakan **Page Visibility API** (`document.hidden`) saat tab berada di latar belakang/tidak fokus.

**Kontribusi P3:**
1. S2 memenuhi target INP hanya tepat di batas dan long task masih > 100 ms. Pengurangan
   processing handler sudah terukur, tetapi optimasi lebih lanjut harus mempertimbangkan SDK
   vendor serta pekerjaan P2 yang tetap aktif; jangan menyatakan seluruh masalah selesai.
2. Bukti S3 sesudah menyimpang dari skenario baku karena klik diberi jeda sampai tombol aktif
   kembali. Trace tetap berguna sebagai bukti bahwa guard memblokir tap saat transaksi aktif
   dan pembelian baru tetap mungkin sesudahnya, tetapi median target S3 belum tersedia.
3. Idempotensi menyeluruh memerlukan dukungan server. Perbaikan saat ini hanya mencegah
   duplikasi dari UI pada satu halaman, sesuai batas karena `server.js` tidak boleh diubah.

## 7. Pernyataan penggunaan AI dan pembagian kerja

P2 menggunakan AI (Gemini) sebagai mitra diskusi teknis dan penyusun draf perbaikan kode. AI membantu mengidentifikasi *Layout Thrashing* pada `gulir.js`, merancang mekanisme *Time-Slicing* pada `harga-promo.js`, serta memindahkan animasi JS ke CSS Compositor (`transform: translateX`) pada `promo.js`. Setiap usulan AI diaudit dan diuji ulang menggunakan trace Performance panel DevTools (CPU 4x slowdown) sebelum diterapkan ke repositori utama. P2 bertanggung jawab atas diagnosis, perbaikan kode (`harga-promo.js`, `promo.js`, `gulir.js`), perekaman trace baseline vs sesudah perbaikan, serta analisis statistik untuk tiket P2 (TK-1057, TK-1070, TK-1063).

P3 menggunakan OpenAI Codex untuk membantu membaca trace, menghitung median, menyusun
hipotesis, dan mengusulkan implementasi. P3 memeriksa kembali usulan tersebut terhadap source,
trace Performance, Network, dan hasil tiga run. Codex juga membuat uji otomatis untuk guard
checkout; uji itu diperlakukan sebagai bukti pendukung dan tidak menggantikan trace protokol.
Kontribusi P3 mencakup diagnosis serta perbaikan TK-1044/TK-1052 dan dokumentasi hasilnya.
Nama anggota dan pembagian kontribusi P1/P2 perlu dilengkapi tim.
