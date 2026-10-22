import { ChevronRight } from 'lucide-react';
import { Clickable, type ClickableProps } from '@/components/Clickable';
import { FOCUS_RING } from '@/lib/interaction';
import { cn } from '@/lib/utils';

/**
 * A row inside a card that leads somewhere: it grows 8 px into the card's padding so
 * the hover tint has room, and shares the hover, focus ring and selected state.
 */
export function RowLink({ className, ...props }: ClickableProps) {
  return (
    <Clickable
      className={cn(
        '-mx-2 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-hover',
        FOCUS_RING,
        props.selected && 'bg-selected',
        className,
      )}
      {...props}
    />
  );
}

/** The muted arrow at the end of a row that opens something. Decoration only: the row's own name says where it leads. */
export function RowChevron({ className }: { className?: string }) {
  return <ChevronRight aria-hidden="true" className={cn('size-4 shrink-0 text-muted-foreground', className)} />;
}
