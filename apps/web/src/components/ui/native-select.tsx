import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Liste déroulante native : sur mobile elle ouvre le sélecteur du système (plus ergonomique et
 * plus léger qu'une liste personnalisée pour des listes de plusieurs dizaines d'éléments).
 */
const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<'select'>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-input aria-[invalid=true]:border-destructive bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
NativeSelect.displayName = 'NativeSelect';

export { NativeSelect };
