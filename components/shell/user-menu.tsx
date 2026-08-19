'use client';

import { signOut } from '@/app/(dashboard)/actions';
import { Button } from '@/components/ui/button';

export function UserMenu({ fullName, role }: { fullName: string; role: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right text-sm">
        <div className="font-medium">{fullName}</div>
        <div className="text-muted-foreground">{role}</div>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="outline" size="sm">
          Cerrar sesión
        </Button>
      </form>
    </div>
  );
}
