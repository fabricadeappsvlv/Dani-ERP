'use client';

import { useState } from 'react';
import Shell from '@/components/Shell';
import Mono from '@/components/Mono';
import Icono from '@/components/Icono';
import { RESTAURANTES, getEgresos, nombreRestaurante, HOY } from '@/lib/mock';
import { pesos, aCentavos, fechaLarga } from '@/lib/formato';

/* ══════════════════════════════════════════════════════════════════════
   EGRESOS — registrar un pago a proveedor o costo operativo.
   ══════════════════════════════════════════════════════════════════════ */

const PROVEEDORES = ['Carnes del Bajío','Abarrotes La Merced','Frutería Michoacán','Distribuidora Vall','Limpieza Integral'];

export default function Egresos() {
  const [tipo, setTipo] = useState<'transferencia'|'efectivo'>('transferencia');
  const [categoria, setCategoria] = useState<'proveedor'|'cliente'|'costo_operativo'>('proveedor');
  const [sucursal, setSucursal] = useState(RESTAURANTES[0].id);
  const [proveedor, setProveedor] = useState(PROVEEDORES[0]);
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');

  const delDia = getEgresos();
  const totalDia = delDia.reduce((a, e) => a + e.monto, 0);
  const listo = aCentavos(monto) > 0 && concepto.trim().length > 0;

  return (
    <Shell titulo="Registrar pago" subtitulo={fechaLarga(HOY)}>
      <div className="grid">

        <article className="card" style={{ gridColumn:'span 12' }}>
          <div className="card-h"><h2 className="card-t">Nuevo pago</h2></div>
          <div className="card-b">

            <div className="campo">
              <label className="lbl">¿Cómo se pagó?</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {([['transferencia','Transferencia'],['efectivo','Efectivo']] as const).map(([id, n]) => (
                  <button key={id} onClick={() => setTipo(id)}
                    style={{
                      padding:'14px 12px', borderRadius:'var(--r-sm)', minHeight:50,
                      border:`1px solid ${tipo === id ? 'var(--acento)' : 'var(--line)'}`,
                      background: tipo === id ? 'var(--acento-dim)' : 'var(--card-2)',
                      color: tipo === id ? 'var(--acento)' : 'var(--ink-2)',
                      fontWeight:600, fontSize:13, textAlign:'center',
                    }}>{n}</button>
                ))}
              </div>
            </div>

            <div className="campo">
              <label className="lbl">¿A qué sucursal se carga?</label>
              <select value={sucursal} onChange={e => setSucursal(e.target.value)}>
                {RESTAURANTES.filter(r => r.activo).map(r => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>

            <div className="campo">
              <label className="lbl">¿De qué es el pago?</label>
              <select value={categoria} onChange={e => setCategoria(e.target.value as typeof categoria)}>
                <option value="proveedor">Proveedor</option>
                <option value="costo_operativo">Costo operativo</option>
                <option value="cliente">Cliente</option>
              </select>
            </div>

            {categoria === 'proveedor' && (
              <div className="campo">
                <label className="lbl">¿A quién?</label>
                <select value={proveedor} onChange={e => setProveedor(e.target.value)}>
                  {PROVEEDORES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}

            <div className="campo">
              <label className="lbl">Monto</label>
              <input className="dinero" inputMode="decimal" placeholder="0.00"
                value={monto} onChange={e => setMonto(e.target.value)} />
            </div>

            <div className="campo">
              <label className="lbl">Concepto</label>
              <input placeholder="Mercancía de la semana"
                value={concepto} onChange={e => setConcepto(e.target.value)} />
              <div className="ayuda">Una línea que explique de qué fue el pago.</div>
            </div>

            <button className="btn full" disabled={!listo}>
              Registrar {monto ? pesos(aCentavos(monto)) : 'pago'}
            </button>
          </div>
        </article>

        <article className="card">
          <div className="card-h">
            <h2 className="card-t">Pagos de hoy</h2>
            <span className="card-x num">{pesos(totalDia)}</span>
          </div>
          {delDia.slice(0, 8).map(e => (
            <div className="fila" key={e.id}>
              <Mono id={e.restaurant_id} n={30} />
              <div>
                <div className="fila-n">{e.proveedor ?? e.concepto}</div>
                <div className="fila-s">
                  {nombreRestaurante(e.restaurant_id)} · {e.tipo === 'transferencia' ? 'Transferencia' : 'Efectivo'}
                </div>
              </div>
              <div className="fila-v">{pesos(e.monto)}</div>
            </div>
          ))}
        </article>

        <aside className="banner">
          <Icono d='<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.1"/>' n={15} />
          <div>
            <div className="banner-t">Todo pago se puede corregir</div>
            <div className="banner-d">
              Si te equivocas, se edita y queda el registro del cambio. Nada se
              borra: se guarda el ajuste con su historial.
            </div>
          </div>
        </aside>

      </div>
    </Shell>
  );
}
