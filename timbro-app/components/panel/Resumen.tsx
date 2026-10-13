'use client';
import { useMemo } from 'react';
import { claveMes, estimarImpuestos } from '@/lib/impuestos';
import { money } from '@/lib/rfc';
import type { Ctx } from './types';

const MES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const kfmt = (n: number) => (n >= 1e6 ? '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + ' M' : n >= 1e3 ? '$' + (n / 1e3).toFixed(1).replace(/\.0$/, '') + ' k' : '$' + Math.round(n));
const niceMax = (v: number) => { if (v <= 0) return 1000; const e = Math.pow(10, Math.floor(Math.log10(v))), f = v / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e; };
const ultimos = (n: number) => { const out: string[] = [], d = new Date(); d.setDate(1); for (let i = n - 1; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`); } return out; };
const delta = (a: number, b: number) => (b > 0 ? (a >= b ? '▲ ' : '▼ ') + Math.abs(Math.round(((a - b) / b) * 100)) + '% vs mes anterior' : a > 0 ? 'Primer movimiento' : 'Sin movimientos');
const rel = (f: number) => { const d = Math.floor((Date.now() - f) / 864e5); return d <= 0 ? 'Hoy' : d === 1 ? 'Ayer' : d < 30 ? `Hace ${d} días` : new Date(f).toLocaleDateString('es-MX'); };

export default function Resumen({ c }: { c: Ctx }) {
  const { empresa, facturas, recibidas, usados, limite } = c;
  const d = useMemo(() => {
    const meses = ultimos(6), cur = meses[5];
    const emit = facturas.filter(f => f.estatus === 'timbrada'), rec = recibidas.filter(r => r.deducible);
    const ing = (k: string) => emit.filter(f => claveMes(f.timbrada_en ?? f.creada_en) === k).reduce((t, f) => t + Number(f.subtotal), 0);
    const gas = (k: string) => rec.filter(r => claveMes(r.fecha + 'T12:00:00') === k).reduce((t, r) => t + Number(r.subtotal), 0);
    const serie = meses.map(k => ({ k, ing: ing(k), gas: gas(k) }));
    const e = estimarImpuestos(cur, empresa.regimen, empresa.rfc,
      facturas.map(x => ({ estatus: x.estatus, fecha: x.timbrada_en ?? x.creada_en, subtotal: Number(x.subtotal), iva: Number(x.iva), isr_retenido: Number(x.isr_retenido), iva_retenido: Number(x.iva_retenido) })),
      recibidas.map(x => ({ fecha: x.fecha + 'T12:00:00', subtotal: Number(x.subtotal), iva: Number(x.iva), deducible: x.deducible })), {});
    const eventos = [
      ...facturas.map(f => ({ f: new Date(f.creada_en).getTime(), ico: 'e', t: `Factura ${f.folio} · ${f.cliente_nombre}`, s: f.estatus, a: Number(f.total) })),
      ...recibidas.map(r => ({ f: new Date(r.fecha + 'T12:00:00').getTime(), ico: 'r', t: `Gasto · ${r.proveedor}`, s: r.deducible ? 'deducible' : 'no deducible', a: -Number(r.total) })),
    ].sort((a, b) => b.f - a.f).slice(0, 7);
    return { serie, e, eventos };
  }, [facturas, recibidas, empresa.regimen, empresa.rfc]);

  const { serie, e, eventos } = d, favor = e.ivaNeto < 0, left = Math.max(limite - usados, 0);
  const W = 600, H = 230, L = 46, B = 28, T = 12, R = 8, max = niceMax(Math.max(...serie.flatMap(x => [x.ing, x.gas]), 0)), ph = H - B - T, bw = (W - L - R) / serie.length;
  const y = (v: number) => T + ph - (v / max) * ph;
  const tot = serie.reduce((t, x) => t + x.ing, 0), totG = serie.reduce((t, x) => t + x.gas, 0);
  const ac = Math.round((e.ivaRec) * 100) / 100, mx = Math.max(e.ivaTr, ac, 1);

  return (
    <>
      <div className="kpis kpis4">
        <div className="kpi"><small>Facturado este mes</small><b>{money(serie[5].ing)}</b><em>{delta(serie[5].ing, serie[4].ing)}</em></div>
        <div className="kpi"><small>Gastos deducibles del mes</small><b>{money(serie[5].gas)}</b><em>{delta(serie[5].gas, serie[4].gas)}</em></div>
        <div className={'kpi ' + (e.ivaNeto === 0 ? '' : favor ? 'good' : 'warn')}><small>{favor ? 'IVA a favor' : 'IVA por pagar'}</small><b>{money(Math.abs(e.ivaNeto))}</b><em>{favor ? 'Se acredita en meses siguientes' : e.ivaNeto > 0 ? 'Vence el 17 del mes siguiente' : 'Sin IVA este mes'}</em></div>
        <div className="kpi"><small>Timbres disponibles</small><b>{left}</b><em>{usados} de {limite} usados</em></div>
      </div>

      <div className="res-grid">
        <div className="card chartcard">
          <div className="hist-head"><b>Ingresos y gastos</b><div className="legend"><span className="lg i">Emitidas</span><span className="lg g">Recibidas</span></div></div>
          <div className="chart" role="img" aria-label="Gráfica de ingresos y gastos de los últimos seis meses">
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
              {[0, 0.5, 1].map(f => <g key={f}><line x1={L} x2={W - R} y1={y(max * f)} y2={y(max * f)} className="gl" /><text x={L - 8} y={y(max * f) + 4} textAnchor="end" className="ax">{kfmt(max * f)}</text></g>)}
              {serie.map((x, i) => {
                const cx = L + i * bw + bw / 2, w = Math.min(bw * 0.32, 26);
                return (
                  <g key={x.k}>
                    {x.ing > 0 && <rect className="bi" x={cx - w - 2} y={y(x.ing)} width={w} height={T + ph - y(x.ing)} rx={5} style={{ animationDelay: i * 60 + 'ms' }}><title>Emitidas: {money(x.ing)}</title></rect>}
                    {x.gas > 0 && <rect className="bg" x={cx + 2} y={y(x.gas)} width={w} height={T + ph - y(x.gas)} rx={5} style={{ animationDelay: i * 60 + 'ms' }}><title>Recibidas: {money(x.gas)}</title></rect>}
                    <text x={cx} y={H - 8} textAnchor="middle" className={'ax' + (i === 5 ? ' cur' : '')}>{MES3[+x.k.slice(5) - 1]}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <p className="tiny">{tot || totG ? `En 6 meses: ${money(tot)} emitidos y ${money(totG)} en gastos deducibles.` : 'Aquí verás tus facturas emitidas y recibidas de los últimos 6 meses.'}</p>
        </div>
        <div className="card ivacard">
          <b>Tu IVA este mes</b>
          <div className="ivabars">
            {([['IVA que cobraste', e.ivaTr, 'tr'], ['IVA que pagaste (acreditable)', ac, 'ac']] as const).map(([t, v, k]) => (
              <div className="ib" key={t}><div><span>{t}</span><b>{money(v)}</b></div><i className={k} style={{ width: Math.max((v / mx) * 100, v > 0 ? 4 : 0) + '%' }} /></div>
            ))}
          </div>
          <p className={'ivamsg' + (e.ivaNeto < 0 ? ' fav' : e.ivaNeto > 0 ? ' pay' : '')}>{e.ivaNeto > 0 ? `Pagarías ${money(e.ivaNeto)} de IVA este mes.` : e.ivaNeto < 0 ? `Tendrías ${money(-e.ivaNeto)} de IVA a favor.` : 'Todavía no hay IVA en este periodo.'}</p>
          <button className="link" type="button" onClick={() => c.ir('tax')}>Ver el detalle de impuestos →</button>
        </div>
      </div>

      <div className="card activity">
        <div className="hist-head"><b>Actividad reciente</b>
          <div className="tools"><button className="btn sm" type="button" onClick={() => { c.ir('fact'); setTimeout(() => dispatchEvent(new Event('timbro:nueva')), 80); }}>+ Nueva factura</button>
            <button className="btn ghost sm" type="button" onClick={() => { c.ir('rec'); setTimeout(() => document.getElementById('cProv')?.focus(), 100); }}>+ Factura recibida</button></div>
        </div>
        <ul className="act-list">
          {eventos.map((ev, i) => (
            <li key={i}><span className={'ai ' + ev.ico}>{ev.ico === 'e' ? '↑' : '↓'}</span><div><b>{ev.t}</b><small>{rel(ev.f)} · {ev.s}</small></div><span className={'am' + (ev.a < 0 ? ' neg' : '')}>{ev.a < 0 ? '−' : '+'}{money(Math.abs(ev.a))}</span></li>
          ))}
        </ul>
        {eventos.length === 0 && <div className="empty"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="9" y="5" width="30" height="38" rx="5" /><path d="M16 16h16M16 23h16M16 30h9" /></svg><p><b>Todavía no hay movimientos</b><br />Crea tu primera factura emitida o registra un gasto.</p></div>}
      </div>
    </>
  );
}
