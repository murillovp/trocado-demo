import type { ComponentProps, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * The one card for a block of a screen. Padding is 20 px and the gap between its
 * parts is 16 px, so cards line up wherever they sit. `compact` (16 px, 4 px gap)
 * is for a small figure that sits beside clickable cards of the same size.
 */
export function SectionCard({
  variant = 'default',
  className,
  ...props
}: ComponentProps<'div'> & { variant?: 'default' | 'compact' }) {
  return <Card className={cn(variant === 'compact' ? 'gap-1 p-4' : 'gap-4 p-5', className)} {...props} />;
}

/**
 * The title row of a card: a level 2 heading, with an optional mark before it, a
 * line of small text under it, and whatever belongs at the right edge (a link, a
 * hint, a count, a legend or a button).
 */
export function SectionHeader({
  title,
  description,
  leading,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        <div className="flex min-w-0 flex-col">
          <h2 className="flex items-center gap-2 text-heading font-semibold">{title}</h2>
          {description ? <span className="text-xs text-muted-foreground">{description}</span> : null}
        </div>
      </div>
      {action}
    </div>
  );
}
