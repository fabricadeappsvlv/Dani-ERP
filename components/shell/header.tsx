import type { CurrentUser } from '@/lib/auth/session';
import { UserMenu } from './user-menu';

export function Header({ user }: { user: CurrentUser }) {
  return (
    <header className="flex h-14 items-center justify-end border-b px-6">
      <UserMenu fullName={user.fullName} role={user.role} />
    </header>
  );
}
