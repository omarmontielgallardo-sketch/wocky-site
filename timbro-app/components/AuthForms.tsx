'use client';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { login, registrar, recuperar, restablecer, type FormState } from '@/app/auth/actions';
import { REGIMENES_OTROS, REGIMENES_USADOS } from '@/lib/constants';
import { GIROS } from '@/lib/impuestos';
import { limpiarRfc, validarRfc } from '@/lib/rfc';

const init: FormState = {};

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button className="btn shine" type="submit" disabled={pending}>{pending ? 'Un momento…' : children}</button>;
}
function Msg({ s }: { s: FormState }) {
  if (s.error) return <p className="amsg err" role="alert">{s.error}</p>;
  if (s.ok) return <p className="amsg" role="status">{s.ok}</p>;
  return null;
}
function Password({ id, name = 'password', placeholder, autoComplete }: { id: string; name?: string; placeholder: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw">
      <input id={id} name={name} type={show ? 'text' : 'password'} placeholder={placeholder} autoComplete={autoComplete} minLength={8} required />
      <button className={'eye' + (show ? ' on' : '')} type="button" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShow(!show)}>
        <svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
      </button>
    </div>
  );
}

export function LoginForm({ aviso }: { aviso?: string }) {
  const [s, action] = useActionState(login, init);
  return (
    <form className="afrm" action={action}>
      <label htmlFor="giro">¿A qué se dedica tu empresa?</label>
      <select id="giro" name="giro" defaultValue="general">{Object.entries(GIROS).map(([k, g]) => <option key={k} value={k}>{g.n}</option>)}</select>
      <label htmlFor="email">Correo</label>
      <input id="email" name="email" type="email" placeholder="tu@empresa.mx" autoComplete="email" required />
      <label htmlFor="password">Contraseña</label>
      <Password id="password" placeholder="••••••••" autoComplete="current-password" />
      <Submit>Entrar</Submit>
      <Msg s={s.error || s.ok ? s : aviso ? { error: aviso } : s} />
      <div className="auth-links"><Link href="/recuperar">Olvidé mi contraseña</Link><Link href="/registro">Crear cuenta</Link></div>
    </form>
  );
}

export function RegistroForm() {
  const [s, action] = useActionState(registrar, init);
  const [rfc, setRfc] = useState('');
  const rc = validarRfc(rfc), n = rfc.length;
  return (
    <form className="afrm" action={action}>
      <label htmlFor="razon_social">Razón social o nombre</label>
      <input id="razon_social" name="razon_social" placeholder="Estudio Aurora S.A. de C.V." autoComplete="organization" required />
      <label htmlFor="rfc">RFC de tu empresa</label>
      <input id="rfc" name="rfc" className={'rfc-input' + (rc.ok ? ' ok' : n >= 12 ? ' bad' : '')} placeholder="EAU200101AB6" maxLength={20} autoCapitalize="characters" autoComplete="off" spellCheck={false}
        value={rfc} onChange={e => setRfc(limpiarRfc(e.target.value))} aria-describedby="rfcHint" required />
      <p id="rfcHint" className={'fhint' + (rc.ok ? ' ok' : n >= 12 ? ' err' : '')} aria-live="polite">
        {!n ? '12 caracteres para personas morales, 13 para personas físicas.' : rc.ok ? '✓ ' + rc.msg : n >= 12 ? rc.msg : `${n}/13 · ${rc.msg}`}
      </p>
      <label htmlFor="regimen">Régimen fiscal</label>
      <select id="regimen" name="regimen" defaultValue="626">
        <optgroup label="Más usados">{REGIMENES_USADOS.map(([c, n]) => <option key={c} value={c}>{c} · {n}</option>)}</optgroup>
        <optgroup label="Otros regímenes">{REGIMENES_OTROS.map(([c, n]) => <option key={c} value={c}>{c} · {n}</option>)}</optgroup>
      </select>
      <label htmlFor="email">Correo</label>
      <input id="email" name="email" type="email" placeholder="tu@empresa.mx" autoComplete="email" required />
      <label htmlFor="password">Contraseña</label>
      <Password id="password" placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
      <label className="chk-l"><input type="checkbox" name="acepto" required /> <span>Leí el <Link href="/privacidad" target="_blank">Aviso de privacidad</Link> y acepto los <Link href="/terminos" target="_blank">Términos y condiciones</Link>.</span></label>
      <Submit>Crear cuenta de administrador</Submit>
      <Msg s={s} />
      <div className="auth-links"><span>¿Ya tienes cuenta?</span><Link href="/login">Iniciar sesión</Link></div>
    </form>
  );
}

export function RecuperarForm() {
  const [s, action] = useActionState(recuperar, init);
  return (
    <form className="afrm" action={action}>
      <label htmlFor="email">Correo de tu cuenta</label>
      <input id="email" name="email" type="email" placeholder="tu@empresa.mx" autoComplete="email" required />
      <Submit>Enviar enlace</Submit>
      <Msg s={s} />
      <div className="auth-links"><Link href="/login">Volver a iniciar sesión</Link></div>
    </form>
  );
}

export function RestablecerForm() {
  const [s, action] = useActionState(restablecer, init);
  return (
    <form className="afrm" action={action}>
      <label htmlFor="password">Nueva contraseña</label>
      <Password id="password" placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
      <Submit>Guardar contraseña</Submit>
      <Msg s={s} />
    </form>
  );
}
