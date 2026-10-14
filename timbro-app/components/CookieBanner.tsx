'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const KEY = 'timbro_consent';
export default function CookieBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let v: string | null = null;
    try { v = localStorage.getItem(KEY); } catch { /* sin almacenamiento */ }
    const t = v ? undefined : setTimeout(() => setShow(true), 900);
    const open = () => setShow(true);
    addEventListener('timbro:cookies', open);
    return () => { if (t) clearTimeout(t); removeEventListener('timbro:cookies', open); };
  }, []);
  const set = (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* ignorar */ } setShow(false); };
  if (!show) return null;
  return (
    <div className="cookie" role="dialog" aria-label="Aviso de cookies">
      <p><b>Tu privacidad importa.</b> Usamos únicamente cookies y almacenamiento necesarios para que Timbro funcione (por ejemplo, mantener tu sesión). No usamos cookies de publicidad. <Link href="/cookies">Más información</Link></p>
      <div className="cookie-act"><button className="btn sm" type="button" onClick={() => set('all')}>Aceptar</button><button className="btn ghost sm" type="button" onClick={() => set('necessary')}>Solo necesarias</button></div>
    </div>
  );
}
