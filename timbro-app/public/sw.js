// Service worker mínimo: permite instalar Timbro como app. No guarda datos fiscales en caché.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* las solicitudes van siempre a la red */ });
