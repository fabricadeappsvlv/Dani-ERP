import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Restaurant } from '@/lib/api/types';

export function RestaurantesTable({ restaurantes }: { restaurantes: Restaurant[] }) {
  if (restaurantes.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay restaurantes activos.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Dirección</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {restaurantes.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.name}</TableCell>
            <TableCell>{r.address ?? '—'}</TableCell>
            <TableCell>
              <Badge variant={r.status === 'active' ? 'outline' : 'secondary'}>
                {r.status === 'active' ? 'Activo' : 'Inactivo'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
