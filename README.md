# ERP Financiero Multi-Restaurante

Scaffold generado a partir de `PRODUCT_SPEC_RestaurantERP.md` + `API_SPEC_RestaurantERP.md`.
Stack: Next.js (App Router) + Supabase (Postgres + Auth + Storage) + Vercel + GitHub.

## Qué ya existe

- **`supabase/migrations/0001_init.sql`** — schema completo: las 10 entidades del product spec,
  tabla puente `restaurant_users` (multi-restaurante por responsable), tablas de auditoría
  (`corte_adjustments`, `egreso_adjustments`), la vista materializada `mv_resumen_ejecutivo_diario`,
  y **todas las políticas RLS** por rol (sección 2.4 del API spec).
- **`lib/supabase/`** — clientes server, browser y service_role.
- **`lib/api/`** — helpers de formato de respuesta (`ok`, `okPaginated`, `apiError`) y el
  guard de autenticación/rol (`requireRole`) que usa todo Route Handler.
- **`middleware.ts`** — refresco de sesión en cada request.
- **`app/api/restaurantes/`** — patrón CRUD simple completo (lista + crear).
- **`app/api/cortes/`** — patrón completo del recurso más complejo: crear, editar,
  enviar a validación, validar (con la regla de comentario obligatorio en diferencias),
  y cancelar (por error de carga, confirmado con el negocio).

## Integración SoftRestaurant (contraste POS, día completo)

- **`supabase/migrations/0002_softrestaurant_integration.sql`** — tablas de recepción
  (`sr_ventas_raw`, `sr_pagos`), mapeo de sucursal (`restaurant_sr_config`) y catálogo
  de formas de pago (`sr_forma_pago_map`).
- **`app/api/webhooks/softrestaurant/ventas/`** — receptor del *push* de SR (SR llama
  aquí, no al revés — ver el manual de integración). Responde en el formato propio de
  SR (`{Message, Transaction_id}`), no en el contrato general de esta API.
- **`app/api/webhooks/softrestaurant/ventas/cancelar/`** — recibe cancelaciones de SR.
- **`app/api/resumen-ejecutivo/contraste-pos/`** — endpoint de lectura (roles: dueño,
  admin, validador_cortes) que compara, por día, lo reportado en `cortes` contra lo
  recibido de SR. **Es solo informativo: no participa en el flujo de validación.**
- **Todos los montos se normalizan a centavos** al recibirlos (SR envía pesos con
  decimales; el resto de la app usa `bigint` en centavos — la conversión ocurre una
  sola vez, en el webhook).
- **Pendiente antes de producción:** dar de alta cada restaurante en
  `restaurant_sr_config` (su `IdEmpresa` de SR + un `webhook_token` generado por
  nosotros) y configurar ese token como header `Authorization` dentro de SR
  (sección 3.4 del manual).

## Qué falta (siguiente iteración, mismo patrón)

Recursos pendientes de implementar siguiendo exactamente el patrón de `cortes/`:

- [ ] `app/api/usuarios/` (4.2) — incluye invitación vía `supabase.auth.admin.inviteUserByEmail`
- [ ] `app/api/proveedores/` (4.4)
- [ ] `app/api/cuentas/` (4.5)
- [ ] `app/api/egresos/` (4.6) — incluye subida de comprobante a Storage (4.6.1) y
      registro en `egreso_adjustments` en cada PATCH (auditoría, siempre editable)
- [ ] `app/api/resumen-ejecutivo/` (4.7) — lee `mv_resumen_ejecutivo_diario`, agrega por
      semana/mes en la capa de aplicación (el sub-recurso `contraste-pos` ya está listo)
- [ ] `app/api/restaurantes/{id}/sr-config` — CRUD admin para `restaurant_sr_config`
      (alta de sucursal + generación de `webhook_token`)
- [ ] `app/api/cron/refresh-resumen/` — `REFRESH MATERIALIZED VIEW CONCURRENTLY`, invocado
      por Vercel Cron con `CRON_SECRET`
- [ ] `app/api/ai/analisis-financiero/` y `app/api/ai/deteccion-anomalias/` (sección 12)
- [ ] `app/api/alertas/` (12.2)
- [ ] Frontend: login (`@supabase/ssr`), dashboard del Dueño, formulario de corte,
      panel de validación, panel de egresos

## Cómo arrancar

```bash
npm install

# Supabase local (requiere Supabase CLI)
supabase init
supabase start
supabase db push          # aplica supabase/migrations/0001_init.sql

cp .env.example .env.local  # completa con las credenciales que imprime `supabase start`
npm run dev
```

## Cómo desplegar

1. Crea el repo en GitHub y sube este código (`git init && git add . && git commit -m "scaffold inicial" && git remote add origin <url> && git push -u origin main`).
2. Crea un proyecto Supabase (uno de staging, uno de producción — sección 11 del API spec).
3. Importa el repo en Vercel; configura las variables de entorno de `.env.example`
   por ambiente (Production / Preview / Development), apuntando cada uno a su proyecto Supabase.
4. Cada PR generará un deploy de preview automático; el merge a `main` despliega a producción.
5. Aplica las migraciones al proyecto Supabase remoto: `supabase link` + `supabase db push`.

## Decisiones de negocio ya fijadas en el schema

- **Cancelación de cortes**: estado `cancelado` explícito para errores de carga
  (turno/restaurante equivocado). No hay flujo de "rechazo" — solo validación con
  diferencia + comentario, o cancelación con motivo obligatorio.
- **Egresos**: siempre editables, pero cada edición queda en `egreso_adjustments`
  (mismo patrón de auditoría que los cortes).
- **Turnos**: `TEXT + CHECK` (no `ENUM` nativo) con `matutino`/`vespertino` activos y
  2 slots reservados para expansión futura — agregar uno es un `ALTER` simple del
  constraint, sin migración de tipo.
