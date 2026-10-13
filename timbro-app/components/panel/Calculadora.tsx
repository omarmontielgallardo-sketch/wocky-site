'use client';
import { useState } from 'react';
import { calculadora, type ConfigImp, type ModoCalc } from '@/lib/impuestos';
import { money } from '@/lib/rfc';

const TXT: Record<ModoCalc, [string, string]> = {
  neto: ['Monto neto que quiero recibir', 'Con los impuestos y retenciones de la factura que estás creando, calcula cuánto facturar (subtotal) para recibir esa cantidad.'],
  desglosar: ['Total con IVA incluido', 'Separa el subtotal y el IVA de un precio que ya incluye IVA.'],
  agregar: ['Subtotal', 'Suma los impuestos y retenciones de la factura que estás creando a un subtotal.'],
};

export default function Calculadora({ cfg, onUsar, abrirRef }: { cfg: ConfigImp; onUsar: (subtotal: number) => void; abrirRef?: React.RefObject<HTMLDetailsElement | null> }) {
  const [modo, setModo] = useState<ModoCalc>('neto');
  const [monto, setMonto] = useState('');
  const [iva, setIva] = useState(16);
  const r = calculadora(modo, parseFloat(monto) || 0, cfg, iva);
  return (
    <details className="card calc" ref={abrirRef as React.RefObject<HTMLDetailsElement>}>
      <summary>
        <span className="calc-ico"><svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="3" /><path d="M8 7h8M8 12h2M12 12h2M8 16h2M12 16h2" /></svg></span>
        <span><b>Calculadora de facturas</b><small>Desglosa el IVA, calcula cuánto cobrar para recibir lo que quieres y pásalo a tu factura.</small></span>
      </summary>
      <div className="calc-body">
        <div className="seg" role="tablist" aria-label="Tipo de cálculo">
          {([['neto', 'Quiero recibir…'], ['desglosar', 'Desglosar IVA'], ['agregar', 'Agregar impuestos']] as const).map(([k, t]) =>
            <button key={k} type="button" className={modo === k ? 'on' : ''} onClick={() => setModo(k)}>{t}</button>)}
        </div>
        <p className="tiny">{TXT[modo][1]}</p>
        <div className="calc-grid">
          <div><label htmlFor="cMonto">{TXT[modo][0]}</label><input id="cMonto" type="number" min="0" step="any" inputMode="decimal" placeholder="0.00" value={monto} onChange={e => setMonto(e.target.value)} /></div>
          {modo === 'desglosar' && <div><label htmlFor="cIva">IVA del total</label><select id="cIva" value={iva} onChange={e => setIva(+e.target.value)}><option value={16}>16%</option><option value={8}>8%</option><option value={0}>0%</option></select></div>}
        </div>
        <dl className="tot calc-out">
          {r.filas.map(([t, v, c]) => <div key={t} className={c}><dt>{t}</dt><dd>{money(v)}</dd></div>)}
        </dl>
        <div className="actions">
          <button className="btn sm" type="button" disabled={!(r.sub > 0)} onClick={() => onUsar(r.sub)}>Usar en la factura</button>
          <button className="btn ghost sm" type="button" onClick={() => setMonto('')}>Limpiar</button>
        </div>
      </div>
    </details>
  );
}
