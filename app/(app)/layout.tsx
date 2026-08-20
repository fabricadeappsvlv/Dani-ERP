/* Agrupador de rutas. El shell lo monta cada pantalla porque el título
   y el subtítulo cambian en cada una. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
