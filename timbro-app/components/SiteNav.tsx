'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';

export default function SiteNav({ home = false }: { home?: boolean }) {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const [active, setActive] = useState('');
  const path = usePathname();
  const enPanel = path.startsWith('/panel');
  useEffect(() => {
    const onScroll = () => setSolid(scrollY > 30);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    addEventListener('scroll', onScroll, { passive: true }); addEventListener('keydown', onKey); onScroll();
    let spy: IntersectionObserver | undefined;
    if (home && 'IntersectionObserver' in window) {
      spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }), { rootMargin: '-45% 0px -50% 0px' });
      ['funciones', 'como', 'precios', 'faq'].forEach(id => { const s = document.getElementById(id); if (s) spy!.observe(s); });
    }
    return () => { removeEventListener('scroll', onScroll); removeEventListener('keydown', onKey); spy?.disconnect(); };
  }, [home]);
  const a = (id: string, text: string) => <a href={`/#${id}`} className={active === id ? 'active' : ''} onClick={() => setOpen(false)}>{text}</a>;
  return (
    <header className={'nav' + (solid ? ' solid' : '')}>
      <Logo anim />
      <button className="burger" type="button" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} aria-controls="menu" onClick={() => setOpen(!open)}><i /><i /></button>
      <nav id="menu" className={open ? 'open' : ''}>
        <Link href="/" className={path === '/' && !active ? 'active' : ''} onClick={() => setOpen(false)}>Inicio</Link>
        {a('funciones', 'Funciones')}{a('como', 'Cómo funciona')}{a('precios', 'Precios')}{a('faq', 'Preguntas')}
        <Link className={'navtab' + (enPanel ? ' active' : '')} href="/panel" aria-current={enPanel ? 'page' : undefined} onClick={() => setOpen(false)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="2" /><rect x="14" y="3" width="7" height="5" rx="2" /><rect x="14" y="12" width="7" height="9" rx="2" /><rect x="3" y="16" width="7" height="5" rx="2" /></svg>Panel
        </Link>
      </nav>
    </header>
  );
}
