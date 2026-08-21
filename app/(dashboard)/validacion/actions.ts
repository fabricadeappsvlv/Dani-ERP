'use server';

import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api/fetch';
import { pesosToCentavos } from '@/lib/format/money';

export type ValidacionFormState = { error?: string };

export async function validarCorte(
  corteId: string,
  _prevState: ValidacionFormState,
  formData: FormData
): Promise<ValidacionFormState> {
  const result = await apiFetch(`/api/cortes/${corteId}/validar`, {
    method: 'POST',
    body: {
      montoEfectivoValidado: pesosToCentavos(Number(formData.get('montoEfectivoValidado') ?? 0)),
      montoTarjetaValidado: pesosToCentavos(Number(formData.get('montoTarjetaValidado') ?? 0)),
      comentario: String(formData.get('comentario') ?? '') || undefined,
    },
  });

  if (!result.ok) return { error: result.error.message };

  redirect('/validacion');
}

export async function cancelarCorte(
  corteId: string,
  _prevState: ValidacionFormState,
  formData: FormData
): Promise<ValidacionFormState> {
  const motivo = String(formData.get('motivo') ?? '');
  if (!motivo) return { error: 'El motivo es obligatorio.' };

  const result = await apiFetch(`/api/cortes/${corteId}/cancelar`, {
    method: 'POST',
    body: { motivo },
  });

  if (!result.ok) return { error: result.error.message };

  redirect('/validacion');
}
