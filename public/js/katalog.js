// Katalog: menyimpan data produk dan menggambar kisi kartu produk.

import { $, el, formatRupiah, formatRibuan, hargaSetelahDiskon } from './util.js';
import { tambahKeKeranjang, beliSekarang } from './keranjang.js';
import { periksaGulir } from './gulir.js';

export const keadaan = {
  semuaProduk: [],
  ditampilkan: [],
  hargaVoucher: new Map(), // id produk -> harga setelah voucher
};

export async function muatProduk() {
  const respons = await fetch('/api/produk');
  keadaan.semuaProduk = await respons.json();
  return keadaan.semuaProduk;
}

function buatKartu(produk) {
  const kartu = el('article', 'kartu');
  kartu.dataset.id = produk.id;

  if (produk.flashSale) kartu.append(el('span', 'lencana-kilat', '⚡ Kilat'));

  const media = el('a', 'kartu-media');
  media.href = '#produk-' + produk.id;
  const gambar = document.createElement('img');
  gambar.src = produk.gambar;
  gambar.alt = produk.nama;
  // Muat malas: browser hanya meminta gambar yang mendekati viewport, bukan
  // 3000 permintaan sekaligus saat render pertama (TK-1081: gambar lambat + boros kuota).
  // decoding=async: dekode gambar tidak menyela respons terhadap input.
  gambar.loading = 'lazy';
  gambar.decoding = 'async';
  // Dimensi intrinsik sama dengan SVG dari server (480x480) agar browser bisa
  // memesan kotak gambar berrasio tetap sejak layout pertama; gambar yang
  // termuat tidak lagi menambah tinggi kartu dan menggeser konten di bawahnya
  // (TK-1078: layout shift saat gambar termuat). Pergeseran akibat banner
  // promo yang di-prepend belakangan ditangani terpisah di promo.js (P2).
  gambar.width = 480;
  gambar.height = 480;
  media.append(gambar);

  const badan = el('div', 'kartu-badan');
  badan.append(el('h3', 'kartu-judul', produk.nama));

  const harga = el('div', 'harga');
  harga.append(el('span', 'harga-kini', formatRupiah(hargaSetelahDiskon(produk))));
  if (produk.diskon > 0) {
    harga.append(el('span', 'harga-asli', formatRupiah(produk.harga)));
    harga.append(el('span', 'harga-diskon', '-' + produk.diskon + '%'));
  }
  const hargaVoucher = keadaan.hargaVoucher.get(produk.id);
  if (hargaVoucher) harga.append(el('span', 'harga-voucher', 'Pakai voucher: ' + formatRupiah(hargaVoucher)));
  badan.append(harga);

  badan.append(el('div', 'keterangan', '★ ' + produk.rating.toLocaleString('id-ID') + ' | ' + formatRibuan(produk.terjual) + ' terjual'));
  badan.append(el('div', 'keterangan', produk.kota));

  const aksi = el('div', 'aksi');
  const tombolTambah = el('button', 'tombol-tambah', '+ Keranjang');
  tombolTambah.type = 'button';
  tombolTambah.addEventListener('click', () => tambahKeKeranjang(produk, tombolTambah));
  const tombolBeli = el('button', 'tombol-beli', 'Beli sekarang');
  tombolBeli.type = 'button';
  tombolBeli.addEventListener('click', () => beliSekarang(produk, tombolBeli));
  aksi.append(tombolTambah, tombolBeli);
  badan.append(aksi);

  kartu.append(media, badan);
  return kartu;
}

// Judul produk panjangnya beda-beda (1-3 baris). Supaya harga & tombol dalam
// satu deret sejajar rapi, tinggi judul disamakan mengikuti judul tertinggi.
//
// Dua fase: BACA semua tinggi dulu, baru TULIS semua. Membaca offsetHeight
// setelah menulis style.height membuat layout kotor dan memaksa layout sinkron
// di setiap iterasi; dengan dua fase seluruh potongan hanya memicu satu layout.
// Tinggi disamakan per potongan render: selisih antar potongan paling banyak
// satu baris judul dan tidak sejajar deret, jadi tidak terlihat.
function samakanTinggiJudul(kartuBaru) {
  const judul = [];
  let tertinggi = 0;
  for (const kartu of kartuBaru) {
    const j = kartu.querySelector('.kartu-judul');
    judul.push(j);
    const tinggi = j.offsetHeight; // fase baca
    if (tinggi > tertinggi) tertinggi = tinggi;
  }
  for (const j of judul) j.style.height = tertinggi + 'px'; // fase tulis
}

// Render progresif: membangun ribuan kartu dalam satu task membuat event loop
// sibuk berpuluh-puluh ratus ms (Style+Layout raksasa) tanpa rendering
// opportunity, sehingga ketikan berikutnya mengantri dan teks telat muncul
// (TK-1041). Potongan pertama dirender sinkron supaya umpan balik instan,
// sisanya satu potongan per bingkai lewat requestAnimationFrame supaya tiap
// task pendek dan browser bisa menyisipkan input + paint di antaranya.
const UKURAN_POTONGAN = 60;
let tokenRender = 0;

export function renderProduk(daftar) {
  const kisi = $('#kisi');
  const saya = ++tokenRender; // batalkan potongan render lama yang masih terjadwal
  keadaan.ditampilkan = daftar;
  kisi.innerHTML = '';

  if (daftar.length === 0) {
    const kosong = el('div', 'kosong');
    kosong.append(el('strong', '', 'Produk tidak ditemukan.'), el('p', '', 'Periksa ejaan, atau coba kata kunci yang lebih umum seperti "sepatu" atau "serum".'));
    kisi.append(kosong);
  }

  function cetakPotongan(dari) {
    const sampai = Math.min(dari + UKURAN_POTONGAN, daftar.length);
    const potongan = document.createDocumentFragment();
    const kartuBaru = [];
    for (let i = dari; i < sampai; i++) {
      const kartu = buatKartu(daftar[i]);
      kartuBaru.push(kartu);
      potongan.append(kartu);
    }
    kisi.append(potongan); // satu reflow per potongan, bukan per kartu
    samakanTinggiJudul(kartuBaru);
    // Kartu baru perlu ditandai .terlihat (CSS menyembunyikan kartu tanpa
    // tanda sampai periksaGulir memeriksanya); dipanggil per potongan juga
    // mencatat impresi kartu yang masuk layar tanpa menunggu event scroll.
    periksaGulir();
    return sampai;
  }

  let berikut = cetakPotongan(0); // potongan pertama; saat hasil kosong ini juga memanggil periksaGulir seperti semula
  function lanjutCetak() {
    if (saya !== tokenRender) return; // ada render baru; potongan ini kedaluwarsa
    berikut = cetakPotongan(berikut);
    if (berikut < daftar.length) requestAnimationFrame(lanjutCetak);
  }
  if (berikut < daftar.length) requestAnimationFrame(lanjutCetak);

  // Jumlah yang dilaporkan adalah jumlah hasil saringan penuh, bukan yang
  // sudah masuk DOM (aturan: jumlah hasil yang ditampilkan harus benar).
  $('#ringkasan').textContent = daftar.length.toLocaleString('id-ID') + ' produk ditampilkan';
}

export function perbaruiHargaVoucherDiKartu() {
  renderProduk(keadaan.ditampilkan);
}
