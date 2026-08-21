'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api/fetch';
import { pesosToCentavos } from '@/lib/format/money';
import type { Corte } from '@/lib/api/types';

export type CorteFormState = { error?: string };

export async function crearCorte(_prevState: CorteFormState, formData: FormData): Promise<CorteFormState> {
  const result = await apiFetch<Corte>('/api/cortes', {
    method: 'POST',
    body: {
      restaurantId: String(formData.get('restaurantId') ?? ''),
      businessDate: String(formData.get('businessDate') ?? ''),
      turno: String(formData.get('turno') ?? ''),
      montoEfectivoReportado: pesosToCentavos(Number(formData.get('montoEfectivo') ?? 0)),
      montoTarjetaReportado: pesosToCentavos(Number(formData.get('montoTarjeta') ?? 0)),
    },
  });

  if (!result.ok) return { error: result.error.message };

  redirect(`/cortes/${result.data.id}`);
}

export async function editarCorte(
  corteId: string,
  _prevState: CorteFormState,
  formData: FormData
): Promise<CorteFormState> {
  const result = await apiFetch<Corte>(`/api/cortes/${corteId}`, {
    method: 'PATCH',
    body: {
      montoEfectivoReportado: pesosToCentavos(Number(formData.get('montoEfectivo') ?? 0)),
      montoTarjetaReportado: pesosToCentavos(Number(formData.get('montoTarjeta') ?? 0)),
    },
  });

  if (!result.ok) return { error: result.error.message };

  revalidatePath(`/cortes/${corteId}`);
  return {};
}

export async function enviarCorte(
  corteId: string,
  _prevState: CorteFormState,
  _formData: FormData
): Promise<CorteFormState> {
  const result = await apiFetch(`/api/cortes/${corteId}/enviar`, { method: 'POST' });
  if (!result.ok) return { error: result.error.message };

  revalidatePath(`/cortes/${corteId}`);
  return {};
}
