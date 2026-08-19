import Link from 'next/link';
import type { Role } from '@/lib/api/auth';
import { navItemsForRole } from './nav-items';

export function Sidebar({ role }: { role: Role }) {
  const items = navItemsForRole(role);

  return (
    <aside className="w-56 shrink-0 border-r bg-muted/30 p-4">
      <div className="mb-6 px-2 text-lg font-semibold">ERP Restaurantes</div>
      <nav className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
