-- Timbro · esquema inicial (etapa 1: cuentas, empresas y facturas en modo demostración)
-- Ejecuta este archivo en Supabase: SQL Editor > New query > Run.


-- ---------- Planes ----------
create table if not exists public.planes (
  id text primary key,
  nombre text not null,
  timbres int not null check (timbres > 0),
  usuarios int,                      -- null = ilimitados
  rfc_max int not null default 1,
  precio_mxn numeric(10,2) not null
);
insert into public.planes (id, nombre, timbres, usuarios, rfc_max, precio_mxn) values
  ('emprendedor', 'Emprendedor', 40, 1, 1, 99),
  ('negocio', 'Negocio', 150, 3, 3, 249),
  ('despacho', 'Despacho', 600, null, 20, 649)
on conflict (id) do update set nombre = excluded.nombre, timbres = excluded.timbres,
  usuarios = excluded.usuarios, rfc_max = excluded.rfc_max, precio_mxn = excluded.precio_mxn;

-- ---------- Empresas y miembros ----------
create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  razon_social text not null check (char_length(razon_social) between 2 and 200),
  rfc text not null check (rfc ~ '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$'),
  regimen text not null check (regimen ~ '^[0-9]{3}$'),
  plan text not null default 'emprendedor' references public.planes(id),
  owner_id uuid references auth.users(id) on delete set null,   -- administrador que creó la empresa; sus empresas comparten plan y timbres
  plan_elegido boolean not null default false,   -- el administrador debe elegir su plan después de crear la cuenta
  folio_seq int not null default 0,
  creada_en timestamptz not null default now()
);

create table if not exists public.miembros (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rol text not null check (rol in ('admin', 'miembro')),
  creado_en timestamptz not null default now(),
  primary key (empresa_id, user_id)
);
create index if not exists miembros_user_idx on public.miembros(user_id);

-- ---------- Clientes y conceptos frecuentes ----------
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nombre text not null,
  rfc text not null check (rfc ~ '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$'),
  unique (empresa_id, rfc)
);

create table if not exists public.conceptos_frecuentes (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  descripcion text not null,
  precio numeric(14,2) not null,
  primary key (empresa_id, descripcion)
);

-- ---------- Facturas ----------
create table if not exists public.facturas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  folio text not null,
  cliente_nombre text not null,
  cliente_rfc text not null check (cliente_rfc ~ '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$'),
  uso_cfdi text not null default 'G03',
  metodo_pago text not null default 'PUE' check (metodo_pago in ('PUE', 'PPD')),
  lineas jsonb not null,
  subtotal numeric(14,2) not null,
  iva numeric(14,2) not null,
  total numeric(14,2) not null,
  estatus text not null default 'borrador' check (estatus in ('borrador', 'timbrada', 'cancelada')),
  uuid_demo uuid,                    -- UUID de demostración; el UUID fiscal real llegará con el PAC
  timbrada_en timestamptz,
  cancelada_en timestamptz,
  creada_por uuid references auth.users(id) on delete set null,
  creada_en timestamptz not null default now(),
  unique (empresa_id, folio)
);
create index if not exists facturas_empresa_idx on public.facturas(empresa_id, creada_en desc);
create index if not exists facturas_timbre_idx on public.facturas(empresa_id, timbrada_en);

-- ---------- Registro de aceptaciones (aviso de privacidad y términos) ----------
create table if not exists public.aceptaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  documento text not null,
  version text not null,
  aceptado_en timestamptz not null default now()
);

-- ---------- Funciones auxiliares ----------
create or replace function public.es_miembro(eid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.miembros where empresa_id = eid and user_id = auth.uid());
$$;

create or replace function public.es_admin(eid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.miembros where empresa_id = eid and user_id = auth.uid() and rol = 'admin');
$$;

-- Los timbres son del plan: se comparten entre todas las empresas del mismo administrador.
create or replace function public.timbres_usados(eid uuid) returns int
language plpgsql stable security definer set search_path = public as $$
declare v_owner uuid; v_n int;
begin
  select owner_id into v_owner from public.empresas where id = eid;
  select count(*)::int into v_n from public.facturas f join public.empresas e on e.id = f.empresa_id
  where (e.id = eid or (v_owner is not null and e.owner_id = v_owner))
    and f.timbrada_en >= (date_trunc('month', now() at time zone 'America/Mexico_City') at time zone 'America/Mexico_City');
  return v_n;
end $$;

-- ---------- Row Level Security ----------
alter table public.planes enable row level security;
alter table public.empresas enable row level security;
alter table public.miembros enable row level security;
alter table public.clientes enable row level security;
alter table public.conceptos_frecuentes enable row level security;
alter table public.facturas enable row level security;
alter table public.aceptaciones enable row level security;

