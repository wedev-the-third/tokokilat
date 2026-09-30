# Audit usulan perbaikan dari AI

Peran kami di sini adalah **reviewer**. AI diminta memperbaiki tiket P1 (TK-1041, TK-1078,
TK-1081) **tanpa diberi akses ke berkas trace** — persis seperti bekerja dengan junior engineer
yang rajin tapi belum pernah melihat profil. Usulan lalu diuji terhadap bukti pengukuran.

Alat AI yang dipakai: GLM (coding agent, sesi terpisah tanpa akses trace).
Branch usulan diterapkan: `audit-ai` (commit `81b4254` = usulan A-01, `c75d7b0` = usulan A-02).

Basis bukti: `laporan/trace/trace-S1-TK1041-{sebelum,sesudah}-1.json.gz`,
`trace-S0-TK1081-sesudah-1.json.gz` (kondisi protokol), dan mikro-benchmark
`laporan/trace/bench-filter.mjs` (Node 26, CPU native, data asli 3000 produk dari
`/api/produk`, median 5 ronde). Keterbatasan yang kami akukan: A-01 dan A-02 tidak sempat
direkam ulang di browser pada branch (perekaman pemuatan tidak stabil di mesin ini);
penilaian memakai trace protokol yang ada + aritmetika mekanisme + mikro-benchmark.

---

## A-01: "Debounce 300 ms pada input pencarian"

- **Tiket yang diminta diperbaiki:** TK-1041
- **Prompt yang diberikan (ringkas):** "Kolom pencarian telat merespons tiap ketikan di HP
  kelas bawah. Perbaiki." (tanpa trace)
- **Usulan AI (ringkas):** `clearTimeout(pengaturCari); pengaturCari = setTimeout(terapkanSaringan, 300);`
  — diterapkan di `audit-ai` commit `81b4254`.
- **Jenis masalah pada usulan:**
  - [ ] Salah diagnosis
  - [x] **Tidak lengkap** — mengurangi *frekuensi* task raksasa, bukan *durasi*-nya; saat timer
    jalan (mis. setelah pengguna berhenti mengetik / menghapus semua huruf), task render ribuan
    kartu + fingerprint SDK yang sama persis masih mengeksekusi — gejala "hang lalu selesai"
    tetap ada.
  - [x] **Menimbulkan regresi** — setiap ketikan kini menunggu >= 300 ms sebelum hasil muncul:
    menunda umpan balik adalah regresi *interaction capability* (operability) — keluhan tiket
    ("hurufnya munculnya telat-telat") dibuat ulang oleh desain.
- **Bukti:** trace S1-sebelum (protokol): interaksi terburuk 14.318 ms dengan komponen
  "presentasi" dominan dan long task terlama 14.810 ms — biaya ada pada DURASI task, sehingga
  debounce hanya memindahkan kapan biaya itu dibayar. Mikro-benchmark: biaya filter sendiri
  hanya 140,6 ms per 12 ketikan tanpa cache (9,8 ms dengan cache) — konfirmasi bahwa yang
  harus diperkecil adalah task render, bukan frekuensinya.
- **Mengapa AI bisa keliru:** AI hanya membaca kode dan melihat "handler dijalankan tiap
  ketikan" → menyimpulkan frekuensi adalah masalah. Ia tidak punya trace yang menunjukkan
  durasi task yang menumpuk di antara ketikan.
- **Perbaikan yang benar menurut tim:** mengecilkan biaya per ketikan (cache normalisasi
  `ae92f15`, render progresif `05f0a57`, penundaan event SDK `529287a`) — umpan balik tetap
  instan, task tetap pendek.

---

## A-02: "Placeholder min-height 180px untuk mencegah layout shift gambar"

- **Tiket yang diminta diperbaiki:** TK-1078
- **Prompt yang diberikan (ringkas):** "Halaman loncat saat gambar termuat dan saat banner
  masuk. Perbaiki." (tanpa trace)
- **Usulan AI (ringkas):** `.kartu-media { min-height: 180px; }` — diterapkan di `audit-ai`
  commit `c75d7b0`.
- **Jenis masalah pada usulan:**
  - [x] **Tidak lengkap** — memesan tinggi TETAP, padahal tinggi sebenarnya mengikuti lebar
    kolom kisi (gambar persegi 480x480, `width:100%`). Di viewport 412 (2 kolom +-195px) masih
    tersisa shift kecil; di layar lebar (kolom jauh > 180px) shift tersisa besar. Gejala
    berkurang, akar masalah (rasio tidak dipesan) tetap.
- **Bukti:** trace S0-sesudah membuktikan mekanisme yang benar: dengan atribut dimensi
  intrinsik (`d258eb4`), kontribusi CLS dari gambar = 0 (CLS 0,472 yang tersisa seluruhnya
  dari banner, lihat PREDIKSI P-02). Aritmetika usulan: shift tersisa per kartu =
  (lebar_kolom - 180) px; itu bukan nol kecuali kebetulan lebar kolom 180px. Nilai 180px
  sendiri adalah tebakan — AI tidak tahu gambar server berukuran 480x480 persegi karena
  tidak membaca trace/Network.
