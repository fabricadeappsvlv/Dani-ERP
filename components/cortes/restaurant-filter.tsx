'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Restaurant } from '@/lib/api/types';

export function RestaurantFilter({ restaurantes }: { restaurantes: Restaurant[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('restaurantId') ?? 'todos';

  return (
    <Select
      value={current}
      onValueChange={(value) => {
        const params = new URLSearchParams(searchParams);
        if (value === 'todos') params.delete('restaurantId');
        else params.set('restaurantId', value);
        router.push(`/cortes?${params.toString()}`);
      }}
    >
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Todos los restaurantes" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">Todos los restaurantes</SelectItem>
        {restaurantes.map((r) => (
          <SelectItem key={r.id} value={r.id}>
            {r.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
