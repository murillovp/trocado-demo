import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * A plain select, styled to sit next to shadcn inputs. Works well on phones and in tests.
 * It hides the system arrow and draws one of its own. `className` goes on the box
 * around the select (width, height, `hidden`), so a hidden select hides its arrow too.
 */
export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return (
    <div className={cn('relative h-9 w-full min-w-0', className)}>
      <select
        className={cn(
          'h-full w-full min-w-0 appearance-none rounded-md border border-input bg-background pr-9 pl-3 text-base text-foreground shadow-xs md:text-sm outline-hidden',
          'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
