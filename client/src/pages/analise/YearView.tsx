import { useAnalysisYear } from '@/api/queries';
import type { AnalysisMonthQuery } from '@/api/types';
import { QueryView } from '@/components/QueryView';
import { PageSkeleton } from '@/components/States';
import type { LinkFilters } from '@/lib/transacoesLink';
import { CountedMonthsNote } from './countedMonthsNote';
import { Highlights } from './Highlights';
import { MonthByMonth } from './MonthByMonth';

type Props = {
  query: AnalysisMonthQuery;
  carried: LinkFilters;
};

/**
 * Análise for the twelve months ending with the selected month: Destaques, the month-by-month table,
 * then a note naming the months the sentences and trends read. The answer loads inside `QueryView`, so an
 * older server that lacks the address shows the restart message here only.
 */
export function YearView({ query, carried }: Props) {
  const analysis = useAnalysisYear(query);
  return (
    <QueryView query={analysis} loading={<PageSkeleton />}>
      {(data) => (
        <>
          <Highlights data={data} />
          <MonthByMonth data={data} carried={carried} />
          <CountedMonthsNote countedMonths={data.countedMonths} />
        </>
      )}
    </QueryView>
  );
}
