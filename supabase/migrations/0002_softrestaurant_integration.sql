-- =========================================================================
-- 0002_softrestaurant_integration.sql
-- Contraste de ingresos reportados vs. POS SoftRestaurant (día completo).
-- SR empuja datos vía webhook (push), no se consulta una API de SR — ver
-- OPE.Guía de módulo de conexión con ERP y PMS, sección 2.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Mapeo de sucursal SR <-> restaurant
-- -------------------------------------------------------------------------
-- IdEmpresa es la clave que SR usa para identificar la sucursal que envía
-- la venta (sección 3.4 del manual). webhook_token es el secreto que se
-- configura como header "Authorization" dentro de SR (Configuración >
-- Interfaz con ERP y PMS > Configuración ERP y PMS > parámetros).
create table public.restaurant_sr_config (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null unique references public.restaurants(id),
  id_empresa     text not null unique,
  webhook_token  text not null,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 2. Catálogo de equivalencia de formas de pago
-- -------------------------------------------------------------------------
-- SR envía "FormaPago" como texto libre configurado dentro del propio SR
-- (sección 3.3 del manual). Aquí lo traducimos a los 2 buckets que usa
-- el corte: efectivo / tarjeta.
create table public.sr_forma_pago_map (
  id             uuid primary key default gen_random_uuid(),
  forma_pago_sr  text not null unique,
  tipo           text not null check (tipo in ('efectivo', 'tarjeta', 'otro'))
);

insert into public.sr_forma_pago_map (forma_pago_sr, tipo) values
  ('Efectivo', 'efectivo'),
  ('Tarjeta de Débito', 'tarjeta'),
  ('Tarjeta de Crédito', 'tarjeta'),
  ('Tarjeta', 'tarjeta');

-- -------------------------------------------------------------------------
-- 3. Ventas crudas recibidas de SR (log de ingesta, nunca se sobrescribe)
-- -------------------------------------------------------------------------
create table public.sr_ventas_raw (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id),
  id_empresa     text not null,
  estacion       text,
  almacen        text,
  numero_orden   text not null,
  fecha_venta    timestamptz not null,
  business_date  date not null generated always as ((fecha_venta at time zone 'America/Mexico_City')::date) stored,
  total_centavos bigint not null, -- convertido desde el decimal en pesos que envía SR
  raw_payload    jsonb not null,
  cancelled      boolean not null default false,
  cancelled_at   timestamptz,
  received_at    timestamptz not null default now(),
  unique (id_empresa, numero_orden)
);

create index idx_sr_ventas_restaurant_date on public.sr_ventas_raw(restaurant_id, business_date);

-- -------------------------------------------------------------------------
-- 4. Pagos por venta (desglose efectivo/tarjeta ya normalizado)
-- -------------------------------------------------------------------------
create table public.sr_pagos (
  id                uuid primary key default gen_random_uuid(),
  venta_id          uuid not null references public.sr_ventas_raw(id) on delete cascade,
  forma_pago_sr     text not null,
  tipo              text not null check (tipo in ('efectivo', 'tarjeta', 'otro')),
  importe_centavos  bigint not null,  -- convertido desde el decimal en pesos que envía SR
  propina_centavos  bigint not null default 0
);

create index idx_sr_pagos_venta on public.sr_pagos(venta_id);

-- -------------------------------------------------------------------------
-- RLS — solo lectura para roles de negocio; la escritura la hace el
-- webhook usando service_role (SR se autentica con su propio token, no
-- con una sesión de Supabase Auth, así que RLS de auth.uid() no aplica).
-- -------------------------------------------------------------------------
alter table public.restaurant_sr_config enable row level security;
alter table public.sr_ventas_raw enable row level security;
alter table public.sr_pagos enable row level security;

create policy "sr_config_select_admin"
  on public.restaurant_sr_config for select
  using (public.current_role_from_jwt() = 'admin');

create policy "sr_config_write_admin"
  on public.restaurant_sr_config for all
  using (public.current_role_from_jwt() = 'admin')
  with check (public.current_role_from_jwt() = 'admin');

create policy "sr_ventas_select_roles"
  on public.sr_ventas_raw for select
  using (public.current_role_from_jwt() in ('dueno', 'admin', 'validador_cortes'));

create policy "sr_pagos_select_roles"
  on public.sr_pagos for select
  using (public.current_role_from_jwt() in ('dueno', 'admin', 'validador_cortes'));
