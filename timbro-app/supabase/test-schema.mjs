// Prueba el esquema en un Postgres local (PGlite) simulando Supabase Auth y los roles.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const db = new PGlite();
const A = '11111111-1111-1111-1111-111111111111', B = '22222222-2222-2222-2222-222222222222';
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  insert into auth.users values ('${A}'), ('${B}');
`);
await db.exec(readFileSync(new URL('./migrations/0001_init.sql', import.meta.url), 'utf8'));

let pass = 0, fail = 0;
const as = async uid => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); set role authenticated;`); };
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'OK  ' : 'FALLA'} ${name}${cond ? '' : ' ' + extra}`); };
const throws = async (name, sql, params, msg) => {
  try { await db.query(sql, params); ok(name, false, '(no lanzó error)'); }
  catch (e) { ok(name, !msg || String(e.message).includes(msg), `(error: ${e.message})`); }
};
const q = async (sql, params) => (await db.query(sql, params)).rows;

await as(A);
const [emp] = await q(`select * from crear_empresa('Estudio Aurora SA', 'eau200101ab6', '601', '2026-10-13', '2026-10-13')`);
ok('crear_empresa normaliza el RFC', emp.rfc === 'EAU200101AB6' && emp.plan === 'emprendedor');
ok('el plan no está elegido al crear la cuenta', emp.plan_elegido === false);
await throws('plan inexistente se rechaza', `select elegir_plan($1, 'gratis')`, [emp.id], 'plan_invalido');
const [ep] = await q(`select * from elegir_plan($1, 'negocio')`, [emp.id]);
ok('elegir plan lo guarda y lo marca como elegido', ep.plan === 'negocio' && ep.plan_elegido === true);
await q(`select elegir_plan($1, 'emprendedor')`, [emp.id]);
await throws('RFC con dígito verificador falso se rechaza', `select crear_empresa('X SA', 'EAU200101AB1', '601', 'v', 'v')`, [], 'rfc_invalido');
await throws('RFC con fecha imposible se rechaza', `select crear_empresa('X SA', 'EAU201301AB6', '601', 'v', 'v')`, [], 'rfc_invalido');
await throws('RFC genérico no sirve para registrar empresa', `select crear_empresa('X SA', 'XAXX010101000', '601', 'v', 'v')`, [], 'rfc_invalido');
ok('RFC real del SAT es válido', (await q(`select rfc_valido('SAT970701NN3') v`))[0].v === true);
ok('RFC persona física válido', (await q(`select rfc_valido('GAMJ800101AB8') v`))[0].v === true);
await throws('RFC inválido se rechaza', `select crear_empresa('X SA', 'abc', '601', 'v', 'v')`, [], 'rfc_invalido');
await throws('sin aceptar aviso no se crea', `select crear_empresa('X SA', 'NUB200101ABA', '601', '', '')`, [], 'aceptacion_requerida');
ok('aceptaciones registradas', (await q(`select count(*)::int c from aceptaciones`))[0].c === 2);

const lineas = JSON.stringify([{ descripcion: 'Diseño', cantidad: 2, precio: 100.5 }]);
const [f1] = await q(`select * from guardar_factura($1, 'Cliente Uno', 'xaxx010101000', 'G03', 'PUE', $2::jsonb, false)`, [emp.id, lineas]);
ok('totales calculados en servidor', f1.subtotal === '201.00' && f1.iva === '32.16' && f1.total === '233.16', JSON.stringify(f1));
ok('folio A-0001 y estatus borrador', f1.folio === 'A-0001' && f1.estatus === 'borrador');
await throws('cliente con RFC falso se rechaza', `select guardar_factura($1,'Cliente','GAMJ800101AB1','G03','PUE',$2::jsonb,false)`, [emp.id, lineas], 'rfc_invalido');
await throws('líneas con precio negativo se rechazan', `select guardar_factura($1,'Cliente','XAXX010101000','G03','PUE','[{"descripcion":"x","cantidad":1,"precio":-5}]'::jsonb,false)`, [emp.id], 'lineas_invalidas');
const [f1s] = await q(`select * from timbrar_factura($1)`, [f1.id]);
ok('timbrar cambia estatus y genera UUID demo', f1s.estatus === 'timbrada' && !!f1s.uuid_demo);
await throws('no se puede timbrar dos veces', `select timbrar_factura($1)`, [f1.id], 'estatus_invalido');
ok('timbres usados = 1', (await q(`select timbres_usados($1) n`, [emp.id]))[0].n === 1);
ok('cliente y concepto guardados', (await q(`select (select count(*) from clientes) c, (select count(*) from conceptos_frecuentes) k`))[0].c == 1);
const [c1] = await q(`select * from cancelar_factura($1)`, [f1.id]);
ok('cancelar funciona y el timbre sigue contado', c1.estatus === 'cancelada' && (await q(`select timbres_usados($1) n`, [emp.id]))[0].n === 1);
const [d1] = await q(`select * from guardar_factura($1, 'Cliente Dos', 'EAU200101AB6', 'G03', 'PPD', $2::jsonb, false)`, [emp.id, lineas]);
await q(`select eliminar_borrador($1)`, [d1.id]);
ok('eliminar borrador', (await q(`select count(*)::int c from facturas where id = $1`, [d1.id]))[0].c === 0);
await throws('no se elimina una factura timbrada', `select eliminar_borrador($1)`, [f1.id], 'estatus_invalido');

// Límite de timbres del plan (40)
for (let i = 0; i < 39; i++) await q(`select guardar_factura($1, 'Cliente Uno', 'XAXX010101000', 'G03', 'PUE', $2::jsonb, true)`, [emp.id, lineas]);
ok('40 timbres usados', (await q(`select timbres_usados($1) n`, [emp.id]))[0].n === 40);
await throws('timbre 41 se bloquea', `select guardar_factura($1, 'Cliente Uno', 'XAXX010101000', 'G03', 'PUE', $2::jsonb, true)`, [emp.id, lineas], 'limite_timbres');

// Varias empresas por administrador
await q(`select elegir_plan($1, 'negocio')`, [emp.id]);
const [emp2] = await q(`select * from crear_empresa('Beta Servicios', 'BET200101AAA', '612', '2026-10-13', '2026-10-13')`);
ok('la segunda empresa hereda el plan y queda elegida', emp2.plan === 'negocio' && emp2.plan_elegido === true);
await throws('RFC repetido entre empresas se rechaza', `select crear_empresa('Otra', 'BET200101AAA', '612', 'v', 'v')`, [], 'empresa_duplicada');
ok('los timbres son un pool entre empresas (40 ya usados)', (await q(`select timbres_usados($1) n`, [emp2.id]))[0].n === 40);
await q(`select guardar_factura($1, 'Cliente Dos', 'XAXX010101000', 'G03', 'PUE', $2::jsonb, true)`, [emp2.id, lineas]);
ok('el pool suma la factura de la segunda empresa', (await q(`select timbres_usados($1) n`, [emp.id]))[0].n === 41);
const res = await q(`select * from resumen_empresas()`);
ok('resumen: 2 empresas', res.length === 2, JSON.stringify(res));
ok('resumen: conteo de facturas de la primera', res[0].facturas === 40 && res[0].timbradas === 39 && res[0].canceladas === 1 && res[0].borradores === 0 && res[0].timbres_mes === 40, JSON.stringify(res[0]));
ok('resumen: conteo de la segunda', res[1].facturas === 1 && res[1].timbradas === 1 && Number(res[1].facturado) === 233.16, JSON.stringify(res[1]));
await throws('no se baja a un plan con menos empresas', `select elegir_plan($1, 'emprendedor')`, [emp.id], 'plan_insuficiente');
await q(`select crear_empresa('Carlos SA', 'CAR910315MX6', '626', 'v', 'v')`);
await throws('el plan Negocio permite 3 empresas', `select crear_empresa('Delta SA', 'DEL850707HJ4', '626', 'v', 'v')`, [], 'limite_empresas');
await q(`select elegir_plan($1, 'despacho')`, [emp.id]);
ok('cambiar plan aplica a todas las empresas', (await q(`select count(*)::int c from empresas where plan = 'despacho'`))[0].c === 3);
await q(`select crear_empresa('Delta SA', 'DEL850707HJ4', '626', 'v', 'v')`);
ok('con Despacho se pueden agregar más', (await q(`select count(*)::int c from resumen_empresas()`))[0].c === 4);

// Aislamiento entre empresas / usuarios
await as(B);
ok('B no ve facturas de A', (await q(`select count(*)::int c from facturas`))[0].c === 0);
ok('B no ve empresas de A', (await q(`select count(*)::int c from empresas`))[0].c === 0);
ok('B no tiene panel de empresas ajenas', (await q(`select count(*)::int c from resumen_empresas()`))[0].c === 0);
await throws('B no puede elegir el plan de A', `select elegir_plan($1, 'despacho')`, [emp.id], 'sin_acceso');
await throws('B no puede timbrar facturas de A', `select timbrar_factura($1)`, [f1.id], 'sin_acceso');
await throws('B no puede crear facturas en la empresa de A', `select guardar_factura($1,'C','XAXX010101000','G03','PUE',$2::jsonb,false)`, [emp.id, lineas], 'sin_acceso');
await throws('insertar directo en facturas está prohibido', `insert into facturas (empresa_id, folio, cliente_nombre, cliente_rfc, lineas, subtotal, iva, total) values ($1,'X','C','XAXX010101000','[]',0,0,0)`, [emp.id], 'permission denied');

await as(A);
await throws('el usuario no puede cambiar su plan', `update empresas set plan = 'despacho' where id = $1`, [emp.id], 'permission denied');
await throws('el usuario no puede editar facturas directamente', `update facturas set total = 1`, [], 'permission denied');
ok('el usuario sí puede editar razón social', (await q(`update empresas set razon_social = 'Aurora Estudio SA' where id = $1 returning 1`, [emp.id])).length === 1);

// Sin sesión
await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); set role anon;`);
await throws('anónimo no lee facturas', `select * from facturas`, [], 'permission denied');
ok('anónimo sí ve los planes', (await q(`select count(*)::int c from planes`))[0].c === 3);

// Derecho de cancelación
await as(A);
await q(`select eliminar_mis_datos()`);
ok('eliminar_mis_datos borra todas sus empresas y facturas', (await q(`select (select count(*) from empresas)::int e, (select count(*) from facturas)::int f, (select count(*) from aceptaciones)::int a`))[0].e === 0);

console.log(`\n${pass} correctas, ${fail} con falla`);
process.exit(fail ? 1 : 0);