create policy planes_lectura on public.planes for select using (true);
create policy empresas_lectura on public.empresas for select to authenticated using (public.es_miembro(id));
create policy empresas_edicion on public.empresas for update to authenticated using (public.es_admin(id)) with check (public.es_admin(id));
create policy miembros_lectura on public.miembros for select to authenticated using (public.es_miembro(empresa_id));
create policy clientes_todo on public.clientes for all to authenticated using (public.es_miembro(empresa_id)) with check (public.es_miembro(empresa_id));
create policy conceptos_todo on public.conceptos_frecuentes for all to authenticated using (public.es_miembro(empresa_id)) with check (public.es_miembro(empresa_id));
create policy facturas_lectura on public.facturas for select to authenticated using (public.es_miembro(empresa_id));
create policy aceptaciones_propias on public.aceptaciones for select to authenticated using (user_id = auth.uid());

-- Permisos de tabla: los usuarios solo escriben por funciones (excepto clientes y conceptos).
revoke all on public.planes, public.empresas, public.miembros, public.clientes, public.conceptos_frecuentes, public.facturas, public.aceptaciones from anon, authenticated;
grant select on public.planes to anon, authenticated;
grant select on public.empresas, public.miembros, public.facturas, public.aceptaciones to authenticated;
grant update (razon_social, regimen) on public.empresas to authenticated;   -- el plan NO es editable por el usuario
grant select, insert, update, delete on public.clientes, public.conceptos_frecuentes to authenticated;

-- ---------- Funciones de negocio ----------
-- Valida estructura, fecha y dígito verificador del RFC (algoritmo del SAT).
create or replace function public.rfc_valido(p_rfc text) returns boolean
language plpgsql immutable set search_path = public as $$
declare
  r text := upper(trim(coalesce(p_rfc, '')));
  dic constant text := '0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ';
  base text; suma int := 0; i int; d int; esperado text; yy int; mm int; dd int; y int; fecha_ok boolean := false;
begin
  if r !~ '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$' then return false; end if;
  base := case when length(r) = 12 then substr(r, 4, 6) else substr(r, 5, 6) end;
  yy := substr(base, 1, 2)::int; mm := substr(base, 3, 2)::int; dd := substr(base, 5, 2)::int;
  foreach y in array array[1900 + yy, 2000 + yy] loop
    begin perform make_date(y, mm, dd); fecha_ok := true; exception when others then null; end;
  end loop;
  if not fecha_ok then return false; end if;
  base := lpad(r, 13, ' ');
  for i in 1..12 loop suma := suma + (position(substr(base, i, 1) in dic) - 1) * (14 - i); end loop;
  d := 11 - (suma % 11);
  esperado := case when d = 11 then '0' when d = 10 then 'A' else d::text end;
  return substr(base, 13, 1) = esperado;
end $$;

create or replace function public.crear_empresa(p_razon text, p_rfc text, p_regimen text, p_version_privacidad text, p_version_terminos text)
returns public.empresas language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_rfc text := upper(trim(p_rfc)); v_emp public.empresas; v_prev public.empresas; v_n int;
begin
  if v_uid is null then raise exception 'no_autenticado'; end if;
  if not public.rfc_valido(v_rfc) or v_rfc in ('XAXX010101000', 'XEXX010101000') then raise exception 'rfc_invalido'; end if;
  if char_length(trim(p_razon)) < 2 then raise exception 'razon_invalida'; end if;
  if p_regimen !~ '^[0-9]{3}$' then raise exception 'regimen_invalido'; end if;
  if coalesce(p_version_privacidad, '') = '' or coalesce(p_version_terminos, '') = '' then raise exception 'aceptacion_requerida'; end if;
  -- Empresas adicionales: heredan el plan del administrador y no pueden exceder las que permite.
  select * into v_prev from public.empresas where owner_id = v_uid order by creada_en limit 1;
  select count(*)::int into v_n from public.empresas where owner_id = v_uid;
  if v_prev.id is not null and v_n >= (select rfc_max from public.planes where id = v_prev.plan) then raise exception 'limite_empresas'; end if;
  if exists (select 1 from public.empresas where owner_id = v_uid and rfc = v_rfc) then raise exception 'empresa_duplicada'; end if;
  insert into public.empresas (razon_social, rfc, regimen, owner_id, plan, plan_elegido)
    values (trim(p_razon), v_rfc, p_regimen, v_uid, coalesce(v_prev.plan, 'emprendedor'), coalesce(v_prev.plan_elegido, false)) returning * into v_emp;
  insert into public.miembros (empresa_id, user_id, rol) values (v_emp.id, v_uid, 'admin');
  if v_prev.id is null then
    insert into public.aceptaciones (user_id, documento, version) values (v_uid, 'privacidad', p_version_privacidad), (v_uid, 'terminos', p_version_terminos);
  end if;
  return v_emp;
