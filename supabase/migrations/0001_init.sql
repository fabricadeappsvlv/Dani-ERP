-- =========================================================================
-- 0001_init.sql
-- ERP Financiero Multi-Restaurante — schema inicial
-- Derivado de PRODUCT_SPEC_RestaurantERP.md + API_SPEC_RestaurantERP.md
-- =========================================================================

-- -------------------------------------------------------------------------
-- Extensiones
-- -------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- -------------------------------------------------------------------------
-- 1. PROFILES (usuarios del sistema, 1:1 con auth.users)
-- -------------------------------------------------------------------------
-- Rol como TEXT + CHECK (no enum nativo): agregar un rol nuevo es un ALTER
-- de constraint, no una operación de tipo bloqueante sobre la tabla.
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text not null,
  email          text not null,
  role           text not null check (role in (
                   'dueno', 'admin', 'responsable_restaurante',
                   'validador_cortes', 'egresos'
                 )),
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.profiles is 'Un usuario tiene exactamente un rol operativo (sección 2.4 del API spec).';

-- Sincroniza profiles.role -> auth.users.app_metadata.role para poder
-- leerlo en políticas RLS vía auth.jwt() sin un SELECT extra.
create or replace function public.sync_role_to_app_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new.role)
  where id = new.id;
  return new;
end;
$$;

create trigger trg_sync_role
after insert or update of role on public.profiles
for each row execute function public.sync_role_to_app_metadata();

-- Helper: rol del usuario autenticado actual, leído del JWT (rápido, sin SELECT)
create or replace function public.current_role_from_jwt()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

