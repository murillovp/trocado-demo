import type { ComponentProps } from 'react';
import { barPercent } from '@/lib/format';
import { BarTrack } from './BarTrack';

/** A bar filled to the actual share of income (0 to 100), with a dark mark at the target. */
export function TargetBar({
  actualPct,
  targetPct,
  color,
  ...props
}: Omit<ComponentProps<'div'>, 'color'> & { actualPct: number | null; targetPct: number; color: string }) {
  return (
    <BarTrack aria-hidden="true" size="md" {...props}>
      <div className="h-full rounded-full" style={{ width: `${barPercent(actualPct ?? 0, 100)}%`, backgroundColor: color }} />
      <div
        data-testid="target-tick"
        className="absolute -inset-y-1 w-0.5 rounded bg-foreground"
        style={{ left: `${barPercent(targetPct, 100)}%` }}
      />
    </BarTrack>
  );
}
