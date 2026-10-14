import type { SupabaseClient, User } from '@supabase/supabase-js';

/** Devuelve la empresa del usuario. Si aún no existe (p. ej. justo después de confirmar el correo), la crea con los datos del registro. */
export async function asegurarEmpresa(supabase: SupabaseClient, user: User): Promise<string | null> {
  const { data: mem } = await supabase.from('miembros').select('empresa_id').limit(1);
  if (mem && mem.length) return mem[0].empresa_id as string;
  const m = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  if (!m.razon_social || !m.rfc || !m.regimen || !m.aceptado_privacidad || !m.aceptado_terminos) return null;
  const { data, error } = await supabase.rpc('crear_empresa', {
    p_razon: m.razon_social, p_rfc: m.rfc, p_regimen: m.regimen, p_giro: m.giro && /^[a-z_]+$/.test(m.giro) ? m.giro : 'general',
    p_version_privacidad: m.aceptado_privacidad, p_version_terminos: m.aceptado_terminos,
  });
  if (error || !data) return null;
  return (data as { id: string }).id;
}
