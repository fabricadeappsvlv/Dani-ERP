'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ROLES, LISTA_ROLES, ROL_POR_DEFECTO, type Rol } from '@/lib/roles';
import Icono from './Icono';

/* ══════════════════════════════════════════════════════════════════════
   SHELL
   La navegación se arma desde ROLES: la credencial determina qué ve el
   usuario. Cambiar de rol cambia la aplicación completa, no un permiso.

   Sidebar en escritorio · barra inferior en móvil · mismo contenido.
   ══════════════════════════════════════════════════════════════════════ */

const MODOS = [
  { id:'dia',    n:'Día'    },
  { id:'oscuro', n:'Normal' },
  { id:'noche',  n:'Noche'  },
];

/* Pequeno almacen sobre localStorage para poder leerlo con
   useSyncExternalStore: getSnapshot en el cliente, valor por defecto en el
   servidor, y notificacion a los suscriptores al escribir. */
function crearAlmacen(clave: string, porDefecto: string) {
  const oyentes = new Set<() => void>();
  return {
    suscribir(cb: () => void) {
      oyentes.add(cb);
      window.addEventListener('storage', cb);
      return () => { oyentes.delete(cb); window.removeEventListener('storage', cb); };
    },
    leer: () => localStorage.getItem(clave) ?? porDefecto,
    leerEnServidor: () => porDefecto,
    escribir(valor: string) {
      localStorage.setItem(clave, valor);
      oyentes.forEach(cb => cb());
    },
  };
}

const ALMACEN_ROL = crearAlmacen('rol', ROL_POR_DEFECTO);
const ALMACEN_MODO = crearAlmacen('modo', 'oscuro');

export default function Shell({ children, titulo, subtitulo }:
  { children: React.ReactNode; titulo: string; subtitulo?: string }) {

  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();
  const router = useRouter();

  /* El rol y el modo se recuerdan entre recargas mientras no exista el login
     real. localStorage es la fuente de verdad y se lee con
     useSyncExternalStore: hidratar con setState dentro de un useEffect
     dispara renders en cascada (react-hooks/set-state-in-effect). */
  const rolGuardado = useSyncExternalStore(
    ALMACEN_ROL.suscribir, ALMACEN_ROL.leer, ALMACEN_ROL.leerEnServidor);
  const modo = useSyncExternalStore(
    ALMACEN_MODO.suscribir, ALMACEN_MODO.leer, ALMACEN_MODO.leerEnServidor);

  const rol = (ROLES[rolGuardado as Rol] ? rolGuardado : ROL_POR_DEFECTO) as Rol;

  /* Sincroniza el modo con el DOM (sistema externo, no es estado de React). */
  useEffect(() => { document.documentElement.dataset.modo = modo; }, [modo]);

  const cambiarRol = (nuevo: Rol) => {
    ALMACEN_ROL.escribir(nuevo);
    router.push(ROLES[nuevo].inicio);
  };

  const cambiarModo = () => {
    const i = MODOS.findIndex(m => m.id === modo);
    ALMACEN_MODO.escribir(MODOS[(i + 1) % MODOS.length].id);
  };

  const perfil = ROLES[rol];
  const activo = (r: string) => ruta === r || (r !== perfil.inicio && ruta.startsWith(r));

  return (
    <div className="shell">
      <aside className={`sidebar${abierto ? ' open' : ''}`}>
        <div className="brand">
          <div className="brand-n">Centro de Control</div>
          <div className="brand-e">{perfil.nombre}</div>
        </div>

        <nav className="side-nav">
          {perfil.destinos.map(d => (
            <Link key={d.id} href={d.fase2 ? ruta : d.ruta}
              className="side-item" data-activo={activo(d.ruta)}
              onClick={e => { if (d.fase2) e.preventDefault(); else setAbierto(false); }}
              style={d.fase2 ? { color:'var(--ink-3)' } : undefined}>
              <Icono d={d.icono} n={17} />
              <span>{d.nombre}</span>
              {d.fase2 && <span className="tag">PRONTO</span>}
            </Link>
          ))}
        </nav>

        <div className="side-user">
          <div className="avatar">{perfil.nombre.charAt(0)}</div>
          <div>
            <div className="su-n">{perfil.nombre}</div>
            <div className="su-r">Sesión de prueba</div>
          </div>
        </div>
      </aside>

      <div className={`scrim${abierto ? ' on' : ''}`} onClick={() => setAbierto(false)} />

      <header className="topbar">
        <div className="tb-in">
          <button className="icon-btn solo-movil" onClick={() => setAbierto(true)} aria-label="Menú">
            <Icono d='<path d="M4 7h16M4 12h16M4 17h16"/>' n={19} />
          </button>
          <div>
            <div className="tb-t">{titulo}</div>
            {subtitulo && <div className="tb-s">{subtitulo}</div>}
          </div>
          <div className="tb-sp" />
          <button className="icon-btn" onClick={cambiarModo} aria-label="Cambiar vista"
            title={`Vista: ${MODOS.find(m => m.id === modo)?.n}`}>
            <Icono d='<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>' n={18} />
          </button>
        </div>
      </header>

      <main className="wrap">{children}</main>

      <nav className="bnav">
        {perfil.destinos.slice(0, 5).map(d => (
          <Link key={d.id} href={d.fase2 ? ruta : d.ruta} data-activo={activo(d.ruta)}
            onClick={e => { if (d.fase2) e.preventDefault(); }}>
            <Icono d={d.icono} n={19} />
            <span className="bn-l">{d.corto}</span>
          </Link>
        ))}
      </nav>

      {/* ── Selector de rol: SOLO DESARROLLO ──
          Se elimina en cuanto el login de Supabase esté conectado.
          Sirve para enseñar las cuatro aplicaciones sin credenciales. */}
      <div className="devbar">
        <span className="devbar-t">Ver como</span>
        <div className="devbar-caja">
          {LISTA_ROLES.map(r => (
            <button key={r.id} onClick={() => cambiarRol(r.id)} data-activo={r.id === rol}>
              {r.nombre.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
