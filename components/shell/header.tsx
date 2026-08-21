import type { CurrentUser } from '@/lib/auth/session';
import { ETIQUETA_ROL } from './nav-items';
import { ModoVista } from './modo-vista';
import { LogoutButton } from './logout-button';

/* Topbar: quién eres, en qué modo ves, y salir. */
export function Header({ user }: { user: CurrentUser }) {
  const primerNombre = user.fullName.split(' ')[0] || user.email;

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur"
      style={{
        background: 'color-mix(in srgb, var(--cc-bg) 88%, transparent)',
        borderColor: 'var(--cc-line)',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-4 py-3 lg:px-6">
        <div>
          <div className="text-[17px] font-semibold leading-tight tracking-tight">
            Hola, {primerNombre}
          </div>
          <div className="text-[12px]" style={{ color: 'var(--cc-ink-3)' }}>
            {ETIQUETA_ROL[user.role]}
          </div>
        </div>

        <div className="flex-1" />
        <ModoVista />
        <LogoutButton />
      </div>
    </header>
  );
}
