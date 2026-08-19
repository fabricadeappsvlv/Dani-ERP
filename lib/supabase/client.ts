import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente Supabase para uso en Client Components.
 * Usa la anon key — la sesión se gestiona vía cookies httpOnly (@supabase/ssr).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
