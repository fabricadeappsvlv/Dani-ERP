'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api/fetch';
import type { Restaurant } from '@/lib/api/types';

export type RestauranteFormState = { status: 'idle' | 'success' | 'error'; error?: string };

export const initialRestauranteFormState: RestauranteFormState = { status: 'idle' };

export async function crearRestaurante(
  _prevState: RestauranteFormState,
  formData: FormData
): Promise<RestauranteFormState> {
  const name = String(formData.get('name') ?? '');
  if (!name) return { status: 'error', error: 'El nombre es obligatorio.' };

  const result = await apiFetch<Restaurant>('/api/restaurantes', {
    method: 'POST',
    body: { name, address: String(formData.get('address') ?? '') || undefined },
  });

  if (!result.ok) return { status: 'error', error: result.error.message };

  revalidatePath('/restaurantes');
  return { status: 'success' };
}
