// Perilaku saat halaman digulir: bayangan header, bar progres baca,
// tombol "Ke atas", efek kartu muncul, dan pencatatan impresi produk.

import { $ } from './util.js';

const sudahTercatat = new Set();
const impresiBaru = [];
let impresiTimer = null;

// IntersectionObserver menggantikan loop getBoundingClientRect() pada ribuan kartu.
// Menghilangkan Layout Thrashing saat pengguliran berlangsung.
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const kartu = entry.target;
        if (!kartu.classList.contains('terlihat')) {
          kartu.classList.add('terlihat');
          kartu.style.minHeight = Math.round(entry.boundingClientRect.height) + 'px';
        }
        const id = kartu.dataset.id;
        if (id && !sudahTercatat.has(id)) {
          sudahTercatat.add(id);
          impresiBaru.push(id);
        }
      }
    });

    if (impresiBaru.length) {
      if (impresiTimer) clearTimeout(impresiTimer);
      impresiTimer = setTimeout(() => {
        if (impresiBaru.length && window.Lacak) {
          window.Lacak.kirim('impression', { produk: [...impresiBaru] });
          impresiBaru.length = 0;
        }
      }, 100);
    }
  },
  {
    rootMargin: '80px 0px 80px 0px',
    threshold: 0,
  }
);

function amatiKartuBaru() {
  document.querySelectorAll('.kartu:not([data-observed])').forEach((kartu) => {
    kartu.dataset.observed = 'true';
    observer.observe(kartu);
  });
}

// MutationObserver memantau penambahan kartu produk baru di DOM secara otomatis
const mutationObserver = new MutationObserver(() => {
  amatiKartuBaru();
});

let ticking = false;

export function periksaGulir() {
  if (ticking) return;
  ticking = true;

  // Throttling menggunakan requestAnimationFrame agar update UI berlangsung maksimal 1x per frame
  requestAnimationFrame(() => {
    const kepala = $('#kepala');
    const bar = $('#bar-gulir');
    const keAtas = $('#ke-atas');

    const y = window.scrollY;
    if (kepala) kepala.classList.toggle('melayang', y > 8);
    if (keAtas) keAtas.hidden = y < 900;

    if (bar) {
      const tinggiDokumen = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (tinggiDokumen > 0 ? (y / tinggiDokumen) * 100 : 0) + '%';
    }

    ticking = false;
  });
}

export function pasangGulir() {
  amatiKartuBaru();
  mutationObserver.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('scroll', periksaGulir, { passive: true });
  window.addEventListener('resize', periksaGulir, { passive: true });

  let yAwal = 0;
  const utama = $('#utama');
  if (utama) {
    utama.addEventListener('touchstart', (e) => { yAwal = e.touches[0].clientY; }, { passive: true });
    utama.addEventListener('touchmove', (e) => {
      const menarikKeBawah = e.touches[0].clientY > yAwal;
      if (window.scrollY === 0 && menarikKeBawah) {
        e.preventDefault();
      }
      periksaGulir();
    }, { passive: false });
    utama.addEventListener('wheel', () => { periksaGulir(); }, { passive: true });
  }

  const keAtasBtn = $('#ke-atas');
  if (keAtasBtn) {
    keAtasBtn.addEventListener('click', () => window.scrollTo({ top: 0 }));
  }
}