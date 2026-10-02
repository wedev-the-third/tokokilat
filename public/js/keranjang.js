// Keranjang belanja, riwayat penelusuran, dan "Beli sekarang".
// Semua disimpan di localStorage supaya tetap ada walau halaman dimuat ulang.

import { $, el, formatRupiah, hargaSetelahDiskon, salinDalam, tampilkanToast } from './util.js';

const KUNCI_KERANJANG = 'tk_keranjang';
const KUNCI_RIWAYAT = 'tk_riwayat';

const KONFIG = { maksPerProduk: 99, mataUang: 'IDR', sumber: 'web-flashsale-1212' };

// Guard per produk: satu checkout boleh berjalan untuk setiap produk.
const pesananDiproses = new Set();

// Jalankan pekerjaan sekunder pada task setelah browser mendapat kesempatan
// menggambar perubahan UI dari interaksi saat ini.
function setelahPaint(aksi) {
  requestAnimationFrame(() => {
    setTimeout(aksi, 0);
  });
}

function pulihkanTombol(tombol, produkId) {
  pesananDiproses.delete(produkId);
  tombol.disabled = false;
  tombol.removeAttribute('aria-busy');
  tombol.textContent = 'Beli sekarang';
}

function bacaKeranjang() {
  return JSON.parse(localStorage.getItem(KUNCI_KERANJANG) || '[]');
}
function simpanKeranjang(isi) {
  localStorage.setItem(KUNCI_KERANJANG, JSON.stringify(isi));
}
function bacaRiwayat() {
  return JSON.parse(localStorage.getItem(KUNCI_RIWAYAT) || '[]');
}
function simpanRiwayat(riwayat) {
  localStorage.setItem(KUNCI_RIWAYAT, JSON.stringify(riwayat));
}

// Riwayat aktivitas dipakai tim rekomendasi ("Karena kamu melihat...").
// Untuk pengembangan, kita isi dengan data contoh pelanggan lama yang aktif
// sejak 2023 supaya kondisinya mirip pengguna sungguhan.
export function siapkanRiwayatContoh(semuaProduk) {
  if (localStorage.getItem(KUNCI_RIWAYAT)) return;
  const riwayat = [];
  const jenis = ['lihat', 'lihat', 'lihat', 'cari', 'keranjang', 'beli'];
  let waktu = Date.parse('2023-01-05T08:00:00+07:00');
  for (let i = 0; i < 9000; i++) {
    const p = semuaProduk[(i * 131) % semuaProduk.length];
    waktu += 1000 * 60 * (7 + (i % 190));
    riwayat.push({ t: waktu, jenis: jenis[i % jenis.length], id: p.id, nama: p.nama, kategori: p.kategori, harga: p.harga });
  }
  simpanRiwayat(riwayat);
}

export function perbaruiLencana() {
  const total = bacaKeranjang().reduce((n, item) => n + item.jumlah, 0);
  $('#lencana-keranjang').textContent = total;
}

function gambarPanel() {
  const daftar = $('#daftar-keranjang');
  const isi = bacaKeranjang();
  daftar.innerHTML = '';
  let total = 0;
  if (isi.length === 0) daftar.append(el('li', '', 'Keranjang masih kosong. Tambahkan produk dari daftar.'));
  for (const item of isi) {
    total += item.harga * item.jumlah;
    const baris = el('li');
    baris.append(el('span', '', item.nama), el('span', 'jumlah', item.jumlah + ' x ' + formatRupiah(item.harga)));
    const hapus = el('button', 'hapus', 'Hapus dari keranjang');
    hapus.type = 'button';
    hapus.addEventListener('click', () => {
      simpanKeranjang(bacaKeranjang().filter((x) => x.id !== item.id));
      perbaruiLencana();
      gambarPanel();
    });
    baris.append(hapus);
    daftar.append(baris);
  }
  $('#total-keranjang').textContent = formatRupiah(total);
}

