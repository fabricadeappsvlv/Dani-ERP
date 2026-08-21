'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { enviarCorte, type CorteFormState } from '@/app/(dashboard)/cortes/actions';

const initialState: CorteFormState = {};

export function EnviarCorteButton({ corteId }: { corteId: string }) {
  const action = enviarCorte.bind(null, corteId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-2">
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Enviando...' : 'Enviar a validación'}
      </Button>
    </form>
  );
}
