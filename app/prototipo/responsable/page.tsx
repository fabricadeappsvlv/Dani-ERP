'use client';

import { useState } from 'react';
import Shell from '@/components/Shell';
import Icono from '@/components/Icono';
import { HOY, RESTAURANTES } from '@/lib/mock';
import { aCentavos, pesos, fechaLarga } from '@/lib/formato';

/* ══════════════════════════════════════════════════════════════════════
   RESPONSABLE — una sola pantalla: capturar el corte del turno.
   Si tarda más de dos minutos, no lo van a hacer.
   ══════════════════════════════════════════════════════════════════════ */

export default function Responsable() {
  /* [SUPUESTO] La sucursal saldrá de restaurant_users cuando exista login. */
  const sucursal = RESTAURANTES[5];

  const [turno, setTurno] = useState<'matutino' | 'vespertino'>('vespertino');
  const [efectivo, setEfectivo] = useState('');
  const [tarjeta, setTarjeta] = useState('');
  const [enviado, setEnviado] = useState(false);

  const total = aCentavos(efectivo) + aCentavos(tarjeta);
  const listo = aCentavos(efectivo) > 0 || aCentavos(tarjeta) > 0;

  if (enviado) {
    return (
      <Shell titulo="Corte enviado" subtitulo={sucursal.nombre}>
        <article className="card">
          <div className="vacio">
            <span style={{ color:'var(--sano)' }}>
              <Icono d='<path d="M20 6L9 17l-5-5"/>' n={30} />
            </span>
            <div className="vacio-t">Listo, ya se envió</div>
            <div className="vacio-d">
              Reportaste {pesos(total)} del turno {turno}.<br />
              Ahora falta que lo revisen y lo validen.
            </div>
            <button className="btn sec" style={{ marginTop:20 }}
              onClick={() => { setEnviado(false); setEfectivo(''); setTarjeta(''); }}>
              Capturar otro turno
            </button>
          </div>
        </article>
      </Shell>
    );
  }

  return (
    <Shell titulo="Corte de caja" subtitulo={`${sucursal.nombre} · ${fechaLarga(HOY)}`}>
      <div className="grid">
        <article className="card">
          <div className="card-h"><h2 className="card-t">¿Qué turno estás cerrando?</h2></div>
          <div className="card-b">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:22 }}>
              {(['matutino','vespertino'] as const).map(t => (
                <button key={t} onClick={() => setTurno(t)}
                  style={{
                    padding:'16px 12px', borderRadius:'var(--r-sm)', minHeight:56,
                    border:`1px solid ${turno === t ? 'var(--acento)' : 'var(--line)'}`,
                    background: turno === t ? 'var(--acento-dim)' : 'var(--card-2)',
                    color: turno === t ? 'var(--acento)' : 'var(--ink-2)',
                    fontWeight:600, fontSize:13.5, textAlign:'center',
                  }}>
                  {t === 'matutino' ? 'Matutino' : 'Vespertino'}
                </button>
              ))}
            </div>

            <div className="campo">
              <label className="lbl">Efectivo que entregas</label>
              <input className="dinero" inputMode="decimal" placeholder="0.00"
                value={efectivo} onChange={e => setEfectivo(e.target.value)} />
              <div className="ayuda">Lo que hay en la caja, contado.</div>
            </div>

            <div className="campo">
              <label className="lbl">Cobrado con tarjeta</label>
              <input className="dinero" inputMode="decimal" placeholder="0.00"
                value={tarjeta} onChange={e => setTarjeta(e.target.value)} />
              <div className="ayuda">Lo que marca la terminal al cierre del turno.</div>
            </div>

            <div style={{
              display:'flex', justifyContent:'space-between', alignItems:'baseline',
              padding:'16px 0', borderTop:'1px solid var(--line)', marginBottom:18,
            }}>
              <span style={{ fontSize:14, color:'var(--ink-2)' }}>Total del turno</span>
              <span className="num" style={{ fontSize:24, fontWeight:600, letterSpacing:'-.03em' }}>
                {pesos(total)}
              </span>
            </div>

            <button className="btn full" disabled={!listo} onClick={() => setEnviado(true)}>
              Enviar corte
            </button>
          </div>
        </article>

        <aside className="banner">
          <Icono d='<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.1"/>' n={15} />
          <div>
            <div className="banner-t">Después de enviarlo ya no se edita</div>
            <div className="banner-d">
              Si te equivocaste, avisa para que se cancele y lo capturas de nuevo.
              Si hay diferencia con lo contado, se anota al validarlo — no es un problema tuyo.
            </div>
          </div>
        </aside>
      </div>
    </Shell>
  );
}
