export type EstadoCorte = 'preliminar' | 'en_proceso' | 'validado' | 'cancelado';
export type Turno = 'matutino' | 'vespertino';

export type Corte = {
  id: string;
  restaurant_id: string;
  business_date: string;
  turno: Turno;
  monto_efectivo_reportado: number;
  monto_tarjeta_reportado: number;
  currency: string;
  estado: EstadoCorte;
  monto_efectivo_validado: number | null;
  monto_tarjeta_validado: number | null;
  diferencia: number | null;
  comentario_validacion: string | null;
  cancelacion_motivo: string | null;
  created_by: string;
  validated_by: string | null;
  validated_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Restaurant = {
  id: string;
  name: string;
  address: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};
