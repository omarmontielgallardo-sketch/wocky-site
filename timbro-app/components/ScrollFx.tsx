'use client';
import { useEffect } from 'react';

// Barra de progreso, aparición al hacer scroll y movimiento suave de los fondos.
export default function ScrollFx() {
  useEffect(() => {
    const prog = document.getElementById('progress');
    const onScroll = () => {
      const h = document.documentElement;
      if (prog) prog.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight || 1)) * 100 + '%';
    };
    addEventListener('scroll', onScroll, { passive: true });
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let io: IntersectionObserver | undefined, move: ((e: MouseEvent) => void) | undefined;
    if (!reduce && 'IntersectionObserver' in window) {
      document.documentElement.classList.add('anim');
      io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io!.unobserve(e.target); } }), { threshold: 0.12 });
      document.querySelectorAll<HTMLElement>('.rv').forEach((el, i) => { el.style.transitionDelay = (i % 3) * 0.08 + 's'; io!.observe(el); });
    }
    if (!reduce && matchMedia('(pointer:fine)').matches) {
      const blobs = [...document.querySelectorAll<HTMLElement>('.blob')];
      move = e => { const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5; blobs.forEach((b, i) => { b.style.translate = `${x * 50 * (i + 1)}px ${y * 40 * (i + 1)}px`; }); };
      addEventListener('mousemove', move, { passive: true });
    }
    return () => { removeEventListener('scroll', onScroll); io?.disconnect(); if (move) removeEventListener('mousemove', move); document.documentElement.classList.remove('anim'); };
  }, []);
  return <div className="progress" id="progress" />;
}
