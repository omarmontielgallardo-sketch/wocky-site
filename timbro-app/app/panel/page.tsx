import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { asegurarEmpresa } from '@/lib/empresa';
import { LIMITES, RFC_MAX } from '@/lib/constants';
import SiteNav from '@/components/SiteNav';
import Footer from '@/components/Footer';
import PlanPicker from '@/components/PlanPicker';
import PanelShell from '@/components/panel/PanelShell';
import type { Empresa, Factura, Recibida, Cliente, Concepto, ResumenEmpresa } from '@/components/panel/types';
import { cerrarSesion } from '@/app/auth/actions';

export const metadata: Metadata = { title: 'Mi panel' };
export const dynamic = 'force-dynamic';

export default async function PanelPage({ searchParams }: { searchParams: Promise<{ plan?: string; e?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!user.email_confirmed_at) { await supabase.auth.signOut(); redirect('/login?error=confirma'); }
  const primera = await asegurarEmpresa(supabase, user);
  const { data: resumenRaw } = await supabase.rpc('resumen_empresas');
  const resumen = ((resumenRaw ?? []) as Record<string, unknown>[]).map(r => ({ ...r, facturado: Number(r.facturado) })) as unknown as ResumenEmpresa[];
  const empresaId = (sp.e && resumen.some(r => r.id === sp.e) ? sp.e : resumen[0]?.id) ?? primera;

  if (!empresaId) {
    return (
      <>
        <SiteNav />
        <main id="contenido" className="page-auth"><div className="authbox">
          <h1>No encontramos tu empresa</h1>
          <p className="auth-sub">Tu cuenta existe, pero aún no tiene una empresa registrada. Escríbenos a <a href="mailto:timbrocontacto@gmail.com">timbrocontacto@gmail.com</a> y lo resolvemos.</p>
          <form action={cerrarSesion}><button className="btn ghost" type="submit">Cerrar sesión</button></form>
        </div></main>
        <Footer />
      </>
    );
  }

  const [empresa, facturas, recibidas, clientes, conceptos, usados] = await Promise.all([
    supabase.from('empresas').select('id,razon_social,rfc,regimen,giro,plan,plan_elegido').eq('id', empresaId).single(),
    supabase.from('facturas').select('id,folio,cliente_nombre,cliente_rfc,uso_cfdi,metodo_pago,lineas,subtotal,iva_tipo,ieps,ish,iva,isr_retenido,iva_retenido,total,estatus,uuid_demo,timbrada_en,creada_en').eq('empresa_id', empresaId).order('creada_en', { ascending: false }).limit(500),
    supabase.from('recibidas').select('id,fecha,proveedor,rfc,concepto,categoria,metodo,iva_tasa,subtotal,iva,total,deducible,motivo').eq('empresa_id', empresaId).order('fecha', { ascending: false }).limit(500),
    supabase.from('clientes').select('id,nombre,rfc').eq('empresa_id', empresaId).order('nombre'),
    supabase.from('conceptos_frecuentes').select('descripcion,precio').eq('empresa_id', empresaId).order('descripcion'),
    supabase.rpc('timbres_usados', { eid: empresaId }),
  ]);
  const e = empresa.data as Empresa & { plan_elegido: boolean };
  if (!e.plan_elegido || sp.plan) {
    return (
      <>
        <SiteNav />
        <main id="contenido" className="panel-wrap"><div className="wrap"><PlanPicker empresaId={e.id} actual={e.plan} primera={!e.plan_elegido} /></div></main>
        <Footer />
      </>
    );
  }
  return (
    <>
      <SiteNav />
      <main id="contenido" className="panel-wrap"><div className="wrap">
        <PanelShell
          empresa={e} email={user.email ?? ''}
          facturas={(facturas.data ?? []) as Factura[]} recibidas={(recibidas.data ?? []) as Recibida[]} clientes={(clientes.data ?? []) as Cliente[]} conceptos={(conceptos.data ?? []) as Concepto[]}
          usados={Number(usados.data ?? 0)} limite={LIMITES[e.plan] ?? 40} empresas={resumen} rfcMax={RFC_MAX[e.plan] ?? 1}
        />
      </div></main>
      <Footer />
    </>
  );
}
