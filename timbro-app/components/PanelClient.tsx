'use client';
import { useMemo, useRef, useState, useTransition } from 'react';
import { cancelarFactura, eliminarBorrador, eliminarCuenta, exportarMisDatos, guardarFactura, timbrarFactura, type Resultado } from '@/app/panel/actions';
import { cerrarSesion } from '@/app/auth/actions';
import { NOMBRE_PLAN, USOS_CFDI } from '@/lib/constants';
import { money, rfcOk } from '@/lib/rfc';

export type Empresa = { id: string; razon_social: string; rfc: string; regimen: string; plan: string };
export type Linea = { descripcion: string; cantidad: number; precio: number };
export type Factura = { id: string; folio: string; cliente_nombre: string; cliente_rfc: string; uso_cfdi: string; metodo_pago: string; lineas: Linea[]; total: number; estatus: 'borrador' | 'timbrada' | 'cancelada'; uuid_demo: string | null; timbrada_en: string | null; creada_en: string };
export type Cliente = { id: string; nombre: string; rfc: string };
export type Concepto = { descripcion: string; precio: number };
type Toast = { id: number; text: string; err?: boolean };

const CIRC = 326.7;
const r2 = (n: number) => Math.round(n * 100) / 100;
const vacia = (): Linea => ({ descripcion: '', cantidad: 1, precio: 0 });

