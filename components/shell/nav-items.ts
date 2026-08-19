import type { Role } from '@/lib/api/auth';

export type NavItem = { href: string; label: string };

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  responsable_restaurante: [{ href: '/cortes', label: 'Cortes' }],
  validador_cortes: [{ href: '/validacion', label: 'Validación' }],
  dueno: [
    { href: '/restaurantes', label: 'Restaurantes' },
    { href: '/cortes', label: 'Cortes' },
  ],
  admin: [
    { href: '/restaurantes', label: 'Restaurantes' },
    { href: '/cortes', label: 'Cortes' },
  ],
  egresos: [{ href: '/egresos', label: 'Egresos' }],
};

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_BY_ROLE[role];
}
