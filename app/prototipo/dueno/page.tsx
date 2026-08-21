'use client';

import { useRouter } from 'next/navigation';
import { LISTA_ROLES, type Rol } from '@/lib/roles';

/* ══════════════════════════════════════════════════════════════════════
   DUEÑO — dashboard completo
   Monta public/dueno.html tal cual, sin modificar un byte. Ese archivo
   trae su propia navegación (Inicio, Cortes, Sucursales, Alertas,
   Reportes), su modo día/noche, el mapa, el drill-down y el gauge, así
   que NO se envuelve en el Shell de Next: se duplicaría el menú.

   ── POR QUÉ ASÍ Y NO PORTADO A COMPONENTES ──
   El archivo lleva siete iteraciones aprobadas. Portarlo pieza por
   pieza arriesga perder detalles que ya funcionan. Montarlo íntegro
   garantiza que lo que ves es exactamente lo que aprobaste.

   ── CUÁNDO CAMBIA ──
   Al conectar Supabase: el bloque DATA de dueno.html deja de generar
   datos y pasa a recibirlos. Dos caminos posibles entonces:
     a) Mantener el archivo y pasarle datos por postMessage.
     b) Portar bloque por bloque a React, usando los marcadores
        ▼▼ BLOQUE: nombre ▼▼ que ya trae el archivo.
   Decisión pendiente. Hasta entonces, esto es lo íntegro.
   ══════════════════════════════════════════════════════════════════════ */

export default function Dueno() {
  const router = useRouter();

  const cambiarRol = (rol: Rol, inicio: string) => {
    localStorage.setItem('rol', rol);
    router.push(inicio);
  };

  return (
    <>
      <iframe
        src="/dueno.html"
        title="Centro de Control · Dueño"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100dvh',
          border: 0,
          display: 'block',
        }}
      />

      {/* Selector de rol. SOLO DESARROLLO: se retira al conectar el login. */}
      <div style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top) + 10px)',
        right: 10,
        zIndex: 999,
        display: 'flex',
        gap: 5,
        padding: 5,
        borderRadius: 100,
        background: 'rgba(12,17,25,.9)',
        border: '1px solid rgba(123,131,190,.32)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 24px rgba(0,0,0,.45)',
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      }}>
        {LISTA_ROLES.map(r => (
          <button
            key={r.id}
            onClick={() => cambiarRol(r.id, r.inicio)}
            style={{
              padding: '6px 11px',
              borderRadius: 100,
              border: 0,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              background: r.id === 'dueno' ? 'rgba(123,131,190,.18)' : 'transparent',
              color: r.id === 'dueno' ? '#9AA2DC' : '#7C8AA5',
            }}
          >
            {r.nombre.split(' ')[0]}
          </button>
        ))}
      </div>
    </>
  );
}
