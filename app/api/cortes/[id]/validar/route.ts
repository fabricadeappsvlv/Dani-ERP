import { requireRole } from '@/lib/api/auth';
import { ok, apiError } from '@/lib/api/responses';

// POST /api/cortes/{id}/validar — solo validador_cortes (sección 4.3.2)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(['validador_cortes']);
  if (auth instanceof Response) return auth;
  const { supabase, user } = auth;

  const { data: existing, error: fetchError } = await supabase
    .from('cortes')
    .select('estado, monto_efectivo_reportado, monto_tarjeta_reportado')
    .eq('id', params.id)
    .single();

  if (fetchError || !existing) return apiError('RESOURCE_NOT_FOUND', 'Corte no encontrado.');
  if (!['preliminar', 'en_proceso'].includes(existing.estado)) {
    return apiError('CORTE_NOT_EDITABLE', 'Este corte ya no está disponible para validación.');
  }

  const body = await req.json();
  const { montoEfectivoValidado, montoTarjetaValidado, comentario } = body;

  if (montoEfectivoValidado === undefined || montoTarjetaValidado === undefined) {
    return apiError('VALIDATION_ERROR', 'montoEfectivoValidado y montoTarjetaValidado son obligatorios.');
  }

  const totalReportado = existing.monto_efectivo_reportado + existing.monto_tarjeta_reportado;
  const totalValidado = montoEfectivoValidado + montoTarjetaValidado;
  const diferencia = totalValidado - totalReportado;

  // Regla de negocio: comentario obligatorio si hay diferencia (sección 4.3.2)
  if (diferencia !== 0 && !comentario) {
    return apiError('COMMENT_REQUIRED_ON_DIFFERENCE', 'Se requiere un comentario cuando hay diferencia distinta de cero.');
  }

  const { data, error } = await supabase
    .from('cortes')
    .update({
      estado: 'validado',
      monto_efectivo_validado: montoEfectivoValidado,
      monto_tarjeta_validado: montoTarjetaValidado,
      diferencia,
      comentario_validacion: comentario ?? null,
      validated_by: user.id,
      validated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return apiError('INTERNAL_ERROR', error.message);

  return ok(data);
}