end $$;

-- Cobra un timbre. Debe llamarse con la empresa bloqueada (for update).
create or replace function public._consumir_timbre(p_factura uuid) returns public.facturas
language plpgsql security definer set search_path = public as $$
declare v_f public.facturas; v_limite int;
begin
  select * into v_f from public.facturas where id = p_factura for update;
  if v_f.estatus <> 'borrador' then raise exception 'estatus_invalido'; end if;
  select p.timbres into v_limite from public.empresas e join public.planes p on p.id = e.plan where e.id = v_f.empresa_id;
  if public.timbres_usados(v_f.empresa_id) >= v_limite then raise exception 'limite_timbres'; end if;
  update public.facturas set estatus = 'timbrada', timbrada_en = now(), uuid_demo = gen_random_uuid() where id = p_factura returning * into v_f;
  return v_f;
end $$;

create or replace function public.guardar_factura(p_empresa uuid, p_cliente_nombre text, p_cliente_rfc text, p_uso text, p_metodo text, p_lineas jsonb, p_timbrar boolean default false)
returns public.facturas language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_rfc text := upper(trim(p_cliente_rfc)); v_seq int; v_f public.facturas;
  v_sub numeric(14,2) := 0; v_iva numeric(14,2); l jsonb; v_n int := 0; v_lineas jsonb := '[]'::jsonb;
  v_q numeric; v_p numeric; v_d text;
begin
  if v_uid is null then raise exception 'no_autenticado'; end if;
  if not public.es_miembro(p_empresa) then raise exception 'sin_acceso'; end if;
  if char_length(trim(coalesce(p_cliente_nombre, ''))) < 2 then raise exception 'cliente_invalido'; end if;
  if not public.rfc_valido(v_rfc) and v_rfc not in ('XAXX010101000', 'XEXX010101000') then raise exception 'rfc_invalido'; end if;
  if p_metodo not in ('PUE', 'PPD') then raise exception 'metodo_invalido'; end if;
  if p_uso !~ '^[A-Z][0-9]{2}$' then raise exception 'uso_invalido'; end if;
  if jsonb_typeof(p_lineas) <> 'array' or jsonb_array_length(p_lineas) = 0 or jsonb_array_length(p_lineas) > 100 then raise exception 'lineas_invalidas'; end if;

  for l in select * from jsonb_array_elements(p_lineas) loop
    v_d := trim(coalesce(l->>'descripcion', ''));
    begin v_q := (l->>'cantidad')::numeric; v_p := (l->>'precio')::numeric;
    exception when others then raise exception 'lineas_invalidas'; end;
    if v_d = '' or v_q is null or v_p is null or v_q <= 0 or v_p <= 0 then raise exception 'lineas_invalidas'; end if;
    v_sub := v_sub + round(v_q * v_p, 2);
    v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('descripcion', v_d, 'cantidad', v_q, 'precio', v_p));
    v_n := v_n + 1;
  end loop;
  v_iva := round(v_sub * 0.16, 2);

  update public.empresas set folio_seq = folio_seq + 1 where id = p_empresa returning folio_seq into v_seq;
  insert into public.facturas (empresa_id, folio, cliente_nombre, cliente_rfc, uso_cfdi, metodo_pago, lineas, subtotal, iva, total, creada_por)
  values (p_empresa, 'A-' || lpad(v_seq::text, 4, '0'), trim(p_cliente_nombre), v_rfc, p_uso, p_metodo, v_lineas, v_sub, v_iva, v_sub + v_iva, v_uid)
  returning * into v_f;

  insert into public.clientes (empresa_id, nombre, rfc) values (p_empresa, trim(p_cliente_nombre), v_rfc)
    on conflict (empresa_id, rfc) do update set nombre = excluded.nombre;
  for l in select * from jsonb_array_elements(v_lineas) loop
    insert into public.conceptos_frecuentes (empresa_id, descripcion, precio) values (p_empresa, l->>'descripcion', (l->>'precio')::numeric)
      on conflict (empresa_id, descripcion) do update set precio = excluded.precio;
  end loop;

  if p_timbrar then v_f := public._consumir_timbre(v_f.id); end if;
  return v_f;
end $$;

create or replace function public.timbrar_factura(p_id uuid) returns public.facturas
language plpgsql security definer set search_path = public as $$
declare v_emp uuid;
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  select empresa_id into v_emp from public.facturas where id = p_id;
  if v_emp is null or not public.es_miembro(v_emp) then raise exception 'sin_acceso'; end if;
  perform 1 from public.empresas where id = v_emp for update;   -- evita carreras al contar timbres
  return public._consumir_timbre(p_id);
end $$;

