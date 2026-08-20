/* Agrupador de rutas del prototipo. El shell lo monta cada pantalla porque
   el título y el subtítulo cambian en cada una.

   Estas cuatro pantallas corren sobre datos de ejemplo (lib/mock.ts) y son
   la referencia de diseño; el flujo real, cableado al API, vive en
   app/(dashboard)/**. Viven bajo /prototipo para no disputarle /egresos
   a la app autenticada. */
import '../centro-control.css';

export default function PrototipoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
