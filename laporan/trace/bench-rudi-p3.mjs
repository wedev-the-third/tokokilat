import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';

const ROOT = new URL('../../', import.meta.url);

function baca(path) {
  return readFileSync(new URL(path, ROOT), 'utf8');
}

function median(angka) {
  const urut = angka.slice().sort((a, b) => a - b);
  return urut[Math.floor(urut.length / 2)];
}

function ukurPerPanggilan(aksi, iterasi, putaran = 9) {
  for (let i = 0; i < Math.min(iterasi, 20); i++) aksi();
  const sampel = [];
  for (let putaranKe = 0; putaranKe < putaran; putaranKe++) {
    const mulai = performance.now();
    for (let i = 0; i < iterasi; i++) aksi();
    sampel.push((performance.now() - mulai) / iterasi);
  }
  return median(sampel);
}

function bulat(angka) {
  return Number(angka.toFixed(4));
}

// Jalankan generator data asli agar kardinalitas dan bentuk objek sama dengan aplikasi.
const server = baca('server.js');
const awalGenerator = server.indexOf('function mulberry32');
const akhirGenerator = server.indexOf('const PRODUK =');
if (awalGenerator < 0 || akhirGenerator < 0) throw new Error('Generator produk tidak ditemukan.');
const konteksData = vm.createContext({});
vm.runInContext(
  server.slice(awalGenerator, akhirGenerator) + '\nglobalThis.__produk = buatProduk(3000);',
  konteksData,
);
const produk = konteksData.__produk;

// DOM minimum untuk menjalankan util.js dan kategori.js yang asli tanpa browser.
function elemen() {
  return {
    children: [],
    className: '',
    textContent: '',
    append(...anak) { this.children.push(...anak); },
    classList: { add() {}, remove() {} },
  };
}

const target = {
  '#merek-populer': elemen(),
  '#kategori-terkait': elemen(),
  '#toast': elemen(),
};
let jumlahQueryKategori = 0;
const document = {
  querySelector(selektor) {
    return target[selektor] || elemen();
  },
  querySelectorAll(selektor) {
    if (selektor === '#kategori-terkait li') {
      jumlahQueryKategori++;
      return target['#kategori-terkait'].children.slice();
    }
    return [];
  },
  createElement() {
    return elemen();
  },
};

const konteksHalaman = vm.createContext({
  document,
  Intl,
  JSON,
  Math,
  setTimeout,
  clearTimeout,
});
const util = baca('public/js/util.js').replace(/^export /gm, '');
const kategori = baca('public/js/kategori.js')
  .replace(/^import .*;\r?\n/gm, '')
  .replace(/^export /gm, '');
vm.runInContext(util, konteksHalaman);
vm.runInContext(kategori, konteksHalaman);
const pasangKaki = vm.runInContext('pasangKaki', konteksHalaman);
const urutkanGelembung = vm.runInContext('urutkanGelembung', konteksHalaman);

function resetKaki() {
  target['#merek-populer'].children = [];
  target['#kategori-terkait'].children = [];
  jumlahQueryKategori = 0;
}

resetKaki();
pasangKaki(produk);
const kategoriUnik = new Set(produk.map((p) => p.kategori)).size;
const merekUnik = new Set(produk.map((p) => p.merek)).size;
const queryKategoriPerPanggilan = jumlahQueryKategori;
const pasangKakiMs = ukurPerPanggilan(() => {
  resetKaki();
  pasangKaki(produk);
}, 100);

const daftarMerek = [...new Set(produk.map((p) => p.merek))]
  .map((nama, i) => ({ nama, terjual: (i * 7919) % 12000 }));
const pembanding = (a, b) => b.terjual - a.terjual;
let perbandinganBubble = 0;
urutkanGelembung(daftarMerek, (a, b) => {
  perbandinganBubble++;
  return pembanding(a, b);
});
const bubbleMs = ukurPerPanggilan(
  () => urutkanGelembung(daftarMerek, pembanding),
  50000,
);
const nativeSortMs = ukurPerPanggilan(
  () => daftarMerek.slice().sort(pembanding),
  50000,
);

// Muat berkas vendor apa adanya pada window tiruan.
const windowSdk = {
  document: { location: { pathname: '/' } },
  navigator: {
    userAgent: 'benchmark-tokokilat',
    language: 'id-ID',
    hardwareConcurrency: 8,
  },
  screen: { width: 412, height: 915, colorDepth: 24 },
};
windowSdk.window = windowSdk;
const muatSdk = new Function(
  'window',
  `${baca('public/vendor/lacak.min.js')}\nreturn window.Lacak;`,
);
windowSdk.Lacak = muatSdk(windowSdk);

const riwayat = Array.from({ length: 9001 }, (_, i) => {
  const p = produk[(i * 131) % produk.length];
  return {
    t: 1672880400000 + i * 600000,
    jenis: 'lihat',
    id: p.id,
    nama: p.nama,
    kategori: p.kategori,
    harga: p.harga,
  };
});
const keranjang = [{
  id: produk[0].id,
  nama: produk[0].nama,
  harga: produk[0].harga,
  jumlah: 1,
}];
const payloadPenuh = {
  produk: produk[0],
  keranjang,
  riwayat,
  sumber: 'web-flashsale-1212',
};
const payloadRingkas = {
  produk: {
    id: produk[0].id,
    nama: produk[0].nama,
    kategori: produk[0].kategori,
    harga: produk[0].harga,
  },
  jumlahProduk: 1,
  totalItem: 1,
  jumlahRiwayat: riwayat.length,
  sumber: 'web-flashsale-1212',
};

const stringifyPenuhMs = ukurPerPanggilan(() => JSON.stringify(payloadPenuh), 50);
const stringifyRingkasMs = ukurPerPanggilan(() => JSON.stringify(payloadRingkas), 10000);
const sdkPenuhMs = ukurPerPanggilan(
  () => windowSdk.Lacak.kirim('add_to_cart', payloadPenuh),
  1,
  3,
);
const sdkRingkasMs = ukurPerPanggilan(
  () => windowSdk.Lacak.kirim('add_to_cart', payloadRingkas),
  1,
  3,
);

const hasil = {
  lingkungan: {
    node: process.version,
    platform: `${process.platform} ${process.arch}`,
    catatan: 'Microbenchmark Node tanpa CPU throttling; gunakan untuk perbandingan mekanisme, bukan pengganti trace Chrome.',
  },
  dataNyata: {
    produk: produk.length,
    kategoriUnik,
    merekUnik,
  },
  kategori: {
    querySelectorAllPerPanggilan: queryKategoriPerPanggilan,
    pasanganDiperiksa: kategoriUnik * (kategoriUnik - 1),
    pasangKakiMedianMs: bulat(pasangKakiMs),
  },
  pengurutan12Merek: {
    perbandinganBubble,
    bubbleMedianMs: bulat(bubbleMs),
    nativeSortMedianMs: bulat(nativeSortMs),
    selisihMs: bulat(bubbleMs - nativeSortMs),
  },
  sdk: {
    payloadPenuhByte: Buffer.byteLength(JSON.stringify(payloadPenuh)),
    payloadRingkasByte: Buffer.byteLength(JSON.stringify(payloadRingkas)),
    stringifyPenuhMedianMs: bulat(stringifyPenuhMs),
    stringifyRingkasMedianMs: bulat(stringifyRingkasMs),
    kirimPenuhMedianMs: bulat(sdkPenuhMs),
    kirimRingkasMedianMs: bulat(sdkRingkasMs),
  },
};

console.log(JSON.stringify(hasil, null, 2));
