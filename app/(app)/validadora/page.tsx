'use client';

import { useState } from 'react';
import Shell from '@/components/Shell';
import Mono from '@/components/Mono';
import Icono from '@/components/Icono';
import Estado from '@/components/Estado';
import { getCortes, nombreRestaurante, HOY, type EstadoCorte } from '@/lib/mock';
import { pesos, fechaLarga, TEXTO_CORTE, COLOR_CORTE, TEXTO_TURNO } from '@/lib/formato';

/* ══════════════════════════════════════════════════════════════════════
   VALIDADORA — bandeja de cortes por revisar.
   La pantalla más densa: aquí se compara lo reportado contra lo contado.
   ══════════════════════════════════════════════════════════════════════ */

const FILTROS: { id: string; n: string }[] = [
  { id:'pendientes', n:'Por validar' },
  { id:'validado',   n:'Ya validados' },
  { id:'todos',      n:'Todos' },
];

export default function Validadora() {
  const [filtro, setFiltro] = useState('pendientes');
  const cortes = getCortes();

  const lista = cortes.filter(c =>
    filtro === 'todos' ? true :
    filtro === 'validado' ? c.estado === 'validado' :
    c.estado !== 'validado' && c.estado !== 'cancelado');

  const pendientes = cortes.filter(c => c.estado !== 'validado' && c.estado !== 'cancelado').length;
  const conDiferencia = cortes.filter(c => (c.diferencia ?? 0) !== 0).length;

  return (
    <Shell titulo="Cortes por validar"
      subtitulo={`${fechaLarga(HOY)} · ${pendientes} pendientes`}>
      <div className="grid">

        <div className="kpis" style={{ gridTemplateColumns:'repeat(2,1fr)' }}>
          <article className="kpi" style={{ ['--kc' as string]:'var(--alarma)' }}>
            <div className="lbl">Por revisar</div>
            <div className="kpi-c">{pendientes}</div>
            <div className="kpi-d">de {cortes.length} cortes del día</div>
          </article>
          <article className="kpi" style={{ ['--kc' as string]:'var(--critico)' }}>
            <div className="lbl">Con diferencia</div>
            <div className="kpi-c">{conDiferencia}</div>
            <div className="kpi-d">necesitan comentario</div>
          </article>
        </div>

        <article className="card">
          <div style={{
            display:'flex', gap:7, padding:'12px 16px',
            borderBottom:'1px solid var(--line)', overflowX:'auto',
          }}>
            {FILTROS.map(f => (
              <button key={f.id} onClick={() => setFiltro(f.id)}
                style={{
                  padding:'8px 14px', borderRadius:100, flex:'none', minHeight:36,
                  border:`1px solid ${filtro === f.id ? 'var(--acento)' : 'var(--line)'}`,
                  background: filtro === f.id ? 'var(--acento-dim)' : 'var(--card-2)',
                  color: filtro === f.id ? 'var(--acento)' : 'var(--ink-3)',
                  fontSize:12, fontWeight:600,
                }}>{f.n}</button>
            ))}
          </div>

          {lista.length === 0 ? (
            <div className="vacio">
              <span style={{ color:'var(--sano)' }}>
                <Icono d='<path d="M20 6L9 17l-5-5"/>' n={28} />
              </span>
              <div className="vacio-t">Todo al día</div>
              <div className="vacio-d">No hay cortes esperando en esta lista.</div>
            </div>
          ) : lista.map(c => {
            const total = c.monto_efectivo_reportado + c.monto_tarjeta_reportado;
            const dif = c.diferencia ?? 0;
            return (
              <div className="fila" key={c.id} style={{ alignItems:'flex-start' }}>
                <Mono id={c.restaurant_id} n={30} />
                <div>
                  <div className="fila-n">{nombreRestaurante(c.restaurant_id)}</div>
                  <div className="fila-s">{TEXTO_TURNO[c.turno]} · {c.created_by_nombre}</div>
                  <div style={{ display:'flex', gap:14, marginTop:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11.5, color:'var(--ink-3)' }}>
                      Efectivo <span className="num" style={{ color:'var(--ink)', fontWeight:600 }}>
                        {pesos(c.monto_efectivo_reportado)}</span>
                    </span>
                    <span style={{ fontSize:11.5, color:'var(--ink-3)' }}>
                      Tarjeta <span className="num" style={{ color:'var(--ink)', fontWeight:600 }}>
                        {pesos(c.monto_tarjeta_reportado)}</span>
                    </span>
                  </div>
                  {dif !== 0 && (
                    <div style={{
                      marginTop:9, padding:'8px 10px', borderRadius:7,
                      background:'var(--critico-dim)', border:'1px solid rgba(255,68,56,.28)',
                      fontSize:11.5, color:'var(--critico)', display:'flex', gap:7,
                    }}>
                      <Icono d='<path d="M12 4L2.5 20h19z"/><path d="M12 10v4M12 17.4v.1"/>' n={13} />
                      <span>
                        Faltaron <span className="num">{pesos(Math.abs(dif))}</span>
                        {c.comentario_validacion && ` · ${c.comentario_validacion}`}
                      </span>
                    </div>
                  )}
                  <div style={{ marginTop:10 }}>
                    <Estado e={COLOR_CORTE[c.estado]} texto={TEXTO_CORTE[c.estado]} />
                  </div>
                </div>
                <div>
                  <div className="fila-v">{pesos(total)}</div>
                  {c.estado !== 'validado' && (
                    <button className="btn" style={{ marginTop:10, padding:'9px 14px', minHeight:38, fontSize:12 }}>
                      Revisar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </article>

        <aside className="banner">
          <Icono d='<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.1"/>' n={15} />
          <div>
            <div className="banner-t">Falta el contraste con el punto de venta</div>
            <div className="banner-d">
              Cuando se conecte Soft Restaurant, aquí aparecerá al lado lo que
              registró el sistema ese día, para comparar contra lo que reportó el encargado.
            </div>
          </div>
        </aside>

      </div>
    </Shell>
  );
}