-- -------------------------------------------------------------------------
-- 2. RESTAURANTES
-- -------------------------------------------------------------------------
create table public.restaurants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  status      text not null default 'active' check (status in ('active', 'inactive')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Tabla puente: un responsable_restaurante puede estar asignado a N restaurantes.
create table public.restaurant_users (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique (restaurant_id, user_id)
);

create index idx_restaurant_users_user on public.restaurant_users(user_id);
create index idx_restaurant_users_restaurant on public.restaurant_users(restaurant_id);

-- Helper: ¿el usuario actual tiene acceso a este restaurante?
create or replace function public.has_restaurant_access(target_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- roles con acceso a todos los restaurantes activos
    public.current_role_from_jwt() in ('dueno', 'admin', 'validador_cortes', 'egresos')
    or
    -- responsable_restaurante: solo los suyos vía restaurant_users
    exists (
      select 1 from public.restaurant_users ru
      where ru.restaurant_id = target_restaurant_id
        and ru.user_id = auth.uid()
    );
$$;

-- -------------------------------------------------------------------------
-- 3. CORTES (cierre de caja por turno)
-- -------------------------------------------------------------------------
-- turno como TEXT + CHECK, no enum: quedan 2 en reserva para el futuro
-- (ver nota de negocio) sin necesidad de ALTER TYPE.
create table public.cortes (
  id                       uuid primary key default gen_random_uuid(),
  restaurant_id            uuid not null references public.restaurants(id),
  business_date            date not null,
  turno                    text not null check (turno in (
                              'matutino', 'vespertino'
                              -- reservados para expansión futura: 'intermedio', 'nocturno'
                            )),
  monto_efectivo_reportado bigint not null check (monto_efectivo_reportado >= 0), -- centavos
  monto_tarjeta_reportado  bigint not null check (monto_tarjeta_reportado >= 0),  -- centavos
  currency                 text not null default 'MXN',
  estado                   text not null default 'preliminar' check (estado in (
                              'preliminar', 'en_proceso', 'validado', 'cancelado'
                            )),
  monto_efectivo_validado  bigint,
  monto_tarjeta_validado   bigint,
  diferencia               bigint,
  comentario_validacion    text,
  cancelacion_motivo       text,
  created_by               uuid not null references public.profiles(id),
  validated_by             uuid references public.profiles(id),
  validated_at             timestamptz,
  cancelled_by             uuid references public.profiles(id),
  cancelled_at             timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on column public.cortes.estado is
  'preliminar: editable por responsable. en_proceso: enviado, ya no editable. '
  'validado: cerrado por validador_cortes. cancelado: error de carga (ver 4.3.1 confirmación de negocio).';

-- Un solo corte activo (no cancelado) por restaurante+fecha+turno.
-- Se implementa como índice único parcial, no como constraint simple,
-- porque un corte cancelado SÍ puede coexistir con uno nuevo del mismo turno.
create unique index uq_corte_activo
  on public.cortes (restaurant_id, business_date, turno)
  where estado <> 'cancelado';

create index idx_cortes_restaurant_date on public.cortes(restaurant_id, business_date);
create index idx_cortes_estado on public.cortes(estado);

-- Auditoría de ajustes post-validación (nunca se sobrescribe un corte validado)
create table public.corte_adjustments (
  id            uuid primary key default gen_random_uuid(),
  corte_id      uuid not null references public.cortes(id) on delete cascade,
  campo         text not null,
  valor_anterior text,
  valor_nuevo   text,
  motivo        text not null,
  adjusted_by   uuid not null references public.profiles(id),
  adjusted_at   timestamptz not null default now()
);

create index idx_corte_adjustments_corte on public.corte_adjustments(corte_id);

-- -------------------------------------------------------------------------
-- 4. PROVEEDORES
-- -------------------------------------------------------------------------
create table public.proveedores (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  rfc           text,
  contact_info  text,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 5. CUENTAS (bancarias — corporativas o por restaurante)
-- -------------------------------------------------------------------------
create table public.cuentas (
  id                     uuid primary key default gen_random_uuid(),
  restaurant_id          uuid references public.restaurants(id), -- null = corporativa
  bank_name              text not null,
  account_number_masked  text not null,
  active                 boolean not null default true,
  created_at             timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 6. EGRESOS (pagos a proveedores, clientes, costos operativos)
-- -------------------------------------------------------------------------
create table public.egresos (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id),
  tipo            text not null check (tipo in ('transferencia', 'efectivo')),
  categoria       text not null check (categoria in ('proveedor', 'cliente', 'costo_operativo')),
  proveedor_id    uuid references public.proveedores(id),
  cuenta_id       uuid references public.cuentas(id),
  monto           bigint not null check (monto > 0), -- centavos
  currency        text not null default 'MXN',
  concepto        text not null,
  comprobante_url text,
  business_date   date not null,
  cancelled       boolean not null default false,
  cancelacion_motivo text,
  created_by      uuid not null references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint chk_transferencia_requiere_cuenta
    check (tipo <> 'transferencia' or cuenta_id is not null),
  constraint chk_proveedor_requiere_proveedor_id
    check (categoria <> 'proveedor' or proveedor_id is not null)
);

create index idx_egresos_restaurant_date on public.egresos(restaurant_id, business_date);
create index idx_egresos_categoria on public.egresos(categoria);

-- Auditoría de ediciones a egresos (siempre editables → siempre auditados,
-- mismo patrón que corte_adjustments, decisión de negocio confirmada).
create table public.egreso_adjustments (
  id             uuid primary key default gen_random_uuid(),
  egreso_id      uuid not null references public.egresos(id) on delete cascade,
  campo          text not null,
  valor_anterior text,
  valor_nuevo    text,
  adjusted_by    uuid not null references public.profiles(id),
  adjusted_at    timestamptz not null default now()
);

create index idx_egreso_adjustments_egreso on public.egreso_adjustments(egreso_id);

-- -------------------------------------------------------------------------
-- 7. ALERTAS (módulo de IA — detección de anomalías)
-- -------------------------------------------------------------------------
create table public.alertas (
  id               uuid primary key default gen_random_uuid(),
  restaurant_id    uuid not null references public.restaurants(id),
  tipo             text not null check (tipo in ('diferencia_corte', 'egreso_atipico')),
  severidad        text not null check (severidad in ('baja', 'media', 'alta')),
  referencia_id    uuid not null,
  referencia_tipo  text not null check (referencia_tipo in ('corte', 'egreso')),
  descripcion      text not null,
  estado           text not null default 'nueva' check (estado in ('nueva', 'vista', 'descartada')),
  created_at       timestamptz not null default now()
);

create index idx_alertas_restaurant on public.alertas(restaurant_id);
create index idx_alertas_estado on public.alertas(estado);

-- -------------------------------------------------------------------------
-- 8. AI USAGE LOGS (auditoría/costo del módulo de IA)
-- -------------------------------------------------------------------------
create table public.ai_usage_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id),
  feature       text not null,
  input_tokens  integer not null,
  output_tokens integer not null,
  created_at    timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 9. VISTA MATERIALIZADA — Resumen Ejecutivo diario
-- -------------------------------------------------------------------------
-- Se refresca por job (Vercel Cron -> service_role), no en vivo.
-- El endpoint /api/resumen-ejecutivo agrega esto por semana/mes en la capa
-- de aplicación (o con vistas adicionales si el volumen lo justifica).
create materialized view public.mv_resumen_ejecutivo_diario as
select
  r.id as restaurant_id,
  r.name as restaurant_name,
  coalesce(c.business_date, e.business_date) as business_date,
  coalesce(c.ingresos_preliminar, 0) as ingresos_preliminar,
  coalesce(c.ingresos_validado, 0) as ingresos_validado,
  coalesce(e.egresos_total, 0) as egresos_total,
  coalesce(c.ingresos_validado, 0) - coalesce(e.egresos_total, 0) as balance
from public.restaurants r
left join (
  select
    restaurant_id,
    business_date,
    sum(monto_efectivo_reportado + monto_tarjeta_reportado)
      filter (where estado in ('preliminar', 'en_proceso')) as ingresos_preliminar,
    sum(monto_efectivo_validado + monto_tarjeta_validado)
      filter (where estado = 'validado') as ingresos_validado
  from public.cortes
  where estado <> 'cancelado'
  group by restaurant_id, business_date
) c on c.restaurant_id = r.id
left join (
  select restaurant_id, business_date, sum(monto) as egresos_total
  from public.egresos
  where not cancelled
  group by restaurant_id, business_date
) e on e.restaurant_id = r.id and e.business_date = c.business_date
where r.status = 'active';

create unique index uq_mv_resumen_restaurant_date
  on public.mv_resumen_ejecutivo_diario (restaurant_id, business_date);

-- =========================================================================
-- RLS — activar en todas las tablas de negocio
-- =========================================================================
alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_users enable row level security;
alter table public.cortes enable row level security;
alter table public.corte_adjustments enable row level security;
alter table public.proveedores enable row level security;
alter table public.cuentas enable row level security;
alter table public.egresos enable row level security;
alter table public.egreso_adjustments enable row level security;
alter table public.alertas enable row level security;
alter table public.ai_usage_logs enable row level security;

-- --- profiles ---
create policy "profiles_select_self_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.current_role_from_jwt() = 'admin');

create policy "profiles_write_admin_only"
  on public.profiles for all
  using (public.current_role_from_jwt() = 'admin')
  with check (public.current_role_from_jwt() = 'admin');

-- --- restaurants ---
create policy "restaurants_select_by_access"
  on public.restaurants for select
  using (public.has_restaurant_access(id));

create policy "restaurants_write_admin_only"
  on public.restaurants for insert
  with check (public.current_role_from_jwt() = 'admin');

create policy "restaurants_update_admin_only"
  on public.restaurants for update
  using (public.current_role_from_jwt() = 'admin');

-- --- restaurant_users ---
create policy "restaurant_users_select_admin_or_self"
  on public.restaurant_users for select
  using (public.current_role_from_jwt() = 'admin' or user_id = auth.uid());

create policy "restaurant_users_write_admin_only"
  on public.restaurant_users for all
  using (public.current_role_from_jwt() = 'admin')
  with check (public.current_role_from_jwt() = 'admin');

-- --- cortes ---
create policy "cortes_select_by_access"
  on public.cortes for select
  using (public.has_restaurant_access(restaurant_id));

create policy "cortes_insert_responsable"
  on public.cortes for insert
  with check (
    public.current_role_from_jwt() = 'responsable_restaurante'
    and public.has_restaurant_access(restaurant_id)
    and created_by = auth.uid()
  );

-- Responsable solo edita mientras está en 'preliminar' y es dueño del corte.
create policy "cortes_update_responsable_preliminar"
  on public.cortes for update
  using (
    public.current_role_from_jwt() = 'responsable_restaurante'
    and created_by = auth.uid()
    and estado = 'preliminar'
  )
  with check (
    public.current_role_from_jwt() = 'responsable_restaurante'
    and created_by = auth.uid()
  );

-- validador_cortes valida/cancela vía Route Handler con service_role
-- (las transiciones de estado pasan por lógica de aplicación, no RLS directo
-- del cliente, para poder validar reglas como COMMENT_REQUIRED_ON_DIFFERENCE).
create policy "cortes_update_validador"
  on public.cortes for update
  using (public.current_role_from_jwt() = 'validador_cortes')
  with check (public.current_role_from_jwt() = 'validador_cortes');

-- --- corte_adjustments ---
create policy "corte_adjustments_select_by_access"
  on public.corte_adjustments for select
  using (
    exists (
      select 1 from public.cortes c
      where c.id = corte_id and public.has_restaurant_access(c.restaurant_id)
    )
  );

create policy "corte_adjustments_insert_validador_admin"
  on public.corte_adjustments for insert
  with check (public.current_role_from_jwt() in ('validador_cortes', 'admin'));

-- --- proveedores ---
create policy "proveedores_select_roles"
  on public.proveedores for select
  using (public.current_role_from_jwt() in ('egresos', 'admin', 'dueno'));

create policy "proveedores_write_roles"
  on public.proveedores for insert
  with check (public.current_role_from_jwt() in ('egresos', 'admin'));

create policy "proveedores_update_roles"
  on public.proveedores for update
  using (public.current_role_from_jwt() in ('egresos', 'admin'));

-- --- cuentas ---
create policy "cuentas_select_roles"
  on public.cuentas for select
  using (public.current_role_from_jwt() in ('egresos', 'admin', 'dueno'));

create policy "cuentas_write_admin_only"
  on public.cuentas for all
  using (public.current_role_from_jwt() = 'admin')
  with check (public.current_role_from_jwt() = 'admin');

-- --- egresos ---
create policy "egresos_select_by_role"
  on public.egresos for select
  using (public.current_role_from_jwt() in ('dueno', 'egresos', 'admin'));

create policy "egresos_insert_egresos_role"
  on public.egresos for insert
  with check (
    public.current_role_from_jwt() = 'egresos'
    and created_by = auth.uid()
  );

create policy "egresos_update_egresos_role"
  on public.egresos for update
  using (public.current_role_from_jwt() = 'egresos')
  with check (public.current_role_from_jwt() = 'egresos');

-- --- egreso_adjustments ---
create policy "egreso_adjustments_select_by_role"
  on public.egreso_adjustments for select
  using (public.current_role_from_jwt() in ('dueno', 'egresos', 'admin'));

create policy "egreso_adjustments_insert_egresos_role"
  on public.egreso_adjustments for insert
  with check (public.current_role_from_jwt() = 'egresos');

-- --- alertas ---
create policy "alertas_select_roles"
  on public.alertas for select
  using (public.current_role_from_jwt() in ('dueno', 'validador_cortes'));

create policy "alertas_update_roles"
  on public.alertas for update
  using (public.current_role_from_jwt() in ('dueno', 'validador_cortes'));

-- --- ai_usage_logs ---
create policy "ai_usage_logs_select_admin"
  on public.ai_usage_logs for select
  using (public.current_role_from_jwt() = 'admin' or user_id = auth.uid());

-- =========================================================================
-- Trigger genérico updated_at
-- =========================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_restaurants_updated_at before update on public.restaurants
  for each row execute function public.set_updated_at();
create trigger trg_cortes_updated_at before update on public.cortes
  for each row execute function public.set_updated_at();
create trigger trg_egresos_updated_at before update on public.egresos
  for each row execute function public.set_updated_at();