create or replace function public.cancelar_factura(p_id uuid) returns public.facturas
language plpgsql security definer set search_path = public as $$
declare v_f public.facturas;
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  select * into v_f from public.facturas where id = p_id for update;
  if v_f.id is null or not public.es_miembro(v_f.empresa_id) then raise exception 'sin_acceso'; end if;
  if v_f.estatus <> 'timbrada' then raise exception 'estatus_invalido'; end if;
  update public.facturas set estatus = 'cancelada', cancelada_en = now() where id = p_id returning * into v_f;
  return v_f;
end $$;

-- Etapa 1 (sin cobros): el administrador elige o cambia su plan. En la etapa 3 esto se reemplaza por el flujo de pago.
create or replace function public.elegir_plan(p_empresa uuid, p_plan text) returns public.empresas
language plpgsql security definer set search_path = public as $$
declare v_emp public.empresas; v_owner uuid; v_n int; v_max int;
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  if not public.es_admin(p_empresa) then raise exception 'sin_acceso'; end if;
  select rfc_max into v_max from public.planes where id = p_plan;
  if v_max is null then raise exception 'plan_invalido'; end if;
  select owner_id into v_owner from public.empresas where id = p_empresa;
  select count(*)::int into v_n from public.empresas where owner_id = v_owner;
  if v_owner is not null and v_n > v_max then raise exception 'plan_insuficiente'; end if;
  update public.empresas set plan = p_plan, plan_elegido = true where id = p_empresa or (v_owner is not null and owner_id = v_owner);
  select * into v_emp from public.empresas where id = p_empresa;
  return v_emp;
end $$;

create or replace function public.eliminar_borrador(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_f public.facturas;
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  select * into v_f from public.facturas where id = p_id for update;
  if v_f.id is null or not public.es_miembro(v_f.empresa_id) then raise exception 'sin_acceso'; end if;
  if v_f.estatus <> 'borrador' then raise exception 'estatus_invalido'; end if;
  delete from public.facturas where id = p_id;
end $$;

-- Derecho de cancelación (ARCO): borra tus empresas donde eres el único miembro y tu pertenencia al resto.
create or replace function public.eliminar_mis_datos() returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'no_autenticado'; end if;
  delete from public.empresas e where exists (select 1 from public.miembros m where m.empresa_id = e.id and m.user_id = v_uid)
    and not exists (select 1 from public.miembros m2 where m2.empresa_id = e.id and m2.user_id <> v_uid);
  delete from public.miembros where user_id = v_uid;
  delete from public.aceptaciones where user_id = v_uid;
end $$;

revoke all on function public.crear_empresa(text, text, text, text, text), public._consumir_timbre(uuid),
  public.guardar_factura(uuid, text, text, text, text, jsonb, boolean), public.timbrar_factura(uuid),
  public.cancelar_factura(uuid), public.eliminar_borrador(uuid), public.eliminar_mis_datos(), public.elegir_plan(uuid, text),
  public.es_miembro(uuid), public.es_admin(uuid), public.timbres_usados(uuid) from public, anon, authenticated;
grant execute on function public.crear_empresa(text, text, text, text, text), public.guardar_factura(uuid, text, text, text, text, jsonb, boolean),
  public.timbrar_factura(uuid), public.cancelar_factura(uuid), public.eliminar_borrador(uuid), public.eliminar_mis_datos(), public.elegir_plan(uuid, text),
  public.es_miembro(uuid), public.es_admin(uuid), public.timbres_usados(uuid) to authenticated;

-- Panel del administrador: sus empresas con el número de facturas de cada una.
create or replace function public.resumen_empresas()
returns table (id uuid, razon_social text, rfc text, regimen text, plan text, creada_en timestamptz,
               facturas int, timbradas int, borradores int, canceladas int, facturado numeric, timbres_mes int)
language sql stable security definer set search_path = public as $$
  select e.id, e.razon_social, e.rfc, e.regimen, e.plan, e.creada_en,
         count(f.id)::int,
         (count(f.id) filter (where f.estatus = 'timbrada'))::int,
         (count(f.id) filter (where f.estatus = 'borrador'))::int,
         (count(f.id) filter (where f.estatus = 'cancelada'))::int,
         coalesce(sum(f.total) filter (where f.estatus = 'timbrada'), 0),
         (count(f.id) filter (where f.timbrada_en >= (date_trunc('month', now() at time zone 'America/Mexico_City') at time zone 'America/Mexico_City')))::int
  from public.empresas e
  join public.miembros m on m.empresa_id = e.id and m.user_id = auth.uid() and m.rol = 'admin'
  left join public.facturas f on f.empresa_id = e.id
  group by e.id
  order by e.creada_en;
$$;
revoke all on function public.resumen_empresas() from public, anon, authenticated;
grant execute on function public.resumen_empresas() to authenticated;
