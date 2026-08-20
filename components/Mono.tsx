import { restaurantePorId } from '@/lib/mock';

/** Marca provisional de cada sucursal.
    TODO: sustituir por los logos oficiales cuando Dani los entregue. */
export default function Mono({ id, n = 34 }: { id: string; n?: number }) {
  const r = restaurantePorId(id);
  return (
    <span style={{
      width:n, height:n, borderRadius: n / 3.6, flex:'none', display:'grid',
      placeItems:'center', fontSize: n / 2.9, fontWeight:700, color:'#fff',
      background: r?.color ?? 'var(--serie-4)',
      border:'1px solid rgba(255,255,255,.18)', letterSpacing:'-.02em',
    }}>{r?.sigla ?? '?'}</span>
  );
}
