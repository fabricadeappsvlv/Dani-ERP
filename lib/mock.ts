/* ══════════════════════════════════════════════════════════════════════
   DATOS SIMULADOS
   Respetan el esquema real de Supabase (migración 0001):
     · Dinero en CENTAVOS (bigint), nunca decimales flotantes
     · turno: 'matutino' | 'vespertino'
     · estado: 'preliminar' | 'en_proceso' | 'validado' | 'cancelado'
     · egresos.tipo: 'transferencia' | 'efectivo'
     · egresos.categoria: 'proveedor' | 'cliente' | 'costo_operativo'

   ┌────────────────────────────────────────────────────────────────┐
   │ PUNTO DE SWAP A SUPABASE                                       │
   │ Cada función de aquí se reemplaza por una consulta:            │
   │                                                                │
   │   export async function getCortes(fecha: string) {             │
   │     const supabase = createClient();                           │
   │     const { data } = await supabase.from('cortes')             │
   │       .select('*, restaurants(nombre)')                        │
   │       .eq('business_date', fecha);                             │
   │     return data ?? [];                                         │
   │   }                                                            │
   │                                                                │
   │ Las pantallas no cambian: consumen la misma forma de objeto.   │
   └────────────────────────────────────────────────────────────────┘
   ══════════════════════════════════════════════════════════════════════ */

export type EstadoCorte = 'preliminar' | 'en_proceso' | 'validado' | 'cancelado';
export type Turno = 'matutino' | 'vespertino';
export type Semaforo = 'sano' | 'alarma' | 'critico' | 'off';

export type Restaurante = {
  id: string;
  nombre: string;
  zona: string;
  activo: boolean;
  sigla: string;
  color: string;
};

export type Corte = {
  id: string;
  restaurant_id: string;
  business_date: string;
  turno: Turno;
  monto_efectivo_reportado: number;   // centavos
  monto_tarjeta_reportado: number;    // centavos
  estado: EstadoCorte;
  monto_efectivo_validado: number | null;
  monto_tarjeta_validado: number | null;
  diferencia: number | null;
  comentario_validacion: string | null;
  created_by_nombre: string;
};

export type Egreso = {
  id: string;
  restaurant_id: string;
  tipo: 'transferencia' | 'efectivo';
  categoria: 'proveedor' | 'cliente' | 'costo_operativo';
  proveedor: string | null;
  monto: number;                      // centavos
  concepto: string;
  business_date: string;
};

/* ── Catálogo. [SUPUESTO] Nombres del demo del grupo, pendientes de
   confirmar con Dani. ─────────────────────────────────────────────── */
export const RESTAURANTES: Restaurante[] = [
  { id:'r1', nombre:'El Pirata I',   zona:'Centro',       activo:true,  sigla:'P1', color:'#C8912A' },
  { id:'r2', nombre:'El Pirata II',  zona:'Camelinas',    activo:true,  sigla:'P2', color:'#C8912A' },
  { id:'r3', nombre:'El Pirata III', zona:'Altozano',     activo:true,  sigla:'P3', color:'#C8912A' },
  { id:'r4', nombre:'La Santa I',    zona:'Centro',       activo:true,  sigla:'S1', color:'#6E56C8' },
  { id:'r5', nombre:'La Santa II',   zona:'Las Américas', activo:true,  sigla:'S2', color:'#6E56C8' },
  { id:'r6', nombre:'La Brasileña',  zona:'Piloto',       activo:true,  sigla:'B',  color:'#2E9E3C' },
  { id:'r7', nombre:'La Tarasca',    zona:'Junto a Ónix', activo:true,  sigla:'T',  color:'#C2453A' },
  { id:'r8', nombre:'La Santa III',  zona:'La Poza',      activo:false, sigla:'S3', color:'#6E56C8' },
  { id:'r9', nombre:'El Capitán',    zona:'Ex-Chakra',    activo:false, sigla:'C',  color:'#2C7FA8' },
];

export const HOY = '2026-08-18';

/* Generador con semilla fija: los mismos números en cada carga y en cada
   máquina. Sin esto, tú y Luis verían datos distintos. */
function prng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Perfil por sucursal: base de venta diaria en pesos y estado deseado.
   Calibrado para que convivan los tres colores del semáforo. */
const PERFIL: Record<string, { base: number; salud: Semaforo }> = {
  r1: { base: 78400, salud:'sano' },
  r2: { base: 71900, salud:'sano' },
  r3: { base: 69200, salud:'sano' },
  r4: { base: 63100, salud:'sano' },
  r5: { base: 58800, salud:'alarma' },
  r6: { base: 54200, salud:'sano' },
  r7: { base: 50700, salud:'critico' },
};

const aCentavos = (pesos: number) => Math.round(pesos * 100);

