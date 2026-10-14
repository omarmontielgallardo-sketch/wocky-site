'use client';
import { useEffect, useRef, useState } from 'react';
import type { Tab } from './types';

type Cmd = { t: string; k: string; f: () => void };

export default function Palette({ abierta, cerrar, ir }: { abierta: boolean; cerrar: () => void; ir: (t: Tab) => void }) {
  const d = useRef<HTMLDialogElement>(null), inp = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(''), [sel, setSel] = useState(0);
  const ev = (n: string, t: Tab) => () => { ir(t); setTimeout(() => dispatchEvent(new Event(n)), 120); };
  const cmds: Cmd[] = [
    { t: 'Nueva factura', k: 'Acción', f: ev('timbro:nueva', 'fact') },
    { t: 'Registrar factura recibida', k: 'Acción', f: () => { ir('rec'); setTimeout(() => document.getElementById('cProv')?.focus(), 150); } },
    { t: 'Buscar en mis facturas', k: 'Acción', f: ev('timbro:buscar', 'fact') },
    { t: 'Abrir la calculadora', k: 'Acción', f: ev('timbro:calc', 'fact') },
    { t: 'Simular IVA a favor o por pagar', k: 'Acción', f: () => { ir('tax'); setTimeout(() => document.getElementById('sIng')?.focus(), 150); } },
    { t: 'Ir a Resumen', k: 'Sección', f: () => ir('res') },
    { t: 'Ir a Facturas emitidas', k: 'Sección', f: () => ir('fact') },
    { t: 'Ir a Facturas recibidas', k: 'Sección', f: () => ir('rec') },
    { t: 'Ir a Impuestos', k: 'Sección', f: () => ir('tax') },
    { t: 'Ir a Mis empresas', k: 'Sección', f: () => ir('emp') },
  ];
  const lista = cmds.filter(c => c.t.toLowerCase().includes(q.trim().toLowerCase()));
  const elegir = (c?: Cmd) => { if (!c) return; cerrar(); c.f(); };

  useEffect(() => {
    const el = d.current; if (!el) return;
    if (abierta && !el.open) { setQ(''); setSel(0); el.showModal(); setTimeout(() => inp.current?.focus(), 30); }
    if (!abierta && el.open) el.close();
  }, [abierta]);

  return (
    <dialog className="cmd" ref={d} aria-label="Buscar o ir a" onClose={cerrar} onClick={e => e.target === d.current && cerrar()}>
      <div className="cmd-box">
        <div className="cmd-in">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input ref={inp} placeholder="Escribe una sección o una acción…" autoComplete="off" aria-label="Buscar comando" role="combobox" aria-expanded="true" aria-controls="cmdList" value={q}
            onChange={e => { setQ(e.target.value); setSel(0); }}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, lista.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
              else if (e.key === 'Enter') { e.preventDefault(); elegir(lista[sel]); }
            }} />
        </div>
        <ul id="cmdList" role="listbox">
          {lista.map((c, i) => <li key={c.t} role="option" aria-selected={i === sel} className={i === sel ? 'on' : ''} onMouseEnter={() => setSel(i)} onClick={() => elegir(c)}>{c.t}<small>{c.k}</small></li>)}
          {lista.length === 0 && <li>Sin resultados</li>}
        </ul>
        <p className="tiny cmd-foot"><kbd>↑</kbd><kbd>↓</kbd> para moverte · <kbd>Enter</kbd> para elegir · <kbd>Esc</kbd> para cerrar</p>
      </div>
    </dialog>
  );
}
