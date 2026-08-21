import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api/fetch';
import { getCurrentUser } from '@/lib/auth/session';
import { RestaurantesTable } from '@/components/restaurantes/restaurantes-table';
import { NuevoRestauranteDialog } from '@/components/restaurantes/nuevo-restaurante-dialog';
import type { Restaurant } from '@/lib/api/types';

export default async function RestaurantesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'dueno' && user.role !== 'admin') redirect('/');

  const result = await apiFetch<Restaurant[]>('/api/restaurantes?perPage=100');
  const restaurantes = result.ok ? result.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Restaurantes</h1>
        {user.role === 'admin' && <NuevoRestauranteDialog />}
      </div>
      <RestaurantesTable restaurantes={restaurantes} />
    </div>
  );
}
