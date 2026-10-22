import { useContext } from 'react';
import { useAnalysisWeek } from '@/api/queries';
import type { AnalysisMonthQuery } from '@/api/types';
import { SubjectContext } from '@/app/view';
import { QueryView } from '@/components/QueryView';
import { PageSkeleton } from '@/components/States';
import { HOUSEHOLD_COLOR } from '@/lib/colors';
import { formatWholeReais } from '@/lib/format';
import type { LinkFilters } from '@/lib/transacoesLink';
import { CountedMonthsNote } from './countedMonthsNote';
import { MonthPartChart } from './MonthPartChart';
import { WeekdayChart } from './WeekdayChart';

type Props = {
  query: AnalysisMonthQuery;
  carried: LinkFilters;
};

/**
 * Análise by weekday and by part of the month, over the twelve months ending with the selected month:
 * Por dia da semana, Por parte do mês, then a note on the installments left out and the note naming the
 * months the charts read. The answer loads inside `QueryView`, so an older server that lacks the address
 * shows the restart message here only. Nothing here links to Transações, so `carried` goes unused.
 */
export function WeekView({ query }: Props) {
  const analysis = useAnalysisWeek(query);
  const subject = useContext(SubjectContext);
  const color = subject?.color ?? HOUSEHOLD_COLOR;
  return (
    <QueryView query={analysis} loading={<PageSkeleton />}>
      {(data) => (
        <>
          <WeekdayChart data={data} color={color} />
          <MonthPartChart data={data} color={color} />
          {data.leftOutInstallmentsCents > 0 ? (
            <p className="text-sm text-muted-foreground">
              Parcelas a partir da 2ª ficam de fora: {formatWholeReais(data.leftOutInstallmentsCents)} nesses meses.
            </p>
          ) : null}
          <CountedMonthsNote countedMonths={data.countedMonths} />
        </>
      )}
    </QueryView>
  );
}
