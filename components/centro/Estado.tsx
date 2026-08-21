export type Semaforo = 'sano' | 'alarma' | 'critico' | 'off';

const TEXTO: Record<Semaforo, string> = {
  sano: 'Va bien', alarma: 'Hay que vigilar',
  critico: 'Atender hoy', off: 'Sin datos',
};

/* La forma cambia con el estado: no depende solo del color. */
const FORMA: Record<Semaforo, string> = {
  sano:    '<path d="M20 6L9 17l-5-5" stroke-width="2.6"/>',
  alarma:  '<path d="M12 4L2.5 20h19z" stroke-width="2.2"/><path d="M12 10v4M12 17.4v.1" stroke-width="2.2"/>',
  critico: '<circle cx="12" cy="12" r="9" stroke-width="2.2"/><path d="M12 7.5v5M12 16.2v.1" stroke-width="2.2"/>',
  off:     '<circle cx="12" cy="12" r="9" stroke-width="2" opacity=".6"/>',
};

export function Lampara({ e }: { e: Semaforo }) {
  return <span className="cc-lamp" data-e={e} aria-hidden="true" />;
}

export default function Estado({ e, texto }: { e: Semaforo; texto?: string }) {
  return (
    <span className="cc-estado" data-e={e}>
      <svg
        width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeLinecap="round" strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: FORMA[e] }}
      />
      {texto ?? TEXTO[e]}
    </span>
  );
}
