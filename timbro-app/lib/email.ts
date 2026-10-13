import 'server-only';
import { promises as dns } from 'node:dns';

const DESECHABLES = new Set(['mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org', 'yopmail.com', 'trashmail.com', 'sharklasers.com', 'getnada.com', 'dispostable.com', 'maildrop.cc', 'fakeinbox.com', 'throwawaymail.com', 'mailnesia.com']);
const ERRATAS: Record<string, string> = { 'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmail.con': 'gmail.com', 'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmail.co': 'gmail.com', 'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'icloud.con': 'icloud.com' };

const conTiempo = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

/**
 * Revisa que el correo exista: forma válida, sin errores comunes, sin dominios desechables y con servidores de correo (MX) reales.
 * Que el buzón sea de la persona se comprueba con el enlace de confirmación: sin confirmarlo no se puede entrar.
 */
export async function validarCorreo(raw: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const e = raw.trim().toLowerCase();
  const [user, dom] = e.split('@');
  if (!dom || !/^[a-z0-9._%+-]{1,64}$/.test(user) || user.startsWith('.') || user.endsWith('.') || user.includes('..') ||
      !/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(dom)) return { ok: false, error: 'Escribe un correo válido, por ejemplo tu@empresa.mx.' };
  if (ERRATAS[dom]) return { ok: false, error: `¿Quisiste escribir ${user}@${ERRATAS[dom]}? Corrígelo para continuar.` };
  if (DESECHABLES.has(dom)) return { ok: false, error: 'Ese correo es temporal. Usa un correo real que revises.' };
  try {
    const mx = await conTiempo(dns.resolveMx(dom), 4000);
    if (mx.length) return { ok: true };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOTFOUND' || code === 'ENODATA') {
      // Sin MX, el correo puede entregarse al registro A del dominio; si tampoco existe, el dominio no existe.
      try { const a = await conTiempo(dns.resolve4(dom), 4000); if (a.length) return { ok: true }; } catch { /* sin registros */ }
      return { ok: false, error: 'Ese correo no existe: el dominio no recibe correos. Revisa cómo lo escribiste.' };
    }
    return { ok: true }; // fallo temporal de DNS: no bloqueamos; la confirmación por enlace sigue siendo obligatoria
  }
  return { ok: false, error: 'Ese correo no existe: el dominio no recibe correos. Revisa cómo lo escribiste.' };
}
