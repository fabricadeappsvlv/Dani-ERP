import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Cliente Supabase para uso server-side (Route Handlers, Server Components).
 * Usa la anon key + RLS — respeta los permisos del usuario autenticado
 * a través de las cookies httpOnly de sesión.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Se puede ignorar si se llama desde un Server Component;
            // el middleware ya se encarga de refrescar la sesión.
          }
        },
      },
    }
  );
}

/**
 * Cliente con service_role — SOLO para jobs, webhooks y operaciones admin
 * de confianza (crear usuarios, refrescar la vista materializada).
 * NUNCA importar este archivo desde código que responde a un request
 * directo del cliente sin haber verificado antes el rol del usuario.
 */
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
