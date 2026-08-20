import { redirect } from 'next/navigation';
import { Toaster } from '@/components/ui/sonner';
import { getCurrentUser } from '@/lib/auth/session';
import { Shell } from '@/components/shell/shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <Shell user={user}>
      {children}
      <Toaster />
    </Shell>
  );
}
