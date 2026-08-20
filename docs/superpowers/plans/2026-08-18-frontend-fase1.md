# Frontend Fase 1 — Fundación + flujo de cortes end-to-end — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir login, un shell de navegación por rol, y el flujo de `cortes` completo (crear/editar/enviar/validar/cancelar) en Next.js, sin backend nuevo — reutilizando el 100% del API existente en `app/api/cortes/**` y `app/api/restaurantes/**`.

**Architecture:** Next.js App Router, Server Components por defecto. La sesión vive 100% en cookies httpOnly (`@supabase/ssr`, ya configurado). Lecturas y escrituras desde la UI pasan por un helper `apiFetch` que llama a las rutas `/api/**` ya existentes (reenviando la cookie de sesión), en vez de reimplementar reglas de negocio contra Supabase directo. La única excepción es la sesión misma (login/logout/lectura de rol), que no tiene lógica de negocio que duplicar y usa Supabase directo, igual que ya hace `requireRole()` en `lib/api/auth.ts`.

**Tech Stack:** Next.js 16.3.1, React 19.2, TypeScript 6.0.3, Tailwind CSS v4, shadcn/ui (Radix), Supabase (`@supabase/ssr` + `@supabase/supabase-js`, ya en package.json).

**Spec:** `docs/superpowers/specs/2026-08-18-frontend-fase1-design.md`

> **Estado de ejecución (2026-08-19):** todo el código de las Tareas 1-12 está
> implementado y commiteado en el branch `frontend-fase1`. `npm run typecheck`,
> `npm run lint` y `npm run build` pasan limpio sobre el estado final del branch
> (Tarea 13, Step 1). **Los pasos que siguen sin marcar están bloqueados por la
> falta de Docker en esta máquina**: sin Docker no corre `supabase start`, así que
> no hay base local, ni usuarios de prueba sembrados, ni sesiones reales contra las
> que hacer el QA manual por rol. Lo único verificado en runtime fue el guard de
> sesión (`npm run dev` + `curl`): `/login` renderiza con estilos y `/`, `/cortes`,
> `/cortes/nuevo`, `/validacion`, `/restaurantes` y `/egresos` responden 307 a
> `/login` sin sesión. Para desbloquear: instalar Docker Desktop, `supabase start`,
> completar las claves en `.env.local`, `supabase db push`, `npm run seed:test-users`,
> y recorrer los pasos de QA restantes.

## Global Constraints

- Toda lectura/escritura de datos de negocio desde la UI pasa por `apiFetch()` hacia `/api/**` — nunca Supabase directo desde un Server Component/Action de la UI, excepto para sesión (login/logout/rol actual).
- Los montos se capturan en los formularios en pesos (decimal) y se convierten a centavos (`pesosToCentavos`) antes de enviarlos a la API — el resto del sistema opera en centavos (`bigint`).
- Sin framework de tests automatizado en esta fase (decisión explícita del usuario) — la verificación de cada tarea es `npm run typecheck`, `npm run lint`, `npm run build` + QA manual contra Supabase local.
- Solo se instalan los primitivos shadcn/ui que realmente se usan: Button, Input, Label, Select, NativeSelect, Table, Card, Badge, Dialog, Textarea, Sonner.
- Roles del sistema (`lib/api/auth.ts`): `dueno`, `admin`, `responsable_restaurante`, `validador_cortes`, `egresos`.

---

## Task 1: Supabase local + usuarios de prueba

Sin esto, ninguna tarea posterior se puede verificar manualmente contra sesiones reales.

**Files:**
- Create: `supabase/config.toml` (generado por `supabase init`)
- Create: `.env.local` (no se commitea — está en `.gitignore`)
- Create: `supabase/seed-test-users.mjs`
- Modify: `package.json` (nuevo script `seed:test-users`)

**Interfaces:**
- Produces: 5 usuarios de prueba (`dueno@test.local`, `admin@test.local`, `responsable@test.local`, `validador@test.local`, `egresos@test.local`, contraseña `Test1234!`), un restaurante "Restaurante de Prueba" asignado a `responsable@test.local`. Todas las tareas de QA manual posteriores asumen que estos usuarios existen.

- [ ] **Step 1: Inicializar y levantar Supabase local**

```bash
supabase init
supabase start
```

`supabase start` imprime `API URL`, `anon key` y `service_role key` locales — cópialos para el siguiente paso.

- [ ] **Step 2: Crear `.env.local` y aplicar las migraciones**

```bash
cp .env.example .env.local
```

Edita `.env.local` con los valores impresos por `supabase start`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key impresa>
SUPABASE_SERVICE_ROLE_KEY=<service_role key impresa>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

(`SUPABASE_PROJECT_ID` y `CRON_SECRET` quedan vacíos — no se usan en esta fase.)

```bash
supabase db push
```

Expected: confirma que aplicó `0001_init.sql` y `0002_softrestaurant_integration.sql` sin error.

- [x] **Step 3: Escribir el script de seed**

Create `supabase/seed-test-users.mjs`:

```js
// Uso: node --env-file=.env.local supabase/seed-test-users.mjs
// Crea un usuario de prueba por rol en el Supabase local, para poder hacer
// QA manual del frontend (Fase 1). Requiere `supabase start` corriendo y
// las migraciones aplicadas (`supabase db push`).
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const PASSWORD = 'Test1234!';

const USERS = [
  { role: 'dueno', email: 'dueno@test.local', fullName: 'Dueño de Prueba' },
  { role: 'admin', email: 'admin@test.local', fullName: 'Admin de Prueba' },
  { role: 'responsable_restaurante', email: 'responsable@test.local', fullName: 'Responsable de Prueba' },
  { role: 'validador_cortes', email: 'validador@test.local', fullName: 'Validador de Prueba' },
  { role: 'egresos', email: 'egresos@test.local', fullName: 'Egresos de Prueba' },
];

const userIdByRole = {};

for (const u of USERS) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: u.email,
    password: PASSWORD,
    email_confirm: true,
  });

  if (error) {
    console.error(`No se pudo crear ${u.email}:`, error.message);
    continue;
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: data.user.id, full_name: u.fullName, email: u.email, role: u.role });

  if (profileError) {
    console.error(`No se pudo crear el profile de ${u.email}:`, profileError.message);
    continue;
  }

  userIdByRole[u.role] = data.user.id;
  console.log(`Creado: ${u.email} (${u.role})`);
}

const { data: restaurant, error: restaurantError } = await supabase
  .from('restaurants')
  .insert({ name: 'Restaurante de Prueba', address: 'Calle Falsa 123' })
  .select('id')
  .single();

if (restaurantError) {
  console.error('No se pudo crear el restaurante de prueba:', restaurantError.message);
} else if (userIdByRole.responsable_restaurante) {
  const { error: linkError } = await supabase
    .from('restaurant_users')
    .insert({ restaurant_id: restaurant.id, user_id: userIdByRole.responsable_restaurante });

  if (linkError) console.error('No se pudo asignar el restaurante:', linkError.message);
  else console.log(`Restaurante "${restaurant.name}" asignado a responsable@test.local`);
}

console.log(`\nContraseña de todos los usuarios de prueba: ${PASSWORD}`);
```

- [ ] **Step 4: Agregar el script npm y ejecutarlo**

Modify `package.json` — agregar dentro de `"scripts"`:

```json
"seed:test-users": "node --env-file=.env.local supabase/seed-test-users.mjs"
```

