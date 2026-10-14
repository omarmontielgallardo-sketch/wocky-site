'use client';
import { useEffect, useMemo, useState } from 'react';
import { claveRegimen, consejos, estimarImpuestos, fmtIva, MESES, REG_TXT, type EntradaImp, type Fila, type IvaTipo, type Simulacion } from '@/lib/impuestos';
import { money } from '@/lib/rfc';
import type { Ctx } from './types';

function periodos(): string[] {
  const hoy = new Date(), y = hoy.getFullYear(), out: string[] = [];
  for (let m = hoy.getMonth(); m >= 0; m--) out.push(`${y}-${String(m + 1).padStart(2, '0')}`);
  return out;
}
const etiqueta = (k: string) => MESES[+k.slice(5) - 1][0].toUpperCase() + MESES[+k.slice(5) - 1].slice(1) + ' ' + k.slice(0, 4);
const val = (v: number | string) => (typeof v === 'number' ? money(v) : v);

function Lista({ filas }: { filas: Fila[] }) {
  return <dl>{filas.map(([t, v, cls]) => <div key={t} className={cls}><dt>{t}</dt><dd>{val(v)}</dd></div>)}</dl>;
}

export default function Impuestos({ c }: { c: Ctx }) {
  const { empresa, facturas, recibidas } = c;
  const per = useMemo(periodos, []);
  const [periodo, setPeriodo] = useState(per[0]);
  const [inp, setInp] = useState<Record<string, string>>({});
  const [ded35, setDed35] = useState(false);
  const [sim, setSim] = useState({ ing: '', ivaIng: '16', gas: '', ivaGas: '16' });
  const key = `timbro_taxin_${empresa.id}`;
  useEffect(() => { try { const x = JSON.parse(localStorage.getItem(key) || '{}'); setInp(x.inp ?? {}); setDed35(!!x.ded35); } catch { /* sin almacenamiento */ } }, [key]);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify({ inp, ded35 })); } catch { /* ignorar */ } }, [key, inp, ded35]);

  const entrada: EntradaImp = { gastos: parseFloat(inp.gastos) || 0, ivaAc: parseFloat(inp.ivaAc) || 0, prev: parseFloat(inp.prev) || 0, coef: parseFloat(inp.coef) || 0, ded35 };
  const f = facturas.map(x => ({ estatus: x.estatus, fecha: x.timbrada_en ?? x.creada_en, subtotal: Number(x.subtotal), iva: Number(x.iva), isr_retenido: Number(x.isr_retenido), iva_retenido: Number(x.iva_retenido) }));
  const r = recibidas.map(x => ({ fecha: x.fecha + 'T12:00:00', subtotal: Number(x.subtotal), iva: Number(x.iva), deducible: x.deducible }));
  const e = estimarImpuestos(periodo, empresa.regimen, empresa.rfc, f, r, entrada);
  const s: Simulacion = { ing: Math.max(parseFloat(sim.ing) || 0, 0), ivaIng: sim.ivaIng as IvaTipo, gas: Math.max(parseFloat(sim.gas) || 0, 0), ivaGas: sim.ivaGas as IvaTipo };
  const b = estimarImpuestos(periodo, empresa.regimen, empresa.rfc, f, r, entrada, s);
  const hay = s.ing > 0 || s.gas > 0;
  const dif = (x: number, y: number) => { const d = Math.round((y - x) * 100) / 100; return d === 0 ? '—' : (d > 0 ? '+' : '−') + money(Math.abs(d)); };
  const clave = claveRegimen(empresa.regimen, empresa.rfc), info = REG_TXT[clave], reg = empresa.regimen.split(' ')[0];
  const tips = consejos(e, recibidas, money);
  const cambio = Math.round((b.total - e.total) * 100) / 100;
  const sinGastos = clave === '626' || clave === '603' || !info;
  const num = (k: string, ph: string, label: string, extra?: object) => (
    <div><label htmlFor={'x' + k}>{label}</label><input id={'x' + k} type="number" min="0" step="any" inputMode="decimal" placeholder={ph} value={inp[k] ?? ''} onChange={ev => setInp({ ...inp, [k]: ev.target.value })} {...extra} /></div>
  );

  return (
    <>
      <div className="card taxcard">
        <div className="hist-head"><b>Impuestos del periodo</b>
          <div className="tools"><label className="sr" htmlFor="xMes">Periodo</label><select id="xMes" value={periodo} onChange={ev => setPeriodo(ev.target.value)}>{per.map(k => <option key={k} value={k}>{etiqueta(k)}</option>)}</select></div>
        </div>
        <p className="tiny">Régimen {reg}{info ? ' · ' + info[0] : ''}. {info ? info[1] : 'Todavía no calculamos el ISR de este régimen; el IVA sí.'}</p>
        <div className="xinputs">
          {!sinGastos && num('gastos', '0.00', 'Otros gastos deducibles del año (sin factura en Recibidas)')}
          {num('ivaAc', '0.00', 'Otro IVA acreditable del mes')}
          {!sinGastos && num('prev', '0.00', 'Pagos provisionales de ISR anteriores del año')}
          {clave === '601' && num('coef', '0.2000', 'Coeficiente de utilidad', { step: '0.0001' })}
          {clave === '606' && <label className="chk-l"><input type="checkbox" checked={ded35} onChange={ev => setDed35(ev.target.checked)} /> <span>Usar la deducción opcional del 35% (arrendamiento)</span></label>}
        </div>
        <div className="xgrid">
          <div className="xbox"><h3>IVA</h3><Lista filas={e.iva} /></div>
          <div className="xbox"><h3>ISR</h3><Lista filas={e.isr} /></div>
        </div>
        <div className="xtotal"><div><span>Total estimado a pagar</span><small>{e.vence}</small></div><b>{money(e.total)}</b></div>
        {(e.ivaFavor || e.nota) && <p className="tiny xnote">{e.ivaFavor ? 'Tienes IVA a favor este periodo: no se paga y puede acreditarse o solicitarse. ' : ''}{e.nota}</p>}
        <p className="tiny">Estimación informativa a partir de tus facturas emitidas y recibidas en Timbro y de los datos que captures arriba. Usa las tarifas 2026 (art. 96 y 113-E de la Ley del ISR, Anexo 8 de la RMF 2026). No es una declaración: confirma los montos con tu contador antes de presentar.</p>
      </div>

      <div className="card sim">
        <div className="hist-head"><b>Simulador de facturas</b><button className="link" type="button" onClick={() => setSim({ ...sim, ing: '', gas: '' })}>Limpiar</button></div>
        <p className="tiny">Prueba qué pasaría con tu IVA y tus impuestos del periodo si emitieras o recibieras una factura más. No guarda nada.</p>
        <div className="xinputs">
          <div><label htmlFor="sIng">Factura que emitirías (subtotal)</label><input id="sIng" type="number" min="0" step="any" inputMode="decimal" placeholder="0.00" value={sim.ing} onChange={ev => setSim({ ...sim, ing: ev.target.value })} /></div>
          <div><label htmlFor="sIvaIng">IVA de esa factura</label><select id="sIvaIng" value={sim.ivaIng} onChange={ev => setSim({ ...sim, ivaIng: ev.target.value })}><option value="16">16%</option><option value="8">8%</option><option value="0">0%</option><option value="exento">Exento</option></select></div>
          <div><label htmlFor="sGas">Factura que recibirías, gasto deducible (subtotal)</label><input id="sGas" type="number" min="0" step="any" inputMode="decimal" placeholder="0.00" value={sim.gas} onChange={ev => setSim({ ...sim, gas: ev.target.value })} /></div>
          <div><label htmlFor="sIvaGas">IVA de ese gasto</label><select id="sIvaGas" value={sim.ivaGas} onChange={ev => setSim({ ...sim, ivaGas: ev.target.value })}><option value="16">16%</option><option value="8">8%</option><option value="0">0%</option><option value="exento">Exento</option></select></div>
        </div>
        <div className="table"><table className="simtable">
          <thead><tr><th /><th>Ahora</th><th>Con la simulación</th><th>Diferencia</th></tr></thead>
          <tbody>
            {([['IVA del periodo', fmtIva(e.ivaNeto, money), fmtIva(b.ivaNeto, money), dif(e.ivaNeto, b.ivaNeto)],
              ['ISR del periodo', e.isrPagar === null ? 'N/D' : money(e.isrPagar), b.isrPagar === null ? 'N/D' : money(b.isrPagar), e.isrPagar === null || b.isrPagar === null ? '—' : dif(e.isrPagar, b.isrPagar)],
              ['Total estimado a pagar', money(e.total), money(b.total), dif(e.total, b.total)]] as string[][]).map((row, i) => (
              <tr key={row[0]} className={i === 2 ? 'strong' : ''}>{row.map((v, k) => <td key={k} className={k === 3 ? (v.startsWith('−') ? 'down' : v.startsWith('+') ? 'up' : '') : ''}>{v}</td>)}</tr>))}
          </tbody>
        </table></div>
        <p className={'simmsg' + (hay ? (b.ivaNeto < 0 ? ' fav' : ' pay') : '')} aria-live="polite">
          {!hay ? 'Escribe el subtotal de una factura que emitirías o de un gasto que recibirías para ver el efecto.'
            : `${b.ivaNeto >= 0 ? `Con esta simulación tendrías IVA por pagar de ${money(b.ivaNeto)}.` : `Con esta simulación tendrías IVA a favor de ${money(-b.ivaNeto)}.`} ${cambio < 0 ? `Tu pago estimado bajaría ${money(-cambio)}.` : cambio > 0 ? `Tu pago estimado subiría ${money(cambio)}.` : 'Tu pago estimado no cambiaría.'}`}
        </p>
      </div>

      <div className="card tips">
        <b>Cómo pagar menos impuestos, de forma legal</b>
        <ul>{tips.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}</ul>
        <p className="tiny">Reducir impuestos significa aprovechar las deducciones y los acreditamientos que la ley permite. Un contador puede revisar tu caso concreto.</p>
      </div>
    </>
  );
}
