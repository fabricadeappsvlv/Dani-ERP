export function pesosToCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

export function formatCentavos(centavos: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(centavos / 100);
}
