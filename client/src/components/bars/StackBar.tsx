import type { ComponentProps } from 'react';
import { Link } from 'react-router';
import { barPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import { BarTrack, COLUMN_RADIUS, type BarSize } from './BarTrack';

/** One segment: its share of the whole (0 to 100), its colour and, when it leads somewhere, a link. */
export interface StackPart {
  key: string;
  pct: number;
  color: string;
  link?: { to: string; label: string; onClick?: () => void };
}

const SEGMENT_LINK =
  'block outline-none transition-[filter] hover:brightness-90 hover:ring-2 hover:ring-inset hover:ring-foreground/60 focus-visible:brightness-90 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/60';

/** The look of a bar with nothing in it: a dashed edge in the input colour, and no fill. */
const EMPTY_OUTLINE = 'border border-dashed border-input';

/**
 * Segments laid end to end in one track: left to right as a bar, or bottom to top as a column.
 * Each segment takes its own share of the track, so a set that adds past 100 is cut at the end.
 * Segments with a link stay in the accessibility tree; with none, the bar is decoration.
 * A link's `title` repeats its `aria-label`, so the name also shows on hover.
 */
export function StackBar({
  parts,
  orientation = 'horizontal',
  size = 'md',
  empty = false,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  parts: StackPart[];
  orientation?: 'horizontal' | 'vertical';
  size?: BarSize;
  /** There is nothing to show (a month with no entries): a dashed outline with no fill, instead of the grey track. */
  empty?: boolean;
}) {
  const vertical = orientation === 'vertical';
  const decorative = parts.every((part) => !part.link);
  const segments = parts
    .filter((part) => part.pct > 0)
    .map((part) => {
      const extent = `${barPercent(part.pct, 100)}%`;
      const style = vertical ? { height: extent, backgroundColor: part.color } : { width: extent, backgroundColor: part.color };
      if (!part.link) return <span key={part.key} aria-hidden="true" className={vertical ? 'block w-full' : 'block h-full'} style={style} />;
      return (
        <Link
          key={part.key}
          to={part.link.to}
          onClick={part.link.onClick}
          aria-label={part.link.label}
          title={part.link.label}
          style={style}
          className={cn(SEGMENT_LINK, vertical ? 'w-full' : 'h-full')}
        />
      );
    });

  if (vertical) {
    return (
      <div
        aria-hidden={decorative || undefined}
        className={cn('flex w-full flex-1 flex-col-reverse overflow-hidden', empty ? EMPTY_OUTLINE : 'bg-bar-track', COLUMN_RADIUS, className)}
        {...props}
      >
        {segments}
      </div>
    );
  }
  return (
    <BarTrack aria-hidden={decorative || undefined} size={size} className={cn('flex overflow-hidden', empty && `bg-transparent ${EMPTY_OUTLINE}`, className)} {...props}>
      {segments}
    </BarTrack>
  );
}
