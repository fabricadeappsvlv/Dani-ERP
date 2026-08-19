import { createServiceRoleClient } from '@/lib/supabase/server';

/** SR envía montos como decimal en pesos ("120.0000"); toda la app opera
 * en centavos (bigint) — ver cortes.monto_efectivo_reportado. Redondeo a
 * centavo más cercano para evitar arrastre de error de punto flotante. */
function toCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

/**
 * POST /api/webhooks/softrestaurant/ventas
 *
 * SoftRestaurant llama a esta URL (no al revés — ver sección 2 del manual
 * de integración). El formato de request/response NO sigue el contrato
 * general de nuestra API (lib/api/responses.ts): está fijado por SR y hay
 * que respetarlo tal cual para que su módulo de bitácora lo reconozca.
 *
 * Autenticación: header "Authorization" con el token configurado en
 * SR (Configuración > Interfaz con ERP y PMS), que debe coincidir con
 * restaurant_sr_config.webhook_token para el id_empresa recibido.
 */
export async function POST(req: Request) {
  const supabase = createServiceRoleClient();

  const authHeader = req.headers.get('authorization') ?? '';
  const body = await req.json().catch(() => null);

  if (!body?.IdEmpresa || !Array.isArray(body?.Ventas)) {
    return srError('Payload inválido: se requiere IdEmpresa y Ventas[].');
  }

  const { data: config } = await supabase
    .from('restaurant_sr_config')
    .select('restaurant_id, webhook_token, active')
    .eq('id_empresa', body.IdEmpresa)
    .single();

  if (!config || !config.active) {
    return srError('IdEmpresa no configurado o inactivo.');
  }
  if (authHeader !== config.webhook_token) {
    return srError('Token de autorización inválido.');
  }

  // Catálogo de equivalencia forma de pago -> efectivo/tarjeta/otro
  const { data: formaPagoMap } = await supabase.from('sr_forma_pago_map').select('*');
  const mapByLabel = new Map((formaPagoMap ?? []).map((m: any) => [m.forma_pago_sr, m.tipo]));

  let lastTransactionId: string | null = null;

  for (const venta of body.Ventas) {
    const { data: insertedVenta, error: ventaError } = await supabase
      .from('sr_ventas_raw')
      .upsert(
        {
          restaurant_id: config.restaurant_id,
          id_empresa: body.IdEmpresa,
          estacion: venta.Estacion ?? null,
          almacen: venta.Almacen ?? null,
          numero_orden: String(venta.NumeroOrden),
          fecha_venta: venta.FechaVenta,
          total_centavos: toCentavos(venta.Total),
          raw_payload: venta,
        },
        { onConflict: 'id_empresa,numero_orden' }
      )
      .select('id')
      .single();

    if (ventaError || !insertedVenta) {
      return srError(`No se pudo procesar la orden ${venta.NumeroOrden}: ${ventaError?.message ?? 'error desconocido'}`);
    }

    // Reemplaza los pagos de esta venta (idempotente ante reenvíos de SR)
    await supabase.from('sr_pagos').delete().eq('venta_id', insertedVenta.id);

    const pagosRows = (venta.Pagos ?? []).map((pago: any) => ({
      venta_id: insertedVenta.id,
      forma_pago_sr: pago.FormaPago,
      tipo: mapByLabel.get(pago.FormaPago) ?? 'otro',
      importe_centavos: toCentavos(pago.Importe),
      propina_centavos: toCentavos(pago.Propina ?? 0),
    }));

    if (pagosRows.length) {
      await supabase.from('sr_pagos').insert(pagosRows);
    }

    lastTransactionId = insertedVenta.id;
  }

  return srSuccess('Registro insertado correctamente', lastTransactionId);
}

function srSuccess(message: string, transactionId: string | null) {
  return Response.json({ Message: message, Transaction_id: transactionId ?? 0 });
}

function srError(message: string) {
  // Contrato de SR: en error, Transaction_id vacío/0 (sección 3.4 del manual).
  return Response.json({ Message: message, Transaction_id: 0 }, { status: 400 });
}
