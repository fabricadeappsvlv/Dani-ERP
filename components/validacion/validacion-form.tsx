'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { validarCorte, type ValidacionFormState } from '@/app/(dashboard)/validacion/actions';
import { formatCentavos } from '@/lib/format/money';

const initialState: ValidacionFormState = {};

export function ValidacionForm({
  corteId,
  montoEfectivoReportado,
  montoTarjetaReportado,
}: {
  corteId: string;
  montoEfectivoReportado: number;
  montoTarjetaReportado: number;
}) {
  const action = validarCorte.bind(null, corteId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [efectivo, setEfectivo] = useState(String(montoEfectivoReportado / 100));
  const [tarjeta, setTarjeta] = useState(String(montoTarjetaReportado / 100));

  const diferenciaCentavos =
    Math.round(Number(efectivo || 0) * 100) +
    Math.round(Number(tarjeta || 0) * 100) -
    (montoEfectivoReportado + montoTarjetaReportado);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="montoEfectivoValidado">Efectivo validado (MXN)</Label>
        <Input
          id="montoEfectivoValidado"
          name="montoEfectivoValidado"
          type="number"
          step="0.01"
          min="0"
          value={efectivo}
          onChange={(e) => setEfectivo(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="montoTarjetaValidado">Tarjeta validada (MXN)</Label>
        <Input
          id="montoTarjetaValidado"
          name="montoTarjetaValidado"
          type="number"
          step="0.01"
          min="0"
          value={tarjeta}
          onChange={(e) => setTarjeta(e.target.value)}
          required
        />
      </div>
      <p className="text-sm text-muted-foreground">Diferencia: {formatCentavos(diferenciaCentavos)}</p>
      <div className="space-y-2">
        <Label htmlFor="comentario">
          Comentario {diferenciaCentavos !== 0 && '(obligatorio por la diferencia)'}
        </Label>
        <Textarea id="comentario" name="comentario" required={diferenciaCentavos !== 0} />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Validando...' : 'Validar'}
      </Button>
    </form>
  );
}
