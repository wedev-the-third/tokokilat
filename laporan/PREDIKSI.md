# Log prediksi

Aturan: satu entri per masalah. Bagian **Sebelum perbaikan** harus di-commit *sebelum* commit
perbaikannya. Bagian **Sesudah perbaikan** diisi setelah pengukuran ulang. Jangan menyunting
bagian "sebelum" setelah hasilnya diketahui; bila prediksi meleset, jelaskan di bagian "sesudah".

---

## P-01: KolomKolom caricari telat merespons tiap ketikan (TK-1041)telat merespons tiap ketikan (TK-1041)

**Tiket terkait:** TK-1041 (Bu Wulan — "hurufnya munculnya telat-telat, kadang HP seperti hang")1041 (Bu Wulan — "hurufnya munculnya telat-telat, kadang HP seperti hang")
**Tanggal dan hash commit entri ini:** 2026-09-30, hash: diisi pada commit berikutnya.2026-09-30, hash: diisi pada commit berikutnya.

### Sebelum perbaikan

- **Yang teramati di trace (baseline, S1):** *diisi setelah rekam baseline*. Dugaan bentuknya:
  satu task sinkron panjang pada setiap event `input` di `#kolom-cari` (terlihat di track
  Interactions + flame chart main thread), dengan bottom-up didominasi berurutan:
  `normalkan`/`cocok` (filter 3000 produk dengan regex per ketikan), `buatKartu` + `append`
  (membangun ulang seluruh kisi DOM — hingga ±3000 kartu saat kolom dikosongkan),
  `samakanTinggiJudul` (pembacaan `offsetHeight` bergantian dengan tulisan `style.height`),
  dan `Lacak.kirim` (fingerprint ±2.000.000 iterasi hash per panggilan, terlihat sebagai
  blok besar dalam kode vendor).
- **Dugaan mekanisme:** seluruh pekerjaan berjalan di *satu task* pada handler event `input`,
  jadi event loop tidak memberi *rendering opportunity* di antara ketikan: input berikutnya
  mengantri, teks di kolom cari baru dicat setelah task selesai. Pembersihan kisi lalu
  pembangunan ribuan node memicu Style+Layout raksasa; `samakanTinggiJudul` memaksa
  *layout sinkron berulang* karena baca (`offsetHeight`) diselang-seling tulis
  (`style.height`) — layout kotor dibaca ulang tiap iterasi.
- **Rencana perubahan:**
  1. `pencarian.js`: hasil `normalkan` per produk di-*cache* sekali (dibangun saat memuat
     halaman, bukan saat mengetik); pemecahan `kunci.split(' ')` cukup sekali per saringan.
  2. `katalog.js`: render progresif — potongan pertama (±60 kartu) sinkron, sisanya per
     bingkai lewat `requestAnimationFrame` dengan token pembatal bila render baru dimulai;
     `#ringkasan` tetap menampilkan jumlah hasil penuh.
  3. `katalog.js`: `samakanTinggiJudul` dua fase — baca semua tinggi dulu, baru tulis semua
     (satu layout sinkron per potongan, bukan per judul).
  4. `pencarian.js`: event `search` ke SDK dikirim setelah ketikan berhenti (±500 ms),
     bukan per ketikan.
- **Prediksi terukur:** setelah perubahan, INP S1 turun dari *(isi baseline; dugaan order
  ratusan ms pada CPU 4x)* menjadi **< 100 ms**, dan tidak ada long task > 100 ms selama
  mengetik, karena task per ketikan kini hanya: filter 3000 entri (cache) + ±60 kartu +
  satu layout. Jumlah hasil pencarian tidak berubah (aturan: semua produk tetap bisa
  ditemukan). Efek samping yang diprediksi: seluruh kartu baru selesai masuk DOM ±1–2 dtk
  setelah saringan berubah (bertahap, bukan sekaligus) dan tinggi judul disamakan per
  potongan sehingga antar potongan bisa berbeda paling banyak satu baris — tak terlihat
  karena baris kisi saling independen.
