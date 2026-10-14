'use client';
import { useState } from 'react';
import { eliminarRecibida, guardarRecibida } from '@/app/panel/actions';
import { claveMes } from '@/lib/impuestos';
import { limpiarRfc, money, validarRfc } from '@/lib/rfc';
import type { Ctx } from './types';

const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
const CATS = ['Servicios profesionales', 'Mercancía o insumos', 'Renta', 'Servicios (luz, internet, teléfono)', 'Transporte y combustible', 'Software y tecnología', 'Publicidad', 'Otros gastos'];

export default function Recibidas({ c }: { c: Ctx }) {
  const { recibidas } = c;
  const [prov, setProv] = useState(''), [rfc, setRfc] = useState(''), [conc, setConc] = useState(''), [cat, setCat] = useState(CATS[0]);
  const [fecha, setFecha] = useState(hoy()), [metodo, setMetodo] = useState('transferencia'), [sub, setSub] = useState(''), [ivaTasa, setIvaTasa] = useState('16'), [ded, setDed] = useState(true);
  const [msg, setMsg] = useState('');
  const rc = validarRfc(rfc), n = rfc.length;

  const s = Math.max(parseFloat(sub) || 0, 0), iva = ivaTasa === 'exento' ? 0 : Math.round(s * Number(ivaTasa)) / 100, total = Math.round((s + iva) * 100) / 100;
  const efectivoAlto = metodo === 'efectivo' && total > 2000;
  const mk = claveMes(new Date());
  const mes = recibidas.filter(r => r.deducible && claveMes(r.fecha + 'T12:00:00') === mk);

  const enviar = () => {
    if (prov.trim().length < 2) return setMsg('Escribe el nombre del proveedor.');
    if (!rc.ok) return setMsg(rc.msg || 'Escribe el RFC del proveedor.');
    if (conc.trim().length < 2) return setMsg('Escribe el concepto de la factura.');
    if (!(s > 0)) return setMsg('Escribe el subtotal de la factura.');
    setMsg('');
    c.run(guardarRecibida({ empresaId: c.empresa.id, fecha, proveedor: prov, rfc: limpiarRfc(rfc), concepto: conc, categoria: cat, metodo, ivaTasa, subtotal: s, deducible: ded }),
      () => { setProv(''); setRfc(''); setConc(''); setSub(''); setFecha(hoy()); setDed(true); });
  };

  return (
    <>
      <div className="kpis">
        <div className="kpi"><small>Gastos deducibles del mes</small><b>{money(mes.reduce((t, r) => t + Number(r.subtotal), 0))}</b></div>
        <div className="kpi"><small>IVA acreditable del mes</small><b>{money(mes.reduce((t, r) => t + Number(r.iva), 0))}</b></div>
        <div className="kpi"><small>Facturas recibidas</small><b>{recibidas.length}</b></div>
      </div>

      <form className="card recform" noValidate onSubmit={e => { e.preventDefault(); enviar(); }}>
        <b>Registrar factura recibida</b>
        <p className="tiny">Las facturas que te hacen tus proveedores. El IVA que pagaste se acredita y los gastos deducibles bajan tu ISR, según tu régimen.</p>
        <div className="two-f">
          <div><label htmlFor="cProv">Proveedor</label><input id="cProv" placeholder="Nombre o razón social" autoComplete="off" value={prov} onChange={e => setProv(e.target.value)} /></div>
          <div><label htmlFor="cRfc">RFC del proveedor</label>
            <input id="cRfc" className={'rfc-input' + (rc.ok ? ' ok' : n >= 12 ? ' bad' : '')} placeholder="GAMJ800101AB8" maxLength={20} autoCapitalize="characters" autoComplete="off" spellCheck={false} value={rfc} onChange={e => setRfc(limpiarRfc(e.target.value))} />
            <p className={'fhint' + (rc.ok ? ' ok' : n >= 12 ? ' err' : '')} aria-live="polite">{!n ? '' : rc.ok ? '✓ ' + rc.msg : n >= 12 ? rc.msg : `${n}/13 · ${rc.msg}`}</p></div>
        </div>
        <div className="two-f eq">
          <div><label htmlFor="cConc">Concepto</label><input id="cConc" placeholder="Renta de oficina, software, mercancía…" autoComplete="off" value={conc} onChange={e => setConc(e.target.value)} /></div>
          <div><label htmlFor="cCat">Categoría</label><select id="cCat" value={cat} onChange={e => setCat(e.target.value)}>{CATS.map(k => <option key={k}>{k}</option>)}</select></div>
        </div>
        <div className="two-f eq">
          <div><label htmlFor="cFecha">Fecha de la factura</label><input id="cFecha" type="date" max={hoy()} value={fecha} onChange={e => setFecha(e.target.value)} /></div>
          <div><label htmlFor="cMet">Forma de pago</label><select id="cMet" value={metodo} onChange={e => setMetodo(e.target.value)}><option value="transferencia">Transferencia</option><option value="tarjeta">Tarjeta</option><option value="cheque">Cheque</option><option value="efectivo">Efectivo</option></select></div>
        </div>
        <div className="two-f eq">
          <div><label htmlFor="cSub">Subtotal (sin IVA)</label><input id="cSub" type="number" min="0" step="any" inputMode="decimal" placeholder="0.00" value={sub} onChange={e => setSub(e.target.value)} /></div>
          <div><label htmlFor="cIvaR">IVA de la factura</label><select id="cIvaR" value={ivaTasa} onChange={e => setIvaTasa(e.target.value)}><option value="16">16%</option><option value="8">8%</option><option value="0">0%</option><option value="exento">Exento</option></select></div>
        </div>
        <label className="chk-l"><input type="checkbox" checked={ded} onChange={e => setDed(e.target.checked)} /> <span>Es un gasto del negocio (deducible y con IVA acreditable)</span></label>
        <p className={'fhint' + (efectivoAlto ? ' err' : s ? ' ok' : '')} aria-live="polite">
          {!s ? '' : efectivoAlto ? `Total ${money(total)}: los pagos en efectivo mayores a $2,000 no son deducibles ni acreditables.` : `Total ${money(total)} · IVA ${ded ? 'acreditable' : 'no acreditable'} ${money(iva)}`}
        </p>
        <div className="actions"><button className="btn shine" type="submit" disabled={c.pending}>{c.pending ? 'Un momento…' : 'Registrar factura recibida'}</button></div>
        {msg && <p className="amsg err" role="alert">{msg}</p>}
      </form>

      <div className="card">
        <div className="hist-head"><b>Facturas recibidas</b></div>
        <div className="table"><table>
          <thead><tr><th>Fecha</th><th>Proveedor</th><th>Concepto</th><th>Subtotal</th><th>IVA</th><th>Total</th><th>Tratamiento</th><th /></tr></thead>
          <tbody>
            {recibidas.map((r, i) => (
              <tr key={r.id} style={{ animationDelay: Math.min(i, 8) * 0.04 + 's' }}>
                <td>{new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-MX')}</td>
                <td>{r.proveedor}<small className="uuid">{r.rfc}</small></td>
                <td>{r.concepto}<small className="uuid">{r.categoria}</small></td>
                <td className="num">{money(Number(r.subtotal))}</td><td className="num">{r.iva_tasa === 'exento' ? 'Exento' : money(Number(r.iva))}</td><td className="num">{money(Number(r.total))}</td>
                <td><span className={'st ' + (r.deducible ? 'timbrada' : 'borrador')} title={r.motivo}>{r.deducible ? 'Deducible' : 'No deducible'}</span>{r.motivo && <small className="uuid">{r.motivo}</small>}</td>
                <td><div className="rowact"><button type="button" disabled={c.pending} onClick={() => c.run(eliminarRecibida(r.id))}>Eliminar</button></div></td>
              </tr>
            ))}
          </tbody>
        </table></div>
        {recibidas.length === 0 && <div className="empty"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="9" y="5" width="30" height="38" rx="5" /><path d="M16 16h16M16 23h16M16 30h9" /></svg><p><b>Aún no registras facturas recibidas</b><br />Agrégalas arriba para acreditar IVA y reducir tus impuestos.</p></div>}
      </div>
    </>
  );
}
