'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { actualizarGiro, cancelarFactura, eliminarBorrador, guardarFactura, timbrarFactura } from '@/app/panel/actions';
import { USOS_CFDI } from '@/lib/constants';
import { desglosar, GIROS, impuestosSugeridos, pct, subtotalLineas, type ConfigImp, type IvaTipo } from '@/lib/impuestos';
import { limpiarRfc, money, validarRfc } from '@/lib/rfc';
import Calculadora from './Calculadora';
import type { Ctx, Factura, Linea } from './types';

const CIRC = 326.7;
const vacia = (): Linea => ({ descripcion: '', cantidad: 1, precio: 0 });
const tasaDe = (monto: number, sub: number) => (sub > 0 ? Math.round((monto / sub) * 1e6) / 1e6 : 0);
const opt = (v: number) => (Math.round(v * 1e6) / 1e6).toString();

export default function Emitidas({ c }: { c: Ctx }) {
  const { empresa, facturas, clientes, conceptos, usados, limite } = c;
  const [nombre, setNombre] = useState(''), [rfc, setRfc] = useState(''), [uso, setUso] = useState('G03'), [metodo, setMetodo] = useState('PUE');
  const [lineas, setLineas] = useState<Linea[]>([vacia()]);
  const [cfgManual, setCfgManual] = useState<ConfigImp | null>(null);
  const [filtro, setFiltro] = useState<'todas' | Factura['estatus']>('todas');
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const formRef = useRef<HTMLFormElement>(null), buscarRef = useRef<HTMLInputElement>(null), calcRef = useRef<HTMLDetailsElement>(null);
  const focoUltima = useRef(false), restaurado = useRef(false);
  const draftKey = `timbro_borrador_${empresa.id}`;

  const sug = useMemo(() => impuestosSugeridos(empresa.giro, empresa.regimen, empresa.rfc, rfc), [empresa.giro, empresa.regimen, empresa.rfc, rfc]);
  const cfg = cfgManual ?? sug.cfg;
  const setCfg = (p: Partial<ConfigImp>) => setCfgManual({ ...cfg, ...p });
  const sub = subtotalLineas(lineas.map(l => ({ cantidad: l.cantidad, precio: l.precio })));
  const d = desglosar(sub, cfg);
  const rfcRes = validarRfc(rfc, { generico: true });
  const left = Math.max(limite - usados, 0);

  const kpi = useMemo(() => {
    const mes = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }).slice(0, 7);
    const t = facturas.filter(f => f.estatus === 'timbrada' && (f.timbrada_en ?? '').slice(0, 7) === mes);
    return { total: t.reduce((s, f) => s + Number(f.total), 0), timbradas: t.length, borradores: facturas.filter(f => f.estatus === 'borrador').length };
  }, [facturas]);
  const pasos = [true, facturas.length > 0, facturas.some(f => f.estatus !== 'borrador')], hechos = pasos.filter(Boolean).length;
  const recientes = useMemo(() => { const v = new Map<string, { nombre: string; rfc: string }>(); facturas.forEach(f => { if (!v.has(f.cliente_rfc) && v.size < 5) v.set(f.cliente_rfc, { nombre: f.cliente_nombre, rfc: f.cliente_rfc }); }); return [...v.values()]; }, [facturas]);
  const conteo = (e: string) => (e === 'todas' ? facturas.length : facturas.filter(f => f.estatus === e).length);
  const lista = facturas.filter(f => (filtro === 'todas' || f.estatus === filtro) && (!q.trim() || [f.cliente_nombre, f.folio, f.cliente_rfc].some(v => v.toLowerCase().includes(q.trim().toLowerCase()))));

  const setL = (i: number, patch: Partial<Linea>) => setLineas(ls => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const agregar = (foco = false) => { focoUltima.current = foco; setLineas(ls => [...ls, vacia()]); };
  const reset = () => { setNombre(''); setRfc(''); setUso('G03'); setMetodo('PUE'); setLineas([vacia()]); setCfgManual(null); setMsg(null); };

  const enviar = (timbrar: boolean) => {
    const valid = lineas.filter(l => l.descripcion.trim() && l.cantidad > 0 && l.precio > 0);
    if (!nombre.trim()) return setMsg({ text: 'Escribe el nombre del cliente.', err: true });
    if (!rfcRes.ok) return setMsg({ text: rfcRes.msg || 'Escribe el RFC del cliente.', err: true });
    if (!valid.length) return setMsg({ text: 'Agrega al menos un concepto con cantidad y precio.', err: true });
    c.run(guardarFactura({
      empresaId: empresa.id, clienteNombre: nombre.trim(), clienteRfc: limpiarRfc(rfc), uso, metodo, lineas: valid, timbrar,
      impuestos: { iva: cfg.iva, isr: cfg.isr, iva_ret: cfg.ivaRet, ieps: cfg.ieps, ish: cfg.ish },
    }), reset, { celebrar: timbrar, flash: 'first' });
  };
  const duplicar = (f: Factura) => {
    setNombre(f.cliente_nombre); setRfc(f.cliente_rfc); setUso(f.uso_cfdi); setMetodo(f.metodo_pago); setLineas(f.lineas.map(l => ({ ...l })));
    setCfgManual({ iva: f.iva_tipo as IvaTipo, isr: tasaDe(f.isr_retenido, f.subtotal), ivaRet: tasaDe(f.iva_retenido, f.subtotal), ieps: tasaDe(f.ieps, f.subtotal), ish: tasaDe(f.ish, f.subtotal) });
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); c.toast('Factura copiada al formulario. Ajusta y timbra.');
  };
  const irFormulario = () => { formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => document.getElementById('iName')?.focus({ preventScroll: true }), 350); };
  const irBuscar = () => { buscarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => buscarRef.current?.focus({ preventScroll: true }), 350); };
  const ejemplo = () => { setNombre('Estudio Aurora S.A. de C.V.'); setRfc('EAU200101AB6'); setLineas([{ descripcion: 'Honorarios', cantidad: 1, precio: 12000 }]); irFormulario(); c.toast('Ejemplo cargado. Presiona «Timbrar factura».'); };
  const repetir = () => { if (facturas[0]) duplicar(facturas[0]); else c.toast('Aún no hay facturas para repetir.', true); };
  const usarCalc = (s: number) => {
    setLineas(ls => (ls.length === 1 && !ls[0].descripcion && !ls[0].precio ? [{ descripcion: 'Servicio', cantidad: 1, precio: s }] : [...ls, { descripcion: 'Servicio', cantidad: 1, precio: s }]));
    irFormulario(); c.toast(`Subtotal de ${money(s)} agregado a la factura.`);
  };

  // Atajos y acciones desde el panel (paleta de comandos, teclas N y /)
  useEffect(() => {
    const nueva = () => irFormulario(), buscar = () => irBuscar(), calc = () => { if (calcRef.current) { calcRef.current.open = true; setTimeout(() => calcRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80); } };
    addEventListener('timbro:nueva', nueva); addEventListener('timbro:buscar', buscar); addEventListener('timbro:calc', calc);
    return () => { removeEventListener('timbro:nueva', nueva); removeEventListener('timbro:buscar', buscar); removeEventListener('timbro:calc', calc); };
  }, []);
  // Borrador automático
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) { const x = JSON.parse(raw); setNombre(x.nombre ?? ''); setRfc(x.rfc ?? ''); setUso(x.uso ?? 'G03'); setMetodo(x.metodo ?? 'PUE'); if (x.lineas?.length) setLineas(x.lineas); if (x.cfg) setCfgManual(x.cfg); c.toast('Recuperamos tu borrador sin terminar.'); }
    } catch { /* sin almacenamiento */ }
    restaurado.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!restaurado.current) return;
    const t = setTimeout(() => {
      try {
        const vacio = !nombre && !rfc && lineas.every(l => !l.descripcion && !l.precio);
        if (vacio) localStorage.removeItem(draftKey); else localStorage.setItem(draftKey, JSON.stringify({ nombre, rfc, uso, metodo, lineas, cfg: cfgManual }));
      } catch { /* ignorar */ }
    }, 400);
    return () => clearTimeout(t);
  }, [nombre, rfc, uso, metodo, lineas, cfgManual, draftKey]);

  const ivaNom = cfg.iva === 'exento' ? 'IVA (exento)' : `IVA ${cfg.iva}%`;
  return (
    <>
      <div className={'card onboard' + (hechos === 3 ? ' complete' : '')}>
        <div className="ob-head"><b>Primeros pasos</b><span>{hechos === 3 ? '¡Listo!' : `${hechos} de 3`}</span></div>
        <div className="ob-bar"><i style={{ width: (hechos / 3) * 100 + '%' }} /></div>
        <ul className="ob-list">{['Registra tu empresa', 'Crea tu primera factura', 'Timbra una factura'].map((t, i) => <li key={t} className={pasos[i] ? 'done' : ''}><i />{t}</li>)}</ul>
      </div>

      <div className="quick" role="toolbar" aria-label="Acciones rápidas">
        <button className="qbtn" type="button" onClick={irFormulario}><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>Nueva factura <kbd>N</kbd></button>
        <button className="qbtn" type="button" onClick={repetir} disabled={!facturas.length}><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" /></svg>Repetir la última</button>
        <button className="qbtn" type="button" onClick={ejemplo}><svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>Rellenar ejemplo</button>
        <button className="qbtn" type="button" onClick={irBuscar}><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>Buscar <kbd>/</kbd></button>
      </div>

      <Calculadora cfg={cfg} onUsar={usarCalc} abrirRef={calcRef} />

      <div className="kpis">
        <div className="kpi"><small>Facturado este mes</small><b>{money(kpi.total)}</b></div>
        <div className="kpi"><small>Facturas timbradas</small><b>{kpi.timbradas}</b></div>
        <div className="kpi"><small>Borradores</small><b>{kpi.borradores}</b></div>
      </div>

      <div className="dash-grid">
        <div className="card meter">
          <b>Timbres del mes</b>
          <div className="ring-wrap">
            <svg viewBox="0 0 120 120" className="ring" aria-hidden="true"><circle cx="60" cy="60" r="52" className="trk" /><circle cx="60" cy="60" r="52" className={'val' + (left / limite <= 0.2 ? ' warn' : '')} style={{ strokeDashoffset: CIRC * (1 - left / limite) }} /></svg>
            <div className="ring-n"><b>{left}</b><small>disponibles</small></div>
          </div>
          <p className="tiny">{usados} de {limite} usados · timbre extra $3</p>
          <p className="tiny">Los borradores no consumen timbres.</p>
        </div>

        <form className="card inv" ref={formRef} noValidate onSubmit={e => e.preventDefault()} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); enviar(true); } }}>
          <b>Nueva factura</b>
          <div className="two-f">
            <div><label htmlFor="iName">Cliente</label>
              <input id="iName" list="dlClientes" placeholder="Nombre o razón social" autoComplete="off" value={nombre}
                onChange={e => { setNombre(e.target.value); const k = clientes.find(x => x.nombre.toLowerCase() === e.target.value.trim().toLowerCase()); if (k) setRfc(k.rfc); }} />
              {recientes.length > 0 && <div className="recent">{recientes.map(k => <button key={k.rfc} type="button" className="rchip" title={`${k.nombre} · ${k.rfc}`} onClick={() => { setNombre(k.nombre); setRfc(k.rfc); }}>{k.nombre.length > 22 ? k.nombre.slice(0, 21) + '…' : k.nombre}</button>)}</div>}
              <datalist id="dlClientes">{clientes.map(k => <option key={k.id} value={k.nombre} label={k.rfc} />)}</datalist></div>
            <div><label htmlFor="iRfc">RFC del cliente</label>
              <input id="iRfc" className={'rfc-input' + (rfcRes.ok ? ' ok' : rfc.length >= 12 ? ' bad' : '')} placeholder="GAMJ800101AB8" maxLength={20} autoCapitalize="characters" autoComplete="off" spellCheck={false} value={rfc} onChange={e => setRfc(limpiarRfc(e.target.value))} aria-describedby="iRfcHint" />
              <p id="iRfcHint" className={'fhint' + (rfcRes.ok ? ' ok' : rfc.length >= 12 ? ' err' : '')} aria-live="polite">{!rfc ? 'Para público en general usa XAXX010101000.' : rfcRes.ok ? '✓ ' + rfcRes.msg : rfc.length >= 12 ? rfcRes.msg : `${rfc.length}/13 · ${rfcRes.msg}`}</p></div>
          </div>
          <div className="two-f eq">
            <div><label htmlFor="iUso">Uso del CFDI</label><select id="iUso" value={uso} onChange={e => setUso(e.target.value)}>{USOS_CFDI.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></div>
            <div><label htmlFor="iMet">Método de pago</label><select id="iMet" value={metodo} onChange={e => setMetodo(e.target.value)}><option value="PUE">PUE · Pago en una exhibición</option><option value="PPD">PPD · Pago en parcialidades</option></select></div>
          </div>
          <div className="lines">
            {lineas.map((l, i) => (
              <div className="line" key={i}>
                <input aria-label="Concepto" list="dlConceptos" placeholder="Concepto" autoComplete="off" value={l.descripcion} autoFocus={focoUltima.current && i === lineas.length - 1}
                  onChange={e => { const k = conceptos.find(x => x.descripcion === e.target.value); setL(i, { descripcion: e.target.value, ...(k && !l.precio ? { precio: Number(k.precio) } : {}) }); }} />
                <input aria-label="Cantidad" type="number" min="0" step="any" inputMode="decimal" placeholder="Cant." value={l.cantidad || ''} onChange={e => setL(i, { cantidad: parseFloat(e.target.value) || 0 })} />
                <input aria-label="Precio unitario" type="number" min="0" step="any" inputMode="decimal" placeholder="Precio" value={l.precio || ''}
                  onChange={e => setL(i, { precio: parseFloat(e.target.value) || 0 })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (i === lineas.length - 1) agregar(true); } }} />
                <button type="button" className="x" aria-label="Quitar concepto" onClick={() => lineas.length > 1 && setLineas(ls => ls.filter((_, k) => k !== i))}>×</button>
              </div>
            ))}
            <datalist id="dlConceptos">{conceptos.map(k => <option key={k.descripcion} value={k.descripcion} />)}</datalist>
          </div>
          <button className="link" type="button" onClick={() => agregar(true)}>+ Agregar concepto</button>

          <fieldset className="taxes">
            <legend>Impuestos de esta factura</legend>
            <div className="tax-top">
              <div><label htmlFor="iGiro">Giro de la empresa</label>
                <select id="iGiro" value={empresa.giro} onChange={e => { setCfgManual(null); c.run(actualizarGiro(empresa.id, e.target.value)); }}>{Object.entries(GIROS).map(([k, g]) => <option key={k} value={k}>{g.n}</option>)}</select></div>
              <button className="link" type="button" onClick={() => { setCfgManual(null); c.toast('Impuestos restablecidos según tu giro.'); }}>Restablecer sugerencia</button>
            </div>
            <div className="tax-grid">
              <div className="tax-row"><label htmlFor="tIvaSel">IVA</label>
                <select id="tIvaSel" value={cfg.iva} onChange={e => { const iva = e.target.value as IvaTipo; setCfgManual({ ...cfg, iva, ivaRet: iva === 'exento' ? 0 : cfg.ivaRet }); }}>
                  <option value="16">16% · tasa general</option><option value="8">8% · franja fronteriza</option><option value="0">0% · tasa cero</option><option value="exento">Exento</option></select></div>
              <div className="tax-row"><label><input type="checkbox" checked={cfg.isr > 0} onChange={e => setCfg({ isr: e.target.checked ? 0.10 : 0 })} /> Retención de ISR</label>
                <select disabled={!cfg.isr} value={opt(cfg.isr || 0.10)} onChange={e => setCfg({ isr: parseFloat(e.target.value) })}><option value="0.1">10%</option><option value="0.0125">1.25% (RESICO)</option></select></div>
              <div className="tax-row"><label><input type="checkbox" disabled={cfg.iva === 'exento'} checked={cfg.ivaRet > 0} onChange={e => setCfg({ ivaRet: e.target.checked ? 0.106667 : 0 })} /> Retención de IVA</label>
                <select disabled={!cfg.ivaRet} value={opt(cfg.ivaRet || 0.106667)} onChange={e => setCfg({ ivaRet: parseFloat(e.target.value) })}><option value="0.106667">2/3 del IVA (10.6667%)</option><option value="0.04">4% (autotransporte)</option></select></div>
              <div className="tax-row"><label><input type="checkbox" checked={cfg.ieps > 0} onChange={e => setCfg({ ieps: e.target.checked ? 0.265 : 0 })} /> IEPS</label>
                <select disabled={!cfg.ieps} value={opt(cfg.ieps || 0.265)} onChange={e => setCfg({ ieps: parseFloat(e.target.value) })}><option value="0.08">8% alimentos de alta densidad calórica</option><option value="0.265">26.5% bebidas alcohólicas (hasta 14° G.L.)</option><option value="0.3">30% bebidas alcohólicas (14° a 20°)</option><option value="0.53">53% bebidas alcohólicas (más de 20°)</option><option value="1.6">160% tabacos labrados</option></select></div>
              <div className="tax-row"><label><input type="checkbox" checked={cfg.ish > 0} onChange={e => setCfg({ ish: e.target.checked ? 0.03 : 0 })} /> Impuesto sobre hospedaje</label>
                <select disabled={!cfg.ish} value={opt(cfg.ish || 0.03)} onChange={e => setCfg({ ish: parseFloat(e.target.value) })}><option value="0.02">2%</option><option value="0.03">3%</option><option value="0.04">4%</option><option value="0.05">5%</option></select></div>
            </div>
            <p className="tiny" id="taxNote">{sug.nota}</p>
          </fieldset>

          <dl className="tot">
            <div><dt>Subtotal</dt><dd>{money(d.sub)}</dd></div>
            {d.ieps > 0 && <div><dt>IEPS</dt><dd>{money(d.ieps)}</dd></div>}
            {d.ish > 0 && <div><dt>Impuesto sobre hospedaje</dt><dd>{money(d.ish)}</dd></div>}
            <div><dt>{ivaNom}</dt><dd>{money(d.iva)}</dd></div>
            {d.isr > 0 && <div><dt>Retención ISR {pct(cfg.isr)}</dt><dd>−{money(d.isr)}</dd></div>}
            {d.ivaRet > 0 && <div><dt>Retención IVA {pct(cfg.ivaRet)}</dt><dd>−{money(d.ivaRet)}</dd></div>}
            <div className="grand"><dt>Total</dt><dd>{money(d.total)}</dd></div>
          </dl>
          <div className="actions">
            <button className="btn shine" type="button" disabled={c.pending} onClick={() => enviar(true)}>{c.pending ? 'Un momento…' : 'Timbrar factura'}</button>
            <button className="btn ghost" type="button" disabled={c.pending} onClick={() => enviar(false)}>Guardar borrador</button>
          </div>
          {msg && <p className={'amsg' + (msg.err ? ' err' : '')} role={msg.err ? 'alert' : 'status'}>{msg.text}</p>}
          <p className="tiny hint">Atajos: <kbd>Enter</kbd> agrega un concepto · <kbd>Ctrl</kbd>+<kbd>Enter</kbd> timbra · <kbd>N</kbd> nueva factura</p>
        </form>
      </div>

      <div className="card hist">
        <div className="hist-head"><b>Mis facturas</b>
          <div className="tools">
            <div className="chips" role="group" aria-label="Filtrar por estatus">
              {([['todas', 'Todas'], ['timbrada', 'Timbradas'], ['borrador', 'Borradores'], ['cancelada', 'Canceladas']] as const).map(([k, t]) => <button key={k} type="button" className={filtro === k ? 'on' : ''} onClick={() => setFiltro(k)}>{t} <i>{conteo(k)}</i></button>)}
            </div>
            <label className="sr" htmlFor="hSearch">Buscar</label>
            <input id="hSearch" type="search" placeholder="Buscar cliente o folio" value={q} onChange={e => setQ(e.target.value)} ref={buscarRef} />
          </div>
        </div>
        <div className="table"><table>
          <thead><tr><th>Folio</th><th>Fecha</th><th>Cliente</th><th>Total</th><th>Estatus</th><th /></tr></thead>
          <tbody>
            {lista.map((f, n) => (
              <tr key={f.id} className={c.flash === f.id || (c.flash === 'first' && n === 0 && filtro === 'todas' && !q) ? 'flash' : ''} style={{ animationDelay: Math.min(n, 8) * 0.04 + 's' }}>
                <td>{f.folio}</td><td>{new Date(f.creada_en).toLocaleDateString('es-MX')}</td>
                <td>{f.cliente_nombre}<small className="uuid">{f.cliente_rfc}</small></td>
                <td>{money(Number(f.total))}{(f.isr_retenido > 0 || f.iva_retenido > 0 || f.ieps > 0 || f.ish > 0) && <small className="uuid">IVA {money(Number(f.iva))}{f.isr_retenido > 0 ? ` · ret. ISR ${money(Number(f.isr_retenido))}` : ''}{f.iva_retenido > 0 ? ` · ret. IVA ${money(Number(f.iva_retenido))}` : ''}</small>}</td>
                <td><span className={'st ' + f.estatus}>{f.estatus}</span>{f.uuid_demo && <small className="uuid">UUID demo {f.uuid_demo.slice(0, 8)}…</small>}</td>
                <td><div className="rowact">
                  {f.estatus === 'borrador' && <><button type="button" disabled={c.pending} onClick={() => c.run(timbrarFactura(f.id), undefined, { celebrar: true, flash: f.id })}>Timbrar</button><button type="button" disabled={c.pending} onClick={() => c.run(eliminarBorrador(f.id))}>Eliminar</button></>}
                  {f.estatus === 'timbrada' && <button type="button" disabled={c.pending} onClick={() => c.run(cancelarFactura(f.id))}>Cancelar</button>}
                  <button type="button" onClick={() => duplicar(f)}>Duplicar</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table></div>
        {lista.length === 0 && (
          <div className="empty"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="9" y="5" width="30" height="38" rx="5" /><path d="M16 16h16M16 23h16M16 30h9" /></svg>
            <p>{facturas.length ? <><b>Sin resultados</b><br />Prueba con otro filtro o búsqueda.</> : <><b>Aún no hay facturas</b><br />Crea la primera con el formulario de arriba.</>}</p></div>
        )}
      </div>
    </>
  );
}
