'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Icono from '@/components/centro/Icono';

/* Cierra sesión contra Supabase desde el cliente y refresca para que el
   layout del dashboard redirija a /login.

   NOTA: si ya existe una server action de logout en app/(dashboard)/actions.ts,
   se puede cambiar este botón para usarla. Se hizo así para no depender de
   una firma que puede cambiar. */
export function LogoutButton() {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  const salir = async () => {
    setSaliendo(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <button
      onClick={salir}
      disabled={saliendo}
      className="grid h-9 w-9 place-items-center rounded-md transition-colors hover:bg-[var(--cc-card-2)] disabled:opacity-50"
      style={{ color: 'var(--cc-ink-2)' }}
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
    >
      <Icono d='<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>' n={18} />
    </button>
  );
}
