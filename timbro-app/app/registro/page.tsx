import type { Metadata } from 'next';
import SiteNav from '@/components/SiteNav';
import Footer from '@/components/Footer';
import { RegistroForm } from '@/components/AuthForms';
export const metadata: Metadata = { title: 'Crear cuenta' };

export default function Page() {
  return (
    <>
      <SiteNav />
      <main id="contenido" className="page-auth">
        <div className="authbox">
          <h1>Crear cuenta</h1>
          <p className="auth-sub">La cuenta que creas es la del administrador de tu empresa: gestiona el plan, las facturas y el equipo.</p>
          <RegistroForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
