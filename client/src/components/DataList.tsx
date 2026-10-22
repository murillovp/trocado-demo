import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type DataColumn = {
  key: string;
  /** What the column holds. Empty for a column of icon buttons. */
  label: string;
  /** `end` for a column of money, so the header sits over the figures. */
  align?: 'end';
  /** A control in the header cell, such as a "select all" box, in place of the label text. */
  control?: ReactNode;
};

type Props = {
  /** The list's accessible name. Tests and screen readers find the list by it. */
  label: string;
  columns: DataColumn[];
  /** The wide column template, such as `lg:grid-cols-[1fr_8rem]`. Rows use the same string, so header and cells line up. */
  grid: string;
  /** The rows: `li` elements that use `grid`. */
  children: ReactNode;
  className?: string;
};

/**
 * A list of rows under a header row that names the columns. The frame, the border
 * and the shadow are the same on every list. The header shows from `lg` (1024 px),
 * where the rows switch to their wide columns; below that, rows keep their compact
 * layout and there is no header. The header sits outside the `ul`, so the list keeps
 * its rows as its only items. It is `aria-hidden` while it only names columns; `DataCell`
 * gives each value its column name for screen readers. A header that holds a `control`
 * stays visible to them, and only its names are hidden. The header carries `group/row`
 * so a control in it reveals on hover like the rows' boxes.
 */
export function DataList({ label, columns, grid, children, className }: Props) {
  const hasControl = columns.some((column) => column.control !== undefined);
  return (
    <div className={cn('overflow-hidden rounded-xl border bg-card shadow-sm', className)}>
      <div
        aria-hidden={hasControl ? undefined : true}
        className={cn(
          'group/row hidden items-center gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground lg:grid',
          grid,
        )}
      >
        {columns.map((column) =>
          column.control !== undefined ? (
            <span key={column.key}>{column.control}</span>
          ) : (
            <span
              key={column.key}
              title={column.label}
              aria-hidden={hasControl ? true : undefined}
              className={cn('truncate', column.align === 'end' && 'text-right')}
            >
              {column.label}
            </span>
          ),
        )}
      </div>
      <ul aria-label={label} className="divide-y">
        {children}
      </ul>
    </div>
  );
}

type CellProps = {
  /** The column's name, read aloud before the value. */
  label: string;
  /** Cut a long value short with an ellipsis. The full text goes in `title`. */
  truncate?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * One value in a row, usually text or an amount. It reads "Categoria: Mercado" to a screen reader, because the
 * header row is hidden from them, and shows only "Mercado". With `truncate`, the full text
 * is also the hover title.
 */
export function DataCell({ label, truncate = false, className, children }: CellProps) {
  return (
    <span className={cn(truncate && 'truncate', className)} title={truncate && typeof children === 'string' ? children : undefined}>
      <span className="sr-only">{label}: </span>
      {children}
    </span>
  );
}
