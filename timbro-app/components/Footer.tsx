import Link from 'next/link';
import { Logo } from './Logo';
import CookiePrefs from './CookiePrefs';

export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap foot-grid">
        <div className="foot-brand"><Logo gradient={false} /><p>Facturar nunca sonó tan fácil.</p></div>
        <div><h4>Producto</h4><ul><li><a href="/#funciones">Funciones</a></li><li><a href="/#precios">Precios</a></li><li><Link href="/panel">Mi panel</Link></li><li><a href="/#faq">Preguntas</a></li></ul></div>
        <div><h4>Legal</h4><ul><li><Link href="/privacidad">Aviso de privacidad</Link></li><li><Link href="/terminos">Términos y condiciones</Link></li><li><Link href="/cookies">Política de cookies</Link></li><li><CookiePrefs /></li></ul></div>
        <div><h4>Contacto</h4><ul><li><a href="mailto:timbrocontacto@gmail.com">timbrocontacto@gmail.com</a></li><li>México</li></ul></div>
      </div>
      <p className="copy">© 2026 Timbro. Servicio en desarrollo; no sustituye asesoría fiscal ni contable.</p>
    </footer>
  );
}
