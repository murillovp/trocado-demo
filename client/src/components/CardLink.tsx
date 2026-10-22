import { Clickable, type ClickableProps } from '@/components/Clickable';
import { FOCUS_RING } from '@/lib/interaction';
import { cn } from '@/lib/utils';

/**
 * A whole card that leads somewhere or picks something: the Card look plus one
 * hover, one focus ring and one selected state: the dark outline alone, with no fill, so it never blends with the bars inside.
 * The caller sets padding and layout.
 */
export function CardLink({ className, ...props }: ClickableProps) {
  return (
    <Clickable
      className={cn(
        'block rounded-xl border bg-card text-left text-card-foreground shadow-sm transition-colors hover:bg-hover',
        FOCUS_RING,
        props.selected && 'border-foreground',
        className,
      )}
      {...props}
    />
  );
}
