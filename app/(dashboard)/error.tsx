'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    toast.error('Ocurrió un error, intenta de nuevo.');
  }, [error]);

  return (
    <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm text-muted-foreground">Ocurrió un error inesperado.</p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
