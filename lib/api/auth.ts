import { createClient } from '@/lib/supabase/server';
import { apiError } from '@/lib/api/responses';

export type Role = 'dueno' | 'admin' | 'responsable_restaurante' | 'validador_cortes' | 'egresos';

/**
 * Verifica sesión y, opcionalmente, que el rol esté en la lista permitida.
 * Devuelve { user, role } o una Response de error lista para retornar tal cual.
 *
 * Uso típico en un Route Handler:
 *   const auth = await requireRole(['admin']);
 *   if (auth instanceof Response) return auth;
 *   const { user, role } = auth;
 */
export async function requireRole(allowedRoles?: Role[]) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return apiError('UNAUTHORIZED', 'Sesión inválida o expirada.');
  }

  const role = (user.app_metadata?.role ?? null) as Role | null;

  if (!role) {
    return apiError('FORBIDDEN', 'El usuario no tiene un rol asignado.');
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return apiError('FORBIDDEN', `Esta acción requiere uno de los roles: ${allowedRoles.join(', ')}.`);
  }

  return { user, role, supabase };
}
