# Frontend Fase 1 — Fundación + flujo de cortes end-to-end

## Contexto

El repo tiene backend completo (Next.js Route Handlers + Supabase/Postgres con RLS)
para `restaurantes` y `cortes`, pero el frontend es un placeholder (`app/page.tsx`
sin contenido real). No hay login, ni navegación, ni ninguna pantalla operativa.

Esta es la primera de varias fases para construir el frontend + dashboard por rol:

- **Fase 1 (esta spec)** — login, shell de navegación por rol, y el flujo de
  `cortes` completo (crear/editar/enviar/validar/cancelar). No requiere backend
  nuevo: toda la lógica de negocio ya existe en `app/api/cortes/**`.
- **Fase 2** (futura) — dashboard de resumen ejecutivo para dueño/admin. Requiere
  un endpoint `GET /api/resumen-ejecutivo` nuevo sobre `mv_resumen_ejecutivo_diario`.
- **Fase 3** (futura) — panel de egresos completo (CRUD + comprobante en Storage).
  Requiere backend nuevo (`app/api/egresos/**`, listados de proveedores/cuentas).

Roles del sistema (`lib/api/auth.ts`): `dueno`, `admin`, `responsable_restaurante`,
`validador_cortes`, `egresos`.

## Decisiones ya validadas con el usuario

1. **Sistema visual**: Tailwind CSS v4 + shadcn/ui (componentes Radix copiados al
   repo, no un paquete de UI pesado).
2. **Roles sin pantalla propia en Fase 1** (`dueno`, `admin`, `egresos`): dueño y
   admin ven `/restaurantes` (lista, admin puede crear) + `/cortes` en modo
   solo-lectura de todos los restaurantes (su rol tiene acceso amplio vía RLS).
   `egresos` ve un placeholder "Disponible en la próxima fase".
3. **Patrón de datos**: la UI (Server Components para lectura, Server Actions
   para escritura) consume las rutas `/api/**` ya existentes vía `fetch` interno
   reenviando la cookie de sesión — **no** se reimplementa la lógica de negocio
   (índice único activo, comentario obligatorio en diferencia, transiciones de
   estado) contra Supabase directo. El frontend es "un cliente más" de la API,
   igual que el futuro cliente móvil o el webhook de SoftRestaurant.
4. **Testing**: QA manual para esta fase (dev server + Supabase local). Sin
   framework de tests todavía — se puede añadir como tarea separada más adelante.

## Arquitectura

Next.js App Router, Server Components por defecto; Client Components solo donde
hay interactividad real (inputs de formulario, diálogos). Sesión gestionada
100% server-side vía cookies httpOnly (`@supabase/ssr`, ya configurado en
`lib/supabase/server.ts` / `client.ts` / `proxy.ts`) — sin estado de auth en el
cliente.

### Rutas públicas

- `app/login/page.tsx` — formulario email/password. Si ya hay sesión activa
  (verificado server-side), redirige a `/`.
- `app/login/actions.ts` — Server Action `signIn(prevState, formData)`: llama
  `supabase.auth.signInWithPassword`, en error devuelve `{ error: string }` para
  que el formulario lo muestre inline; en éxito, `redirect('/')`.

### Rutas protegidas — `app/(dashboard)/`

- `layout.tsx` — guard: obtiene sesión + `profiles.role` server-side (SELECT a
  `profiles` filtrado por `id = auth.uid()`, permitido por RLS `profiles_select_self_or_admin`).
  Si no hay sesión, `redirect('/login')`. Renderiza `<Shell role={role}>{children}</Shell>`.
- `page.tsx` — sin contenido propio: redirige según rol a la primera pantalla
  relevante (ver tabla más abajo).
- `cortes/page.tsx`, `cortes/nuevo/page.tsx`, `cortes/[id]/page.tsx`
- `validacion/page.tsx`, `validacion/[id]/page.tsx`
- `restaurantes/page.tsx`
- `egresos/page.tsx` (placeholder)

Cada subcarpeta con mutaciones tiene su propio `actions.ts` (`cortes/actions.ts`,
`validacion/actions.ts`, `restaurantes/actions.ts`) — Server Actions colocados
junto a las páginas que los usan, no un módulo central.

### Redirección post-login por rol

| Rol | Ruta destino |
|---|---|
| `responsable_restaurante` | `/cortes` |
| `validador_cortes` | `/validacion` |
| `dueno`, `admin` | `/restaurantes` |
| `egresos` | `/egresos` |

## Componentes

### Shell (`components/shell/`)

- `Shell.tsx` — layout de dos columnas: `Sidebar` fijo + `Header` con `UserMenu`.
- `Sidebar.tsx` — recibe `role`, renderiza los links de navegación que
  correspondan (tabla de visibilidad abajo). Server Component (no necesita
  estado).
- `UserMenu.tsx` — Client Component pequeño: nombre del usuario + botón
  "Cerrar sesión" que invoca la Server Action `signOut`.

| Link | `responsable_restaurante` | `validador_cortes` | `dueno` / `admin` | `egresos` |
|---|---|---|---|---|
| Cortes | ✅ (propios, editable) | — | ✅ (todos, solo lectura) | — |
| Validación | — | ✅ | — | — |
| Restaurantes | — | — | ✅ | — |
| Egresos | — | — | — | ✅ (placeholder) |

### shadcn/ui (`components/ui/`, generado por el CLI)

Button, Input, Label, Select, Table, Card, Badge, Dialog, Textarea, Sonner
(toasts). Se instalan solo estos — el resto de la UI se compone a partir de
ellos, sin agregar componentes que no se usan.

### Pantallas

