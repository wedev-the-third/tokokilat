// Elemen kampanye: hitung mundur, teks berjalan, dan banner promo.

import { $, el, tampilkanToast } from './util.js';

// Flash sale berakhir tengah malam nanti (waktu perangkat).
function akhirFlashSale() {
  const t = new Date();
  t.setHours(24, 0, 0, 0);
  return t.getTime();
}

const duaDigit = (n) => String(n).padStart(2, '0');

function pasangHitungMundur() {
  const akhir = akhirFlashSale();
  const awal = Date.now();
  const wadah = $('#hitung-mundur');
  const garis = $('#hm-garis');
  const jam = $('#hm-jam'), menit = $('#hm-menit'), detik = $('#hm-detik'), senti = $('#hm-senti');

  if (!wadah || !garis) return;

  // Cache lebarPenuh agar tidak memicu forced reflow (offsetWidth) di setiap tick
  let lebarPenuh = wadah.offsetWidth;
  window.addEventListener('resize', () => {
    lebarPenuh = wadah.offsetWidth;
  }, { passive: true });

  // Ubah interval dari 10ms menjadi 100ms dan lakukan DOM value diffing.
  // Memangkas 90% aktivitas Main Thread tanpa mengurangi estetika tampilan.
  setInterval(() => {
    const sisa = Math.max(akhir - Date.now(), 0);
    const j = duaDigit(Math.floor(sisa / 3600000));
    const m = duaDigit(Math.floor((sisa % 3600000) / 60000));
    const d = duaDigit(Math.floor((sisa % 60000) / 1000));
    const s = duaDigit(Math.floor((sisa % 1000) / 10));

    // Hanya perbarui DOM jika nilainya berubah
    if (jam.textContent !== j) jam.textContent = j;
    if (menit.textContent !== m) menit.textContent = m;
    if (detik.textContent !== d) detik.textContent = d;
    if (senti.textContent !== s) senti.textContent = s;

    garis.style.width = Math.round(lebarPenuh * (sisa / (akhir - awal + 1))) + 'px';
  }, 100);
}

function pasangTeksBerjalan() {
  const teks = $('#berjalan-teks');
  if (!teks) return;

  // Pindahkan animasi teks berjalan dari JS Main Thread ke CSS Compositor Thread.
  // Menggunakan transform: translateX() offload tugas animasi sepenuhnya ke GPU.
  teks.style.display = 'inline-block';
  teks.style.whiteSpace = 'nowrap';

  if (!document.getElementById('style-animasi-berjalan')) {
    const style = document.createElement('style');
    style.id = 'style-animasi-berjalan';
    style.textContent = `
      @keyframes jalanTeksCompositor {
        0% { transform: translateX(100%); }
        100% { transform: translateX(-100%); }
      }
    `;
    document.head.appendChild(style);
  }
  teks.style.animation = 'jalanTeksCompositor 15s linear infinite';
}

async function pasangBannerPromo() {
  const respons = await fetch('/api/promo');
  const promo = await respons.json();

  const banner = el('section', 'promo-banner');
  const teks = el('div');
  teks.append(el('h2', '', promo.judul), el('p', '', promo.isi));
  const tombol = el('button', '', promo.tombol);
  tombol.type = 'button';
  tombol.addEventListener('click', () => {
    tampilkanToast('Syarat promo: berlaku 12 Desember, satu voucher per akun, tidak bisa digabung.');
    if (window.Lacak) window.Lacak.kirim('promo_click', { judul: promo.judul });
  });
  banner.append(teks, tombol);

  $('#utama').prepend(banner);
}

export function pasangPromo() {
  pasangHitungMundur();
  pasangTeksBerjalan();
  pasangBannerPromo();
}