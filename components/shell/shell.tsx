import type { CurrentUser } from '@/lib/auth/session';
import { Sidebar, BottomNav } from './sidebar';
import { Header } from './header';

/* ══════════════════════════════════════════════════════════════════════
   SHELL
   La credencial determina la aplicación, no un menú con permisos.
   Sidebar en escritorio · barra inferior en móvil · mismo contenido.
   ══════════════════════════════════════════════════════════════════════ */
export function Shell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={user} />
        <main className="cc-main mx-auto w-full max-w-[1320px] flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
      <BottomNav role={user.role} />
    </div>
  );
}
