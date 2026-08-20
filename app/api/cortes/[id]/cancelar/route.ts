import { requireRole } from '@/lib/api/auth';
import { ok, apiError } from '@/lib/api/responses';

// POST /api/cortes/{id}/cancelar
// Confirmado con el negocio: no hay flujo de rechazo, pero sí cancelación
// lógica para errores de carga (turno/restaurante equivocado, duplicado, etc).
// Un corte cancelado libera el slot único (restaurant_id, business_date, turno)
// vía el índice parcial uq_corte_activo — ver migración 0001_init.sql.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(['responsable_restaurante', 'validador_cortes', 'admin']);
  if (auth instanceof Response) return auth;
  const { supabase, user, role } = auth;

  const body = await req.json().catch(() => ({}));
  if (!body.motivo) {
    return apiError('VALIDATION_ERROR', 'El campo "motivo" es obligatorio para cancelar un corte.', [
      { field: 'motivo', issue: 'required' },
    ]);
  }

  const { data: existing, error: fetchError } = await supabase
    .from('cortes')
    .select('estado, created_by')
    .eq('id', params.id)
    .single();

  if (fetchError || !existing) return apiError('RESOURCE_NOT_FOUND', 'Corte no encontrado.');

  // El responsable solo puede cancelar sus propios cortes; validador/admin, cualquiera.
  if (role === 'responsable_restaurante' && existing.created_by !== user.id) {
    return apiError('FORBIDDEN', 'No eres el responsable de este corte.');
  }
  if (existing.estado === 'validado') {
    return apiError('CORTE_NOT_EDITABLE', 'Un corte ya validado no se cancela; usar un ajuste (ver /ajustes).');
  }
  if (existing.estado === 'cancelado') {
    return apiError('CORTE_NOT_EDITABLE', 'Este corte ya está cancelado.');
  }

  const { data, error } = await supabase
    .from('cortes')
    .update({
      estado: 'cancelado',
      cancelacion_motivo: body.motivo,
      cancelled_by: user.id,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return apiError('INTERNAL_ERROR', error.message);

  return ok(data);
}
