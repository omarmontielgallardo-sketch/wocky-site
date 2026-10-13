import type { Metadata } from 'next';
import SiteNav from '@/components/SiteNav';
import Footer from '@/components/Footer';
import { RecuperarForm } from '@/components/AuthForms';
export const metadata: Metadata = { title: 'Recuperar contraseña' };

export default function Page() {
  return (
    <>
      <SiteNav />
      <main id="contenido" className="page-auth">
        <div className="authbox">
          <h1>Recuperar contraseña</h1>
          <p className="auth-sub">Te enviaremos un enlace para crear una nueva.</p>
          <RecuperarForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
