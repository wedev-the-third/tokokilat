# Tangkapan layar bukti (P1)

Berkas PNG/JPG di folder ini TIDAK diabaikan git - komit sebagai lampiran bukti.
Penamaan: `<skenario>-<sebelum|sesudah>-<isi>.png`

Yang dinanti untuk laporan:

- `s0-sebelum-about-blank.png` - tab yang jatuh ke about:blank saat merekam pemuatan pada
  CPU 4x (TK-1081: "nyaris tidak bisa dipakai" di simulasi perangkat kelas bawah). Sertakan
  kondisi: CPU 4x, viewport, waktu tunggu, dan server tetap sehat (curl /api/produk = 200).
- `s1-sebelum-flamechart-*.png` - flame chart beranotasi: task per ketikan, fungsi dominan
  (Lacak.kirim, buatKartu, samakanTinggiJudul, cocok), durasi.
- `s0-sesudah-network.png` - panel Network: jumlah permintaan gambar setelah perbaikan.
- `s0-*-layout-shifts.png` - track Layout Shifts (atribusi sumber CLS).