export function getCortes(fecha: string = HOY): Corte[] {
  const rnd = prng(20260818);
  const out: Corte[] = [];
  RESTAURANTES.filter(r => r.activo).forEach((r, i) => {
    (['matutino','vespertino'] as Turno[]).forEach((turno, t) => {
      const base = PERFIL[r.id].base * (turno === 'matutino' ? 0.42 : 0.58);
      const bruta = Math.round(base * (0.9 + rnd() * 0.2));
      const efectivo = Math.round(bruta * (0.3 + rnd() * 0.06));
      const tarjeta = bruta - efectivo;

      /* Mezcla de estados para que la bandeja de la validadora tenga qué mostrar. */
      const n = i * 2 + t;
      const estado: EstadoCorte =
        n % 5 === 0 ? 'validado' : n % 7 === 0 ? 'en_proceso' : 'preliminar';

      /* Una diferencia real, para probar el caso que importa. */
      const hayDiferencia = n === 5;
      const efeValidado = estado === 'validado'
        ? efectivo - (hayDiferencia ? 43000 : 0) : null;

      out.push({
        id: `c${r.id}_${turno}`,
        restaurant_id: r.id,
        business_date: fecha,
        turno,
        monto_efectivo_reportado: aCentavos(efectivo),
        monto_tarjeta_reportado: aCentavos(tarjeta),
        estado,
        monto_efectivo_validado: efeValidado === null ? null : aCentavos(efeValidado),
        monto_tarjeta_validado: estado === 'validado' ? aCentavos(tarjeta) : null,
        diferencia: efeValidado === null ? null : aCentavos(efeValidado - efectivo),
        comentario_validacion: hayDiferencia ? 'Faltó efectivo en la entrega del turno' : null,
        created_by_nombre: `Encargado ${r.sigla}`,
      });
    });
  });
  return out;
}

export function getEgresos(fecha: string = HOY): Egreso[] {
  const rnd = prng(778899);
  const proveedores = ['Carnes del Bajío','Abarrotes La Merced','Frutería Michoacán','Distribuidora Vall'];
  const out: Egreso[] = [];
  RESTAURANTES.filter(r => r.activo).forEach((r, i) => {
    const cuantos = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < cuantos; k++) {
      const prov = proveedores[Math.floor(rnd() * proveedores.length)];
      out.push({
        id: `e${r.id}_${k}`,
        restaurant_id: r.id,
        tipo: rnd() > 0.45 ? 'transferencia' : 'efectivo',
        categoria: 'proveedor',
        proveedor: prov,
        monto: aCentavos(Math.round(PERFIL[r.id].base * (0.12 + rnd() * 0.25))),
        concepto: 'Mercancía del día',
        business_date: fecha,
      });
    }
    if (i % 3 === 0) {
      out.push({
        id: `e${r.id}_op`,
        restaurant_id: r.id,
        tipo: 'transferencia',
        categoria: 'costo_operativo',
        proveedor: null,
        monto: aCentavos(Math.round(PERFIL[r.id].base * 0.09)),
        concepto: 'Servicios del local',
        business_date: fecha,
      });
    }
  });
  return out;
}

/* ── Agregación para el Dueño ──────────────────────────────────────── */
export type ResumenSucursal = {
  restaurante: Restaurante;
  ingresoPreliminar: number;   // centavos
  ingresoValidado: number;     // centavos
  egresos: number;             // centavos
  balance: number;             // centavos
  estado: Semaforo;
  cortesPendientes: number;
};

export function getResumen(fecha: string = HOY): ResumenSucursal[] {
  const cortes = getCortes(fecha);
  const egresos = getEgresos(fecha);
  return RESTAURANTES.filter(r => r.activo).map(r => {
    const mios = cortes.filter(c => c.restaurant_id === r.id && c.estado !== 'cancelado');
    const preliminar = mios.reduce((a, c) => a + c.monto_efectivo_reportado + c.monto_tarjeta_reportado, 0);
    const validado = mios
      .filter(c => c.estado === 'validado')
      .reduce((a, c) => a + (c.monto_efectivo_validado ?? 0) + (c.monto_tarjeta_validado ?? 0), 0);
    const salida = egresos.filter(e => e.restaurant_id === r.id).reduce((a, e) => a + e.monto, 0);
    return {
      restaurante: r,
      ingresoPreliminar: preliminar,
      ingresoValidado: validado,
      egresos: salida,
      balance: preliminar - salida,
      estado: PERFIL[r.id].salud,
      cortesPendientes: mios.filter(c => c.estado !== 'validado').length,
    };
  });
}

export function getTotales(fecha: string = HOY) {
  const filas = getResumen(fecha);
  const suma = (f: (r: ResumenSucursal) => number) => filas.reduce((a, r) => a + f(r), 0);
  const preliminar = suma(r => r.ingresoPreliminar);
  const egresos = suma(r => r.egresos);
  return {
    ingresoPreliminar: preliminar,
    ingresoValidado: suma(r => r.ingresoValidado),
    egresos,
    balance: preliminar - egresos,
    pendientes: suma(r => r.cortesPendientes),
    sucursales: filas.length,
  };
}

export const nombreRestaurante = (id: string) =>
  RESTAURANTES.find(r => r.id === id)?.nombre ?? '—';
export const restaurantePorId = (id: string) =>
  RESTAURANTES.find(r => r.id === id);
