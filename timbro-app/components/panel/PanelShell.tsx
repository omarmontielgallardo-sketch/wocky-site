'use client';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cerrarSesion } from '@/app/auth/actions';
import { NOMBRE_PLAN } from '@/lib/constants';
import { giroDe } from '@/lib/impuestos';
import type { Resultado } from '@/app/panel/actions';
import type { Cliente, Concepto, Ctx, Empresa, Factura, Opciones, Recibida, ResumenEmpresa, Tab } from './types';
import Resumen from './Resumen';
import Emitidas from './Emitidas';
import Recibidas from './Recibidas';
import Impuestos from './Impuestos';
import Empresas from './Empresas';
import Palette from './Palette';

type Toast = { id: number; text: string; err?: boolean };
const TABS: [Tab, string, string, string][] = [
  ['res', 'Resumen', 'Tu panel', 'M3 12l9-8 9 8M5 10v10h14V10'],
  ['fact', 'Emitidas', 'Facturas que emites', 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4'],
  ['rec', 'Recibidas', 'Facturas que te hacen', 'M4 4h16v13H8l-4 4zM8 9h8M8 13h5'],
  ['tax', 'Impuestos', 'IVA e ISR estimados', 'M19 5L5 19M9.5 7a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM19.5 17a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z'],
  ['emp', 'Empresas', 'Administra tus empresas', 'M3 9h18v11H3zM8 9V5h8v4'],
];

export default function PanelShell(p: {
  empresa: Empresa; email: string; empresas: ResumenEmpresa[]; facturas: Factura[]; recibidas: Recibida[]; clientes: Cliente[]; conceptos: Concepto[];
  usados: number; limite: number; rfcMax: number;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('res');
  const [pending, start] = useTransition();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [celebrando, setCelebrando] = useState(false);
  const [cmd, setCmd] = useState(false);

  const toast = (text: string, err = false) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, text, err }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3400);
  };
  const celebrar = () => { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; setCelebrando(true); setTimeout(() => setCelebrando(false), 1800); };
  const run = (pr: Promise<Resultado>, despues?: () => void, o?: Opciones) => start(async () => {
    const r = await pr;
    if (r.ok) {
      toast(r.mensaje ?? 'Listo.'); despues?.();
      if (o?.celebrar) celebrar();
      if (o?.flash) { setFlash(o.flash); setTimeout(() => setFlash(null), 1700); }
      if (r.id) router.push(`/panel?e=${r.id}`);
    } else toast(r.error, true);
  });
  const ir = (t: Tab) => { setTab(t); scrollTo({ top: 0, behavior: 'smooth' }); };

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmd(true); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement; if (t.closest('input,textarea,select,[contenteditable],dialog')) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); ir('fact'); setTimeout(() => dispatchEvent(new Event('timbro:nueva')), 120); }
      else if (e.key === '/') { e.preventDefault(); ir('fact'); setTimeout(() => dispatchEvent(new Event('timbro:buscar')), 120); }
    };
    addEventListener('keydown', on); return () => removeEventListener('keydown', on);
  }, []);

  const c: Ctx = { ...p, pending, flash, toast, run, ir };
  const act = TABS.find(t => t[0] === tab)!;
  const g = giroDe(p.empresa.giro);

  return (
    <>
      <div className={'celebrate' + (celebrando ? ' on' : '')} aria-hidden="true">
        <div className="stamp-pop">TIMBRADA</div>
        {celebrando && Array.from({ length: 30 }, (_, i) => { const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 200; return <i key={i} className="cf" style={{ '--x': Math.cos(a) * d + 'px', '--y': Math.sin(a) * d - 70 + 'px', '--r': Math.random() * 720 - 360 + 'deg', background: ['#5b4bff', '#00c2a8', '#ffb84d', '#ff6b8b', '#2ff0cf'][i % 5], animationDelay: Math.random() * .12 + 's' } as React.CSSProperties} />; })}
      </div>
      <div className="toasts" aria-live="polite">{toasts.map(t => <div key={t.id} className={'toast' + (t.err ? ' err' : '')}>{t.text}</div>)}</div>

      <div id="dashView" className="shell">
        <aside className="side">
          <div className="side-brand">
            <span className="avatar" aria-hidden="true">{p.empresa.razon_social.trim()[0]?.toUpperCase() ?? 'T'}</span>
            <div className="side-name"><h2>{p.empresa.razon_social}</h2><p>{p.empresa.rfc}</p><p className="giro">{g.n}</p></div>
          </div>
          <nav className="side-nav" role="tablist" aria-label="Secciones del panel">
            {TABS.map(([k, n, , d]) => (
              <button key={k} type="button" role="tab" id={'pt' + k} aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => ir(k)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg><span>{n}</span>
                {k === 'rec' && <i>{p.recibidas.length}</i>}{k === 'emp' && <i>{p.empresas.length}</i>}
              </button>
            ))}
          </nav>
          <div className="side-foot">
            {p.empresas.length > 1 && (
              <><label className="sr" htmlFor="dEmp">Empresa activa</label>
                <select id="dEmp" className="empsel" value={p.empresa.id} onChange={e => router.push(`/panel?e=${e.target.value}`)}>{p.empresas.map(e => <option key={e.id} value={e.id}>{e.razon_social}</option>)}</select></>
            )}
            <Link className="planbtn" href="/panel?plan=1" aria-label="Cambiar de plan"><span>{NOMBRE_PLAN[p.empresa.plan] ?? p.empresa.plan}</span><small>Cambiar</small></Link>
            <p className="side-mail"><span className="badge">Admin</span><span>{p.email}</span></p>
            <form action={cerrarSesion}><button className="btn ghost sm" type="submit">Cerrar sesión</button></form>
          </div>
        </aside>

        <div className="main">
          <div className="topbar">
            <div><p className="eyebrow">{act[2]}</p><h1>{act[1] === 'Resumen' ? 'Resumen' : act[1]}</h1></div>
            <button className="cmdbtn" type="button" aria-label="Buscar o ir a" onClick={() => setCmd(true)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg><span>Buscar o ir a…</span><kbd>Ctrl</kbd><kbd>K</kbd>
            </button>
          </div>
          <div id={'tab' + tab} key={tab}>
            {tab === 'res' && <Resumen c={c} />}
            {tab === 'fact' && <Emitidas c={c} />}
            {tab === 'rec' && <Recibidas c={c} />}
            {tab === 'tax' && <Impuestos c={c} />}
            {tab === 'emp' && <Empresas c={c} />}
          </div>
        </div>
      </div>
      <Palette abierta={cmd} cerrar={() => setCmd(false)} ir={ir} />
    </>
  );
}
