import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { asegurarEmpresa } from '@/lib/empresa';
import { LIMITES } from '@/lib/constants';
import SiteNav from '@/components/SiteNav';
import Footer from '@/components/Footer';
import PanelClient, { type Empresa, type Factura, type Cliente, type Concepto } from '@/components/PanelClient';
import { cerrarSesion } from '@/app/auth/actions';

export const metadata: Metadata = { title: 'Mi panel' };
export const dynamic = 'force-dynamic';

export default async function PanelPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const empresaId = await asegurarEmpresa(supabase, user);

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

  const [empresa, facturas, clientes, conceptos, usados] = await Promise.all([
    supabase.from('empresas').select('id,razon_social,rfc,regimen,plan').eq('id', empresaId).single(),
    supabase.from('facturas').select('id,folio,cliente_nombre,cliente_rfc,uso_cfdi,metodo_pago,lineas,total,estatus,uuid_demo,timbrada_en,creada_en').eq('empresa_id', empresaId).order('creada_en', { ascending: false }).limit(500),
    supabase.from('clientes').select('id,nombre,rfc').eq('empresa_id', empresaId).order('nombre'),
    supabase.from('conceptos_frecuentes').select('descripcion,precio').eq('empresa_id', empresaId).order('descripcion'),
    supabase.rpc('timbres_usados', { eid: empresaId }),
  ]);
  const e = empresa.data as Empresa;
  return (
    <>
      <SiteNav />
      <main id="contenido" className="panel-wrap"><div className="wrap">
        <PanelClient
          empresa={e} email={user.email ?? ''}
          facturas={(facturas.data ?? []) as Factura[]} clientes={(clientes.data ?? []) as Cliente[]} conceptos={(conceptos.data ?? []) as Concepto[]}
          usados={Number(usados.data ?? 0)} limite={LIMITES[e.plan] ?? 40}
        />
      </div></main>
      <Footer />
    </>
  );
}
