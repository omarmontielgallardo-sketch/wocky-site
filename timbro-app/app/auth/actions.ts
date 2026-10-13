'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { asegurarEmpresa } from '@/lib/empresa';
import { LEGAL_VERSION } from '@/lib/legal';
import { rfcOk } from '@/lib/rfc';

export type FormState = { error?: string; ok?: string };
const text = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const siteUrl = async () => process.env.NEXT_PUBLIC_SITE_URL || (await headers()).get('origin') || 'http://localhost:3000';
const configured = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const NO_CONFIG: FormState = { error: 'El servicio de cuentas aún no está configurado. Intenta más tarde.' };

export async function login(_: FormState, f: FormData): Promise<FormState> {
  if (!configured()) return NO_CONFIG;
  const email = text(f, 'email').toLowerCase(), password = String(f.get('password') ?? '');
  if (!email || !password) return { error: 'Escribe tu correo y contraseña.' };
  const { error } = await (await createClient()).auth.signInWithPassword({ email, password });
  if (error) {
    if (/not confirmed/i.test(error.message)) return { error: 'Confirma tu correo antes de entrar. Revisa tu bandeja de entrada.' };
    return { error: 'Correo o contraseña incorrectos.' };
  }
  redirect('/panel');
}

export async function registrar(_: FormState, f: FormData): Promise<FormState> {
  if (!configured()) return NO_CONFIG;
  const razon = text(f, 'razon_social'), rfc = text(f, 'rfc').toUpperCase(), regimen = text(f, 'regimen').slice(0, 3);
  const email = text(f, 'email').toLowerCase(), password = String(f.get('password') ?? '');
  if (razon.length < 2) return { error: 'Escribe la razón social o tu nombre.' };
  if (!rfcOk(rfc)) return { error: 'El RFC no tiene un formato válido (12 o 13 caracteres).' };
  if (!/^\d{3}$/.test(regimen)) return { error: 'Elige un régimen fiscal.' };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Escribe un correo válido.' };
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.' };
  if (f.get('acepto') !== 'on') return { error: 'Para crear tu cuenta debes aceptar el Aviso de privacidad y los Términos y condiciones.' };

  const supabase = await createClient();
  const base = await siteUrl();
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: {
      emailRedirectTo: `${base}/auth/callback`,
      data: { razon_social: razon, rfc, regimen, aceptado_privacidad: LEGAL_VERSION, aceptado_terminos: LEGAL_VERSION },
    },
  });
  if (error) return { error: /password/i.test(error.message) ? 'Elige una contraseña más segura (mínimo 8 caracteres).' : 'No pudimos crear tu cuenta. Intenta de nuevo.' };
  if (data.session && data.user) {
    const id = await asegurarEmpresa(supabase, data.user);
    if (!id) return { error: 'Tu cuenta se creó, pero no pudimos registrar tu empresa. Inicia sesión e inténtalo de nuevo.' };
    redirect('/panel');
  }
  // Mensaje igual exista o no el correo, para no revelar qué cuentas existen.
  return { ok: 'Te enviamos un correo para confirmar tu cuenta. Ábrelo y entra desde el enlace.' };
}

export async function recuperar(_: FormState, f: FormData): Promise<FormState> {
  if (!configured()) return NO_CONFIG;
  const email = text(f, 'email').toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Escribe un correo válido.' };
  await (await createClient()).auth.resetPasswordForEmail(email, { redirectTo: `${await siteUrl()}/auth/callback?next=/restablecer` });
  return { ok: 'Si ese correo tiene una cuenta, te enviamos un enlace para crear una nueva contraseña.' };
}

export async function restablecer(_: FormState, f: FormData): Promise<FormState> {
  if (!configured()) return NO_CONFIG;
  const password = String(f.get('password') ?? '');
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.' };
  const { error } = await (await createClient()).auth.updateUser({ password });
  if (error) return { error: 'El enlace expiró o no es válido. Solicita uno nuevo.' };
  redirect('/panel');
}

export async function cerrarSesion() {
  if (configured()) await (await createClient()).auth.signOut();
  redirect('/');
}
