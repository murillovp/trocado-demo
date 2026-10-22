import type { AnalysisCategoryRow } from '@/api/types';
import { useTransacoesLink } from '@/app/view';
import { ShareBar } from '@/components/bars/ShareBar';
import { TargetBar } from '@/components/bars/TargetBar';
import { Money } from '@/components/Money';
import { RowChevron, RowLink } from '@/components/RowLink';
import { BUCKET_COLORS, UNCLASSIFIED_COLOR } from '@/lib/colors';
import { categoryChangeText } from '@/lib/analise';
import { barPercent, formatReais } from '@/lib/format';
import type { LinkFilters } from '@/lib/transacoesLink';

type Props = {
  row: AnalysisCategoryRow;
  /** The amount the longest bar of the list stands for, shared by every row so bars compare. */
  max: number;
  /** Análise's current filters, which the link to Transações carries. */
  carried: LinkFilters;
};

/**
 * One category against its own average: the name with its group colour, this month's amount and change
 * in words, and a bar of this month with a mark where the average sits. It opens that category's lines
 * for the month on Transações, with the same filters.
 * The name and the figures share one line that wraps on a phone; the bar takes the full width under them.
 */
export function CategoryChangeRow({ row, max, carried }: Props) {
  const linkTo = useTransacoesLink();
  const name = row.categoryName ?? 'Sem categoria';
  const color = row.bucket ? BUCKET_COLORS[row.bucket] : UNCLASSIFIED_COLOR;
  const change = categoryChangeText(row);
  const hasMark = row.averageCents !== null && row.averageCents > 0;
  // The bar and its mark are not read out, so the name carries this month, the average and the change.
  const figures = [
    `${formatReais(row.monthCents)} este mês`,
    ...(row.averageCents === null ? [] : [`média ${formatReais(row.averageCents)}`]),
    ...(change ? [change] : []),
  ];
  const spoken = `Ver gastos em ${name}: ${figures.join(', ')}`;

  return (
    <RowLink
      to={linkTo({ ...carried, kind: 'expense', categoryId: row.categoryId ?? 'none' })}
      aria-label={spoken}
      className="group flex flex-col gap-1.5"
    >
      <span className="flex items-start gap-2">
        <span title={name} className="min-w-0 flex-1 line-clamp-2 break-words">{name}</span>
        <span className="flex shrink-0 flex-col items-end sm:flex-row sm:items-baseline sm:gap-3">
          <Money cents={row.monthCents} kind="expense" />
          {change ? <span className="whitespace-nowrap text-xs text-muted-foreground">{change}</span> : null}
        </span>
        {/* mt-0.5 centres the 16 px arrow on the first 20 px line. */}
        <RowChevron className="mt-0.5" />
      </span>
      {hasMark ? (
        <TargetBar
          actualPct={barPercent(row.monthCents, max)}
          targetPct={barPercent(row.averageCents ?? 0, max)}
          color={color}
          className="mt-0.5"
        />
      ) : (
        <ShareBar value={row.monthCents} max={max} color={color} className="mt-0.5" />
      )}
    </RowLink>
  );
}