**`/cortes` (responsable_restaurante — CRUD; dueño/admin — solo lectura)**
- Tabla: fecha, turno, restaurante (si el usuario ve más de uno), estado
  (`Badge` con color por estado), monto efectivo, monto tarjeta, diferencia
  (si validado).
- `responsable_restaurante`: botón "Nuevo corte" arriba de la tabla; fila
  clickeable → `/cortes/[id]`.
- `dueno`/`admin`: sin botón de creación, filtro adicional por restaurante
  (ya que ven todos).

**`/cortes/nuevo`** — formulario: `Select` restaurante (solo los asignados al
usuario vía `restaurant_users`), fecha (`Input type=date`), turno (`Select`
matutino/vespertino), monto efectivo y monto tarjeta (`Input type=number`,
se convierten a centavos antes de enviar — el resto de la app opera en
centavos). Al enviar: Server Action `crearCorte` → `POST /api/cortes` →
en éxito `redirect('/cortes/[id]')`; en error (p.ej. `DUPLICATE_CORTE`)
se muestra el mensaje del contrato de error tal cual.

**`/cortes/[id]`** — detalle. Si `estado === 'preliminar'` y
`created_by === usuario actual`: formulario editable (mismos montos) +
botón "Enviar a validación" (Server Action `enviarCorte` →
`POST /api/cortes/{id}/enviar`). Cualquier otro caso: vista de solo lectura
con todos los campos, incluyendo los de validación/cancelación si aplican.

**`/validacion`** — tabla de cortes en `preliminar`/`en_proceso` de todos los
restaurantes (fecha, turno, restaurante, montos reportados). Fila clickeable
→ `/validacion/[id]`.

**`/validacion/[id]`** — muestra montos reportados (solo lectura) + formulario
de montos validados. Calcula la diferencia en el cliente para mostrarla antes
de enviar (UX), pero la validación real de "comentario obligatorio si
diferencia ≠ 0" la hace el API — si el server la rechaza
(`COMMENT_REQUIRED_ON_DIFFERENCE`), el formulario muestra el error y no pierde
lo ya escrito. Botón "Validar" → Server Action `validarCorte`. Botón
secundario "Cancelar corte" abre un `Dialog` con `Textarea` de motivo
(obligatorio) → Server Action `cancelarCorte`.

**`/restaurantes`** — tabla (nombre, dirección, estado). `admin`: botón
"Nuevo restaurante" abre `Dialog` con formulario (nombre, dirección) → Server
Action `crearRestaurante` → `POST /api/restaurantes`. `dueno`: mismo listado,
sin botón de creación (la API ya restringe `POST` a `admin` con `requireRole`,
pero se oculta el botón en la UI para no ofrecer una acción que fallará).

**`/egresos`** — página estática: mensaje "Disponible en la próxima fase" +
ícono. Sin lógica.

## Flujo de datos: Server Actions como proxy delgado de la API

Cada Server Action sigue el mismo patrón:

```ts
'use server';
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api/fetch';

export async function crearCorte(prevState: unknown, formData: FormData) {
  const result = await apiFetch('/api/cortes', {
    method: 'POST',
    body: { /* ...campos del formData... */ },
  });
  if (!result.ok) return { error: result.error.message };
  redirect(`/cortes/${result.data.id}`);
}
```

Se agrega `NEXT_PUBLIC_SITE_URL` a `.env.example` (por defecto
`http://localhost:3000` en desarrollo) porque `fetch` desde un Server Action
necesita una URL absoluta.

Las lecturas (Server Components) siguen el mismo principio: `fetch` no
reenvía cookies del request original automáticamente, así que ambos casos
(lectura y escritura) usan el mismo helper `apiFetch(path, init)` en
`lib/api/fetch.ts` — construye la URL absoluta, agrega el header `Cookie` con
`(await cookies()).toString()`, y centraliza el parseo del contrato de error
(`{ error: { code, message } }`) para no repetirlo en cada Server
Component/Action.

## Manejo de errores

- Errores de validación/negocio: el JSON de error de la API
  (`{ error: { code, message } }`) se muestra inline en el formulario vía
  `useActionState` (React 19) — un `<p className="text-destructive">` sobre el
  botón de submit.
- Sesión expirada (401 `UNAUTHORIZED` del fetch interno): la Server Action
  hace `redirect('/login')` en vez de mostrar el error.
- Errores de red/desconocidos: mensaje genérico "Ocurrió un error, intenta de
  nuevo" vía toast (sonner), sin detalles técnicos.

## Fuera de alcance (Fase 1)

- Dashboard de resumen ejecutivo, contraste POS — Fase 2.
- Panel de egresos funcional, gestión de proveedores/cuentas — Fase 3.
- Gestión de usuarios (invitar, cambiar rol) — no tiene backend, no está en el
  README como parte de "dashboard por rol", se deja para una fase futura sin
  numerar aún.
- Tests automatizados — decisión explícita del usuario para esta fase.
- Recuperación de contraseña / registro de nuevos usuarios (el alta de
  usuarios es vía invitación admin, fuera de esta fase).

## Dependencias nuevas

- `tailwindcss` v4 + `@tailwindcss/postcss` (build-time)
- `shadcn` (CLI, dev-time únicamente, no queda como dependencia runtime más
  allá de lo que instale: `@radix-ui/*`, `class-variance-authority`, `clsx`,
  `tailwind-merge`, `lucide-react`, `sonner`)

## Plan de verificación

- `npm run typecheck`, `npm run lint`, `npm run build` deben pasar.
- QA manual con `supabase start` + `npm run dev`: crear un usuario por cada
  rol (vía `profiles` + `auth.users`, no hay UI de alta todavía), y recorrer
  cada flujo de la tabla de pantallas de arriba, incluyendo los casos de
  error (duplicado, diferencia sin comentario, sesión expirada).
