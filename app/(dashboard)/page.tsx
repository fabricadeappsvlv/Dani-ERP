import { redirect } from 'next/navigation';
import type { Role } from '@/lib/api/auth';
import { getCurrentUser } from '@/lib/auth/session';

const LANDING_BY_ROLE: Record<Role, string> = {
  responsable_restaurante: '/cortes',
  validador_cortes: '/validacion',
  dueno: '/restaurantes',
  admin: '/restaurantes',
  egresos: '/egresos',
};

export default async function DashboardRootPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  redirect(LANDING_BY_ROLE[user.role]);
}