export default function PanelClient({ empresa, email, facturas, clientes, conceptos, usados, limite }: {
  empresa: Empresa; email: string; facturas: Factura[]; clientes: Cliente[]; conceptos: Concepto[]; usados: number; limite: number;
}) {
  const [pending, start] = useTransition();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [nombre, setNombre] = useState(''), [rfc, setRfc] = useState(''), [uso, setUso] = useState('G03'), [metodo, setMetodo] = useState('PUE');
  const [lineas, setLineas] = useState<Linea[]>([vacia()]);
  const [filtro, setFiltro] = useState<'todas' | Factura['estatus']>('todas');
  const [q, setQ] = useState('');
  const [datos, setDatos] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const dData = useRef<HTMLDialogElement>(null), dDel = useRef<HTMLDialogElement>(null), formRef = useRef<HTMLFormElement>(null);
  const focoUltima = useRef(false);

  const toast = (text: string, err = false) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, text, err }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3400);
  };
  const run = (p: Promise<Resultado>, after?: () => void) => start(async () => {
    const r = await p;
    if (r.ok) { toast(r.mensaje ?? 'Listo.'); setMsg(null); after?.(); } else { toast(r.error, true); setMsg({ text: r.error, err: true }); }
  });

  const sub = lineas.reduce((s, l) => s + r2(l.cantidad * l.precio), 0), iva = r2(sub * 0.16), total = r2(sub + iva);
  const left = Math.max(limite - usados, 0);
  const kpi = useMemo(() => {
    const mes = new Date().toISOString().slice(0, 7);
    const t = facturas.filter(f => f.estatus === 'timbrada' && (f.timbrada_en ?? '').slice(0, 7) === mes);
    return { total: t.reduce((s, f) => s + Number(f.total), 0), timbradas: t.length, borradores: facturas.filter(f => f.estatus === 'borrador').length };
  }, [facturas]);
  const conteo = (e: string) => e === 'todas' ? facturas.length : facturas.filter(f => f.estatus === e).length;
  const lista = facturas.filter(f => (filtro === 'todas' || f.estatus === filtro) && (!q.trim() || [f.cliente_nombre, f.folio, f.cliente_rfc].some(v => v.toLowerCase().includes(q.trim().toLowerCase()))));

  const setL = (i: number, patch: Partial<Linea>) => setLineas(ls => ls.map((l, k) => k === i ? { ...l, ...patch } : l));
  const agregar = (foco = false) => { focoUltima.current = foco; setLineas(ls => [...ls, vacia()]); };
  const reset = () => { setNombre(''); setRfc(''); setUso('G03'); setMetodo('PUE'); setLineas([vacia()]); setMsg(null); };

  const enviar = (timbrar: boolean) => {
    const valid = lineas.filter(l => l.descripcion.trim() && l.cantidad > 0 && l.precio > 0);
    if (!nombre.trim()) return setMsg({ text: 'Escribe el nombre del cliente.', err: true });
    if (!rfcOk(rfc)) return setMsg({ text: 'El RFC del cliente no es válido.', err: true });
    if (!valid.length) return setMsg({ text: 'Agrega al menos un concepto con cantidad y precio.', err: true });
    run(guardarFactura({ empresaId: empresa.id, clienteNombre: nombre.trim(), clienteRfc: rfc.trim().toUpperCase(), uso, metodo, lineas: valid, timbrar }), reset);
  };
  const duplicar = (f: Factura) => {
    setNombre(f.cliente_nombre); setRfc(f.cliente_rfc); setUso(f.uso_cfdi); setMetodo(f.metodo_pago); setLineas(f.lineas.map(l => ({ ...l })));
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('Factura copiada al formulario. Ajusta y timbra.');
  };
  const verDatos = async () => { setDatos('Cargando…'); dData.current?.showModal(); setDatos(await exportarMisDatos()); };

  return (
    <>
      <div className="toasts" aria-live="polite">{toasts.map(t => <div key={t.id} className={'toast' + (t.err ? ' err' : '')}>{t.text}</div>)}</div>

      <div className="dash-head view-in">
        <div>
          <h1 className="dash-title">{empresa.razon_social}</h1>
          <p className="muted"><span className="badge">Administrador</span> RFC {empresa.rfc} · Régimen {empresa.regimen} · {email}</p>
        </div>
        <div className="dash-actions">
          <span className="panel-plan">Plan <b>{NOMBRE_PLAN[empresa.plan] ?? empresa.plan}</b> · cambio de plan próximamente</span>
          <form action={cerrarSesion}><button className="btn ghost sm" type="submit">Cerrar sesión</button></form>
        </div>
      </div>

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

        <form className="card inv" ref={formRef} noValidate onSubmit={e => e.preventDefault()}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); enviar(true); } }}>
          <b>Nueva factura</b>
          <div className="two-f">
            <div><label htmlFor="iName">Cliente</label>
              <input id="iName" list="dlClientes" placeholder="Nombre o razón social" autoComplete="off" value={nombre}
                onChange={e => { setNombre(e.target.value); const c = clientes.find(k => k.nombre.toLowerCase() === e.target.value.trim().toLowerCase()); if (c) setRfc(c.rfc); }} />
              <datalist id="dlClientes">{clientes.map(c => <option key={c.id} value={c.nombre} label={c.rfc} />)}</datalist></div>
            <div><label htmlFor="iRfc">RFC del cliente</label>
              <input id="iRfc" placeholder="XAXX010101000" maxLength={13} autoCapitalize="characters" value={rfc} className={rfcOk(rfc) ? 'ok' : ''} onChange={e => setRfc(e.target.value.toUpperCase())} /></div>
          </div>
          <div className="two-f eq">
            <div><label htmlFor="iUso">Uso del CFDI</label><select id="iUso" value={uso} onChange={e => setUso(e.target.value)}>{USOS_CFDI.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></div>
            <div><label htmlFor="iMet">Método de pago</label><select id="iMet" value={metodo} onChange={e => setMetodo(e.target.value)}><option value="PUE">PUE · Pago en una exhibición</option><option value="PPD">PPD · Pago en parcialidades</option></select></div>
          </div>
          <div className="lines">
            {lineas.map((l, i) => (
              <div className="line" key={i}>
                <input aria-label="Concepto" list="dlConceptos" placeholder="Concepto" autoComplete="off" value={l.descripcion} autoFocus={focoUltima.current && i === lineas.length - 1}
                  onChange={e => { const c = conceptos.find(k => k.descripcion === e.target.value); setL(i, { descripcion: e.target.value, ...(c && !l.precio ? { precio: Number(c.precio) } : {}) }); }} />
                <input aria-label="Cantidad" type="number" min="0" step="any" inputMode="decimal" placeholder="Cant." value={l.cantidad || ''} onChange={e => setL(i, { cantidad: parseFloat(e.target.value) || 0 })} />
                <input aria-label="Precio unitario" type="number" min="0" step="any" inputMode="decimal" placeholder="Precio" value={l.precio || ''}
                  onChange={e => setL(i, { precio: parseFloat(e.target.value) || 0 })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (i === lineas.length - 1) agregar(true); } }} />
                <button type="button" className="x" aria-label="Quitar concepto" onClick={() => lineas.length > 1 && setLineas(ls => ls.filter((_, k) => k !== i))}>×</button>
              </div>
            ))}
            <datalist id="dlConceptos">{conceptos.map(c => <option key={c.descripcion} value={c.descripcion} />)}</datalist>
          </div>
          <button className="link" type="button" onClick={() => agregar(true)}>+ Agregar concepto</button>
          <dl className="tot">
            <div><dt>Subtotal</dt><dd>{money(sub)}</dd></div>
            <div><dt>IVA 16%</dt><dd>{money(iva)}</dd></div>
            <div className="grand"><dt>Total</dt><dd>{money(total)}</dd></div>
          </dl>
          <div className="actions">
            <button className="btn shine" type="button" disabled={pending} onClick={() => enviar(true)}>{pending ? 'Un momento…' : 'Timbrar factura'}</button>
            <button className="btn ghost" type="button" disabled={pending} onClick={() => enviar(false)}>Guardar borrador</button>
          </div>
          {msg && <p className={'amsg' + (msg.err ? ' err' : '')} role={msg.err ? 'alert' : 'status'}>{msg.text}</p>}
        </form>
      </div>

      <div className="card hist">
        <div className="hist-head"><b>Mis facturas</b>
          <div className="tools">
            <div className="chips" role="group" aria-label="Filtrar por estatus">
              {([['todas', 'Todas'], ['timbrada', 'Timbradas'], ['borrador', 'Borradores'], ['cancelada', 'Canceladas']] as const).map(([k, t]) =>
                <button key={k} type="button" className={filtro === k ? 'on' : ''} onClick={() => setFiltro(k)}>{t} <i>{conteo(k)}</i></button>)}
            </div>
            <label className="sr" htmlFor="hSearch">Buscar</label>
            <input id="hSearch" type="search" placeholder="Buscar cliente o folio" value={q} onChange={e => setQ(e.target.value)} />
          </div>
        </div>
        <div className="table"><table>
          <thead><tr><th>Folio</th><th>Fecha</th><th>Cliente</th><th>Total</th><th>Estatus</th><th /></tr></thead>
          <tbody>
            {lista.map((f, n) => (
              <tr key={f.id} style={{ animationDelay: Math.min(n, 8) * 0.04 + 's' }}>
                <td>{f.folio}</td><td>{new Date(f.creada_en).toLocaleDateString('es-MX')}</td>
                <td>{f.cliente_nombre}<small className="uuid">{f.cliente_rfc}</small></td><td>{money(Number(f.total))}</td>
                <td><span className={'st ' + f.estatus}>{f.estatus}</span>{f.uuid_demo && <small className="uuid">UUID demo {f.uuid_demo.slice(0, 8)}…</small>}</td>
                <td><div className="rowact">
                  {f.estatus === 'borrador' && <><button type="button" disabled={pending} onClick={() => run(timbrarFactura(f.id))}>Timbrar</button><button type="button" disabled={pending} onClick={() => run(eliminarBorrador(f.id))}>Eliminar</button></>}
                  {f.estatus === 'timbrada' && <button type="button" disabled={pending} onClick={() => run(cancelarFactura(f.id))}>Cancelar</button>}
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

      <div className="card priv">
        <div><b>Mi privacidad</b><p className="tiny">Ejerce tus derechos sobre tus datos cuando quieras.</p></div>
        <div className="actions"><button className="btn ghost sm" type="button" onClick={verDatos}>Ver mis datos</button><button className="btn ghost sm danger" type="button" onClick={() => { setConfirmar(''); dDel.current?.showModal(); }}>Eliminar mi cuenta</button></div>
      </div>

      <dialog className="legal small" ref={dData} onClick={e => e.target === dData.current && dData.current?.close()}>
        <div className="legal-head"><h2>Mis datos</h2><button className="x" type="button" aria-label="Cerrar" onClick={() => dData.current?.close()}>×</button></div>
        <div className="legal-body">
          <p>Copia de los datos que Timbro guarda de tu cuenta (derecho de acceso). No incluye tu contraseña.</p>
          <label className="sr" htmlFor="dataBox">Datos de tu cuenta</label>
          <textarea id="dataBox" readOnly rows={12} value={datos} />
          <div className="actions"><button className="btn sm" type="button" onClick={async () => { try { await navigator.clipboard.writeText(datos); toast('Datos copiados.'); } catch { toast('Selecciona y copia el texto (Ctrl+C).'); } }}>Copiar</button><button className="btn ghost sm" type="button" onClick={() => dData.current?.close()}>Cerrar</button></div>
        </div>
      </dialog>

      <dialog className="legal small" ref={dDel} onClick={e => e.target === dDel.current && dDel.current?.close()}>
        <div className="legal-head"><h2>Eliminar mi cuenta</h2><button className="x" type="button" aria-label="Cerrar" onClick={() => dDel.current?.close()}>×</button></div>
        <div className="legal-body">
          <p>Se borrarán de forma definitiva tu cuenta, tus empresas, clientes y facturas guardadas. <b>Esta acción no se puede deshacer.</b></p>
          <p>Los comprobantes ya certificados ante el SAT deben conservarse conforme a las disposiciones fiscales aplicables; guarda una copia antes de continuar.</p>
          <label htmlFor="delConfirm">Escribe <b>ELIMINAR</b> para confirmar</label>
          <input id="delConfirm" autoComplete="off" placeholder="ELIMINAR" value={confirmar} onChange={e => setConfirmar(e.target.value)} />
          <div className="actions"><button className="btn danger-solid sm" type="button" disabled={pending || confirmar.trim().toUpperCase() !== 'ELIMINAR'} onClick={() => run(eliminarCuenta())}>Eliminar definitivamente</button><button className="btn ghost sm" type="button" onClick={() => dDel.current?.close()}>Cancelar</button></div>
        </div>
      </dialog>
    </>
  );
}
