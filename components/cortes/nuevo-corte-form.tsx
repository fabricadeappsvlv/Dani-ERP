'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { crearCorte, type CorteFormState } from '@/app/(dashboard)/cortes/actions';
import type { Restaurant } from '@/lib/api/types';

const initialState: CorteFormState = {};

export function NuevoCorteForm({ restaurantes }: { restaurantes: Restaurant[] }) {
  const [state, formAction, pending] = useActionState(crearCorte, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="restaurantId">Restaurante</Label>
        <NativeSelect id="restaurantId" name="restaurantId" required defaultValue="">
          <NativeSelectOption value="" disabled>
            Selecciona un restaurante
          </NativeSelectOption>
          {restaurantes.map((r) => (
            <NativeSelectOption key={r.id} value={r.id}>
              {r.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="businessDate">Fecha</Label>
        <Input id="businessDate" name="businessDate" type="date" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="turno">Turno</Label>
        <NativeSelect id="turno" name="turno" required defaultValue="">
          <NativeSelectOption value="" disabled>
            Selecciona un turno
          </NativeSelectOption>
          <NativeSelectOption value="matutino">Matutino</NativeSelectOption>
          <NativeSelectOption value="vespertino">Vespertino</NativeSelectOption>
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="montoEfectivo">Monto efectivo (MXN)</Label>
        <Input id="montoEfectivo" name="montoEfectivo" type="number" step="0.01" min="0" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="montoTarjeta">Monto tarjeta (MXN)</Label>
        <Input id="montoTarjeta" name="montoTarjeta" type="number" step="0.01" min="0" required />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Creando...' : 'Crear corte'}
      </Button>
    </form>
  );
}
