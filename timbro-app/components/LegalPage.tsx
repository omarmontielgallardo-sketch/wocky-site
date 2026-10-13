import SiteNav from './SiteNav';
import Footer from './Footer';
import { LEGAL, LEGAL_VERSION } from '@/lib/legal';

export default function LegalPage({ doc }: { doc: keyof typeof LEGAL }) {
  const d = LEGAL[doc];
  return (
    <>
      <SiteNav />
      <main id="contenido" className="section legal-page">
        <article className="wrap narrow legal-body-page">
          <h1 className="legal-h1">{d.titulo}</h1>
          <p className="upd">Última actualización: 13 de octubre de 2026 · versión {LEGAL_VERSION}</p>
          <div className="legal-body" dangerouslySetInnerHTML={{ __html: d.html }} />
        </article>
      </main>
      <Footer />
    </>
  );
}
