// Pencarian, saringan kategori, dan pengurutan.

import { $, el, hargaSetelahDiskon } from './util.js';
import { keadaan, renderProduk } from './katalog.js';

const saringan = { kata: '', kategori: 'Semua', urut: 'relevan' };

// Pengirim event 'search' yang ditunda sampai ketikan selesai (lihat terapkanSaringan).
let pengaturSearch = 0;

// "Sepatu Lari" == "sepatu  lari" == "SEPATU-LARI"
function normalkan(teks) {
  return teks
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// normalisasi memakai NFD + dua regex - mahal jika diulang untuk 3000 produk
// pada SETIAP ketikan. Teks siap-cari tiap produk cukup dihitung sekali dan
// di-cache (id produk -> teks ternormalkan), karena data produk tidak berubah.
const cacheTeksCari = new Map();

function teksCari(produk) {
  let teks = cacheTeksCari.get(produk.id);
  if (teks === undefined) {
    teks = normalkan(produk.nama + ' ' + produk.merek + ' ' + produk.kategori + ' ' + produk.kota);
    cacheTeksCari.set(produk.id, teks);
  }
  return teks;
}

// kataKunci: array kata yang sudah dipecah sekali per saringan (bukan per produk).
function cocok(produk, kataKunci) {
  const teks = teksCari(produk);
  return kataKunci.every((k) => teks.includes(k));
}

const PEMBANDING = {
  murah: (a, b) => hargaSetelahDiskon(a) - hargaSetelahDiskon(b),
  mahal: (a, b) => hargaSetelahDiskon(b) - hargaSetelahDiskon(a),
  laris: (a, b) => b.terjual - a.terjual,
  rating: (a, b) => b.rating - a.rating || b.terjual - a.terjual,
};

export function terapkanSaringan() {
  const kunci = normalkan(saringan.kata);
  const kataKunci = kunci ? kunci.split(' ') : [];
  let hasil = keadaan.semuaProduk.filter((p) => {
    if (saringan.kategori !== 'Semua' && p.kategori !== saringan.kategori) return false;
    if (kataKunci.length && !cocok(p, kataKunci)) return false;
    return true;
  });
  if (PEMBANDING[saringan.urut]) hasil = hasil.slice().sort(PEMBANDING[saringan.urut]);
  renderProduk(hasil);

  // Event 'search' tetap terkirim dengan kata kunci akhir + jumlah hasil, tetapi
  // cukup sekali setelah pengguna berhenti mengetik. Setiap Lacak.kirim()
  // menjalankan sidik jari perangkat +-2 juta iterasi hash secara sinkron di
  // dalam SDK - terlalu mahal untuk dipanggil pada tiap ketikan (koordinasi
  // dengan P3 pemilik domain SDK; aturan TUGAS.md no. 1 mengizinkan mengubah
  // waktu pemanggilan selama event tetap terkirim dengan info yang masuk akal).
  if (window.Lacak && kunci) {
    clearTimeout(pengaturSearch);
    const kata = saringan.kata;
    const jumlah = hasil.length;
    pengaturSearch = setTimeout(() => window.Lacak.kirim('search', { kata, jumlah }), 500);
  }
}

export function pasangPencarian() {
  // Panaskan cache sekali saat halaman dimuat, bukan pada ketikan pertama:
  // memindahkan biaya normalisasi 3000 produk dari jalur interaksi ke jalur muat.
  for (const p of keadaan.semuaProduk) teksCari(p);

  const kolom = $('#kolom-cari');
  kolom.addEventListener('input', () => {
    saringan.kata = kolom.value;
    terapkanSaringan();
  });

  $('#pilih-urut').addEventListener('change', (e) => {
    saringan.urut = e.target.value;
    terapkanSaringan();
  });

  const wadah = $('#keping-kategori');
  const kategori = ['Semua', ...new Set(keadaan.semuaProduk.map((p) => p.kategori))];
  for (const nama of kategori) {
    const keping = el('button', 'keping', nama);
    keping.type = 'button';
    keping.setAttribute('aria-pressed', String(nama === 'Semua'));
    keping.addEventListener('click', () => {
      saringan.kategori = nama;
      wadah.querySelectorAll('.keping').forEach((k) => k.setAttribute('aria-pressed', String(k === keping)));
      terapkanSaringan();
    });
    wadah.append(keping);
  }
}
