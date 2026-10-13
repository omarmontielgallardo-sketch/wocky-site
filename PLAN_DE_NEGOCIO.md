# Plan de negocio: plataforma web de facturación digital (México)

> Borrador inicial. Las cifras de precios y costos son supuestos a validar, no datos verificados.

## 1. Propuesta de valor
Facturar CFDI 4.0 en menos de 1 minuto, sin saber de contabilidad, desde el navegador o el celular.

**Cliente objetivo (empezar estrecho):** freelancers y personas físicas con actividad empresarial (RESICO), y micro-negocios de 1 a 10 empleados. Evitar al inicio a empresas grandes (requieren complementos, nómina, integraciones ERP).

## 2. Requisito legal clave
- En México la factura es el **CFDI 4.0**, que debe ser **timbrado por un PAC** (Proveedor Autorizado de Certificación) autorizado por el SAT.
- No necesitas ser PAC: lo habitual es **integrarte a la API de un PAC** (p. ej. Facturama, SW Sapien, Finkok, Facturapi) y revender el servicio con tu propia experiencia de uso.
- Cada usuario sube su **CSD** (certificado de sello digital) y el RFC; hay que custodiarlos cifrados.
- Cancelación, complemento de pago (PPD), notas de crédito, y catálogos SAT (uso CFDI, régimen fiscal, clave producto/servicio) deben soportarse.
- Cumplir **LFPDPPP** (aviso de privacidad). Consultar a un contador/abogado fiscal antes de lanzar.

## 3. Producto (MVP)
1. Registro y alta de RFC + CSD.
2. Catálogo de clientes (validación de RFC y código postal) y de productos/servicios.
3. Crear factura CFDI 4.0 → timbrar → PDF + XML → enviar por correo.
4. Cancelar factura y complemento de pago.
5. Panel con historial y búsqueda.

**Después:** facturas recurrentes, portal de autofacturación para los clientes de tu cliente, descarga masiva SAT, integración con Stripe/Mercado Pago, API, multiusuario para contadores.

## 4. Modelo de ingresos (hipótesis)
| Plan | Público | Precio mensual aprox. |
|---|---|---|
| Gratis | Prueba | 3-5 facturas/mes |
| Básico | Freelancer | MXN 149-199, hasta ~30 facturas |
| Pro | Pequeño negocio | MXN 349-499, ilimitadas + recurrentes |
| Contadores | Despachos | Por cliente/RFC administrado |

Costo variable principal: el timbre del PAC (centavos a pocos pesos por CFDI). El margen depende de negociar paquetes de timbres por volumen.

## 5. Competencia
Factura.com, Facturama, Bind ERP, Contpaqi Facturación, Alegra, Facturoporti, Konfío/Clip, además del propio portal gratuito del SAT.
**Diferenciador posible:** experiencia mucho más simple (móvil primero), nicho claro (p. ej. freelancers de TI/diseño, o repartidores y plataformas), soporte en WhatsApp y precios transparentes.

## 6. Adquisición
- SEO ("cómo facturar siendo RESICO", "cómo emitir factura 4.0") con guías útiles.
- Alianzas con contadores (comisión recurrente).
- Comunidades de freelancers, TikTok/Instagram educativo fiscal.
- Plan gratuito que genera boca a boca.

## 7. Stack técnico sugerido
- Frontend: Next.js (desplegado en Vercel).
- Backend/BD: Postgres (Supabase o Neon) con cifrado de CSD (KMS).
- Facturación: API del PAC elegido.
- Pagos: Stripe (suscripciones).
- Correo: Resend o similar.

## 8. Roadmap
| Fase | Duración | Entregable |
|---|---|---|
| 0. Validación | 2-3 sem | Landing + lista de espera; 15-20 entrevistas a freelancers |
| 1. MVP | 6-8 sem | Emitir y cancelar CFDI con un PAC en sandbox |
| 2. Beta cerrada | 4 sem | 20-50 usuarios reales, ajustes |
| 3. Lanzamiento | — | Cobro con Stripe, SEO, alianzas con contadores |

## 9. Constitución y costos iniciales
- Empezar como persona física con actividad empresarial (RESICO) o constituir una SAS/S. de R.L. según tu asesor.
- Dominio, hosting, contrato con PAC, Stripe, asesoría fiscal/legal, aviso de privacidad y términos.

## 10. Riesgos
- Error en timbrado = problema fiscal para el cliente → pruebas exhaustivas y soporte.
- Seguridad de CSD y datos fiscales (riesgo reputacional alto).
- Cambios regulatorios del SAT.
- Mercado saturado → necesidad de nicho claro.
- Dependencia de un solo PAC → abstraer la integración.

## 11. Próximos pasos
1. Elegir nicho y nombre/dominio.
2. Entrevistar a 15 posibles clientes.
3. Abrir sandbox con 2 PACs y comparar API, precio por timbre y soporte.
4. Construir la landing en este repo y medir registros a la lista de espera.
