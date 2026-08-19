import { requireRole } from '@/lib/api/auth';
import { ok, okPaginated, apiError } from '@/lib/api/responses';

// GET /api/cortes — filtros: restaurantId, businessDate, estado, turno (sección 4.3)
export async function GET(req: Request) {
  const auth = await requireRole();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get('page') ?? '1');
  const perPage = Math.min(Number(searchParams.get('perPage') ?? '20'), 100);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase.from('cortes').select('*', { count: 'exact' });

  const restaurantId = searchParams.get('filter[restaurantId]');
  const estado = searchParams.get('filter[estado]');
  const turno = searchParams.get('filter[turno]');
  const businessDate = searchParams.get('filter[businessDate]');

  if (restaurantId) query = query.eq('restaurant_id', restaurantId);
  if (estado) query = query.eq('estado', estado);
  if (turno) query = query.eq('turno', turno);
  if (businessDate) query = query.eq('business_date', businessDate);

  const { data, error, count } = await query
    .order('business_date', { ascending: false })
    .range(from, to);

  if (error) return apiError('INTERNAL_ERROR', error.message);

  return okPaginated(data, { page, perPage, totalItems: count ?? 0 });
}

// POST /api/cortes — crear corte de un turno (solo responsable_restaurante)
export async function POST(req: Request) {
  const auth = await requireRole(['responsable_restaurante']);
  if (auth instanceof Response) return auth;
  const { supabase, user } = auth;

  const body = await req.json();
  const required = ['restaurantId', 'businessDate', 'turno', 'montoEfectivoReportado', 'montoTarjetaReportado'];
  const missing = required.filter((f) => body[f] === undefined);
  if (missing.length) {
    return apiError(
      'VALIDATION_ERROR',
      'Faltan campos obligatorios.',
      missing.map((field) => ({ field, issue: 'required' }))
    );
  }

  const { data, error } = await supabase
    .from('cortes')
    .insert({
      restaurant_id: body.restaurantId,
      business_date: body.businessDate,
      turno: body.turno,
      monto_efectivo_reportado: body.montoEfectivoReportado,
      monto_tarjeta_reportado: body.montoTarjetaReportado,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    // Violación del índice único parcial uq_corte_activo (Postgres 23505)
    if (error.code === '23505') {
      return apiError('DUPLICATE_CORTE', 'Ya existe un corte activo para ese turno, fecha y restaurante.');
    }
    return apiError('INTERNAL_ERROR', error.message);
  }

  return ok(data, 201);
}
