export const GENERICOS = ['XAXX010101000', 'XEXX010101000'];
const DIC = '0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ';

export const limpiarRfc = (v: string) => String(v).toUpperCase().replace(/[^A-ZÑ&0-9]/g, '').slice(0, 13);

export type RfcResultado = { ok: boolean; msg: string };

/**
 * Valida estructura, fecha y dígito verificador del RFC (algoritmo del SAT).
 * Confirma que el RFC está bien formado y no es un invento; que esté inscrito ante el SAT se confirma con el PAC (etapa 2).
 */
export function validarRfc(raw: string, opts: { generico?: boolean } = {}): RfcResultado {
  const r = limpiarRfc(raw);
  if (!r) return { ok: false, msg: '' };
  if (GENERICOS.includes(r)) return opts.generico ? { ok: true, msg: 'RFC genérico válido' } : { ok: false, msg: 'Un RFC genérico no se puede usar para registrar una empresa.' };
  if (r.length < 12) return { ok: false, msg: `Faltan caracteres (${r.length}/12 o 13).` };
  if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(r)) return { ok: false, msg: 'Formato inválido: 3 o 4 letras, 6 números de fecha y 3 de homoclave.' };
  const f = r.slice(r.length - 9, r.length - 3), yy = +f.slice(0, 2), mm = +f.slice(2, 4), dd = +f.slice(4, 6);
  const fechaOk = [1900, 2000].some(b => { const d = new Date(b + yy, mm - 1, dd); return d.getFullYear() === b + yy && d.getMonth() === mm - 1 && d.getDate() === dd; });
  if (!fechaOk) return { ok: false, msg: 'La fecha dentro del RFC no es válida.' };
  const base = r.padStart(13, ' ');
  let suma = 0;
  for (let i = 0; i < 12; i++) suma += DIC.indexOf(base[i]) * (13 - i);
  const d = 11 - (suma % 11), esperado = d === 11 ? '0' : d === 10 ? 'A' : String(d);
  if (base[12] !== esperado) return { ok: false, msg: 'Ese RFC no existe: el dígito verificador no coincide. Revisa que esté bien escrito.' };
  return { ok: true, msg: 'RFC válido' };
}
export const rfcOk = (v: string, opts?: { generico?: boolean }) => validarRfc(v, opts).ok;
export const money = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);
