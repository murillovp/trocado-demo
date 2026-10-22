import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import { barPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import { COLUMN_RADIUS } from './BarTrack';
import { StackBar, type StackPart } from './StackBar';

/**
 * One column of a `ColumnChart`. A plain column has a `value` and a `color`; a stacked one
 * has `stack` parts that fill the whole track instead. `description` is read out by screen readers and,
 * on a column that is not a link, shows as the hover title; on a column that is one link, the link's
 * description is that text (its `aria-label` hides the content) and its title is the link label.
 */
export interface ChartColumn {
  key: string;
  value?: number;
  color?: string;
  caption: ReactNode;
  /** The current column's caption gets weight; the others stay muted. */
  current?: boolean;
  /** Sits right above the bar, such as the amount. */
  above?: ReactNode;
  stack?: StackPart[];
  /** A stacked column with nothing to show, such as a month with no entries: a dashed outline with no fill. */
  empty?: boolean;
  description?: string;
  /** Makes the whole column (bar and caption) one link. It sets both `aria-label` and `title`. */
  link?: { to: string; label: string; onClick?: () => void };
}

/** The one height, gap and corner radius that every column chart shares. */
const COLUMN_LAYOUT = 'flex h-full w-full flex-col items-center justify-end gap-1 text-center';

function ColumnBody({ column, max, descriptionId }: { column: ChartColumn; max: number; descriptionId?: string }) {
  return (
    <>
      {column.description ? <span id={descriptionId} className="sr-only">{column.description}</span> : null}
      {column.above}
      {column.stack ? (
        <StackBar parts={column.stack} orientation="vertical" empty={column.empty} data-empty-column={column.empty ? '' : undefined} />
      ) : (
        <span
          aria-hidden="true"
          data-column-fill
          className={cn('w-full transition-[filter] group-hover:brightness-90', COLUMN_RADIUS)}
          style={{ height: `${barPercent(column.value ?? 0, max)}%`, backgroundColor: column.color }}
        />
      )}
      <span
        aria-hidden={column.link || column.description ? true : undefined}
        className={cn('text-micro transition-colors group-hover:text-foreground', column.current ? 'font-semibold' : 'text-muted-foreground')}
      >
        {column.caption}
      </span>
    </>
  );
}

/**
 * Vertical bars side by side, each scaled to the tallest value. Used for the twelve-month
 * spending, the committed instalments and the split of the 50/30/20 over time.
 * `className` lands on the list, for a screen that needs a narrower gap (it replaces the default gap).
 */
export function ColumnChart({ label, columns, className }: { label: string; columns: ChartColumn[]; className?: string }) {
  const max = Math.max(0, ...columns.map((column) => column.value ?? 0));
  const chartId = useId();
  return (
    <ol aria-label={label} className={cn('flex h-36 items-end gap-1.5', className)}>
      {columns.map((column) => {
        const descriptionId = column.description ? `${chartId}-${column.key}` : undefined;
        return (
          <li key={column.key} className="flex h-full min-w-0 flex-1">
            {column.link ? (
              <Link
                to={column.link.to}
                onClick={column.link.onClick}
                aria-label={column.link.label}
                aria-describedby={descriptionId}
                title={column.link.label}
                className={cn(COLUMN_LAYOUT, 'group rounded-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2')}
              >
                <ColumnBody column={column} max={max} descriptionId={descriptionId} />
              </Link>
            ) : (
              <div title={column.description} className={COLUMN_LAYOUT}>
                <ColumnBody column={column} max={max} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
