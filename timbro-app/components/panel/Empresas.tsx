'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { crearEmpresa, eliminarCuenta, exportarMisDatos } from '@/app/panel/actions';
import { REGIMENES_OTROS, REGIMENES_USADOS } from '@/lib/constants';
import { GIROS, giroDe } from '@/lib/impuestos';
import { limpiarRfc, money, validarRfc } from '@/lib/rfc';
import type { Ctx } from './types';

export default function Empresas({ c }: { c: Ctx }) {
  const router = useRouter();
  const { empresas, rfcMax } = c;
  const [nueva, setNueva] = useState(false);
  const [razon, setRazon] = useState(''), [rfc, setRfc] = useState(''), [reg, setReg] = useState('626'), [giro, setGiro] = useState('general'), [msg, setMsg] = useState('');
  const [datos, setDatos] = useState(''), [confirmar, setConfirmar] = useState('');
  const dData = useRef<HTMLDialogElement>(null), dDel = useRef<HTMLDialogElement>(null);
  const rc = validarRfc(rfc), n = rfc.length;
  const lleno = empresas.length >= rfcMax;
  const totF = empresas.reduce((t, e) => t + e.facturas, 0), totM = empresas.reduce((t, e) => t + Number(e.facturado), 0);

  const abrir = (id: string) => { c.ir('fact'); router.push(`/panel?e=${id}`); };
  const agregar = () => {
    if (!rc.ok) return setMsg(rc.msg || 'Escribe el RFC de la empresa.');
    if (razon.trim().length < 2) return setMsg('Escribe la razón social o el nombre de la empresa.');
    setMsg('');
    c.run(crearEmpresa({ razon, rfc: limpiarRfc(rfc), regimen: reg, giro }));
  };
  const verDatos = async () => { setDatos('Cargando…'); dData.current?.showModal(); setDatos(await exportarMisDatos()); };

  return (
    <>
      <div className="kpis">
        <div className="kpi"><small>Empresas registradas</small><b>{empresas.length} de {rfcMax}</b></div>
        <div className="kpi"><small>Facturas en total</small><b>{totF}</b></div>
        <div className="kpi"><small>Facturado en total</small><b>{money(totM)}</b></div>
      </div>

      <div className="card emps">
        <div className="hist-head"><b>Mis empresas</b><button className={'btn sm' + (lleno ? ' ghost' : ' shine')} type="button" onClick={() => { if (lleno) c.toast(`Tu plan permite ${rfcMax} ${rfcMax === 1 ? 'empresa' : 'empresas'}. Cambia de plan para agregar más.`, true); else setNueva(true); }}>+ Agregar empresa</button></div>
        <p className="tiny">Tu plan permite {rfcMax} {rfcMax === 1 ? 'empresa' : 'empresas'}.{lleno ? ' Para agregar más, cambia de plan.' : ''}</p>
        <div className="table"><table>
          <thead><tr><th>Empresa</th><th>RFC</th><th>Facturas</th><th>Timbradas</th><th>Borradores</th><th>Canceladas</th><th>Facturado</th><th>Timbres del mes</th><th /></tr></thead>
          <tbody>
            {empresas.map((e, i) => (
              <tr key={e.id} style={{ animationDelay: Math.min(i, 8) * 0.04 + 's' }}>
                <td>{e.razon_social}{e.id === c.empresa.id && <span className="badge" style={{ marginLeft: 8 }}>Activa</span>}<small className="uuid">Régimen {e.regimen} · {giroDe(e.giro).n}</small></td>
                <td className="mono">{e.rfc}</td><td className="num strong">{e.facturas}</td><td className="num">{e.timbradas}</td><td className="num">{e.borradores}</td><td className="num">{e.canceladas}</td><td className="num">{money(Number(e.facturado))}</td><td className="num">{e.timbres_mes}</td>
                <td><div className="rowact"><button type="button" onClick={() => abrir(e.id)}>{e.id === c.empresa.id ? 'Ver facturas' : 'Abrir'}</button></div></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      {nueva && (
        <form className="card newemp" noValidate onSubmit={ev => { ev.preventDefault(); agregar(); }}>
          <b>Agregar empresa</b>
          <label htmlFor="eRazon">Razón social o nombre</label>
          <input id="eRazon" placeholder="Estudio Aurora S.A. de C.V." autoComplete="organization" value={razon} onChange={ev => setRazon(ev.target.value)} />
          <label htmlFor="eRfc">RFC de la empresa</label>
          <input id="eRfc" className={'rfc-input' + (rc.ok ? ' ok' : n >= 12 ? ' bad' : '')} placeholder="EAU200101AB6" maxLength={20} autoCapitalize="characters" autoComplete="off" spellCheck={false} value={rfc} onChange={ev => setRfc(limpiarRfc(ev.target.value))} />
          <p className={'fhint' + (rc.ok ? ' ok' : n >= 12 ? ' err' : '')} aria-live="polite">{!n ? '12 caracteres para personas morales, 13 para personas físicas.' : rc.ok ? '✓ ' + rc.msg : n >= 12 ? rc.msg : `${n}/13 · ${rc.msg}`}</p>
          <label htmlFor="eReg">Régimen fiscal</label>
          <select id="eReg" value={reg} onChange={ev => setReg(ev.target.value)}>
            <optgroup label="Más usados">{REGIMENES_USADOS.map(([k, t]) => <option key={k} value={k}>{k} · {t}</option>)}</optgroup>
            <optgroup label="Otros regímenes">{REGIMENES_OTROS.map(([k, t]) => <option key={k} value={k}>{k} · {t}</option>)}</optgroup>
          </select>
          <label htmlFor="eGiro">¿A qué se dedica la empresa?</label>
          <select id="eGiro" value={giro} onChange={ev => setGiro(ev.target.value)}>{Object.entries(GIROS).map(([k, g]) => <option key={k} value={k}>{g.n}</option>)}</select>
          <div className="actions"><button className="btn shine" type="submit" disabled={c.pending}>Agregar empresa</button><button className="btn ghost" type="button" onClick={() => { setNueva(false); setMsg(''); }}>Cancelar</button></div>
          {msg && <p className="amsg err" role="alert">{msg}</p>}
        </form>
      )}

      <div className="card priv">
        <div><b>Mi privacidad</b><p className="tiny">Ejerce tus derechos sobre tus datos cuando quieras. <Link href="/privacidad" className="inl">Aviso de privacidad</Link></p></div>
        <div className="actions"><button className="btn ghost sm" type="button" onClick={verDatos}>Ver mis datos</button><button className="btn ghost sm danger" type="button" onClick={() => { setConfirmar(''); dDel.current?.showModal(); }}>Eliminar mi cuenta</button></div>
      </div>

      <dialog className="legal small" ref={dData} onClick={ev => ev.target === dData.current && dData.current?.close()}>
        <div className="legal-head"><h2>Mis datos</h2><button className="x" type="button" aria-label="Cerrar" onClick={() => dData.current?.close()}>×</button></div>
        <div className="legal-body">
          <p>Copia de los datos que Timbro guarda de tu cuenta (derecho de acceso). No incluye tu contraseña.</p>
          <label className="sr" htmlFor="dataBox">Datos de tu cuenta</label>
          <textarea id="dataBox" readOnly rows={12} value={datos} />
          <div className="actions"><button className="btn sm" type="button" onClick={async () => { try { await navigator.clipboard.writeText(datos); c.toast('Datos copiados.'); } catch { c.toast('Selecciona y copia el texto (Ctrl+C).'); } }}>Copiar</button><button className="btn ghost sm" type="button" onClick={() => dData.current?.close()}>Cerrar</button></div>
        </div>
      </dialog>

      <dialog className="legal small" ref={dDel} onClick={ev => ev.target === dDel.current && dDel.current?.close()}>
        <div className="legal-head"><h2>Eliminar mi cuenta</h2><button className="x" type="button" aria-label="Cerrar" onClick={() => dDel.current?.close()}>×</button></div>
        <div className="legal-body">
          <p>Se borrarán de forma definitiva tu cuenta, tus empresas, clientes, facturas emitidas y recibidas. <b>Esta acción no se puede deshacer.</b></p>
          <p>Los comprobantes ya certificados ante el SAT deben conservarse conforme a las disposiciones fiscales aplicables; guarda una copia antes de continuar.</p>
          <label htmlFor="delConfirm">Escribe <b>ELIMINAR</b> para confirmar</label>
          <input id="delConfirm" autoComplete="off" placeholder="ELIMINAR" value={confirmar} onChange={ev => setConfirmar(ev.target.value)} />
          <div className="actions"><button className="btn danger-solid sm" type="button" disabled={c.pending || confirmar.trim().toUpperCase() !== 'ELIMINAR'} onClick={() => c.run(eliminarCuenta())}>Eliminar definitivamente</button><button className="btn ghost sm" type="button" onClick={() => dDel.current?.close()}>Cancelar</button></div>
        </div>
      </dialog>
    </>
  );
}
