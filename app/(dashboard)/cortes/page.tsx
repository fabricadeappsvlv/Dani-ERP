import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api/fetch';
import { getCurrentUser } from '@/lib/auth/session';
import { CortesTable } from '@/components/cortes/cortes-table';
import { RestaurantFilter } from '@/components/cortes/restaurant-filter';
import type { Corte, Restaurant } from '@/lib/api/types';

export default async function CortesPage({
  searchParams,
}: {
  searchParams: Promise<{ restaurantId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { restaurantId } = await searchParams;
  const isResponsable = user.role === 'responsable_restaurante';

  const restaurantesResult = await apiFetch<Restaurant[]>('/api/restaurantes?perPage=100');
  const restaurantes = restaurantesResult.ok ? restaurantesResult.data : [];

  const cortesPath = restaurantId
    ? `/api/cortes?perPage=100&filter[restaurantId]=${restaurantId}`
    : '/api/cortes?perPage=100';
  const cortesResult = await apiFetch<Corte[]>(cortesPath);
  const cortes = cortesResult.ok ? cortesResult.data : [];

  const restaurantsById = Object.fromEntries(restaurantes.map((r) => [r.id, r]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Cortes</h1>
        {isResponsable && (
          <Button asChild>
            <Link href="/cortes/nuevo">Nuevo corte</Link>
          </Button>
        )}
      </div>
      {restaurantes.length > 1 && <RestaurantFilter restaurantes={restaurantes} />}
      <CortesTable cortes={cortes} restaurantsById={restaurantsById} showRestaurant={restaurantes.length > 1} />
    </div>
  );
}
