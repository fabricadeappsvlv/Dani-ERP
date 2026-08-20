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