export function tambahKeKeranjang(produk, tombol) {
  const konfig = salinDalam(KONFIG);
  const keranjang = bacaKeranjang();

  let item = keranjang.find((isi) => isi.id === produk.id);
  if (item) item.jumlah = Math.min(item.jumlah + 1, konfig.maksPerProduk);
  else {
    item = { id: produk.id, nama: produk.nama, harga: hargaSetelahDiskon(produk), jumlah: 1 };
    keranjang.push(item);
  }

  simpanKeranjang(keranjang);

  // Umpan balik utama selesai sebelum riwayat besar dan SDK diproses.
  perbaruiLencana();
  tombol.textContent = 'Ditambahkan ✓';
  tombol.classList.add('sudah');
  setTimeout(() => {
    tombol.textContent = '+ Keranjang';
    tombol.classList.remove('sudah');
  }, 1500);
  tampilkanToast('Ditambahkan ke keranjang: ' + produk.nama);

  setelahPaint(() => {
    const riwayat = bacaRiwayat();
    riwayat.push({ t: Date.now(), jenis: 'keranjang', id: produk.id, nama: produk.nama, kategori: produk.kategori, harga: produk.harga });
    simpanRiwayat(riwayat);

    if (window.Lacak) {
      window.Lacak.kirim('add_to_cart', {
        produk: {
          id: produk.id,
          nama: produk.nama,
          kategori: produk.kategori,
          harga: hargaSetelahDiskon(produk),
        },
        jumlahProduk: item.jumlah,
        totalItem: keranjang.reduce((total, isi) => total + isi.jumlah, 0),
        jumlahRiwayat: riwayat.length,
        sumber: konfig.sumber,
      });
    }
  });
}

export async function beliSekarang(produk, tombol) {
  if (pesananDiproses.has(produk.id)) return;

  pesananDiproses.add(produk.id);
  tombol.disabled = true;
  tombol.setAttribute('aria-busy', 'true');
  tombol.textContent = 'Memproses…';

  setelahPaint(() => {
    const riwayat = bacaRiwayat();
    riwayat.push({ t: Date.now(), jenis: 'beli', id: produk.id, nama: produk.nama, kategori: produk.kategori, harga: produk.harga });
    simpanRiwayat(riwayat);

    if (window.Lacak) {
      window.Lacak.kirim('begin_checkout', {
        produk: {
          id: produk.id,
          nama: produk.nama,
          kategori: produk.kategori,
          harga: hargaSetelahDiskon(produk),
        },
        jumlahRiwayat: riwayat.length,
        sumber: KONFIG.sumber,
      });
    }
  });

  try {
    const respons = await fetch('/api/pesanan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produkId: produk.id, nama: produk.nama }),
    });

    if (!respons.ok) throw new Error('Pesanan gagal dibuat: HTTP ' + respons.status);

    const pesanan = await respons.json();
    tombol.textContent = 'Dipesan ✓';
    tampilkanToast('Pesanan ' + pesanan.id + ' dibuat: ' + produk.nama);

    // Pesanan sudah berhasil dibuat. Kegagalan refresh lencana tidak boleh
    // membuat pengguna mengira POST gagal lalu mencoba memesan lagi.
    perbaruiLencanaPesanan().catch((error) => {
      console.error('Gagal memperbarui lencana pesanan:', error);
    });

    setTimeout(() => pulihkanTombol(tombol, produk.id), 1500);
  } catch (error) {
    console.error(error);
    tampilkanToast('Pesanan gagal dibuat. Silakan coba lagi.');
    pulihkanTombol(tombol, produk.id);
  }
}

export async function perbaruiLencanaPesanan() {
  const respons = await fetch('/api/pesanan');
  if (!respons.ok) throw new Error('Gagal mengambil pesanan: HTTP ' + respons.status);
  const pesanan = await respons.json();
  $('#lencana-pesanan').textContent = pesanan.length;
  return pesanan;
}

export function pasangKeranjang() {
  const panel = $('#panel-keranjang');
  const tombolBuka = $('#tombol-keranjang');
  const buka = (ya) => {
    panel.hidden = !ya;
    tombolBuka.setAttribute('aria-expanded', String(ya));
    if (ya) gambarPanel();
  };
  tombolBuka.addEventListener('click', () => buka(panel.hidden));
  $('#tutup-keranjang').addEventListener('click', () => buka(false));
  $('#kosongkan-keranjang').addEventListener('click', () => {
    simpanKeranjang([]);
    perbaruiLencana();
    gambarPanel();
  });

  $('#tombol-pesanan').addEventListener('click', async () => {
    try {
      const pesanan = await perbaruiLencanaPesanan();
      if (pesanan.length === 0) return tampilkanToast('Belum ada pesanan. Tekan "Beli sekarang" pada produk untuk memesan.');
      const terakhir = pesanan.slice(-3).map((p) => p.id + ' (produk #' + p.produkId + ')').join(', ');
      tampilkanToast(pesanan.length + ' pesanan. Terakhir: ' + terakhir);
    } catch (error) {
      console.error(error);
      tampilkanToast('Daftar pesanan gagal dimuat.');
    }
  });

  perbaruiLencana();
  perbaruiLencanaPesanan().catch((error) => {
    console.error('Gagal memperbarui lencana pesanan:', error);
  });
}
