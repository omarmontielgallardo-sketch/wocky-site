'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { LEGAL_VERSION } from '@/lib/legal';
import { limpiarRfc, validarRfc } from '@/lib/rfc';

export type Resultado = { ok: true; mensaje?: string; id?: string } | { ok: false; error: string };

const ERRORES: Record<string, string> = {
  limite_timbres: 'Llegaste al límite de timbres de tu plan. Mejora tu plan o compra timbres extra.',
  rfc_invalido: 'El RFC del cliente no es válido.',
  cliente_invalido: 'Escribe el nombre del cliente.',
  lineas_invalidas: 'Revisa los conceptos: descripción, cantidad y precio deben ser mayores a cero.',
  metodo_invalido: 'El método de pago no es válido.',
  uso_invalido: 'El uso del CFDI no es válido.',
  sin_acceso: 'No tienes acceso a esa empresa.',
  estatus_invalido: 'Esa factura ya no se puede modificar.',
  no_autenticado: 'Tu sesión expiró. Inicia sesión de nuevo.',
  limite_empresas: 'Tu plan ya no permite más empresas. Cambia de plan para agregar otra.',
  empresa_duplicada: 'Ya registraste una empresa con ese RFC.',
  razon_invalida: 'Escribe la razón social o el nombre de la empresa.',
  impuestos_invalidos: 'Los impuestos de la factura no son válidos. Restablece la sugerencia e inténtalo de nuevo.',
  proveedor_invalido: 'Escribe el nombre del proveedor.',
  concepto_invalido: 'Escribe el concepto de la factura.',
  monto_invalido: 'Escribe un subtotal mayor a cero.',
  fecha_invalida: 'La fecha de la factura no es válida.',
  datos_invalidos: 'Revisa los datos de la factura.',
  giro_invalido: 'Elige a qué se dedica la empresa.',
  plan_insuficiente: 'Tienes más empresas de las que permite ese plan. Elige un plan con más empresas.',
};
const mapError = (msg: string) => {
  const k = Object.keys(ERRORES).find(k => msg.includes(k));
  return k ? ERRORES[k] : 'No se pudo completar la acción. Intenta de nuevo.';
};

export type EntradaFactura = {
  empresaId: string; clienteNombre: string; clienteRfc: string; uso: string; metodo: string;
  lineas: { descripcion: string; cantidad: number; precio: number }[]; timbrar: boolean;
  impuestos: { iva: string; isr: number; iva_ret: number; ieps: number; ish: number };
};

export async function guardarFactura(i: EntradaFactura): Promise<Resultado> {
  const { error } = await (await createClient()).rpc('guardar_factura', {
    p_empresa: i.empresaId, p_cliente_nombre: i.clienteNombre, p_cliente_rfc: i.clienteRfc, p_uso: i.uso, p_metodo: i.metodo,
    p_lineas: i.lineas, p_timbrar: i.timbrar, p_impuestos: i.impuestos,
  });
  if (error) return { ok: false, error: mapError(error.message) };
  revalidatePath('/panel');
  return { ok: true, mensaje: i.timbrar ? 'Factura timbrada (demostración).' : 'Borrador guardado.' };
}

async function simple(fn: 'timbrar_factura' | 'cancelar_factura' | 'eliminar_borrador', id: string, mensaje: string): Promise<Resultado> {
  const { error } = await (await createClient()).rpc(fn, { p_id: id });
  if (error) return { ok: false, error: mapError(error.message) };
  revalidatePath('/panel');
  return { ok: true, mensaje };
}
export async function timbrarFactura(id: string): Promise<Resultado> { return simple('timbrar_factura', id, 'Factura timbrada (demostración).'); }
export async function cancelarFactura(id: string): Promise<Resultado> { return simple('cancelar_factura', id, 'Factura cancelada.'); }
export async function eliminarBorrador(id: string): Promise<Resultado> { return simple('eliminar_borrador', id, 'Borrador eliminado.'); }

