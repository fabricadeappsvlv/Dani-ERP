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