- **Mengapa AI bisa keliru:** menebak dari pola umum ("min-height placeholder") tanpa tahu
  rasio intrinsik aset dan tanpa mengukur CLS sisa.
- **Perbaikan yang benar menurut tim:** atribut `width/height` intrinsik pada `img` — rasio
  dipesan persis untuk SEMUA lebar kolom.

---

## A-03: "IntersectionObserver manual untuk lazy-load gambar" (ditolak saat review, tidak diterapkan)

- **Tiket yang diminta diperbaiki:** TK-1081
- **Prompt yang diberikan (ringkas):** "Ribuan gambar dimuat sekaligus, kuota pembeli habis. Perbaiki."
- **Usulan AI (ringkas):** setiap `<img>` diberi `data-src` + `IntersectionObserver` yang
  memindahkan ke `src` saat mendekati viewport.
- **Jenis masalah pada usulan:**
  - [x] **Memperbaiki sesuatu yang tidak berpengaruh terukur** (redundan) — `loading="lazy"`
    native sudah mencapai target: trace S0-sesudah (412x915) menunjukkan **8 permintaan** saat
    muat — sebanding kartu terlihat. IO manual menambah JS di main thread per peristiwa gulir
    dan kasus tepi (rootMargin, kontainer), tanpa bisa meminta lebih sedikit dari "yang
    terlihat". Pada kode asli, banjir bukan karena atribut gambar, melainkan karena 3.000 kartu
    dirender sekaligus — IO dengan rootMargin tetap akan memuat ratusan begitu kartu dibuat.
- **Bukti:** trace S0-sesudah (8 permintaan dengan lazy native) vs trace S1-sebelum (3.000
  permintaan dilepas kode asli, 0 selesai selama rekaman).
- **Mengapa AI bisa keliru:** mengulang pola solusi pra-2020 (sebelum `loading=lazy` stabil)
  tanpa memeriksa bahwa target sudah tercapai oleh platform.
- **Perbaikan yang benar menurut tim:** satu baris `loading="lazy"` + `decoding="async"` (`3fd334d`).

---

## A-04: "Pindahkan penyaringan pencarian ke web worker" (ditolak saat review, tidak diterapkan)

- **Tiket yang diminta diperbaiki:** TK-1041
- **Prompt yang diberikan (ringkas):** "Pencarian berat di main thread. Perbaiki."
- **Usulan AI (ringkas):** kirim array produk ke web worker, filter di sana, kirim hasilnya balik.
- **Jenis masalah pada usulan:**
  - [x] **Salah diagnosis** — penyaringan bukan biaya dominan, dan biaya salin data lebih
    besar daripada pekerjaan yang dihindari.
- **Bukti (mikro-benchmark, data asli 3000 produk, CPU native, median 5 ronde):**
  - 12 saringan (setara ketik "sepatu" + hapus) tanpa cache: **140,6 ms**; dengan cache: **9,8 ms**
  - 12x `structuredClone(produk)` (sekadar MENYALIN data ke worker): **187,8 ms** — lebih
    mahal dari seluruh pekerjaan yang mau di-offload.
  - Dibanding trace S1-sebelum: interaksi terburuk **14.318 ms** — filter hanyalah +-1%
    darinya; sisanya render DOM + SDK yang tidak bisa dipindah ke worker.
- **Mengapa AI bisa keliru:** pola umum "loop lambat -> worker" tanpa profil; tidak tahu
  bahwa structured clone 3000 objek per ketikan adalah biaya tersendiri.
- **Perbaikan yang benar menurut tim:** cache teks ternormalkan (`ae92f15`) — 14x lebih murah
  tanpa arsitektur baru.

---

## Refleksi (maks. 200 kata)

AI paling membantu untuk pekerjaan berpola dan berbasis bacaan kode: menulis ulang struktur
yang sudah jelas (render progresif, dua-fase baca-tulis), memberi alternatif yang belum
terpikir, dan menulis dokumentasi. Di sana ia cepat dan tekun. Waspada justru ketika usulannya
berbentuk "kata kunci solusi": debounce, web worker, IntersectionObserver, min-height —
usulan yang dibangun dari pola, bukan dari pengukuran. Empat dari empat usulan bermasalah di
atas salah pada hal yang sama: memperbaiki komponen yang TERLIHAT di kode, padahal trace
menunjukkan waktu habis di komponen lain (render DOM, rasio aset, mekanisme native). Itu
persis kelas kesalahan Rudi di catatan serah terima — dan alasan aturan tugas ini "ukur dulu".
Praktik yang kami ambil: perlakukan usulan AI sebagai hipotesis dengan bobot sama seperti
dugaan manusia — wajib melewati protokol pengukuran yang sama sebelum masuk main.
