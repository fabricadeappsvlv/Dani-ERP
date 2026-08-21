'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@/lib/api/auth';
import Icono from '@/components/centro/Icono';
import { navItemsForRole, ETIQUETA_ROL } from './nav-items';

/* Sidebar de escritorio. En móvil se oculta: ahí navega la barra inferior. */
export function Sidebar({ role }: { role: Role }) {
  const ruta = usePathname();
  const items = navItemsForRole(role);
  const activo = (href: string) =>
    href === '/' ? ruta === '/' : ruta.startsWith(href);

  return (
    <aside
      className="hidden w-[248px] shrink-0 flex-col border-r lg:flex"
      style={{ background: 'var(--cc-sidebar)', borderColor: 'var(--cc-line)' }}
    >
      <div className="border-b p-[18px]" style={{ borderColor: 'var(--cc-line)' }}>
        <div className="text-[15.5px] font-semibold tracking-tight">Centro de Control</div>
        <div className="cc-lbl mt-3">{ETIQUETA_ROL[role]}</div>
      </div>

      <nav className="flex-1 overflow-y-auto py-[10px]">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="cc-side-item"
            data-activo={activo(item.href)}
          >
            <Icono d={item.icon} n={17} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

/* Barra inferior de móvil. Mismos destinos, mismo orden. */
export function BottomNav({ role }: { role: Role }) {
  const ruta = usePathname();
  const items = navItemsForRole(role).slice(0, 5);
  const activo = (href: string) =>
    href === '/' ? ruta === '/' : ruta.startsWith(href);

  return (
    <nav className="cc-bnav" aria-label="Secciones">
      {items.map((item) => (
        <Link key={item.href} href={item.href} data-activo={activo(item.href)}>
          <Icono d={item.icon} n={19} />
          <span className="text-[9px] font-semibold">{item.short}</span>
        </Link>
      ))}
    </nav>
  );
}
