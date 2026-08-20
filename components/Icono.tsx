/** Icono SVG desde un path. Trazo consistente en toda la app. */
export default function Icono({ d, n = 18 }: { d: string; n?: number }) {
  return (
    <svg width={n} height={n} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: d }} />
  );
}
