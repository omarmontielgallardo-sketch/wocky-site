'use client';
import { useEffect, useState } from 'react';

// Barra de progreso, aparición al hacer scroll, fondos con movimiento, ondas en botones,
// luz/inclinación en tarjetas, palabra cambiante, contadores y botón de subir.
export default function ScrollFx() {
  const [top, setTop] = useState(false);
  useEffect(() => {
    const prog = document.getElementById('progress');
    const onScroll = () => {
      const h = document.documentElement;
      if (prog) prog.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight || 1)) * 100 + '%';
      setTop(scrollY > 700);
    };
    addEventListener('scroll', onScroll, { passive: true });
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = matchMedia('(pointer:fine)').matches;
    const cleanups: (() => void)[] = [];

    // Contadores de la portada
    document.querySelectorAll<HTMLElement>('[data-count]').forEach(el => {
      const to = +(el.dataset.count ?? 0); if (reduce) { el.textContent = String(to); return; }
      const t0 = performance.now();
      const tick = (t: number) => { const k = Math.min((t - t0) / 700, 1); el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });

    if (!reduce) {
      // Ondas en botones
      const down = (e: PointerEvent) => {
        const b = (e.target as HTMLElement).closest<HTMLElement>('.btn'); if (!b) return;
        const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 1.6, s = document.createElement('span');
        s.className = 'ripple'; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
        b.append(s); setTimeout(() => s.remove(), 650);
      };
      document.addEventListener('pointerdown', down); cleanups.push(() => document.removeEventListener('pointerdown', down));

      // Palabra cambiante
      const rotor = document.getElementById('rotor');
      if (rotor?.dataset.words) {
        const words = rotor.dataset.words.split('|'); let i = 0;
        const iv = setInterval(() => { rotor.classList.add('out'); setTimeout(() => { i = (i + 1) % words.length; rotor.textContent = words[i]; rotor.classList.remove('out'); }, 300); }, 2800);
        cleanups.push(() => clearInterval(iv));
      }

      // Aparición al hacer scroll
      if ('IntersectionObserver' in window) {
        document.documentElement.classList.add('anim');
        const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
        document.querySelectorAll<HTMLElement>('.rv').forEach((el, i) => { el.style.transitionDelay = (i % 3) * 0.08 + 's'; io.observe(el); });
        cleanups.push(() => { io.disconnect(); document.documentElement.classList.remove('anim'); });
      }
    }
    if (!reduce && fine) {
      const blobs = [...document.querySelectorAll<HTMLElement>('.blob')];
      const move = (e: PointerEvent) => {
        const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
        blobs.forEach((b, i) => { b.style.translate = `${x * 50 * (i + 1)}px ${y * 40 * (i + 1)}px`; });
        const c = (e.target as HTMLElement).closest<HTMLElement>('.feat,.plan,.kpi'); if (!c) return;
        const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        c.style.setProperty('--mx', px * 100 + '%'); c.style.setProperty('--my', py * 100 + '%');
        if (!c.matches('.kpi')) { c.style.setProperty('--ry', (px - .5) * 7 + 'deg'); c.style.setProperty('--rx', (.5 - py) * 7 + 'deg'); }
      };
      const out = (e: PointerEvent) => { const c = (e.target as HTMLElement).closest<HTMLElement>('.feat,.plan'); if (c && !c.contains(e.relatedTarget as Node)) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); } };
      addEventListener('pointermove', move, { passive: true }); document.addEventListener('pointerout', out);
      cleanups.push(() => { removeEventListener('pointermove', move); document.removeEventListener('pointerout', out); });
    }
    return () => { removeEventListener('scroll', onScroll); cleanups.forEach(f => f()); };
  }, []);
  return (
    <>
      <div className="progress" id="progress" />
      <button className={'totop' + (top ? ' show' : '')} type="button" aria-label="Volver arriba" onClick={() => scrollTo({ top: 0, behavior: 'smooth' })}>
        <svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
      </button>
    </>
  );
}
