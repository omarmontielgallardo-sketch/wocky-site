# Timbro (app)

Aplicación web de facturación electrónica CFDI 4.0 para México. **Etapa 1:** cuentas reales, empresas, facturas y control de timbres.
El timbrado ante el SAT **todavía es de demostración** (se conectará a un PAC en la etapa 2).

Stack: Next.js 15 (App Router) · React 19 · Supabase (Auth + Postgres con RLS) · despliegue en Vercel.

## 1. Base de datos (Supabase)
1. Crea un proyecto en https://supabase.com.
2. SQL Editor → New query → pega y ejecuta `supabase/migrations/0001_init.sql`.
3. Authentication → URL Configuration:
   - **Site URL**: la URL pública del sitio (p. ej. `https://timbro.mx`).
   - **Redirect URLs**: `https://TU-DOMINIO/auth/callback` (y `http://localhost:3000/auth/callback` para desarrollo).
4. Authentication → Providers → Email: deja activa la confirmación de correo.
5. Project Settings → API: copia la URL, la `anon key` y la `service_role key`.

## 2. Variables de entorno
Copia `.env.example` a `.env.local` y complétalo. `SUPABASE_SERVICE_ROLE_KEY` es secreta: solo vive en el servidor
y se usa únicamente para borrar al usuario de Auth cuando pide eliminar su cuenta.

## 3. Correr en local
```bash
npm install
npm run dev
```

## Pruebas
- `npm run test:db` ejecuta el esquema SQL en un Postgres local (PGlite) y verifica: cálculo de totales en servidor,
  folios, límite de timbres por plan, aislamiento entre empresas (RLS), permisos y el borrado de datos.
- `npm run typecheck` y `npm run build`.

## Seguridad (resumen)
- Las facturas **no se pueden escribir directamente**: solo con funciones SQL (`guardar_factura`, `timbrar_factura`, …) que recalculan totales,
  validan el RFC, asignan folio y descuentan timbres con la empresa bloqueada para evitar carreras.
- Un usuario no puede cambiar su propio plan (permiso de columna). El cambio de plan llegará con los cobros (etapa 3).
- Cada tabla tiene Row Level Security: solo los miembros de una empresa ven sus datos.
- Cabeceras de seguridad en `next.config.mjs`. Contraseñas gestionadas por Supabase Auth.

## Pendiente antes de lanzar
- Revisión legal de `lib/legal.ts` y de los campos entre corchetes (razón social, domicilio, jurisdicción).
- Etapa 2: integración con un PAC (sandbox primero), manejo seguro de CSD, XML/PDF reales.
- Etapa 3: cobros con Stripe y cambio de plan.
- Revisar con un contador el cumplimiento fiscal antes de timbrar de verdad.
