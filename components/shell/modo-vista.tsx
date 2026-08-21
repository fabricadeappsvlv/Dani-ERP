'use client';

import { useEffect, useState } from 'react';
import Icono from '@/components/centro/Icono';

/* ══════════════════════════════════════════════════════════════════════
   MODO DE VISTA
   Día para el sol, Normal para uso diario, Noche sin brillos.
   Se guarda en localStorage; se aplica antes de pintar para evitar
   el parpadeo al recargar (ver el script en app/layout.tsx).
   ══════════════════════════════════════════════════════════════════════ */

const MODOS = [
  { id: 'dia',    n: 'Día',    icono: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>' },
  { id: 'oscuro', n: 'Normal', icono: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none"/>' },
  { id: 'noche',  n: 'Noche',  icono: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"/>' },
] as const;

export function ModoVista() {
  const [modo, setModo] = useState<string>('oscuro');

  useEffect(() => {
    setModo(document.documentElement.dataset.modo ?? 'oscuro');
  }, []);

  const rotar = () => {
    const i = MODOS.findIndex((m) => m.id === modo);
    const sig = MODOS[(i + 1) % MODOS.length].id;
    setModo(sig);
    document.documentElement.dataset.modo = sig;
    try { localStorage.setItem('cc-modo', sig); } catch {}
  };

  const actual = MODOS.find((m) => m.id === modo) ?? MODOS[1];

  return (
    <button
      onClick={rotar}
      className="grid h-9 w-9 place-items-center rounded-md transition-colors hover:bg-[var(--cc-card-2)]"
      style={{ color: 'var(--cc-ink-2)' }}
      aria-label={`Vista: ${actual.n}. Toca para cambiar`}
      title={`Vista: ${actual.n}`}
    >
      <Icono d={actual.icono} n={18} />
    </button>
  );
}
