import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api/fetch';
import { getCurrentUser } from '@/lib/auth/session';
import { CortesTable } from '@/components/cortes/cortes-table';
import type { Corte, Restaurant } from '@/lib/api/types';

export default async function ValidacionPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'validador_cortes') redirect('/');

  const [preliminarResult, enProcesoResult, restaurantesResult] = await Promise.all([
    apiFetch<Corte[]>('/api/cortes?perPage=100&filter[estado]=preliminar'),
    apiFetch<Corte[]>('/api/cortes?perPage=100&filter[estado]=en_proceso'),
    apiFetch<Restaurant[]>('/api/restaurantes?perPage=100'),
  ]);

  // El API no soporta filtrar por una lista de estados en una sola llamada
  // (filter[estado] acepta un solo valor) — se combinan dos llamadas.
  const cortes = [
    ...(preliminarResult.ok ? preliminarResult.data : []),
    ...(enProcesoResult.ok ? enProcesoResult.data : []),
  ].sort((a, b) => a.business_date.localeCompare(b.business_date));

  const restaurantes = restaurantesResult.ok ? restaurantesResult.data : [];
  const restaurantsById = Object.fromEntries(restaurantes.map((r) => [r.id, r]));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Cola de validación</h1>
      <CortesTable cortes={cortes} restaurantsById={restaurantsById} showRestaurant linkBase="/validacion" />
    </div>
  );
}
