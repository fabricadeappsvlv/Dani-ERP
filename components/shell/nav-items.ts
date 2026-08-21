/* ══════════════════════════════════════════════════════════════════════
   NAVEGACIÓN POR ROL
   Una sola fuente de verdad: de aquí salen el sidebar de escritorio y la
   barra inferior de móvil. Agregar una pantalla es agregar una entrada.

   Los roles vienen de lib/api/auth.ts y se leen del JWT (app_metadata.role).
   ══════════════════════════════════════════════════════════════════════ */

import type { Role } from '@/lib/api/auth';

export type NavItem = {
  href: string;
  label: string;   // etiqueta del sidebar
  short: string;   // etiqueta de la barra inferior (móvil)
  icon: string;    // path de SVG, viewBox 0 0 24 24
};

export const ICONS = {
  casa:   '<path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/>',
  caja:   '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M8 15h3"/>',
  tienda: '<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6"/>',
  check:  '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  salida: '<circle cx="12" cy="12" r="9" opacity=".35"/><path d="M12 7v10M8 13l4 4 4-4"/>',
};

const RESUMEN:      NavItem = { href:'/',             label:'Resumen',        short:'Inicio',   icon:ICONS.casa };
const CORTES:       NavItem = { href:'/cortes',       label:'Cortes de caja', short:'Cortes',   icon:ICONS.caja };
const VALIDACION:   NavItem = { href:'/validacion',   label:'Por validar',    short:'Validar',  icon:ICONS.check };
const EGRESOS:      NavItem = { href:'/egresos',      label:'Pagos',          short:'Pagos',    icon:ICONS.salida };
const RESTAURANTES: NavItem = { href:'/restaurantes', label:'Sucursales',     short:'Sucursal', icon:ICONS.tienda };

/* Cada credencial abre una aplicación distinta, no un menú con permisos. */
const POR_ROL: Record<Role, NavItem[]> = {
  dueno:                   [RESUMEN, RESTAURANTES, CORTES, VALIDACION, EGRESOS],
  admin:                   [RESUMEN, RESTAURANTES, CORTES, VALIDACION, EGRESOS],
  responsable_restaurante: [RESUMEN, CORTES],
  validador_cortes:        [RESUMEN, VALIDACION, CORTES],
  egresos:                 [RESUMEN, EGRESOS],
};

export const ETIQUETA_ROL: Record<Role, string> = {
  dueno: 'Dueño',
  admin: 'Administración',
  responsable_restaurante: 'Responsable de sucursal',
  validador_cortes: 'Validadora',
  egresos: 'Egresos',
};

export function navItemsForRole(role: Role): NavItem[] {
  return POR_ROL[role] ?? [RESUMEN];
}
