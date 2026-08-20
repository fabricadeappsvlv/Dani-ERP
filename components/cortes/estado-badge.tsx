import { Badge } from '@/components/ui/badge';
import type { EstadoCorte } from '@/lib/api/types';

const LABEL_BY_ESTADO: Record<EstadoCorte, string> = {
  preliminar: 'Preliminar',
  en_proceso: 'En proceso',
  validado: 'Validado',
  cancelado: 'Cancelado',
};

const VARIANT_BY_ESTADO: Record<EstadoCorte, 'secondary' | 'default' | 'outline' | 'destructive'> = {
  preliminar: 'secondary',
  en_proceso: 'default',
  validado: 'outline',
  cancelado: 'destructive',
};

export function EstadoBadge({ estado }: { estado: EstadoCorte }) {
  return <Badge variant={VARIANT_BY_ESTADO[estado]}>{LABEL_BY_ESTADO[estado]}</Badge>;
}
