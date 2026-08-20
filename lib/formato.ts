/* ══════════════════════════════════════════════════════════════════════
   FORMATO
   Todo el dinero viaja en CENTAVOS y solo se convierte a pesos al
   pintarlo. Nunca se hacen cuentas con decimales flotantes.
   ══════════════════════════════════════════════════════════════════════ */

const MXN = new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
});
const ENTERO = new Intl.NumberFormat('es-MX');

/** Centavos → "$12,345" */
export const pesos = (centavos: number) => MXN.format(Math.round(centavos / 100));

/** Centavos → "$12,345.67" (para capturas donde importan los centavos) */
export const pesosExactos = (centavos: number) =>
  new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN' }).format(centavos / 100);

export const entero = (n: number) => ENTERO.format(Math.round(n));

/** "1234.56" escrito por una persona → 123456 centavos */
export const aCentavos = (texto: string) => {
  const limpio = texto.replace(/[^0-9.]/g, '');
  const n = parseFloat(limpio);
  return isNaN(n) ? 0 : Math.round(n * 100);
};

export const fechaLarga = (iso: string) => {
  const t = new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export const fechaCorta = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

export const TEXTO_ESTADO: Record<string, string> = {
  sano: 'Va bien', alarma: 'Hay que vigilar', critico: 'Atender hoy', off: 'Sin datos',
};

export const TEXTO_CORTE: Record<string, string> = {
  preliminar: 'Por validar', en_proceso: 'En revisión',
  validado: 'Validado', cancelado: 'Cancelado',
};

export const COLOR_CORTE: Record<string, string> = {
  preliminar: 'alarma', en_proceso: 'alarma', validado: 'sano', cancelado: 'off',
};

export const TEXTO_TURNO: Record<string, string> = {
  matutino: 'Turno matutino', vespertino: 'Turno vespertino',
};
