import type { Metadata } from 'next';
import SiteNav from '@/components/SiteNav';
import Footer from '@/components/Footer';
import { RestablecerForm } from '@/components/AuthForms';
export const metadata: Metadata = { title: 'Nueva contraseña' };

export default function Page() {
  return (
    <>
      <SiteNav />
      <main id="contenido" className="page-auth">
        <div className="authbox">
          <h1>Nueva contraseña</h1>
          <p className="auth-sub">Elige una contraseña nueva para tu cuenta.</p>
          <RestablecerForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
