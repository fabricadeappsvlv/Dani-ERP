import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCentavos } from '@/lib/format/money';
import { EstadoBadge } from './estado-badge';
import type { Corte, Restaurant } from '@/lib/api/types';

export function CortesTable({
  cortes,
  restaurantsById,
  showRestaurant,
  linkBase = '/cortes',
}: {
  cortes: Corte[];
  restaurantsById: Record<string, Restaurant>;
  showRestaurant: boolean;
  linkBase?: string;
}) {
  if (cortes.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay cortes para mostrar.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Turno</TableHead>
          {showRestaurant && <TableHead>Restaurante</TableHead>}
          <TableHead>Efectivo</TableHead>
          <TableHead>Tarjeta</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cortes.map((corte) => (
          <TableRow key={corte.id}>
            <TableCell>
              <Link href={`${linkBase}/${corte.id}`} className="block">
                {corte.business_date}
              </Link>
            </TableCell>
            <TableCell>{corte.turno === 'matutino' ? 'Matutino' : 'Vespertino'}</TableCell>
            {showRestaurant && <TableCell>{restaurantsById[corte.restaurant_id]?.name ?? '—'}</TableCell>}
            <TableCell>{formatCentavos(corte.monto_efectivo_reportado, corte.currency)}</TableCell>
            <TableCell>{formatCentavos(corte.monto_tarjeta_reportado, corte.currency)}</TableCell>
            <TableCell>
              <EstadoBadge estado={corte.estado} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