```bash
npm run seed:test-users
```

Expected: 5 líneas `Creado: <email> (<rol>)`, una línea `Restaurante "Restaurante de Prueba" asignado a responsable@test.local`, y la línea de la contraseña. Sin líneas de error.

- [x] **Step 5: Commit**

```bash
git add supabase/config.toml supabase/seed-test-users.mjs package.json
git commit -m "Agregar Supabase local y usuarios de prueba por rol para QA manual"
```

(`.env.local` no se commitea — ya está en `.gitignore`.)

---

## Task 2: Tailwind v4 + shadcn/ui

**Files:**
- Create: `postcss.config.mjs`, `app/globals.css`, `components.json`, `lib/utils.ts`, `components/ui/{button,input,label,select,native-select,table,card,badge,dialog,textarea,sonner}.tsx` (generados por el CLI)
- Modify: `app/layout.tsx`, `package.json`

**Interfaces:**
- Produces: `cn()` en `lib/utils.ts` (usado por todos los componentes de UI que se escriban a mano en tareas posteriores); los primitivos `@/components/ui/*` importados en tareas 4-12.

- [x] **Step 1: Inicializar shadcn/ui (instala Tailwind v4 automáticamente)**

```bash
npx shadcn@latest init -b radix
```

Si pregunta por el color base, elige `neutral`. Esto crea/edita `postcss.config.mjs`, `app/globals.css`, `components.json`, `lib/utils.ts`, y agrega `tailwindcss`, `@tailwindcss/postcss`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` a `package.json`.

- [x] **Step 2: Verificar que `app/layout.tsx` importa los estilos**

Read `app/layout.tsx`. Si no tiene `import './globals.css';` en la primera línea, agrégalo. El archivo debe quedar:

```tsx
import './globals.css';

