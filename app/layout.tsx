export const metadata = {
  title: 'ERP Restaurantes',
  description: 'Gestión financiera multi-restaurante',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
