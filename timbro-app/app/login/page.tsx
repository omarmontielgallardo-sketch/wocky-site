import type { Metadata } from 'next';
import SiteNav from '@/components/SiteNav';
import Footer from '@/components/Footer';
import { LoginForm } from '@/components/AuthForms';
export const metadata: Metadata = { title: 'Iniciar sesión' };

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <SiteNav />
      <main id="contenido" className="page-auth">
        <div className="authbox">
          <h1>Iniciar sesión</h1>
          <p className="auth-sub">Entra al panel de tu empresa.</p>
          <LoginForm aviso={sp.error ? "El enlace expiró o no es válido. Intenta de nuevo." : undefined} />
        </div>
      </main>
      <Footer />
    </>
  );
}