export const metadata = {
  title: 'ERP Restaurantes',
  description: 'Gestión financiera multi-restaurante',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
```

- [x] **Step 3: Instalar los primitivos necesarios**

```bash
npx shadcn@latest add button input label select native-select table card badge dialog textarea sonner
```

Expected: crea los archivos en `components/ui/` sin error, y agrega `@radix-ui/*` y `sonner` a `package.json`.

- [x] **Step 4: Verificar**

```bash
npm run typecheck
npm run lint
npm run build
```

Expected: los tres comandos pasan limpio (la app sigue sin usar los componentes todavía, pero deben compilar).

- [x] **Step 5: Commit**

```bash
git add postcss.config.mjs app/globals.css app/layout.tsx components.json lib/utils.ts components/ui package.json package-lock.json
git commit -m "Instalar Tailwind v4 y primitivos de shadcn/ui"
```

---

## Task 3: Utilidades compartidas (tipos, apiFetch, formato de moneda, sesión)

**Files:**
- Create: `lib/api/types.ts`
- Create: `lib/api/fetch.ts`
- Create: `lib/format/money.ts`
- Create: `lib/auth/session.ts`

**Interfaces:**
- Produces:
  - `Corte`, `Restaurant`, `EstadoCorte`, `Turno` (tipos, `lib/api/types.ts`)
  - `apiFetch<T>(path: string, init?: { method?: 'GET'|'POST'|'PATCH'; body?: unknown }): Promise<{ok:true; data:T; meta?:...} | {ok:false; error:{code:string; message:string}}>` (`lib/api/fetch.ts`)
  - `pesosToCentavos(pesos: number): number`, `formatCentavos(centavos: number, currency?: string): string` (`lib/format/money.ts`)
  - `getCurrentUser(): Promise<{id:string; email:string; fullName:string; role:Role} | null>`, tipo `CurrentUser` (`lib/auth/session.ts`)
- Consumes: `Role` de `@/lib/api/auth` (ya existe), `createClient` de `@/lib/supabase/server` (ya existe, es async).

- [x] **Step 1: Crear los tipos de dominio**

Create `lib/api/types.ts`:

```ts
export type EstadoCorte = 'preliminar' | 'en_proceso' | 'validado' | 'cancelado';
export type Turno = 'matutino' | 'vespertino';

export type Corte = {
  id: string;
  restaurant_id: string;
  business_date: string;
  turno: Turno;
  monto_efectivo_reportado: number;
  monto_tarjeta_reportado: number;
  currency: string;
  estado: EstadoCorte;
  monto_efectivo_validado: number | null;
  monto_tarjeta_validado: number | null;
  diferencia: number | null;
  comentario_validacion: string | null;
  cancelacion_motivo: string | null;
  created_by: string;
  validated_by: string | null;
  validated_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Restaurant = {
  id: string;
  name: string;
  address: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};
```

- [x] **Step 2: Crear el helper `apiFetch`**

Create `lib/api/fetch.ts`:

```ts
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

type ApiError = { code: string; message: string; details?: { field: string; issue: string }[] };

type ApiResult<T> =
  | { ok: true; data: T; meta?: { page: number; perPage: number; totalItems: number; totalPages: number } }
  | { ok: false; error: ApiError };

// Reenvía la cookie de sesión a las rutas /api/** propias — la UI es "un
// cliente más" de la API, no reimplementa las reglas de negocio que ya
// viven en los Route Handlers (ver spec: docs/superpowers/specs/2026-08-18-frontend-fase1-design.md).
export async function apiFetch<T = unknown>(
  path: string,
  init?: { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown }
): Promise<ApiResult<T>> {
  const cookieStore = await cookies();
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieStore.toString(),
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });

  if (res.status === 401) {
    redirect('/login');
  }

  const json = await res.json();

  if (!res.ok) {
    return { ok: false, error: json.error as ApiError };
  }

  return { ok: true, data: json.data as T, meta: json.meta };
}
```

- [x] **Step 3: Crear el helper de formato de moneda**

Create `lib/format/money.ts`:

```ts
export function pesosToCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

export function formatCentavos(centavos: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(centavos / 100);
}
```

- [x] **Step 4: Crear el helper de sesión**

Create `lib/auth/session.ts`:

```ts
import { createClient } from '@/lib/supabase/server';
import type { Role } from '@/lib/api/auth';

export type CurrentUser = { id: string; email: string; fullName: string; role: Role };

// Lee sesión y rol directo de Supabase (mismo patrón que requireRole() en
// lib/api/auth.ts: rol desde el JWT app_metadata) — no hay lógica de
// negocio que duplicar aquí, así que no pasa por la API interna.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const role = (user.app_metadata?.role ?? null) as Role | null;
  if (!role) return null;

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();

  return {
    id: user.id,
    email: user.email ?? '',
    fullName: profile?.full_name ?? user.email ?? '',
    role,
  };
}
```

- [x] **Step 5: Verificar**

```bash
npm run typecheck
npm run lint
npm run build
```

Expected: los tres pasan limpio. Estos archivos no tienen UI que probar manualmente todavía — su comportamiento se verifica de punta a punta en las tareas 4+.

- [x] **Step 6: Commit**

```bash
git add lib/api/types.ts lib/api/fetch.ts lib/format/money.ts lib/auth/session.ts
git commit -m "Agregar utilidades compartidas: apiFetch, tipos de API, formato de moneda, sesión"
```

---

## Task 4: Login

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/login/login-form.tsx`
- Create: `app/login/actions.ts`

**Interfaces:**
- Consumes: `getCurrentUser()` de `@/lib/auth/session`, `createClient()` de `@/lib/supabase/server`, `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent` de `@/components/ui/card`, `Button`/`Input`/`Label` de `@/components/ui`.
- Produces: ruta pública `/login`.

- [x] **Step 1: Server Action de login**

Create `app/login/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type LoginState = { error?: string };

export async function signIn(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Email y contraseña son obligatorios.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: 'Credenciales inválidas.' };
  }

  redirect('/');
}
```

- [x] **Step 2: Formulario (Client Component)**

Create `app/login/login-form.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn, type LoginState } from './actions';

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  );
}
```

- [x] **Step 3: Página**

Create `app/login/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth/session';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect('/');

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>ERP Restaurantes</CardTitle>
          <CardDescription>Inicia sesión para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 4: Verificar**

```bash
npm run typecheck
npm run lint
npm run build
npm run dev
```

Con el dev server corriendo, en el navegador:
1. Ir a `http://localhost:3000/login`. Expected: se ve la tarjeta de login.
2. Enviar el formulario vacío. Expected: el navegador bloquea el submit (campos `required`).
3. Enviar con `no-existe@test.local` / `cualquier-cosa`. Expected: aparece "Credenciales inválidas." sin recargar la página.
4. Enviar con `responsable@test.local` / `Test1234!` (usuario creado en la Tarea 1). Expected: redirige a `/` (dará 404 o pantalla en blanco hasta la Tarea 5 — eso es esperado en este punto).

- [x] **Step 5: Commit**

```bash
git add app/login
git commit -m "Agregar página de login"
```

---

## Task 5: Shell del dashboard (guard, navegación por rol, logout)

**Files:**
- Create: `app/(dashboard)/layout.tsx`
- Create: `app/(dashboard)/error.tsx`
- Create: `app/(dashboard)/actions.ts`
- Create: `app/(dashboard)/page.tsx`
- Create: `components/shell/nav-items.ts`
- Create: `components/shell/sidebar.tsx`
- Create: `components/shell/header.tsx`
- Create: `components/shell/user-menu.tsx`
- Create: `components/shell/shell.tsx`

**Interfaces:**
- Consumes: `getCurrentUser()`/`CurrentUser` de `@/lib/auth/session`, `Role` de `@/lib/api/auth`, `createClient()` de `@/lib/supabase/server`, `Toaster` de `@/components/ui/sonner`.
- Produces: layout protegido `app/(dashboard)/*`; `signOut()` Server Action reexportada e importada por `UserMenu`.

- [x] **Step 1: Configuración de navegación por rol**

Create `components/shell/nav-items.ts`:

```ts
import type { Role } from '@/lib/api/auth';

export type NavItem = { href: string; label: string };

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  responsable_restaurante: [{ href: '/cortes', label: 'Cortes' }],
  validador_cortes: [{ href: '/validacion', label: 'Validación' }],
  dueno: [
    { href: '/restaurantes', label: 'Restaurantes' },
    { href: '/cortes', label: 'Cortes' },
  ],
  admin: [
    { href: '/restaurantes', label: 'Restaurantes' },
    { href: '/cortes', label: 'Cortes' },
  ],
  egresos: [{ href: '/egresos', label: 'Egresos' }],
};

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_BY_ROLE[role];
}
```

- [x] **Step 2: Sidebar**

Create `components/shell/sidebar.tsx`:

```tsx
import Link from 'next/link';
import type { Role } from '@/lib/api/auth';
import { navItemsForRole } from './nav-items';

export function Sidebar({ role }: { role: Role }) {
  const items = navItemsForRole(role);

  return (
    <aside className="w-56 shrink-0 border-r bg-muted/30 p-4">
      <div className="mb-6 px-2 text-lg font-semibold">ERP Restaurantes</div>
      <nav className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

- [x] **Step 3: Server Action de logout**

Create `app/(dashboard)/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
```

- [x] **Step 4: UserMenu + Header**

Create `components/shell/user-menu.tsx`:

```tsx
'use client';

import { signOut } from '@/app/(dashboard)/actions';
import { Button } from '@/components/ui/button';

export function UserMenu({ fullName, role }: { fullName: string; role: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right text-sm">
        <div className="font-medium">{fullName}</div>
        <div className="text-muted-foreground">{role}</div>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="outline" size="sm">
          Cerrar sesión
        </Button>
      </form>
    </div>
  );
}
```

Create `components/shell/header.tsx`:

```tsx
import type { CurrentUser } from '@/lib/auth/session';
import { UserMenu } from './user-menu';

export function Header({ user }: { user: CurrentUser }) {
  return (
    <header className="flex h-14 items-center justify-end border-b px-6">
      <UserMenu fullName={user.fullName} role={user.role} />
    </header>
  );
}
```

- [x] **Step 5: Shell + layout + redirect por rol**

Create `components/shell/shell.tsx`:

```tsx
import type { CurrentUser } from '@/lib/auth/session';
import { Sidebar } from './sidebar';
import { Header } from './header';

export function Shell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} />
      <div className="flex flex-1 flex-col">
        <Header user={user} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

Create `app/(dashboard)/layout.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { Toaster } from '@/components/ui/sonner';
import { getCurrentUser } from '@/lib/auth/session';
import { Shell } from '@/components/shell/shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <Shell user={user}>
      {children}
      <Toaster />
    </Shell>
  );
}
```

Create `app/(dashboard)/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import type { Role } from '@/lib/api/auth';
import { getCurrentUser } from '@/lib/auth/session';

const LANDING_BY_ROLE: Record<Role, string> = {
  responsable_restaurante: '/cortes',
  validador_cortes: '/validacion',
  dueno: '/restaurantes',
  admin: '/restaurantes',
  egresos: '/egresos',
};

export default async function DashboardRootPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  redirect(LANDING_BY_ROLE[user.role]);
}
```

- [x] **Step 6: Error boundary para errores inesperados**

`apiFetch` deja pasar sin capturar cualquier excepción que no sea un error de negocio (p.ej. `res.json()` fallando porque el servidor devolvió HTML en vez de JSON) — esos casos deben mostrarse como un toast genérico, no como una pantalla en blanco (regla de la spec, sección "Manejo de errores").

Create `app/(dashboard)/error.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    toast.error('Ocurrió un error, intenta de nuevo.');
  }, [error]);

  return (
    <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm text-muted-foreground">Ocurrió un error inesperado.</p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
```

- [ ] **Step 7: Verificar**

```bash
npm run typecheck
npm run lint
npm run build
npm run dev
```

En el navegador:
1. Sin sesión, ir a `http://localhost:3000/`. Expected: redirige a `/login`.
2. Login con `responsable@test.local` / `Test1234!`. Expected: redirige a `/cortes` (dará 404 hasta la Tarea 6 — esperado), la barra lateral muestra solo "Cortes", el header muestra "Responsable de Prueba".
3. Click "Cerrar sesión". Expected: redirige a `/login`.
4. Login con `dueno@test.local` / `Test1234!`. Expected: redirige a `/restaurantes` (404 hasta la Tarea 11 — esperado), la barra lateral muestra "Restaurantes" y "Cortes".
5. Repetir login con `validador@test.local` y `egresos@test.local`: la barra lateral debe mostrar solo el link correspondiente a cada uno (tabla de la spec).

- [x] **Step 8: Commit**

```bash
git add "app/(dashboard)" components/shell
git commit -m "Agregar shell del dashboard con navegacion y logout por rol"
```

---

## Task 6: `/cortes` — lista

**Files:**
- Create: `components/cortes/estado-badge.tsx`
- Create: `components/cortes/cortes-table.tsx`
- Create: `app/(dashboard)/cortes/page.tsx`
- Create: `components/cortes/restaurant-filter.tsx`

**Interfaces:**
- Consumes: `apiFetch` (`@/lib/api/fetch`), `getCurrentUser` (`@/lib/auth/session`), `Corte`/`Restaurant` (`@/lib/api/types`), `formatCentavos` (`@/lib/format/money`).
- Produces: `<CortesTable cortes restaurantsById showRestaurant linkBase? />` y `<EstadoBadge estado />`, reutilizados en las Tareas 9 y 10.

- [x] **Step 1: Badge de estado**

Create `components/cortes/estado-badge.tsx`:

```tsx
import { Badge } from '@/components/ui/badge';
import type { EstadoCorte } from '@/lib/api/types';

const LABEL_BY_ESTADO: Record<EstadoCorte, string> = {
  preliminar: 'Preliminar',
  en_proceso: 'En proceso',
  validado: 'Validado',
  cancelado: 'Cancelado',
};

const VARIANT_BY_ESTADO: Record<EstadoCorte, 'secondary' | 'default' | 'outline' | 'destructive'> = {
  preliminar: 'secondary',
  en_proceso: 'default',
  validado: 'outline',
  cancelado: 'destructive',
};

export function EstadoBadge({ estado }: { estado: EstadoCorte }) {
  return <Badge variant={VARIANT_BY_ESTADO[estado]}>{LABEL_BY_ESTADO[estado]}</Badge>;
}
```

- [x] **Step 2: Tabla de cortes (reutilizable)**

Create `components/cortes/cortes-table.tsx`:

```tsx
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCentavos } from '@/lib/format/money';
import { EstadoBadge } from './estado-badge';
import type { Corte, Restaurant } from '@/lib/api/types';

export function CortesTable({
  cortes,
  restaurantsById,
  showRestaurant,
  linkBase = '/cortes',
}: {
  cortes: Corte[];
  restaurantsById: Record<string, Restaurant>;
  showRestaurant: boolean;
  linkBase?: string;
}) {
  if (cortes.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay cortes para mostrar.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Turno</TableHead>
          {showRestaurant && <TableHead>Restaurante</TableHead>}
          <TableHead>Efectivo</TableHead>
          <TableHead>Tarjeta</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cortes.map((corte) => (
          <TableRow key={corte.id}>
            <TableCell>
              <Link href={`${linkBase}/${corte.id}`} className="block">
                {corte.business_date}
              </Link>
            </TableCell>
            <TableCell>{corte.turno === 'matutino' ? 'Matutino' : 'Vespertino'}</TableCell>
            {showRestaurant && <TableCell>{restaurantsById[corte.restaurant_id]?.name ?? '—'}</TableCell>}
            <TableCell>{formatCentavos(corte.monto_efectivo_reportado, corte.currency)}</TableCell>
            <TableCell>{formatCentavos(corte.monto_tarjeta_reportado, corte.currency)}</TableCell>
            <TableCell>
              <EstadoBadge estado={corte.estado} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [x] **Step 3: Filtro de restaurante (dueño/admin)**

Create `components/cortes/restaurant-filter.tsx`:

```tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Restaurant } from '@/lib/api/types';

export function RestaurantFilter({ restaurantes }: { restaurantes: Restaurant[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('restaurantId') ?? 'todos';

  return (
    <Select
      value={current}
      onValueChange={(value) => {
        const params = new URLSearchParams(searchParams);
        if (value === 'todos') params.delete('restaurantId');
        else params.set('restaurantId', value);
        router.push(`/cortes?${params.toString()}`);
      }}
    >
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Todos los restaurantes" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">Todos los restaurantes</SelectItem>
        {restaurantes.map((r) => (
          <SelectItem key={r.id} value={r.id}>
            {r.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [x] **Step 4: Página de lista**

Create `app/(dashboard)/cortes/page.tsx`:

```tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api/fetch';
import { getCurrentUser } from '@/lib/auth/session';
import { CortesTable } from '@/components/cortes/cortes-table';
import { RestaurantFilter } from '@/components/cortes/restaurant-filter';
import type { Corte, Restaurant } from '@/lib/api/types';

export default async function CortesPage({
  searchParams,
}: {
  searchParams: Promise<{ restaurantId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { restaurantId } = await searchParams;
  const isResponsable = user.role === 'responsable_restaurante';

  const restaurantesResult = await apiFetch<Restaurant[]>('/api/restaurantes?perPage=100');
  const restaurantes = restaurantesResult.ok ? restaurantesResult.data : [];

  const cortesPath = restaurantId
    ? `/api/cortes?perPage=100&filter[restaurantId]=${restaurantId}`
    : '/api/cortes?perPage=100';
  const cortesResult = await apiFetch<Corte[]>(cortesPath);
  const cortes = cortesResult.ok ? cortesResult.data : [];

  const restaurantsById = Object.fromEntries(restaurantes.map((r) => [r.id, r]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Cortes</h1>
        {isResponsable && (
          <Button asChild>
            <Link href="/cortes/nuevo">Nuevo corte</Link>
          </Button>
        )}
      </div>
      {restaurantes.length > 1 && <RestaurantFilter restaurantes={restaurantes} />}
      <CortesTable cortes={cortes} restaurantsById={restaurantsById} showRestaurant={restaurantes.length > 1} />
    </div>
  );
}
```

- [ ] **Step 5: Verificar**

```bash
npm run typecheck
npm run lint
npm run build
npm run dev
```

En el navegador, login como `responsable@test.local`: Expected: la tabla aparece vacía ("No hay cortes para mostrar.") con el botón "Nuevo corte" visible. Login como `dueno@test.local` y navegar a `/cortes` manualmente (el link de sidebar ya existe): Expected: tabla vacía, sin botón "Nuevo corte".

- [x] **Step 6: Commit**

```bash
git add "app/(dashboard)/cortes/page.tsx" components/cortes
git commit -m "Agregar pantalla de lista de cortes"
```

---

## Task 7: `/cortes/nuevo` — crear corte

**Files:**
- Create: `app/(dashboard)/cortes/actions.ts`
- Create: `components/cortes/nuevo-corte-form.tsx`
- Create: `app/(dashboard)/cortes/nuevo/page.tsx`

**Interfaces:**
- Produces: `crearCorte(prevState, formData)`, `editarCorte(corteId, prevState, formData)`, `enviarCorte(corteId, prevState, formData)`, todos con firma de retorno `CorteFormState = { error?: string }` — usados también en las Tareas 8.
- Consumes: `apiFetch`, `pesosToCentavos`, `NativeSelect`/`NativeSelectOption` (`@/components/ui/native-select`).

- [x] **Step 1: Server Actions de cortes**

Create `app/(dashboard)/cortes/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api/fetch';
import { pesosToCentavos } from '@/lib/format/money';
import type { Corte } from '@/lib/api/types';

export type CorteFormState = { error?: string };

export async function crearCorte(_prevState: CorteFormState, formData: FormData): Promise<CorteFormState> {
  const result = await apiFetch<Corte>('/api/cortes', {
    method: 'POST',
    body: {
      restaurantId: String(formData.get('restaurantId') ?? ''),
      businessDate: String(formData.get('businessDate') ?? ''),
      turno: String(formData.get('turno') ?? ''),
      montoEfectivoReportado: pesosToCentavos(Number(formData.get('montoEfectivo') ?? 0)),
      montoTarjetaReportado: pesosToCentavos(Number(formData.get('montoTarjeta') ?? 0)),
    },
  });

  if (!result.ok) return { error: result.error.message };

  redirect(`/cortes/${result.data.id}`);
}

export async function editarCorte(
  corteId: string,
  _prevState: CorteFormState,
  formData: FormData
): Promise<CorteFormState> {
  const result = await apiFetch<Corte>(`/api/cortes/${corteId}`, {
    method: 'PATCH',
    body: {
      montoEfectivoReportado: pesosToCentavos(Number(formData.get('montoEfectivo') ?? 0)),
      montoTarjetaReportado: pesosToCentavos(Number(formData.get('montoTarjeta') ?? 0)),
    },
  });

  if (!result.ok) return { error: result.error.message };

  revalidatePath(`/cortes/${corteId}`);
  return {};
}

export async function enviarCorte(
  corteId: string,
  _prevState: CorteFormState,
  _formData: FormData
): Promise<CorteFormState> {
  const result = await apiFetch(`/api/cortes/${corteId}/enviar`, { method: 'POST' });
  if (!result.ok) return { error: result.error.message };

  revalidatePath(`/cortes/${corteId}`);
  return {};
}
```

- [x] **Step 2: Formulario de creación**

Create `components/cortes/nuevo-corte-form.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { crearCorte, type CorteFormState } from '@/app/(dashboard)/cortes/actions';
import type { Restaurant } from '@/lib/api/types';

const initialState: CorteFormState = {};

export function NuevoCorteForm({ restaurantes }: { restaurantes: Restaurant[] }) {
  const [state, formAction, pending] = useActionState(crearCorte, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="restaurantId">Restaurante</Label>
        <NativeSelect id="restaurantId" name="restaurantId" required defaultValue="">
          <NativeSelectOption value="" disabled>
            Selecciona un restaurante
          </NativeSelectOption>
          {restaurantes.map((r) => (
            <NativeSelectOption key={r.id} value={r.id}>
              {r.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="businessDate">Fecha</Label>
        <Input id="businessDate" name="businessDate" type="date" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="turno">Turno</Label>
        <NativeSelect id="turno" name="turno" required defaultValue="">
          <NativeSelectOption value="" disabled>
            Selecciona un turno
          </NativeSelectOption>
          <NativeSelectOption value="matutino">Matutino</NativeSelectOption>
          <NativeSelectOption value="vespertino">Vespertino</NativeSelectOption>
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="montoEfectivo">Monto efectivo (MXN)</Label>
        <Input id="montoEfectivo" name="montoEfectivo" type="number" step="0.01" min="0" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="montoTarjeta">Monto tarjeta (MXN)</Label>
        <Input id="montoTarjeta" name="montoTarjeta" type="number" step="0.01" min="0" required />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Creando...' : 'Crear corte'}
      </Button>
    </form>
  );
}
```

- [x] **Step 3: Página**

Create `app/(dashboard)/cortes/nuevo/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api/fetch';
import { getCurrentUser } from '@/lib/auth/session';
import { NuevoCorteForm } from '@/components/cortes/nuevo-corte-form';
import type { Restaurant } from '@/lib/api/types';

export default async function NuevoCortePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'responsable_restaurante') redirect('/cortes');

  const restaurantesResult = await apiFetch<Restaurant[]>('/api/restaurantes?perPage=100');
  const restaurantes = restaurantesResult.ok ? restaurantesResult.data : [];

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold">Nuevo corte</h1>
      <NuevoCorteForm restaurantes={restaurantes} />
    </div>
  );
}
```

- [ ] **Step 4: Verificar**

```bash
npm run typecheck
npm run lint
npm run build
npm run dev
```

Login como `responsable@test.local`, ir a `/cortes/nuevo`:
1. Seleccionar "Restaurante de Prueba", una fecha, turno "Matutino", efectivo `1000.50`, tarjeta `500`. Enviar. Expected: redirige a `/cortes/<id>` (dará 404 hasta la Tarea 8 — esperado).
2. Repetir con la misma fecha/turno/restaurante. Expected: error "Ya existe un corte activo para ese turno, fecha y restaurante." (regla `DUPLICATE_CORTE` de la API).
3. Login como `dueno@test.local` y navegar directo a `http://localhost:3000/cortes/nuevo`. Expected: redirige a `/cortes` (rol no autorizado para esta pantalla).

- [x] **Step 5: Commit**

```bash
git add "app/(dashboard)/cortes/actions.ts" "app/(dashboard)/cortes/nuevo" components/cortes/nuevo-corte-form.tsx
git commit -m "Agregar formulario de creacion de cortes"
```

---

## Task 8: `/cortes/[id]` — detalle, edición y envío a validación

**Files:**
- Create: `app/(dashboard)/cortes/[id]/page.tsx`
- Create: `components/cortes/editar-corte-form.tsx`
- Create: `components/cortes/enviar-corte-button.tsx`

**Interfaces:**
- Consumes: `editarCorte`, `enviarCorte`, `CorteFormState` de `@/app/(dashboard)/cortes/actions` (Tarea 7).

- [x] **Step 1: Formulario de edición**

Create `components/cortes/editar-corte-form.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { editarCorte, type CorteFormState } from '@/app/(dashboard)/cortes/actions';
import type { Corte } from '@/lib/api/types';

const initialState: CorteFormState = {};

export function EditarCorteForm({ corte }: { corte: Corte }) {
  const action = editarCorte.bind(null, corte.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="montoEfectivo">Monto efectivo (MXN)</Label>
        <Input
          id="montoEfectivo"
          name="montoEfectivo"
          type="number"
          step="0.01"
          min="0"
          defaultValue={(corte.monto_efectivo_reportado / 100).toFixed(2)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="montoTarjeta">Monto tarjeta (MXN)</Label>
        <Input
          id="montoTarjeta"
          name="montoTarjeta"
          type="number"
          step="0.01"
          min="0"
          defaultValue={(corte.monto_tarjeta_reportado / 100).toFixed(2)}
          required
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </form>
  );
}
```

- [x] **Step 2: Botón de enviar a validación**

Create `components/cortes/enviar-corte-button.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { enviarCorte, type CorteFormState } from '@/app/(dashboard)/cortes/actions';

const initialState: CorteFormState = {};

export function EnviarCorteButton({ corteId }: { corteId: string }) {
  const action = enviarCorte.bind(null, corteId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-2">
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Enviando...' : 'Enviar a validación'}
      </Button>
    </form>
  );
}
```

- [x] **Step 3: Página de detalle**

Create `app/(dashboard)/cortes/[id]/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api/fetch';
import { getCurrentUser } from '@/lib/auth/session';
import { EstadoBadge } from '@/components/cortes/estado-badge';
import { EditarCorteForm } from '@/components/cortes/editar-corte-form';
import { EnviarCorteButton } from '@/components/cortes/enviar-corte-button';
import { formatCentavos } from '@/lib/format/money';
import type { Corte, Restaurant } from '@/lib/api/types';

export default async function CorteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const corteResult = await apiFetch<Corte>(`/api/cortes/${id}`);

  if (!corteResult.ok) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Corte no encontrado</h1>
        <p className="text-sm text-muted-foreground">{corteResult.error.message}</p>
      </div>
    );
  }

  const corte = corteResult.data;
  const restaurantesResult = await apiFetch<Restaurant[]>('/api/restaurantes?perPage=100');
  const restaurante = restaurantesResult.ok
    ? restaurantesResult.data.find((r) => r.id === corte.restaurant_id)
    : undefined;

  const puedeEditar =
    user.role === 'responsable_restaurante' &&
    corte.created_by === user.id &&
    corte.estado === 'preliminar';

  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Corte — {restaurante?.name ?? corte.restaurant_id}</h1>
        <EstadoBadge estado={corte.estado} />
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-muted-foreground">Fecha</dt>
        <dd>{corte.business_date}</dd>
        <dt className="text-muted-foreground">Turno</dt>
        <dd>{corte.turno === 'matutino' ? 'Matutino' : 'Vespertino'}</dd>
        <dt className="text-muted-foreground">Efectivo reportado</dt>
        <dd>{formatCentavos(corte.monto_efectivo_reportado, corte.currency)}</dd>
        <dt className="text-muted-foreground">Tarjeta reportada</dt>
        <dd>{formatCentavos(corte.monto_tarjeta_reportado, corte.currency)}</dd>
        {corte.estado === 'validado' && (
          <>
            <dt className="text-muted-foreground">Efectivo validado</dt>
            <dd>{formatCentavos(corte.monto_efectivo_validado ?? 0, corte.currency)}</dd>
            <dt className="text-muted-foreground">Tarjeta validada</dt>
            <dd>{formatCentavos(corte.monto_tarjeta_validado ?? 0, corte.currency)}</dd>
            <dt className="text-muted-foreground">Diferencia</dt>
            <dd>{formatCentavos(corte.diferencia ?? 0, corte.currency)}</dd>
            {corte.comentario_validacion && (
              <>
                <dt className="text-muted-foreground">Comentario</dt>
                <dd>{corte.comentario_validacion}</dd>
              </>
            )}
          </>
        )}
        {corte.estado === 'cancelado' && corte.cancelacion_motivo && (
          <>
            <dt className="text-muted-foreground">Motivo de cancelación</dt>
            <dd>{corte.cancelacion_motivo}</dd>
          </>
        )}
      </dl>

      {puedeEditar && (
        <div className="space-y-4 border-t pt-4">
          <EditarCorteForm corte={corte} />
          <EnviarCorteButton corteId={corte.id} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verificar**

```bash
npm run typecheck
npm run lint
npm run build
npm run dev
```

Login como `responsable@test.local`, entrar al corte creado en la Tarea 7:
1. Expected: formulario de edición precargado con los montos, badge "Preliminar", botón "Enviar a validación".
2. Cambiar el monto efectivo y "Guardar cambios". Expected: la página no navega, los valores se actualizan (recarga por `revalidatePath`).
3. Click "Enviar a validación". Expected: el badge cambia a "En proceso" y el formulario de edición desaparece (ya no es `preliminar`).
4. Login como `dueno@test.local`, entrar al mismo corte vía `/cortes`. Expected: se ve el detalle en solo lectura, sin formulario de edición ni botón de enviar.

- [x] **Step 5: Commit**

```bash
git add "app/(dashboard)/cortes/[id]" components/cortes/editar-corte-form.tsx components/cortes/enviar-corte-button.tsx
git commit -m "Agregar detalle, edicion y envio a validacion de cortes"
```

---

## Task 9: `/validacion` — cola de validación

**Files:**
- Create: `app/(dashboard)/validacion/page.tsx`

**Interfaces:**
- Consumes: `CortesTable` (Tarea 6, con `linkBase="/validacion"`), `apiFetch`.

- [x] **Step 1: Página de la cola**

Create `app/(dashboard)/validacion/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api/fetch';
import { getCurrentUser } from '@/lib/auth/session';
import { CortesTable } from '@/components/cortes/cortes-table';
import type { Corte, Restaurant } from '@/lib/api/types';

export default async function ValidacionPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'validador_cortes') redirect('/');

  const [preliminarResult, enProcesoResult, restaurantesResult] = await Promise.all([
    apiFetch<Corte[]>('/api/cortes?perPage=100&filter[estado]=preliminar'),
    apiFetch<Corte[]>('/api/cortes?perPage=100&filter[estado]=en_proceso'),
    apiFetch<Restaurant[]>('/api/restaurantes?perPage=100'),
  ]);

  // El API no soporta filtrar por una lista de estados en una sola llamada
  // (filter[estado] acepta un solo valor) — se combinan dos llamadas.
  const cortes = [
    ...(preliminarResult.ok ? preliminarResult.data : []),
    ...(enProcesoResult.ok ? enProcesoResult.data : []),
  ].sort((a, b) => a.business_date.localeCompare(b.business_date));

  const restaurantes = restaurantesResult.ok ? restaurantesResult.data : [];
  const restaurantsById = Object.fromEntries(restaurantes.map((r) => [r.id, r]));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Cola de validación</h1>
      <CortesTable cortes={cortes} restaurantsById={restaurantsById} showRestaurant linkBase="/validacion" />
    </div>
  );
}
```

- [ ] **Step 2: Verificar**

```bash
npm run typecheck
npm run lint
npm run build
npm run dev
```

Login como `validador@test.local`, ir a `/validacion`. Expected: aparece el corte enviado en la Tarea 8 (estado "En proceso"), la fila enlaza a `/validacion/<id>` (dará 404 hasta la Tarea 10 — esperado).

- [x] **Step 3: Commit**

```bash
git add "app/(dashboard)/validacion/page.tsx"
git commit -m "Agregar cola de validacion de cortes"
```

---

## Task 10: `/validacion/[id]` — validar y cancelar

**Files:**
- Create: `app/(dashboard)/validacion/actions.ts`
- Create: `components/validacion/validacion-form.tsx`
- Create: `components/validacion/cancelar-corte-dialog.tsx`
- Create: `app/(dashboard)/validacion/[id]/page.tsx`

**Interfaces:**
- Produces: `validarCorte(corteId, prevState, formData)`, `cancelarCorte(corteId, prevState, formData)`, ambos con `ValidacionFormState = { error?: string }`.

- [x] **Step 1: Server Actions de validación**

Create `app/(dashboard)/validacion/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api/fetch';
import { pesosToCentavos } from '@/lib/format/money';

export type ValidacionFormState = { error?: string };

export async function validarCorte(
  corteId: string,
  _prevState: ValidacionFormState,
  formData: FormData
): Promise<ValidacionFormState> {
  const result = await apiFetch(`/api/cortes/${corteId}/validar`, {
    method: 'POST',
    body: {
      montoEfectivoValidado: pesosToCentavos(Number(formData.get('montoEfectivoValidado') ?? 0)),
      montoTarjetaValidado: pesosToCentavos(Number(formData.get('montoTarjetaValidado') ?? 0)),
      comentario: String(formData.get('comentario') ?? '') || undefined,
    },
  });

  if (!result.ok) return { error: result.error.message };

  redirect('/validacion');
}

export async function cancelarCorte(
  corteId: string,
  _prevState: ValidacionFormState,
  formData: FormData
): Promise<ValidacionFormState> {
  const motivo = String(formData.get('motivo') ?? '');
  if (!motivo) return { error: 'El motivo es obligatorio.' };

  const result = await apiFetch(`/api/cortes/${corteId}/cancelar`, {
    method: 'POST',
    body: { motivo },
  });

  if (!result.ok) return { error: result.error.message };

  redirect('/validacion');
}
```

- [x] **Step 2: Formulario de validación**

Create `components/validacion/validacion-form.tsx`:

```tsx
'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { validarCorte, type ValidacionFormState } from '@/app/(dashboard)/validacion/actions';
import { formatCentavos } from '@/lib/format/money';

const initialState: ValidacionFormState = {};

export function ValidacionForm({
  corteId,
  montoEfectivoReportado,
  montoTarjetaReportado,
}: {
  corteId: string;
  montoEfectivoReportado: number;
  montoTarjetaReportado: number;
}) {
  const action = validarCorte.bind(null, corteId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [efectivo, setEfectivo] = useState(String(montoEfectivoReportado / 100));
  const [tarjeta, setTarjeta] = useState(String(montoTarjetaReportado / 100));

  const diferenciaCentavos =
    Math.round(Number(efectivo || 0) * 100) +
    Math.round(Number(tarjeta || 0) * 100) -
    (montoEfectivoReportado + montoTarjetaReportado);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="montoEfectivoValidado">Efectivo validado (MXN)</Label>
        <Input
          id="montoEfectivoValidado"
          name="montoEfectivoValidado"
          type="number"
          step="0.01"
          min="0"
          value={efectivo}
          onChange={(e) => setEfectivo(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="montoTarjetaValidado">Tarjeta validada (MXN)</Label>
        <Input
          id="montoTarjetaValidado"
          name="montoTarjetaValidado"
          type="number"
          step="0.01"
          min="0"
          value={tarjeta}
          onChange={(e) => setTarjeta(e.target.value)}
          required
        />
      </div>
      <p className="text-sm text-muted-foreground">Diferencia: {formatCentavos(diferenciaCentavos)}</p>
      <div className="space-y-2">
        <Label htmlFor="comentario">
          Comentario {diferenciaCentavos !== 0 && '(obligatorio por la diferencia)'}
        </Label>
        <Textarea id="comentario" name="comentario" required={diferenciaCentavos !== 0} />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Validando...' : 'Validar'}
      </Button>
    </form>
  );
}
```

- [x] **Step 3: Diálogo de cancelación**

Create `components/validacion/cancelar-corte-dialog.tsx`:

```tsx
'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cancelarCorte, type ValidacionFormState } from '@/app/(dashboard)/validacion/actions';

const initialState: ValidacionFormState = {};

export function CancelarCorteDialog({ corteId }: { corteId: string }) {
  const [open, setOpen] = useState(false);
  const action = cancelarCorte.bind(null, corteId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">
          Cancelar corte
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar corte</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Textarea id="motivo" name="motivo" required />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? 'Cancelando...' : 'Confirmar cancelación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

(`cancelarCorte` hace `redirect('/validacion')` en éxito, así que el diálogo se desmonta con la navegación — no hace falta cerrarlo manualmente.)

- [x] **Step 4: Página de detalle de validación**

Create `app/(dashboard)/validacion/[id]/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api/fetch';
import { getCurrentUser } from '@/lib/auth/session';
import { formatCentavos } from '@/lib/format/money';
import { ValidacionForm } from '@/components/validacion/validacion-form';
import { CancelarCorteDialog } from '@/components/validacion/cancelar-corte-dialog';
import type { Corte, Restaurant } from '@/lib/api/types';

export default async function ValidacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'validador_cortes') redirect('/');

  const { id } = await params;
  const corteResult = await apiFetch<Corte>(`/api/cortes/${id}`);

  if (!corteResult.ok) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Corte no encontrado</h1>
        <p className="text-sm text-muted-foreground">{corteResult.error.message}</p>
      </div>
    );
  }

  const corte = corteResult.data;
  const restaurantesResult = await apiFetch<Restaurant[]>('/api/restaurantes?perPage=100');
  const restaurante = restaurantesResult.ok
    ? restaurantesResult.data.find((r) => r.id === corte.restaurant_id)
    : undefined;

  const puedeValidar = corte.estado === 'preliminar' || corte.estado === 'en_proceso';

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold">Validar corte — {restaurante?.name ?? corte.restaurant_id}</h1>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-muted-foreground">Fecha</dt>
        <dd>{corte.business_date}</dd>
        <dt className="text-muted-foreground">Turno</dt>
        <dd>{corte.turno === 'matutino' ? 'Matutino' : 'Vespertino'}</dd>
        <dt className="text-muted-foreground">Efectivo reportado</dt>
        <dd>{formatCentavos(corte.monto_efectivo_reportado, corte.currency)}</dd>
        <dt className="text-muted-foreground">Tarjeta reportada</dt>
        <dd>{formatCentavos(corte.monto_tarjeta_reportado, corte.currency)}</dd>
      </dl>

      {puedeValidar ? (
        <div className="space-y-6 border-t pt-4">
          <ValidacionForm
            corteId={corte.id}
            montoEfectivoReportado={corte.monto_efectivo_reportado}
            montoTarjetaReportado={corte.monto_tarjeta_reportado}
          />
          <CancelarCorteDialog corteId={corte.id} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Este corte ya no está disponible para validación.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verificar**

```bash
npm run typecheck
npm run lint
npm run build
npm run dev
```

Login como `validador@test.local`, entrar al corte de la Tarea 9:
1. Dejar los montos iguales a los reportados (diferencia $0.00), sin comentario, click "Validar". Expected: redirige a `/validacion`, el corte ya no aparece en la cola.
2. Crear otro corte como `responsable@test.local`, enviarlo, y esta vez en `/validacion/[id]` cambiar el monto efectivo validado para generar una diferencia distinta de cero, dejar el comentario vacío, click "Validar". Expected: error "Se requiere un comentario cuando hay diferencia distinta de cero." (mismo texto que la API). Llenar el comentario y reintentar. Expected: éxito, redirige a `/validacion`.
3. Crear un tercer corte, en `/validacion/[id]` click "Cancelar corte", dejar el motivo vacío y enviar. Expected: el `required` del textarea bloquea el submit. Llenar un motivo y confirmar. Expected: redirige a `/validacion`, el corte ya no aparece en la cola (quedó `cancelado`).

- [x] **Step 6: Commit**

```bash
git add "app/(dashboard)/validacion/actions.ts" "app/(dashboard)/validacion/[id]" components/validacion
git commit -m "Agregar validacion y cancelacion de cortes"
```

---

## Task 11: `/restaurantes` — lista y creación (admin)

**Files:**
- Create: `app/(dashboard)/restaurantes/actions.ts`
- Create: `components/restaurantes/restaurantes-table.tsx`
- Create: `components/restaurantes/nuevo-restaurante-dialog.tsx`
- Create: `app/(dashboard)/restaurantes/page.tsx`

- [x] **Step 1: Server Action de creación**

Create `app/(dashboard)/restaurantes/actions.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api/fetch';
import type { Restaurant } from '@/lib/api/types';

export type RestauranteFormState = { status: 'idle' | 'success' | 'error'; error?: string };

export const initialRestauranteFormState: RestauranteFormState = { status: 'idle' };

export async function crearRestaurante(
  _prevState: RestauranteFormState,
  formData: FormData
): Promise<RestauranteFormState> {
  const name = String(formData.get('name') ?? '');
  if (!name) return { status: 'error', error: 'El nombre es obligatorio.' };

  const result = await apiFetch<Restaurant>('/api/restaurantes', {
    method: 'POST',
    body: { name, address: String(formData.get('address') ?? '') || undefined },
  });

  if (!result.ok) return { status: 'error', error: result.error.message };

  revalidatePath('/restaurantes');
  return { status: 'success' };
}
```

- [x] **Step 2: Tabla**

Create `components/restaurantes/restaurantes-table.tsx`:

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Restaurant } from '@/lib/api/types';

export function RestaurantesTable({ restaurantes }: { restaurantes: Restaurant[] }) {
  if (restaurantes.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay restaurantes activos.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Dirección</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {restaurantes.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.name}</TableCell>
            <TableCell>{r.address ?? '—'}</TableCell>
            <TableCell>
              <Badge variant={r.status === 'active' ? 'outline' : 'secondary'}>
                {r.status === 'active' ? 'Activo' : 'Inactivo'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [x] **Step 3: Diálogo de creación (solo admin)**

Create `components/restaurantes/nuevo-restaurante-dialog.tsx`:

```tsx
'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { crearRestaurante, initialRestauranteFormState } from '@/app/(dashboard)/restaurantes/actions';

export function NuevoRestauranteDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(crearRestaurante, initialRestauranteFormState);

  useEffect(() => {
    if (state.status === 'success') setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nuevo restaurante</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo restaurante</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" name="address" />
          </div>
          {state.status === 'error' && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

(El diálogo se cierra vía `useEffect` cuando `state.status === 'success'` — distinguir éxito de error requiere el discriminador `status`, ya que ambos casos devuelven un objeto y React no puede diferenciarlos solo por referencia.)

- [x] **Step 4: Página**

Create `app/(dashboard)/restaurantes/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api/fetch';
import { getCurrentUser } from '@/lib/auth/session';
import { RestaurantesTable } from '@/components/restaurantes/restaurantes-table';
import { NuevoRestauranteDialog } from '@/components/restaurantes/nuevo-restaurante-dialog';
import type { Restaurant } from '@/lib/api/types';

export default async function RestaurantesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'dueno' && user.role !== 'admin') redirect('/');

  const result = await apiFetch<Restaurant[]>('/api/restaurantes?perPage=100');
  const restaurantes = result.ok ? result.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Restaurantes</h1>
        {user.role === 'admin' && <NuevoRestauranteDialog />}
      </div>
      <RestaurantesTable restaurantes={restaurantes} />
    </div>
  );
}
```

- [ ] **Step 5: Verificar**

```bash
npm run typecheck
npm run lint
npm run build
npm run dev
```

1. Login como `admin@test.local`, ir a `/restaurantes`. Expected: se ve "Restaurante de Prueba" (sembrado en la Tarea 1) y el botón "Nuevo restaurante".
2. Click "Nuevo restaurante", llenar nombre "Sucursal Centro", crear. Expected: el diálogo se cierra y la tabla muestra las dos filas sin recargar la página.
3. Login como `dueno@test.local`, ir a `/restaurantes`. Expected: se ven ambos restaurantes, sin botón "Nuevo restaurante".

- [x] **Step 6: Commit**

```bash
git add "app/(dashboard)/restaurantes"
git commit -m "Agregar lista y creacion de restaurantes"
```

---

## Task 12: `/egresos` — placeholder

**Files:**
- Create: `app/(dashboard)/egresos/page.tsx`

- [x] **Step 1: Página placeholder**

Create `app/(dashboard)/egresos/page.tsx`:

```tsx
export default function EgresosPage() {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-xl font-semibold">Egresos</h1>
      <p className="text-sm text-muted-foreground">Disponible en la próxima fase.</p>
    </div>
  );
}
```

- [ ] **Step 2: Verificar**

```bash
npm run typecheck
npm run lint
npm run build
npm run dev
```

Login como `egresos@test.local`. Expected: redirige a `/egresos`, se ve el mensaje placeholder, sin errores en consola.

- [x] **Step 3: Commit**

```bash
git add "app/(dashboard)/egresos"
git commit -m "Agregar placeholder de egresos"
```

---

## Task 13: QA manual end-to-end

Sin código nuevo — recorrido completo de todos los flujos con los 5 roles, para atrapar cualquier interacción entre tareas que no se haya visto en el QA incremental de cada una.

- [x] **Step 1: Verificación estática final**

```bash
npm run typecheck
npm run lint
npm run build
```

Expected: los tres pasan limpio sobre el estado final del branch.

- [ ] **Step 2: Recorrido completo — `responsable_restaurante`**

Con `npm run dev` corriendo, login como `responsable@test.local`:
1. `/cortes` muestra solo los cortes de "Restaurante de Prueba".
2. Crear un corte nuevo, verificar que aparece en la lista con estado "Preliminar".
3. Editarlo (cambiar montos), verificar que persisten tras recargar la página.
4. Enviarlo a validación, verificar que el estado cambia a "En proceso" y el formulario de edición desaparece.
5. Intentar editar un corte ya `en_proceso` navegando directo a su URL: no debe verse el formulario de edición.

- [ ] **Step 3: Recorrido completo — `validador_cortes`**

Login como `validador@test.local`:
1. `/validacion` muestra el corte "En proceso" del paso anterior.
2. Validarlo sin diferencia (mismos montos) — desaparece de la cola.
3. Con otro corte, generar una diferencia y confirmar que el comentario es obligatorio (mensaje exacto de la API).
4. Cancelar un corte con motivo — desaparece de la cola.

- [ ] **Step 4: Recorrido completo — `dueno` / `admin`**

Login como `dueno@test.local`:
1. `/restaurantes` — ver todos los restaurantes, sin botón de creación.
2. `/cortes` — ver todos los cortes de todos los restaurantes (incluyendo los ya validados/cancelados), sin botón "Nuevo corte", con el filtro por restaurante visible si hay más de uno.

Login como `admin@test.local`:
1. `/restaurantes` — crear un restaurante nuevo, confirmar que aparece sin recargar.
2. `/cortes` — mismo comportamiento de solo lectura que `dueno`.

- [ ] **Step 5: Recorrido completo — `egresos` y casos de sesión**

Login como `egresos@test.local`: ver el placeholder, sidebar con un solo link.

Casos de sesión:
1. Sin sesión, intentar acceder directo a `/cortes`, `/validacion`, `/restaurantes`, `/egresos` — todos redirigen a `/login`.
2. Con sesión, ir a `/login` directamente — redirige a `/` (y de ahí a la pantalla del rol).
3. Cerrar sesión desde cualquier pantalla — redirige a `/login` y las rutas protegidas vuelven a redirigir ahí.

- [x] **Step 6: Registrar hallazgos y cerrar**

Si algún paso falla, arreglarlo en el archivo correspondiente (no crear una tarea nueva para bugs de tareas anteriores — se corrigen en línea) y volver a correr el paso. Cuando todo el recorrido pase:

```bash
git status
```

Expected: working tree limpio (todo ya commiteado en las tareas anteriores). Si quedó algo suelto de un fix de este paso, commitearlo:

```bash
git add -A
git commit -m "Fixes de QA manual end-to-end de la Fase 1"
```
