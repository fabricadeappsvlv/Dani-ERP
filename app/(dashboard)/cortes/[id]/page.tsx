import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api/fetch';
import { getCurrentUser } from '@/lib/auth/session';
import { EstadoBadge } from '@/components/cortes/estado-badge';
import { EditarCorteForm } from '@/components/cortes/editar-corte-form';
import { EnviarCorteButton } from '@/components/cortes/enviar-corte-button';
import { formatCentavos } from '@/lib/format/money';
import type { Corte, Restaurant } from '@/lib/api/types';

export default async function CorteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const corteResult = await apiFetch<Corte>(`/api/cortes/${id}`);

  if (!corteResult.ok) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Corte no encontrado</h1>
        <p className="text-sm text-muted-foreground">{corteResult.error.message}</p>
      </div>
    );
  }

  const corte = corteResult.data;
  const restaurantesResult = await apiFetch<Restaurant[]>('/api/restaurantes?perPage=100');
  const restaurante = restaurantesResult.ok
    ? restaurantesResult.data.find((r) => r.id === corte.restaurant_id)
    : undefined;

  const puedeEditar =
    user.role === 'responsable_restaurante' &&
    corte.created_by === user.id &&
    corte.estado === 'preliminar';

  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Corte — {restaurante?.name ?? corte.restaurant_id}</h1>
        <EstadoBadge estado={corte.estado} />
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-muted-foreground">Fecha</dt>
        <dd>{corte.business_date}</dd>
        <dt className="text-muted-foreground">Turno</dt>
        <dd>{corte.turno === 'matutino' ? 'Matutino' : 'Vespertino'}</dd>
        <dt className="text-muted-foreground">Efectivo reportado</dt>
        <dd>{formatCentavos(corte.monto_efectivo_reportado, corte.currency)}</dd>
        <dt className="text-muted-foreground">Tarjeta reportada</dt>
        <dd>{formatCentavos(corte.monto_tarjeta_reportado, corte.currency)}</dd>
        {corte.estado === 'validado' && (
          <>
            <dt className="text-muted-foreground">Efectivo validado</dt>
            <dd>{formatCentavos(corte.monto_efectivo_validado ?? 0, corte.currency)}</dd>
            <dt className="text-muted-foreground">Tarjeta validada</dt>
            <dd>{formatCentavos(corte.monto_tarjeta_validado ?? 0, corte.currency)}</dd>
            <dt className="text-muted-foreground">Diferencia</dt>
            <dd>{formatCentavos(corte.diferencia ?? 0, corte.currency)}</dd>
            {corte.comentario_validacion && (
              <>
                <dt className="text-muted-foreground">Comentario</dt>
                <dd>{corte.comentario_validacion}</dd>
              </>
            )}
          </>
        )}
        {corte.estado === 'cancelado' && corte.cancelacion_motivo && (
          <>
            <dt className="text-muted-foreground">Motivo de cancelación</dt>
            <dd>{corte.cancelacion_motivo}</dd>
          </>
        )}
      </dl>

      {puedeEditar && (
        <div className="space-y-4 border-t pt-4">
          <EditarCorteForm corte={corte} />
          <EnviarCorteButton corteId={corte.id} />
        </div>
      )}
    </div>
  );
}
