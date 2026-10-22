import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** The two bar heights: `sm` (8 px) beside a line of text, `md` (12 px) when the bar is the row. */
export type BarSize = 'sm' | 'md';

const HEIGHTS: Record<BarSize, string> = { sm: 'h-2', md: 'h-3' };

/** The top corners of every column. Horizontal bars are pills instead. */
export const COLUMN_RADIUS = 'rounded-t-sm';

/**
 * The grey channel every horizontal bar sits in: one colour, one pill shape, two heights.
 * `TargetBar`, `ShareBar` and `StackBar` build on it.
 */
export function BarTrack({ size = 'md', className, ...props }: ComponentProps<'div'> & { size?: BarSize }) {
  return <div className={cn('relative w-full rounded-full bg-bar-track', HEIGHTS[size], className)} {...props} />;
}
