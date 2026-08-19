import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api/fetch';
import { getCurrentUser } from '@/lib/auth/session';
import { NuevoCorteForm } from '@/components/cortes/nuevo-corte-form';
import type { Restaurant } from '@/lib/api/types';

export default async function NuevoCortePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'responsable_restaurante') redirect('/cortes');

  const restaurantesResult = await apiFetch<Restaurant[]>('/api/restaurantes?perPage=100');
  const restaurantes = restaurantesResult.ok ? restaurantesResult.data : [];

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold">Nuevo corte</h1>
      <NuevoCorteForm restaurantes={restaurantes} />
    </div>
  );
}
