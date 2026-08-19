import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api/fetch';
import { getCurrentUser } from '@/lib/auth/session';
import { formatCentavos } from '@/lib/format/money';
import { ValidacionForm } from '@/components/validacion/validacion-form';
import { CancelarCorteDialog } from '@/components/validacion/cancelar-corte-dialog';
import type { Corte, Restaurant } from '@/lib/api/types';

export default async function ValidacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'validador_cortes') redirect('/');

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

  const puedeValidar = corte.estado === 'preliminar' || corte.estado === 'en_proceso';

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold">Validar corte — {restaurante?.name ?? corte.restaurant_id}</h1>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-muted-foreground">Fecha</dt>
        <dd>{corte.business_date}</dd>
        <dt className="text-muted-foreground">Turno</dt>
        <dd>{corte.turno === 'matutino' ? 'Matutino' : 'Vespertino'}</dd>
        <dt className="text-muted-foreground">Efectivo reportado</dt>
        <dd>{formatCentavos(corte.monto_efectivo_reportado, corte.currency)}</dd>
        <dt className="text-muted-foreground">Tarjeta reportada</dt>
        <dd>{formatCentavos(corte.monto_tarjeta_reportado, corte.currency)}</dd>
      </dl>

      {puedeValidar ? (
        <div className="space-y-6 border-t pt-4">
          <ValidacionForm
            corteId={corte.id}
            montoEfectivoReportado={corte.monto_efectivo_reportado}
            montoTarjetaReportado={corte.monto_tarjeta_reportado}
          />
          <CancelarCorteDialog corteId={corte.id} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Este corte ya no está disponible para validación.</p>
      )}
    </div>
  );
}
