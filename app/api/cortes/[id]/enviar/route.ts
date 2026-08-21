import { requireRole } from '@/lib/api/auth';
import { ok, apiError } from '@/lib/api/responses';

// POST /api/cortes/{id}/enviar — preliminar -> en_proceso (sección 4.3.1)
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    return apiError('CORTE_NOT_EDITABLE', 'Solo se puede enviar un corte en estado preliminar.');
  }

  const { data, error } = await supabase
    .from('cortes')
    .update({ estado: 'en_proceso' })
    .eq('id', id)
    .select()
    .single();

  if (error) return apiError('INTERNAL_ERROR', error.message);

  return ok(data);
}
