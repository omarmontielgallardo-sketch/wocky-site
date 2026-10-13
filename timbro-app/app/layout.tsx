import type { Metadata, Viewport } from 'next';
import './globals.css';
import ScrollFx from '@/components/ScrollFx';
import CookieBanner from '@/components/CookieBanner';

export const metadata: Metadata = {
  title: { default: 'Timbro · Facturación electrónica CFDI 4.0', template: '%s · Timbro' },
  description: 'Timbro: facturar nunca sonó tan fácil. Crea, timbra y administra tus CFDI 4.0 desde el navegador. Planes desde $99 al mes para México.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/favicon.svg', apple: '/logo.png' },
  appleWebApp: { capable: true, title: 'Timbro', statusBarStyle: 'default' },
  openGraph: { title: 'Timbro · Facturación electrónica CFDI 4.0', description: 'Facturar nunca sonó tan fácil.', images: ['/logo.png'], locale: 'es_MX', type: 'website' },
};
export const viewport: Viewport = { themeColor: '#5b4bff', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <a className="skip" href="#contenido">Saltar al contenido</a>
        <ScrollFx />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
