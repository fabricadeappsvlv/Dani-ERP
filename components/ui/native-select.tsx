import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Wrapper alrededor de <select> nativo, con el mismo look & feel que
 * `Select` (Radix) pero sin JS extra — útil para formularios simples
 * donde no se necesita contenido custom en las opciones.
 */
function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          'border-input data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex h-9 w-full appearance-none items-center rounded-md border bg-transparent px-3 py-2 pr-8 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 opacity-50" />
    </div>
  );
}

function NativeSelectOption({ className, ...props }: React.ComponentProps<'option'>) {
  return <option data-slot="native-select-option" className={cn(className)} {...props} />;
}

export { NativeSelect, NativeSelectOption };
