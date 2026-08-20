import { requireRole } from '@/lib/api/auth';
import { ok, apiError } from '@/lib/api/responses';

/**
 * GET /api/resumen-ejecutivo/contraste-pos?restaurantId=&from=&to=
 *
 * Contraste informativo, día completo (no por turno — sin impacto en el
 * flujo de validación de cortes). Compara:
 *   - "reportado": suma de montos reportados en cortes (preliminar/en_proceso/validado)
 *   - "pos": suma de sr_pagos de ventas no canceladas, mismo restaurante/día
 * por cada uno de los 2 buckets (efectivo/tarjeta) + diferencia.
 */
export async function GET(req: Request) {
  const auth = await requireRole(['dueno', 'admin', 'validador_cortes']);
  if (auth instanceof Response) return auth;
  const { supabase } = auth;

  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get('restaurantId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!restaurantId || !from || !to) {
    return apiError('VALIDATION_ERROR', 'restaurantId, from y to son obligatorios.', [
      { field: 'restaurantId', issue: 'required' },
      { field: 'from', issue: 'required' },
      { field: 'to', issue: 'required' },
    ]);
  }

  const [{ data: cortes, error: cortesError }, { data: ventas, error: ventasError }] = await Promise.all([
    supabase
      .from('cortes')
      .select('business_date, monto_efectivo_reportado, monto_tarjeta_reportado')
      .eq('restaurant_id', restaurantId)
      .neq('estado', 'cancelado')
      .gte('business_date', from)
      .lte('business_date', to),
    supabase
      .from('sr_ventas_raw')
      .select('business_date, sr_pagos(tipo, importe_centavos)')
      .eq('restaurant_id', restaurantId)
      .eq('cancelled', false)
      .gte('business_date', from)
      .lte('business_date', to),
  ]);

  if (cortesError) return apiError('INTERNAL_ERROR', cortesError.message);
  if (ventasError) return apiError('INTERNAL_ERROR', ventasError.message);

  type Bucket = { reportadoEfectivo: number; reportadoTarjeta: number; posEfectivo: number; posTarjeta: number };
  const byDate = new Map<string, Bucket>();

  const getBucket = (date: string): Bucket => {
    if (!byDate.has(date)) {
      byDate.set(date, { reportadoEfectivo: 0, reportadoTarjeta: 0, posEfectivo: 0, posTarjeta: 0 });
    }
    return byDate.get(date)!;
  };

  for (const c of cortes ?? []) {
    const b = getBucket(c.business_date);
    b.reportadoEfectivo += c.monto_efectivo_reportado;
    b.reportadoTarjeta += c.monto_tarjeta_reportado;
  }

  for (const v of ventas ?? []) {
    const b = getBucket(v.business_date);
    for (const pago of (v as any).sr_pagos ?? []) {
      if (pago.tipo === 'efectivo') b.posEfectivo += pago.importe_centavos;
      else if (pago.tipo === 'tarjeta') b.posTarjeta += pago.importe_centavos;
    }
  }

  const result = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([businessDate, b]) => ({
      businessDate,
      reportado: { efectivo: b.reportadoEfectivo, tarjeta: b.reportadoTarjeta, total: b.reportadoEfectivo + b.reportadoTarjeta },
      pos: { efectivo: b.posEfectivo, tarjeta: b.posTarjeta, total: b.posEfectivo + b.posTarjeta },
      diferencia: {
        efectivo: b.posEfectivo - b.reportadoEfectivo,
        tarjeta: b.posTarjeta - b.reportadoTarjeta,
        total: (b.posEfectivo + b.posTarjeta) - (b.reportadoEfectivo + b.reportadoTarjeta),
      },
    }));

  return ok(result);
}