- **Alternatif yang dipertimbangkan dan alasan tidak dipilih:**
  (a) *debounce* pada kolom cari — menunda umpan balik, merugikan *interaction capability*
  (operability); gejalanya disembunyikan, biayanya dipindah ke pengguna.
  (b) virtualisasi penuh (hanya kartu terlihat di DOM) — kompleks dan berisiko melanggar
  aturan "seluruh produk dijangkau dengan menggulir".
  (c) `DocumentFragment` saja tanpa pemotongan — tetap satu task raksasa; fragment hanya
  memangkas *jumlah reflow* saat append, bukan ukuran task.
- **Yang teramati di trace (baseline, S1):** *diisi setelah rekam baseline*. Dugaan bentuknya:
  satu task sinkron panjang pada setiap event `input` di `#kolom-cari` (terlihat di track
  Interactions + flame chart main thread), dengan bottom-up didominasi berurutan:
  `normalkan`/`cocok` (filter 3000 produk dengan regex per ketikan), `buatKartu` + `append`
  (membangun ulang seluruh kisi DOM — hingga ±3000 kartu saat kolom dikosongkan),
  `samakanTinggiJudul` (pembacaan `offsetHeight` bergantian dengan tulisan `style.height`),
  dan `Lacak.kirim` (fingerprint ±2.000.000 iterasi hash per panggilan, terlihat sebagai
  blok besar dalam kode vendor).
- **Dugaan mekanisme:** seluruh pekerjaan berjalan di *satu task* pada handler event `input`,
  jadi event loop tidak memberi *rendering opportunity* di antara ketikan: input berikutnya
  mengantri, teks di kolom cari baru dicat setelah task selesai. Pembersihan kisi lalu
  pembangunan ribuan node memicu Style+Layout raksasa; `samakanTinggiJudul` memaksa
  *layout sinkron berulang* karena baca (`offsetHeight`) diselang-seling tulis
  (`style.height`) — layout kotor dibaca ulang tiap iterasi.
- **Rencana perubahan:**
  1. `pencarian.js`: hasil `normalkan` per produk di-*cache* sekali (dibangun saat memuat
     halaman, bukan saat mengetik); pemecahan `kunci.split(' ')` cukup sekali per saringan.
  2. `katalog.js`: render progresif — potongan pertama (±60 kartu) sinkron, sisanya per
     bingkai lewat `requestAnimationFrame` dengan token pembatal bila render baru dimulai;
     `#ringkasan` tetap menampilkan jumlah hasil penuh.
  3. `katalog.js`: `samakanTinggiJudul` dua fase — baca semua tinggi dulu, baru tulis semua
     (satu layout sinkron per potongan, bukan per judul).
  4. `pencarian.js`: event `search` ke SDK dikirim setelah ketikan berhenti (±500 ms),
     bukan per ketikan.
- **Prediksi terukur:** setelah perubahan, INP S1 turun dari *(isi baseline; dugaan order
  ratusan ms pada CPU 4x)* menjadi **< 100 ms**, dan tidak ada long task > 100 ms selama
  mengetik, karena task per ketikan kini hanya: filter 3000 entri (cache) + ±60 kartu +
  satu layout. Jumlah hasil pencarian tidak berubah (aturan: semua produk tetap bisa
  ditemukan). Efek samping yang diprediksi: seluruh kartu baru selesai masuk DOM ±1–2 dtk
  setelah saringan berubah (bertahap, bukan sekaligus) dan tinggi judul disamakan per
  potongan sehingga antar potongan bisa berbeda paling banyak satu baris — tak terlihat
  karena baris kisi saling independen.
- **Alternatif yang dipertimbangkan dan alasan tidak dipilih:**
  (a) *debounce* pada kolom cari — menunda umpan balik, merugikan *interaction capability*
  (operability); gejalanya disembunyikan, biayanya dipindah ke pengguna.
  (b) virtualisasi penuh (hanya kartu terlihat di DOM) — kompleks dan berisiko melanggar
  aturan "seluruh produk dijangkau dengan menggulir".
  (c) `DocumentFragment` saja tanpa pemotongan — tetap satu task raksasa; fragment hanya
  memangkas *jumlah reflow* saat append, bukan ukuran task.

