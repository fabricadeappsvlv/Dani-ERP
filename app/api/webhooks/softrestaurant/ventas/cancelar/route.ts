import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/webhooks/softrestaurant/ventas/cancelar?NumeroOrden=12
 *
 * Sección 4.4 del manual: SR notifica cancelaciones vía querystring.
 * Solo se pueden cancelar cuentas con turno aún abierto (regla del lado
 * de SR, no de este endpoint) — aquí solo reflejamos la cancelación para
 * que no infle el contraste de ingresos.
 */
export async function GET(req: Request) {
  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(req.url);
  const numeroOrden = searchParams.get('NumeroOrden');
  const authHeader = req.headers.get('authorization') ?? '';

  if (!numeroOrden) {
    return srError('Falta el parámetro NumeroOrden.');
  }

  // El token identifica la sucursal (igual que en /ventas) — buscamos
  // la venta entre las configuraciones activas que coincidan con el token.
  const { data: config } = await supabase
    .from('restaurant_sr_config')
    .select('id_empresa')
    .eq('webhook_token', authHeader)
    .eq('active', true)
    .single();

  if (!config) {
    return srError('Token de autorización inválido.');
  }

  const { data: venta } = await supabase
    .from('sr_ventas_raw')
    .select('id, cancelled')
    .eq('id_empresa', config.id_empresa)
    .eq('numero_orden', numeroOrden)
    .single();

  if (!venta) {
    return srError('Orden no encontrada.');
  }
  if (venta.cancelled) {
    return srSuccess('Cancelacion duplicada', null);
  }

  await supabase
    .from('sr_ventas_raw')
    .update({ cancelled: true, cancelled_at: new Date().toISOString() })
    .eq('id', venta.id);

  return srSuccess('Cancelacion realizada exitosamente', venta.id);
}

function srSuccess(message: string, transactionId: string | null) {
  return Response.json({ Message: message, Transaction_id: transactionId ?? 0 });
}

function srError(message: string) {
  return Response.json({ Message: message, Transaction_id: 0 }, { status: 400 });
}
