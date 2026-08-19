'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { editarCorte, type CorteFormState } from '@/app/(dashboard)/cortes/actions';
import type { Corte } from '@/lib/api/types';

const initialState: CorteFormState = {};

export function EditarCorteForm({ corte }: { corte: Corte }) {
  const action = editarCorte.bind(null, corte.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="montoEfectivo">Monto efectivo (MXN)</Label>
        <Input
          id="montoEfectivo"
          name="montoEfectivo"
          type="number"
          step="0.01"
          min="0"
          defaultValue={(corte.monto_efectivo_reportado / 100).toFixed(2)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="montoTarjeta">Monto tarjeta (MXN)</Label>
        <Input
          id="montoTarjeta"
          name="montoTarjeta"
          type="number"
          step="0.01"
          min="0"
          defaultValue={(corte.monto_tarjeta_reportado / 100).toFixed(2)}
          required
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </form>
  );
}