export async function crearEmpresa(i: { razon: string; rfc: string; regimen: string; giro: string }): Promise<Resultado> {
  const rfc = limpiarRfc(i.rfc), rc = validarRfc(rfc);
  if (!rc.ok) return { ok: false, error: rc.msg || 'Escribe el RFC de la empresa.' };
  if (i.razon.trim().length < 2) return { ok: false, error: ERRORES.razon_invalida };
  const { data, error } = await (await createClient()).rpc('crear_empresa', {
    p_razon: i.razon.trim(), p_rfc: rfc, p_regimen: i.regimen.slice(0, 3), p_version_privacidad: LEGAL_VERSION, p_version_terminos: LEGAL_VERSION, p_giro: i.giro,
  });
  if (error) return { ok: false, error: mapError(error.message) };
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Empresa agregada.', id: (data as { id: string }).id };
}

export async function actualizarGiro(empresaId: string, giro: string): Promise<Resultado> {
  if (!/^[a-z0-9_]{2,30}$/.test(giro)) return { ok: false, error: ERRORES.giro_invalido };
  const { error } = await (await createClient()).from('empresas').update({ giro }).eq('id', empresaId);
  if (error) return { ok: false, error: 'No se pudo actualizar el giro. Solo el administrador puede hacerlo.' };
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Giro actualizado.' };
}

export type EntradaRecibida = { empresaId: string; fecha: string; proveedor: string; rfc: string; concepto: string; categoria: string; metodo: string; ivaTasa: string; subtotal: number; deducible: boolean };
export async function guardarRecibida(i: EntradaRecibida): Promise<Resultado> {
  const rfc = limpiarRfc(i.rfc), rc = validarRfc(rfc);
  if (!rc.ok) return { ok: false, error: rc.msg || 'Escribe el RFC del proveedor.' };
  const { data, error } = await (await createClient()).rpc('guardar_recibida', {
    p_empresa: i.empresaId, p_fecha: i.fecha, p_proveedor: i.proveedor, p_rfc: rfc, p_concepto: i.concepto, p_categoria: i.categoria,
    p_metodo: i.metodo, p_iva_tasa: i.ivaTasa, p_subtotal: i.subtotal, p_deducible: i.deducible,
  });
  if (error) return { ok: false, error: mapError(error.message) };
  revalidatePath('/panel');
  const r = data as { deducible: boolean; iva: number };
  return { ok: true, mensaje: r.deducible ? `Factura recibida registrada. IVA acreditable: $${Number(r.iva).toFixed(2)}.` : 'Factura recibida registrada (no deducible).' };
}
export async function eliminarRecibida(id: string): Promise<Resultado> {
  const { error } = await (await createClient()).rpc('eliminar_recibida', { p_id: id });
  if (error) return { ok: false, error: mapError(error.message) };
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Factura recibida eliminada.' };
}

export async function elegirPlan(empresaId: string, plan: string): Promise<Resultado> {
  const { error } = await (await createClient()).rpc('elegir_plan', { p_empresa: empresaId, p_plan: plan });
  if (error) return { ok: false, error: /sin_acceso/.test(error.message) ? 'Solo el administrador puede elegir el plan.' : /plan_insuficiente/.test(error.message) ? ERRORES.plan_insuficiente : 'No se pudo guardar tu plan. Intenta de nuevo.' };
  revalidatePath('/panel');
  return { ok: true, mensaje: 'Plan guardado.' };
}

/** Derecho de acceso: copia de los datos del usuario (sin credenciales). */
export async function exportarMisDatos(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return '';
  const [empresas, clientes, facturas, conceptos, aceptaciones] = await Promise.all([
    supabase.from('empresas').select('*'), supabase.from('clientes').select('*'), supabase.from('facturas').select('*'),
    supabase.from('conceptos_frecuentes').select('*'), supabase.from('aceptaciones').select('*'),
  ]);
  return JSON.stringify({ cuenta: { correo: user.email, creada: user.created_at }, empresas: empresas.data, clientes: clientes.data, facturas: facturas.data, conceptos_frecuentes: conceptos.data, aceptaciones: aceptaciones.data }, null, 2);
}

/** Derecho de cancelación: borra empresas propias, sus datos y la cuenta de acceso. */
export async function eliminarCuenta(): Promise<Resultado> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: mapError('no_autenticado') };
  const { error } = await supabase.rpc('eliminar_mis_datos');
  if (error) return { ok: false, error: mapError(error.message) };
  const admin = createAdminClient();
  if (admin) await admin.auth.admin.deleteUser(user.id);
  await supabase.auth.signOut();
  redirect('/?cuenta=eliminada');
}