### Sesudah perbaikan

- **Hash commit perbaikan:** ....
- **Hasil ukur (median 3 kali):** ....
- **Prediksi vs kenyataan:** ....
- **Efek samping yang muncul:** ....

---

## P-02: Halaman loncat sendiri saat dimuat (TK-1078, bagian P1)

**Tiket terkait:** TK-1078 (Kak Rara — "halamannya loncat turun sendiri, yang kepencet malah iklan promo")
**Tanggal dan hash commit entri ini:** 2026-09-30, hash: diisi pada commit berikutnya.

### Sebelum perbaikan

- **Yang teramati di trace (baseline, S0):** *diisi setelah rekam baseline*. Dugaan bentuknya
  di track Layout Shifts: rangkaian shift kecil bertambah setiap gambar produk selesai dimuat
  (kotak abu-abu tumbuh memenuhi tinggi gambar), plus **satu shift besar ±1,8 dtk** setelah
  muat — saat banner promo di-`prepend` ke `#utama` (server sengaja menunda `/api/promo`
  1800 ms) dan menurunkan posisi seluruh daftar produk.
- **Dugaan mekanisme:** (1) `<img>` tanpa dimensi intrinsik + CSS `width:100%; height:auto`
  berarti browser tidak tahu rasio gambar saat layout pertama → ruangnya 0 tinggi → setiap
  gambar yang termuat mengubah geometri (Layout) dan menggeser konten di bawahnya (CLS).
  (2) Banner ditambahkan ke DOM setelah fetch selesai → konten yang sudah stabil digeser
  ke bawah; `min-height` pada `.promo-banner` tidak membantu karena baru berlaku setelah
  elemennya ada.
- **Rencana perubahan (bagian P1):** atribut `width="480" height="480"` pada `img` kartu
  (sesuai ukuran intrinsik SVG dari server) sehingga browser memesan kotak berrasio 1:1
  sejak layout pertama. **Bagian banner ada di `promo.js` (milik P2)** — koordinasi:
  P2 memesan placeholder setinggi banner sebelum fetch selesai; P1 mengukur CLS-nya.
- **Prediksi terukur:** kontribusi CLS dari gambar turun menjadi ±0 (kotak sudah dipesan);
  CLS S0 turun dari *(isi baseline)* menjadi jauh di bawah 0,1 **setelah placeholder banner
  P2 ikut masuk** — tanpa itu, shift banner ±1,8 dtk tetap ada, jadi target 0,1 baru
  dinilai setelah kedua perbaikan menyatu.
- **Alternatif yang dipertimbangkan dan alasan tidak dipilih:** (a) `aspect-ratio` di CSS —
  setara, tetapi atribut dipilih karena juga menjadi sinyal rasio untuk pemuatan malas;
  (b) skeleton berukuran tetap per kartu — hasil sama, lebih banyak kode.

### Sesudah perbaikan

- **Hash commit perbaikan:** ....
- **Hasil ukur (median 3 kali):** ....
- **Prediksi vs kenyataan:** ....
- **Efek samping yang muncul:** ....

---

## P-03: Ribuan permintaan gambar; "pasti servernya yang lemot" (TK-1081 + uji dugaan Rudi #2)

**Tiket terkait:** TK-1081 (Pak Hendra — "gambar lama sekali munculnya... kuota saya cepat habis")
**Tanggal dan hash commit entri ini:** 2026-09-30, hash: diisi pada commit berikutnya.

### Sebelum perbaikan

- **Yang teramati di trace (baseline, S0, panel Network):** *diisi setelah rekam baseline*.
  Dugaan bentuknya: ±3000 permintaan `/img/p/*.svg` dilepas segera setelah render pertama
  (semua kartu dirender sekaligus), tiap permintaan berlatensi 60–300 ms (simulasi CDN di
  `server.js`), browser memproses ±6 sekaligus → gambar terakhir selesai lama sekali dan
  total byte sangat besar. Bandingkan: `/api/produk` hanya 1 permintaan dan selesai ±180 ms.
