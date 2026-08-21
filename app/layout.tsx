import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Centro de Control',
  description: 'Control financiero diario del grupo de restaurantes',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0B0F15',
};

/* Aplica el modo guardado ANTES de pintar, para que no parpadee al
   recargar. Se ejecuta inline, antes de que React hidrate. */
const APLICAR_MODO = `
try {
  var m = localStorage.getItem('cc-modo') || 'oscuro';
  document.documentElement.dataset.modo = m;
  var t = localStorage.getItem('cc-texto');
  if (t) document.documentElement.dataset.texto = t;
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" data-modo="oscuro" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: APLICAR_MODO }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
