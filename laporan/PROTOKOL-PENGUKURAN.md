# Protokol pengukuran bersama (lead pengukuran: P1)

Semua angka yang masuk `LAPORAN.md` **wajib** diambil dengan cara yang sama supaya bisa
dibandingkan antar orang dan antar waktu. Ringkasan ini menyarikan `TUGAS.md` bagian 7 —
bila ada perbedaan, `TUGAS.md` yang berlaku.

## A. Kalibrasi lingkungan (sekali per sesi, wajib sama untuk sebelum vs sesudah)

1. Chrome stabil terbaru, **jendela Incognito**, tanpa ekstensi, tab lain ditutup,
   laptop colok listrik. Catat spesifikasi laptop (CPU, RAM, OS, versi Chrome).
2. DevTools terbuka → device toolbar aktif → viewport **412 × 915**.
3. Panel Performance → pengaturan **CPU: 4x slowdown**. Jaringan **tanpa** throttling.
4. Buka `http://localhost:3000/?ukur=1`, tunggu halaman tenang, **muat ulang sekali**
   (pemuatan pertama di Incognito menulis data contoh ke localStorage), baru mulai mengukur.
5. Tekan **Reset** di alat ukur (pojok kiri bawah) sebelum tiap skenario.
6. Setiap skenario diulang **3 kali**, yang dilaporkan **median**.
7. Bandingkan hanya angka sebelum vs sesudah **dari mesin dan konfigurasi yang sama**.
   Bila 4x tidak bisa dipakai sama sekali, pakai `npm run start:ringan` dan tulis itu
   eksplisit di laporan.

## B. Skenario dan pemiliknya

| Kode | Ringkas langkah | Tiket | Pemilik |
|---|---|---|---|
| S0 | Muat halaman, diam 10 dtk; amati Network: jumlah & waktu selesainya permintaan gambar | TK-1078, TK-1081 | **P1** |
| S1 | Ketik `sepatu` huruf demi huruf, lalu hapus semuanya | TK-1041 | **P1** |
| S2 | Tekan "+ Keranjang" satu kali pada satu produk | TK-1044 | P3 |
| S3 | Tekan "Beli sekarang" 3× secepat mungkin; cek lencana Pesanan + log terminal server | TK-1052 | P3 |
| S4 | "Pakai voucher" `KILAT1212`; selama menghitung, coba ketik di kolom cari | TK-1057 | P2 |
| S5 | Gulir daftar produk terus-menerus 10 dtk | TK-1063 | P2 |
| S6 | Diam 10 dtk tanpa menyentuh apa pun setelah halaman selesai dimuat | TK-1070 | P2 |

## C. Merekam satu trace (semua orang cara yang sama)

1. Performance panel → pastikan CPU masih 4x → **Record**.
2. Jalankan langkah skenario (A.5–A.6 berlaku).
3. **Stop**. Simpan via ikon unduh: nama berkas **`trace-<kode>-<tiket>-<sebelum|sesudah>-<run>.json`**
   contoh: `trace-S1-TK1041-sebelum-2.json`. Simpan di `laporan/trace/`
   (pola `trace-*.json` sengaja diabaikan git karena berkasnya besar; pasangan resmi
   untuk laporan ditambahkan dengan `git add -f` bila diputuskan masuk repo, atau taruh
   tautan awan di `LAPORAN.md`).
4. Yang wajib terlihat/tianotasi pada tangkapan layar flame chart:
   - fungsi dominan di **bottom-up**,
   - track **Interactions** (durasi + tunda input vs proses vs presentasi),
   - **Layout Shifts** (S0) / **Frames** (S5, S6) / **Network** (S0).

## D. Merekam baseline dari kode asli (setelah perbaikan menyentuh `main`)

Riwayat git = barang bukti, jadi baseline tetap direkam dari commit awal:

```bash
git switch --detach <hash-commit-awal>   # saat ini: 113af2b
npm start                                 # rekam baseline skenario milikmu
git switch main                           # rekam versi sesudah perbaikan
```

Matikan server sebelum pindah commit, dan jangan lupa `git switch main` lagi sebelum
melanjutkan pekerjaan.

## E. Format pelaporan angka

Satu baris per skenario per kondisi, median dari 3 run:

| Skenario | Kondisi | Metrik utama | Nilai median |
|---|---|---|---|
| S1 | sebelum | INP (ms), long task terlama (ms), jumlah long task | ... |
| S1 | sesudah | sama | ... |

Angka alat ukur pojok kiri bawah hanya untuk memantau cepat — bukti diagnosis tetap
rekaman panel Performance.
