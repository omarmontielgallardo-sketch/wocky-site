'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type Resultado = { ok: true; mensaje?: string } | { ok: false; error: string };

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
};
const mapError = (msg: string) => {
  const k = Object.keys(ERRORES).find(k => msg.includes(k));
  return k ? ERRORES[k] : 'No se pudo completar la acción. Intenta de nuevo.';
};

export type EntradaFactura = {
  empresaId: string; clienteNombre: string; clienteRfc: string; uso: string; metodo: string;
  lineas: { descripcion: string; cantidad: number; precio: number }[]; timbrar: boolean;
};

export async function guardarFactura(i: EntradaFactura): Promise<Resultado> {
  const { error } = await (await createClient()).rpc('guardar_factura', {
    p_empresa: i.empresaId, p_cliente_nombre: i.clienteNombre, p_cliente_rfc: i.clienteRfc, p_uso: i.uso, p_metodo: i.metodo,
    p_lineas: i.lineas, p_timbrar: i.timbrar,
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

export async function elegirPlan(empresaId: string, plan: string): Promise<Resultado> {
  const { error } = await (await createClient()).rpc('elegir_plan', { p_empresa: empresaId, p_plan: plan });
  if (error) return { ok: false, error: /sin_acceso/.test(error.message) ? 'Solo el administrador puede elegir el plan.' : 'No se pudo guardar tu plan. Intenta de nuevo.' };
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
