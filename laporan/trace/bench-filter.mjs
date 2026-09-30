import { readFileSync } from 'node:fs';
const produk = JSON.parse(readFileSync('/tmp/opencode/produk.json', 'utf8'));
console.log('produk:', produk.length);

function normalkan(teks) {
  return teks.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

// simulasi S1: ketik "sepatu" (6 huruf) + hapus 6 huruf = 12 saringan
const kunciPerTahap = ['s','se','sep','sepa','sepat','sepatu','sepat','sepa','sep','se','s',''];

function tanpaCache() {
  const t0 = performance.now();
  for (const k of kunciPerTahap) {
    const kunci = normalkan(k), kata = kunci ? kunci.split(' ') : [];
    produk.filter((p) => {
      const teks = normalkan(p.nama + ' ' + p.merek + ' ' + p.kategori + ' ' + p.kota);
      return kata.every((x) => teks.includes(x));
    });
  }
  return performance.now() - t0;
}

const cache = new Map();
function teksCari(p) {
  let t = cache.get(p.id);
  if (t === undefined) { t = normalkan(p.nama + ' ' + p.merek + ' ' + p.kategori + ' ' + p.kota); cache.set(p.id, t); }
  return t;
}
function denganCache() {
  const t0 = performance.now();
  for (const k of kunciPerTahap) {
    const kunci = normalkan(k), kata = kunci ? kunci.split(' ') : [];
    produk.filter((p) => kata.every((x) => teksCari(p).includes(x)));
  }
  return performance.now() - t0;
}

// jalankan beberapa ronde, ambil median
const ronde = (f, n) => { const r = []; for (let i = 0; i < n; i++) r.push(f()); r.sort((a,b)=>a-b); return r[Math.floor(n/2)]; };
console.log('12 saringan TANPA cache (median 5 ronde):', ronde(tanpaCache, 5).toFixed(1), 'ms');
cache.clear(); // waktu pembuatan cache dihitung terpisah
const t0 = performance.now(); produk.forEach(teksCari); const tCache = performance.now() - t0;
console.log('pembuatan cache sekali:', tCache.toFixed(1), 'ms');
console.log('12 saringan DENGAN cache (median 5 ronde):', ronde(denganCache, 5).toFixed(1), 'ms');
// biaya kirim 3000 produk ke web worker (structuredClone) untuk pembanding usulan worker
const t1 = performance.now(); for (let i = 0; i < 12; i++) structuredClone(produk); const tClone = performance.now() - t1;
console.log('12x structuredClone(3000 produk) [biaya salin ke worker]:', tClone.toFixed(1), 'ms');
