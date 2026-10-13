'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { elegirPlan } from '@/app/panel/actions';
import { PLANES } from '@/lib/constants';

export default function PlanPicker({ empresaId, actual, primera }: { empresaId: string; actual: string; primera: boolean }) {
  const [sel, setSel] = useState(primera ? 'negocio' : actual);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  const nombre = PLANES.find(p => p.id === sel)?.nombre ?? '';
  const guardar = () => start(async () => {
    const r = await elegirPlan(empresaId, sel);
    if (r.ok) router.replace('/panel'); else setError(r.error);
  });
  return (
    <div className="planview">
      <div className="plan-head">
        <p className="eyebrow">{primera ? 'Último paso' : 'Tu plan'}</p>
        <h1 className="dash-title">{primera ? 'Elige tu plan' : 'Cambiar de plan'}</h1>
        <p className="sub">{primera ? 'Tu cuenta ya está creada. Elige el plan que quieres usar; podrás cambiarlo cuando quieras.' : 'El cambio aplica a tus timbres de este mes.'}</p>
      </div>
      <div className="pgrid" role="radiogroup" aria-label="Plan">
        {PLANES.map(p => (
          <button key={p.id} type="button" role="radio" aria-checked={sel === p.id} className={'pcard' + (sel === p.id ? ' sel' : '')} onClick={() => setSel(p.id)}>
            {'destacado' in p && p.destacado && <span className="ptag">Más popular</span>}
            <span className="pcheck" aria-hidden="true" />
            <h3>{p.nombre}</h3><p className="for">{p.para}</p>
            <p className="amt">${p.precio}<small>/mes</small></p>
            <ul><li><b>{p.timbres} timbres</b> al mes</li>{p.items.map(i => <li key={i}>{i}</li>)}</ul>
          </button>
        ))}
      </div>
      <p className="note plan-note">Precios en pesos mexicanos más IVA. Por ahora no se realiza ningún cobro: es una demostración y el plan solo define tus timbres del mes.</p>
      {error && <p className="amsg err" role="alert" style={{ textAlign: 'center' }}>{error}</p>}
      <div className="plan-act">
        <button className="btn shine" type="button" disabled={pending} onClick={guardar}>{pending ? 'Guardando…' : `${primera ? 'Continuar con el plan' : 'Cambiar al plan'} ${nombre}`}</button>
        {!primera && <Link className="btn ghost" href="/panel">Cancelar</Link>}
      </div>
    </div>
  );
}
