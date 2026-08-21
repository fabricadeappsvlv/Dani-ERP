import { requireRole } from '@/lib/api/auth';
import { ok, apiError } from '@/lib/api/responses';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole();
  if (auth instanceof Response) return auth;
  const { supabase } = auth;
  const { id } = await params;

  const { data, error } = await supabase.from('cortes').select('*').eq('id', id).single();

  if (error || !data) return apiError('RESOURCE_NOT_FOUND', 'Corte no encontrado.');

  return ok(data);
}

// PATCH — editar montos reportados. Solo el responsable dueño del corte,
// y solo mientras estado = 'preliminar' (regla de negocio, sección 4.3).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['responsable_restaurante']);
  if (auth instanceof Response) return auth;
  const { supabase, user } = auth;
  const { id } = await params;

  const { data: existing, error: fetchError } = await supabase
    .from('cortes')
    .select('estado, created_by')
    .eq('id', id)
    .single();

  if (fetchError || !existing) return apiError('RESOURCE_NOT_FOUND', 'Corte no encontrado.');
  if (existing.created_by !== user.id) return apiError('FORBIDDEN', 'No eres el responsable de este corte.');
  if (existing.estado !== 'preliminar') {
    return apiError('CORTE_NOT_EDITABLE', 'Solo se puede editar un corte en estado preliminar.');
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (body.montoEfectivoReportado !== undefined) updates.monto_efectivo_reportado = body.montoEfectivoReportado;
  if (body.montoTarjetaReportado !== undefined) updates.monto_tarjeta_reportado = body.montoTarjetaReportado;

  const { data, error } = await supabase
    .from('cortes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return apiError('INTERNAL_ERROR', error.message);

  return ok(data);
}
