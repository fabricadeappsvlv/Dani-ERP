'use client';

import { useRouter } from 'next/navigation';
import { LISTA_ROLES, type Rol } from '@/lib/roles';
import Icono from '@/components/Icono';

/* ══════════════════════════════════════════════════════════════════════
   ENTRADA
   Hoy: se elige el rol a mano para poder ver las cuatro aplicaciones.
   Mañana: aquí va el login de Supabase y el rol se lee del usuario;
   esta pantalla se reemplaza por el formulario de correo y contraseña.
   ══════════════════════════════════════════════════════════════════════ */

export default function Entrada() {
  const router = useRouter();

  const entrar = (rol: Rol, inicio: string) => {
    localStorage.setItem('rol', rol);
    router.push(inicio);
  };

  return (
    <main style={{
      minHeight:'100dvh', display:'grid', placeItems:'center',
      padding:'32px 20px',
    }}>
      <div style={{ width:'100%', maxWidth:440 }}>
        <div style={{ textAlign:'center', marginBottom:34 }}>
          <div className="lbl">Grupo de restaurantes</div>
          <h1 style={{ fontSize:30, fontWeight:600, letterSpacing:'-.03em', marginTop:8 }}>
            Centro de Control
          </h1>
          <p style={{ fontSize:13.5, color:'var(--ink-2)', marginTop:10, lineHeight:1.55 }}>
            Cada persona entra con su cuenta y ve solo lo que le toca.
          </p>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {LISTA_ROLES.map(r => (
            <button key={r.id} onClick={() => entrar(r.id, r.inicio)}
              style={{
                display:'flex', alignItems:'center', gap:14, padding:'16px 16px',
                background:'var(--card)', border:'1px solid var(--line)',
                borderRadius:'var(--r)', textAlign:'left', minHeight:70,
              }}>
              <span className="avatar" style={{ width:42, height:42, fontSize:15 }}>
                {r.nombre.charAt(0)}
              </span>
              <span style={{ flex:1 }}>
                <span style={{ display:'block', fontSize:14.5, fontWeight:600 }}>{r.nombre}</span>
                <span style={{ display:'block', fontSize:11.5, color:'var(--ink-3)', marginTop:3, lineHeight:1.45 }}>
                  {r.descripcion}
                </span>
              </span>
              <span style={{ color:'var(--ink-3)' }}>
                <Icono d='<path d="M9 5l7 7-7 7"/>' n={16} />
              </span>
            </button>
          ))}
        </div>

        <div className="banner" style={{ marginTop:22, gridColumn:'auto' }}>
          <Icono d='<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.1"/>' n={15} />
          <div>
            <div className="banner-t">Versión de prueba</div>
            <div className="banner-d">
              Los números son de ejemplo y todavía no hay contraseñas. Cuando se
              conecte la base de datos, cada quien entrará con su propia cuenta.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
