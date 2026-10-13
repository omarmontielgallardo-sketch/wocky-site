import Link from 'next/link';
import SiteNav from '@/components/SiteNav';
import Footer from '@/components/Footer';
import { PLANES } from '@/lib/constants';

const FAQ: [string, React.ReactNode][] = [
  ['¿Qué es un timbre?', 'Es una factura certificada ante el SAT. Cada factura timbrada descuenta uno de tu plan; los borradores no.'],
  ['¿Ya timbra de verdad?', 'Todavía no. Esta versión es una demostración: crea, calcula y administra facturas, pero no las certifica ante el SAT. El timbrado real se hará a través de un Proveedor Autorizado de Certificación (PAC).'],
  ['¿Qué necesito para empezar?', 'Tu RFC y tu certificado de sello digital (CSD) vigente.'],
  ['¿Mis datos están seguros?', <>Tus datos se guardan con acceso restringido a tu empresa y puedes verlos o eliminarlos desde tu panel. Consulta nuestro <Link href="/privacidad">Aviso de privacidad</Link>.</>],
  ['¿Timbro reemplaza a mi contador?', 'No. Timbro es una herramienta para generar y administrar comprobantes; no ofrece asesoría fiscal ni contable.'],
];

export default function Home() {
  return (
    <>
      <SiteNav home />
      <main id="contenido">
        <section className="hero" id="inicio">
          <div className="blob b1" /><div className="blob b2" /><div className="dots" />
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="pill rise" style={{ '--d': '0s' } as React.CSSProperties}><i className="live" /> Facturación electrónica · México</p>
              <h1>
                <span className="w rise" style={{ '--d': '.08s' } as React.CSSProperties}>Factura</span>{' '}
                <span className="w rise" style={{ '--d': '.16s' } as React.CSSProperties}>en</span>{' '}
                <span className="w rise" style={{ '--d': '.24s' } as React.CSSProperties}><em>un minuto</em>.</span>
              </h1>
              <p className="slogan rise" style={{ '--d': '.32s' } as React.CSSProperties}>Facturar nunca sonó tan fácil.</p>
              <p className="lead rise" style={{ '--d': '.4s' } as React.CSSProperties}>Crea, timbra y administra tus CFDI 4.0 desde el navegador. Valida el RFC al instante y mantén el control de tus timbres, sin hojas de cálculo ni trámites.</p>
              <div className="cta rise" style={{ '--d': '.5s' } as React.CSSProperties}>
                <Link className="btn shine" href="/registro">Crear mi cuenta</Link>
                <a className="btn ghost" href="#como">Cómo funciona</a>
              </div>
              <p className="fine rise" style={{ '--d': '.6s' } as React.CSSProperties}>Cumple con el estándar CFDI 4.0 · Sin permanencia</p>
            </div>
            <div className="mock rise" style={{ '--d': '.3s' } as React.CSSProperties} aria-hidden="true">
              <div className="inv-card">
                <div className="top"><b>Factura A-0042</b><span className="tagt">CFDI 4.0</span></div>
                <div className="r"><small>Cliente</small><span>Estudio Aurora S.A.</span></div>
                <div className="r"><small>RFC</small><span>EAU 200101 AB1</span></div>
                <div className="r"><small>Concepto</small><span>Diseño de marca</span></div>
                <div className="sep" />
                <div className="r"><small>Subtotal</small><span>$12,000.00</span></div>
                <div className="r"><small>IVA 16%</small><span>$1,920.00</span></div>
                <div className="r tot"><small>Total</small><span>$13,920.00</span></div>
                <div className="stamp-big">TIMBRADA</div>
              </div>
              <div className="chip c1">⚡ 0.8 s</div><div className="chip c2">PDF + XML</div>
            </div>
          </div>
        </section>

        <section className="section" id="funciones">
          <div className="wrap">
            <div className="head rv"><p className="eyebrow">Por qué Timbro</p><h2>Menos trámite, más claridad</h2><p className="sub">Hecho para freelancers, negocios pequeños y despachos que quieren facturar bien a la primera.</p></div>
            <div className="feats">
              {[
                ['Rápida', 'Guarda tus clientes y conceptos una vez. La siguiente factura son tres clics.', <path key="a" d="M13 2L4 14h7l-1 8 9-12h-7z" />],
                ['Sin errores', 'Validamos el RFC y los datos fiscales antes de timbrar para evitar rechazos.', <g key="b"><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></g>],
                ['Con control', 'Ve cuántos timbres te quedan, qué facturas están pendientes y cuáles cancelaste.', <g key="c"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></g>],
                ['Crece contigo', 'De un RFC a veinte, de un usuario a un equipo, con planes claros y sin letra chica.', <g key="d"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M7 15h4" /></g>],
              ].map(([t, d, icon]) => (
                <article className="feat rv" key={t as string}><span className="ico"><svg viewBox="0 0 24 24">{icon as React.ReactNode}</svg></span><h3>{t as string}</h3><p>{d as string}</p></article>
              ))}
            </div>
          </div>
        </section>

        <section className="section alt" id="como">
          <div className="wrap">
            <div className="head rv"><p className="eyebrow">Cómo funciona</p><h2>Tres pasos y listo</h2></div>
            <ol className="steps">
              <li className="rv"><span className="n">1</span><h3>Registra tu empresa</h3><p>Ingresa tu razón social, RFC y régimen fiscal. Tu cuenta queda lista en segundos.</p></li>
              <li className="rv"><span className="n">2</span><h3>Captura la factura</h3><p>Elige al cliente, agrega conceptos y revisa el IVA y el total calculados.</p></li>
              <li className="rv"><span className="n">3</span><h3>Timbra y envía</h3><p>Con un clic se descuenta un timbre y la factura queda en tu historial.</p></li>
            </ol>
          </div>
        </section>

        <section className="section" id="precios">
          <div className="wrap">
            <div className="head rv"><p className="eyebrow">Precios</p><h2>Un plan para cada etapa</h2><p className="sub">Todos incluyen cuenta, historial de facturas y control de timbres.</p></div>
            <div className="prices">
              {PLANES.map(p => (
                <article className={'plan rv' + ('destacado' in p && p.destacado ? ' hot' : '')} key={p.id}>
                  {'destacado' in p && p.destacado && <span className="tag">Más popular</span>}
                  <h3>{p.nombre}</h3><p className="for">{p.para}</p>
                  <p className="amt">${p.precio}<small>/mes</small></p>
                  <ul><li><b>{p.timbres} timbres</b> al mes</li>{p.items.map(i => <li key={i}>{i}</li>)}</ul>
                </article>
              ))}
            </div>
            <p className="note">Precios en pesos mexicanos más IVA. Timbre extra: $3. Precios de referencia durante la etapa de validación; pueden cambiar al lanzamiento.</p>
          </div>
        </section>

        <section className="section alt" id="faq">
          <div className="wrap narrow">
            <div className="head rv"><p className="eyebrow">Preguntas</p><h2>Lo que más nos preguntan</h2></div>
            {FAQ.map(([q, a]) => <details className="rv" key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
