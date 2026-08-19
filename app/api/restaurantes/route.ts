import { requireRole } from '@/lib/api/auth';
import { ok, okPaginated, apiError } from '@/lib/api/responses';

// GET /api/restaurantes — lista paginada (sección 4.1)
// RLS ya filtra: responsable_restaurante solo ve los suyos vía restaurant_users.
export async function GET(req: Request) {
  const auth = await requireRole();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get('page') ?? '1');
  const perPage = Math.min(Number(searchParams.get('perPage') ?? '20'), 100);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await supabase
    .from('restaurants')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
    .order('name')
    .range(from, to);

  if (error) return apiError('INTERNAL_ERROR', error.message);

  return okPaginated(data, { page, perPage, totalItems: count ?? 0 });
}

// POST /api/restaurantes — crear restaurante (solo admin, sección 4.1)
export async function POST(req: Request) {
  const auth = await requireRole(['admin']);
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const body = await req.json();
  if (!body.name) {
    return apiError('VALIDATION_ERROR', 'El campo "name" es obligatorio.', [
      { field: 'name', issue: 'required' },
    ]);
  }

  const { data, error } = await supabase
    .from('restaurants')
    .insert({ name: body.name, address: body.address ?? null })
    .select()
    .single();

  if (error) return apiError('INTERNAL_ERROR', error.message);

  return ok(data, 201);
}
