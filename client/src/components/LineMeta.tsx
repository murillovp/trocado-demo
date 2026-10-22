import type { ReactNode } from 'react';
import type { TransactionKind } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { isRefund, lineKindLabel } from '@/lib/refund';
import { cn } from '@/lib/utils';

type Props = {
  /** The values to show, in order, such as the date, the category and the account. They are joined by " · " into one text. */
  parts: string[];
  /** A badge, or nothing. Sits after the text on the same line. */
  children?: ReactNode;
  className?: string;
};

/**
 * The muted second line of a line row on a phone: the values that the wide columns
 * show one per cell, joined into one text. It is hidden from `lg`, where those cells
 * show, and the cells are hidden below `lg`, so a reader meets each value once. The
 * values are one text node, so no single value is a second copy of a wide cell.
 */
export function LineMeta({ parts, children, className }: Props) {
  return (
    <span data-testid="line-meta" className={cn('flex min-w-0 flex-wrap items-center gap-1.5 text-caption text-muted-foreground lg:hidden', className)}>
      <span className="break-words">{parts.join(' · ')}</span>
      {children}
    </span>
  );
}

/**
 * The kind of a line as a badge, for the phone line. A Gasto gets none, because most
 * lines are Gasto; a refund gets "Estorno", and a line with no kind gets "Sem tipo" in
 * the attention colour. `amountCents` is the amount the row shows.
 */
export function KindBadge({ kind, amountCents }: { kind: TransactionKind | null; amountCents: number }) {
  const line = { kind, amountCents };
  if (kind === 'expense' && !isRefund(line)) return null;
  return <Badge variant={kind === null ? 'attention' : 'secondary'}>{lineKindLabel(line)}</Badge>;
}
