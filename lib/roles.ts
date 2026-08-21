/* ══════════════════════════════════════════════════════════════════════
   ROLES Y NAVEGACIÓN
   Una sola fuente de verdad: de aquí salen el sidebar, el bottom nav y
   el enrutamiento. Agregar una pantalla es agregar una entrada aquí.

   Los roles corresponden a los actores del PRODUCT_SPEC §1.
   ══════════════════════════════════════════════════════════════════════ */

export type Rol = 'dueno' | 'responsable' | 'validadora' | 'egresos';

export type Destino = {
  id: string;
  ruta: string;
  nombre: string;   // etiqueta del sidebar
  corto: string;    // etiqueta del bottom nav (móvil)
  icono: string;    // path de SVG, viewBox 0 0 24 24
  fase2?: boolean;  // aún no construido
};

export type PerfilRol = {
  id: Rol;
  nombre: string;        // como se le llama a la persona
  descripcion: string;
  inicio: string;        // ruta a la que entra al iniciar sesión
  destinos: Destino[];
};

const ICO = {
  casa:    '<path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/>',
  caja:    '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M8 15h3"/>',
  tienda:  '<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6"/>',
  campana: '<path d="M12 3a6 6 0 0 0-6 6c0 4-2 5-2 5h16s-2-1-2-5a6 6 0 0 0-6-6z"/><path d="M10.5 20a1.9 1.9 0 0 0 3 0"/>',
  hoja:    '<path d="M14 3v5h5"/><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M8 13h8M8 17h5"/>',
  check:   '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  salida:  '<path d="M12 5v14M5 12l7 7 7-7"/><circle cx="12" cy="12" r="9" opacity=".35"/>',
  reloj:   '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};

export const ICONOS = ICO;

/* Cada rol ve una aplicación distinta. Esa es la premisa:
   la credencial determina la interfaz, no un menú de permisos. */
export const ROLES: Record<Rol, PerfilRol> = {
  dueno: {
    id: 'dueno',
    nombre: 'Dueño',
    descripcion: 'Ve el consolidado de todas las sucursales, sin capturar nada',
    inicio: '/prototipo/dueno',
    destinos: [
      { id:'resumen',   ruta:'/prototipo/dueno',             nombre:'Resumen',            corto:'Inicio',   icono:ICO.casa },
      { id:'suc',       ruta:'/prototipo/dueno/sucursales',  nombre:'Sucursales',         corto:'Sucursal', icono:ICO.tienda,  fase2:true },
      { id:'cortes',    ruta:'/prototipo/dueno/cortes',      nombre:'Cortes del día',     corto:'Cortes',   icono:ICO.caja,    fase2:true },
      { id:'alertas',   ruta:'/prototipo/dueno/alertas',     nombre:'Alertas',            corto:'Alertas',  icono:ICO.campana, fase2:true },
      { id:'reportes',  ruta:'/prototipo/dueno/reportes',    nombre:'Reportes',           corto:'Reportes', icono:ICO.hoja,    fase2:true },
    ],
  },
  responsable: {
    id: 'responsable',
    nombre: 'Responsable de sucursal',
    descripcion: 'Captura el corte de caja de su turno. Una sola pantalla.',
    inicio: '/prototipo/responsable',
    destinos: [
      { id:'corte',     ruta:'/prototipo/responsable',           nombre:'Mi corte',        corto:'Corte',    icono:ICO.caja },
      { id:'historial', ruta:'/prototipo/responsable/historial', nombre:'Mis cortes',      corto:'Historial',icono:ICO.reloj, fase2:true },
    ],
  },
  validadora: {
    id: 'validadora',
    nombre: 'Validadora',
    descripcion: 'Revisa y valida los cortes de todas las sucursales',
    inicio: '/prototipo/validadora',
    destinos: [
      { id:'bandeja',   ruta:'/prototipo/validadora',            nombre:'Por validar',     corto:'Bandeja',  icono:ICO.check },
      { id:'validados', ruta:'/prototipo/validadora/validados',  nombre:'Ya validados',    corto:'Listos',   icono:ICO.reloj, fase2:true },
    ],
  },
  egresos: {
    id: 'egresos',
    nombre: 'Egresos',
    descripcion: 'Registra pagos a proveedores y costos operativos',
    inicio: '/prototipo/egresos',
    destinos: [
      { id:'nuevo',     ruta:'/prototipo/egresos',              nombre:'Registrar pago',   corto:'Registrar',icono:ICO.salida },
      { id:'lista',     ruta:'/prototipo/egresos/historial',    nombre:'Pagos del mes',    corto:'Pagos',    icono:ICO.reloj, fase2:true },
      { id:'prov',      ruta:'/prototipo/egresos/proveedores',  nombre:'Proveedores',      corto:'Prov.',    icono:ICO.tienda, fase2:true },
    ],
  },
};

export const LISTA_ROLES = Object.values(ROLES);

/* ──────────────────────────────────────────────────────────────────────
   PENDIENTE CON LUIS
   Hoy el rol se lee de un selector en el navegador (solo desarrollo).
   Cuando confirme dónde vive el rol —profiles, JWT o restaurant_users—
   esta función es lo único que cambia.

   Probable implementación final:

     import { createClient } from '@/lib/supabase/server';
     export async function rolActual(): Promise<Rol | null> {
       const supabase = createClient();
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return null;
       const { data } = await supabase
         .from('profiles').select('rol').eq('id', user.id).single();
       return data?.rol ?? null;
     }
   ────────────────────────────────────────────────────────────────────── */
export const ROL_POR_DEFECTO: Rol = 'dueno';
