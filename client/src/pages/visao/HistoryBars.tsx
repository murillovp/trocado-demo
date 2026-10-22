import type { MonthTotals } from '@/api/types';
import { useTransacoesLink } from '@/app/view';
import { ColumnChart } from '@/components/bars/ColumnChart';
import { QueryView, type QueryState } from '@/components/QueryView';
import { SectionCard, SectionHeader } from '@/components/SectionCard';
import { CardSkeleton } from '@/components/States';
import { NEUTRAL_BAR } from '@/lib/colors';
import { currentMonth, formatReais, monthLabel, monthSentenceStart, shortMonth } from '@/lib/format';
import { averagedMonths, highestMonth } from '@/lib/history';

/**
 * The card with spending for the twelve months ending at `month`. The current month takes the subject's colour.
 * A failed read shows its error inside the card, under the title.
 */
export function HistoryBars({ history, month, color }: { history: QueryState<MonthTotals[]>; month: string; color: string }) {
  return (
    <SectionCard>
      <QueryView
        query={history}
        header={<SectionHeader title="Últimos 12 meses" action={<span className="text-xs text-muted-foreground">gastos por mês</span>} />}
        loading={<CardSkeleton />}
        inline
        className="flex flex-col gap-4"
      >
        {(months) => <MonthBars months={months} month={month} color={color} />}
      </QueryView>
    </SectionCard>
  );
}

function MonthBars({ months, month, color }: { months: MonthTotals[]; month: string; color: string }) {
  const linkTo = useTransacoesLink();
  const hasSpending = months.some((entry) => entry.spendingCents > 0);

  return (
    <>
      <ColumnChart
        label="Gastos nos últimos 12 meses"
        columns={months.map((entry) => ({
          key: entry.month,
          value: entry.spendingCents,
          color: entry.month === month ? color : NEUTRAL_BAR,
          caption: shortMonth(entry.month),
          current: entry.month === month,
          link: {
            to: linkTo({ kind: 'expense' }, { month: entry.month }),
            label: `Ver gastos de ${monthLabel(entry.month)}: ${formatReais(entry.spendingCents)}`,
          },
        }))}
      />
      {hasSpending ? (
        <ChartFigures months={months} month={month} />
      ) : (
        <p className="text-xs text-muted-foreground">Sem gastos nos últimos 12 meses.</p>
      )}
    </>
  );
}

/**
 * The numbers the columns cannot show without hover: the shown month, the highest month and
 * the average of the complete months (see `averagedMonths`). Three parts, one per line on a phone.
 */
function ChartFigures({ months, month }: { months: MonthTotals[]; month: string }) {
  const shown = months.find((entry) => entry.month === month);
  const highest = highestMonth(months);
  const average = averagedMonths(months, currentMonth());
  const range = average ? (average.from === average.to ? shortMonth(average.from) : `${shortMonth(average.from)} a ${shortMonth(average.to)}`) : '';
  // A month with no spending inside the range is not averaged, so the line says how many were.
  const skippedNote = average && average.months.length < average.spanMonths ? ` (${average.months.length} meses com gastos)` : '';

  return (
    <p className="text-xs text-muted-foreground">
      <span className="block whitespace-nowrap sm:inline">
        {monthSentenceStart(month)}: {formatReais(shown?.spendingCents ?? 0)}
      </span>
      {highest ? (
        <>
          <Separator />
          <span className="block whitespace-nowrap sm:inline">
            Maior: {shortMonth(highest.month)}, {formatReais(highest.spendingCents)}
          </span>
        </>
      ) : null}
      <Separator />
      <span className="block whitespace-nowrap sm:inline">
        {average ? `Média de ${range}${skippedNote}: ${formatReais(average.averageCents)}` : 'Ainda sem um mês completo para a média.'}
      </span>
    </p>
  );
}

/** The dot between the parts; below sm the parts sit on their own lines and need none. */
function Separator() {
  return <span className="hidden sm:inline"> · </span>;
}
