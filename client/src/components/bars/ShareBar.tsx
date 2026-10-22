import type { ComponentProps } from 'react';
import { barPercent } from '@/lib/format';
import { BarTrack, type BarSize } from './BarTrack';

/**
 * A bar filled to `value` as a share of `max` (0 to 100 when `max` is left out), never past the ends.
 * For a bar whose number sits beside it, so it stays out of the accessibility tree.
 */
export function ShareBar({
  value,
  max = 100,
  color,
  size = 'md',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'color'> & { value: number; max?: number; color: string; size?: BarSize }) {
  return (
    <BarTrack aria-hidden="true" size={size} className={className} {...props}>
      <div
        className="h-full rounded-full transition-opacity group-hover:opacity-80"
        style={{ width: `${barPercent(value, max)}%`, backgroundColor: color }}
      />
    </BarTrack>
  );
}