- **Dugaan mekanisme:** setiap `buatKartu` memasang `img.src` untuk semua 3000 produk secara
  *eager* — browser diminta memuat semuanya padahal pengguna hanya melihat ±8 kartu.
  Keluhan "server lemot" (dan dugaan Rudi #2 "API produk lambat, minta backend tambah
  server") **keliru sasaran**: kemacetan bukan pada API melainkan volume permintaan gambar
  yang dibuat sendiri oleh halaman.
- **Rencana perubahan:** `loading="lazy"` + `decoding="async"` pada `img` kartu — browser
  hanya meminta gambar yang mendekati viewport, dekodenya tidak memblokir respons.
- **Prediksi terukur:** jumlah permintaan gambar selama S0 (diam 10 dtk) turun dari
  *(isi baseline, dugaan ±3000)* menjadi **< 100** — sebanding kartu yang terlihat;
  saat menggulir, permintaan bertambah bertahap (memang perilaku yang diinginkan).
  Total byte S0 turun sebanding. Dugaan Rudi #2 dibantah dengan angka: bandingkan waktu
  selesai + ukuran `/api/produk` (satu permintaan, cepat) vs total permintaan gambar.
  Efek samping yang diprediksi: gambar jauh di bawah baru termuat saat digulir mendekat
  (kotak abu-abu sesaat — diinginkan, hemat kuota); "Select all + copy" atau print tidak
  lagi memuat semua gambar.
- **Alternatif yang dipertimbangkan dan alasan tidak dipilih:** (a) `content-visibility` —
  memangkas biaya render, bukan jumlah permintaan gambar; (b) meminta gambar versi kecil —
  `server.js` milik tim lain, tidak boleh diubah; (c) `IntersectionObserver` manual untuk
  menunda `src` — meniru apa yang sudah dilakukan browser secara native oleh `loading=lazy`.

### Sesudah perbaikan

- **Hash commit perbaikan:** ....
- **Hasil ukur (median 3 kali):** ....
- **Prediksi vs kenyataan:** ....
- **Prediksi vs kenyataan:** ....
- **Efek samping yang muncul:** ....

---

## P-02: Halaman loncat sendiri saat dimuat (TK-1078, bagian P1)

**Tiket terkait:** TK-1078 (Kak Rara — "halamannya loncat turun sendiri, yang kepencet malah iklan promo")
**Tanggal dan hash commit entri ini:** 2026-09-30, hash: diisi pada commit berikutnya.

### Sebelum perbaikan

- **Yang teramati di trace (baseline, S0):** *diisi setelah rekam baseline*. Dugaan bentuknya
  di track Layout Shifts: rangkaian shift kecil bertambah setiap gambar produk selesai dimuat
  (kotak abu-abu tumbuh memenuhi tinggi gambar), plus **satu shift besar ±1,8 dtk** setelah
  muat — saat banner promo di-`prepend` ke `#utama` (server sengaja menunda `/api/promo`
  1800 ms) dan menurunkan posisi seluruh daftar produk.
- **Dugaan mekanisme:** (1) `<img>` tanpa dimensi intrinsik + CSS `width:100%; height:auto`
  berarti browser tidak tahu rasio gambar saat layout pertama → ruangnya 0 tinggi → setiap
  gambar yang termuat mengubah geometri (Layout) dan menggeser konten di bawahnya (CLS).
  (2) Banner ditambahkan ke DOM setelah fetch selesai → konten yang sudah stabil digeser
  ke bawah; `min-height` pada `.promo-banner` tidak membantu karena baru berlaku setelah
  elemennya ada.
- **Rencana perubahan (bagian P1):** atribut `width="480" height="480"` pada `img` kartu
  (sesuai ukuran intrinsik SVG dari server) sehingga browser memesan kotak berrasio 1:1
  sejak layout pertama. **Bagian banner ada di `promo.js` (milik P2)** — koordinasi:
  P2 memesan placeholder setinggi banner sebelum fetch selesai; P1 mengukur CLS-nya.
- **Prediksi terukur:** kontribusi CLS dari gambar turun menjadi ±0 (kotak sudah dipesan);
  CLS S0 turun dari *(isi baseline)* menjadi jauh di bawah 0,1 **setelah placeholder banner
  P2 ikut masuk** — tanpa itu, shift banner ±1,8 dtk tetap ada, jadi target 0,1 baru
  dinilai setelah kedua perbaikan menyatu.
- **Alternatif yang dipertimbangkan dan alasan tidak dipilih:** (a) `aspect-ratio` di CSS —
  setara, tetapi atribut dipilih karena juga menjadi sinyal rasio untuk pemuatan malas;
  (b) skeleton berukuran tetap per kartu — hasil sama, lebih banyak kode.

### Sesudah perbaikan

- **Hash commit perbaikan:** ....
- **Hasil ukur (median 3 kali):** ....
- **Prediksi vs kenyataan:** ....
- **Efek samping yang muncul:** ....

---

## P-03: Ribuan permintaan gambar; "pasti servernya yang lemot" (TK-1081 + uji dugaan Rudi #2)

**Tiket terkait:** TK-1081 (Pak Hendra — "gambar lama sekali munculnya... kuota saya cepat habis")
**Tanggal dan hash commit entri ini:** 2026-09-30, hash: diisi pada commit berikutnya.

### Sebelum perbaikan

- **Yang teramati di trace (baseline, S0, panel Network):** *diisi setelah rekam baseline*.
  Dugaan bentuknya: ±3000 permintaan `/img/p/*.svg` dilepas segera setelah render pertama
  (semua kartu dirender sekaligus), tiap permintaan berlatensi 60–300 ms (simulasi CDN di
  `server.js`), browser memproses ±6 sekaligus → gambar terakhir selesai lama sekali dan
  total byte sangat besar. Bandingkan: `/api/produk` hanya 1 permintaan dan selesai ±180 ms.
- **Dugaan mekanisme:** setiap `buatKartu` memasang `img.src` untuk semua 3000 produk secara
  *eager* — browser diminta memuat semuanya padahal pengguna hanya melihat ±8 kartu.
  Keluhan "server lemot" (dan dugaan Rudi #2 "API produk lambat, minta backend tambah
  server") **keliru sasaran**: kemacetan bukan pada API melainkan volume permintaan gambar
  yang dibuat sendiri oleh halaman.
- **Rencana perubahan:** `loading="lazy"` + `decoding="async"` pada `img` kartu — browser
  hanya meminta gambar yang mendekati viewport, dekodenya tidak memblokir respons.
- **Prediksi terukur:** jumlah permintaan gambar selama S0 (diam 10 dtk) turun dari
  *(isi baseline, dugaan ±3000)* menjadi **< 100** — sebanding kartu yang terlihat;
  saat menggulir, permintaan bertambah bertahap (memang perilaku yang diinginkan).
  Total byte S0 turun sebanding. Dugaan Rudi #2 dibantah dengan angka: bandingkan waktu
  selesai + ukuran `/api/produk` (satu permintaan, cepat) vs total permintaan gambar.
  Efek samping yang diprediksi: gambar jauh di bawah baru termuat saat digulir mendekat
  (kotak abu-abu sesaat — diinginkan, hemat kuota); "Select all + copy" atau print tidak
  lagi memuat semua gambar.
- **Alternatif yang dipertimbangkan dan alasan tidak dipilih:** (a) `content-visibility` —
  memangkas biaya render, bukan jumlah permintaan gambar; (b) meminta gambar versi kecil —
  `server.js` milik tim lain, tidak boleh diubah; (c) `IntersectionObserver` manual untuk
  menunda `src` — meniru apa yang sudah dilakukan browser secara native oleh `loading=lazy`.

### Sesudah perbaikan

- **Hash commit perbaikan:** ....
- **Hasil ukur (median 3 kali):** ....
- **Prediksi vs kenyataan:** ....
- **Efek samping yang muncul:** ....
