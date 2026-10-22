import type { CSSProperties } from 'react';
import type { AnalysisYearAnswer, AnalysisYearCategory } from '@/api/types';
import { useTransacoesLink } from '@/app/view';
import { Clickable } from '@/components/Clickable';
import { SectionCard, SectionHeader } from '@/components/SectionCard';
import { EmptyState } from '@/components/States';
import { BUCKET_COLORS, UNCLASSIFIED_COLOR } from '@/lib/colors';
import { formatWholeReais, shortMonth } from '@/lib/format';
import { FOCUS_RING } from '@/lib/interaction';
import type { LinkFilters } from '@/lib/transacoesLink';
import { cn } from '@/lib/utils';
import { cellSentence, shadeStep, trendText } from './monthTable';

type Props = {
  data: AnalysisYearAnswer;
  /** Análise's current filters, carried by every link to Transações. */
  carried: LinkFilters;
};

/**
 * "Mês a mês": a row per category in the server's order (fastest-rising first), a column per month, and
 * a last column "Tendência". Each cell is shaded in five steps of the row's group colour against that
 * row's highest month, and links to that category's lines for the month on Transações. The running month
 * is dashed and its header says "em andamento".
 * Below `md` the category name stays fixed while the months scroll sideways inside the table's own box,
 * and the trend moves under the name. The page itself never scrolls sideways. The table is as wide as
 * its content: month columns have one fixed width and the trend column follows the last month.
 */
export function MonthByMonth({ data, carried }: Props) {
  const { columns, categories } = data;

  return (
    <SectionCard>
      <SectionHeader title="Mês a mês" />
      {categories.length === 0 ? (
        <EmptyState compact>Nenhum gasto nestes meses.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table aria-label="Gasto por categoria e mês" className="w-max border-separate border-spacing-x-1 border-spacing-y-1">
            <thead>
              <tr>
                <th scope="col" className={cn(NAME_CELL, 'pb-1 text-caption font-medium text-muted-foreground')}>
                  Categoria
                </th>
                {columns.map((column) => (
                  <th key={column.month} scope="col" className={cn(MONTH_COLUMN, 'pb-1 text-caption font-medium text-muted-foreground')}>
                    {shortMonth(column.month)}
                    {column.running ? <span className="block text-micro font-normal">em andamento</span> : null}
                  </th>
                ))}
                <th scope="col" className="hidden pb-1 pl-2 text-right text-caption font-medium text-muted-foreground md:table-cell">
                  Tendência
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((row) => (
                <CategoryRow key={row.categoryId ?? 'sem-categoria'} row={row} columns={columns} carried={carried} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

/** Every month column has one width, so a wide screen adds no gap and "R$ 10.812" fits on one line. */
const MONTH_COLUMN = 'w-26 min-w-26 max-w-26';

/** The fixed first column: a set width on a phone so the months have room, a wider one from `md`. */
const NAME_CELL = 'sticky left-0 z-10 w-32 min-w-32 max-w-32 bg-card pr-2 text-left md:w-48 md:max-w-48';

type RowProps = {
  row: AnalysisYearCategory;
  columns: AnalysisYearAnswer['columns'];
  carried: LinkFilters;
};

/** One category: its name (with the trend under it on a phone), a cell per month, and the trend column from `md`. */
function CategoryRow({ row, columns, carried }: RowProps) {
  const linkTo = useTransacoesLink();
  const name = row.categoryName ?? 'Sem categoria';
  const color = row.bucket ? BUCKET_COLORS[row.bucket] : UNCLASSIFIED_COLOR;
  const rowMax = Math.max(0, ...row.cents);
  const trend = trendText(row.trendCentsPerMonth);

  return (
    <tr style={{ '--calendar-subject': color } as CSSProperties}>
      <th scope="row" className={cn(NAME_CELL, 'text-sm font-normal')}>
        <span title={name} className="line-clamp-2 break-words">
          {name}
        </span>
        <span className="block whitespace-nowrap text-xs text-muted-foreground md:hidden">{trend}</span>
      </th>
      {columns.map((column, index) => {
        const cents = row.cents[index] ?? 0;
        const step = shadeStep(cents, rowMax);
        const sentence = cellSentence(name, column.month, cents);
        return (
          <td key={column.month} className="p-0">
            <Clickable
              to={linkTo({ ...carried, kind: 'expense', categoryId: row.categoryId ?? 'none' }, { month: column.month })}
              data-step={step > 0 ? step : undefined}
              title={sentence}
              aria-label={sentence}
              className={cn(
                'month-cell flex h-9 items-center justify-center whitespace-nowrap rounded-md border px-1 text-caption transition-shadow hover:ring-2 hover:ring-ring',
                column.running ? 'border-dashed border-input' : 'border-border',
                FOCUS_RING,
              )}
            >
              {step > 0 ? formatWholeReais(cents) : null}
            </Clickable>
          </td>
        );
      })}
      <td className="hidden whitespace-nowrap pl-2 text-right text-sm md:table-cell">{trend}</td>
    </tr>
  );
}
