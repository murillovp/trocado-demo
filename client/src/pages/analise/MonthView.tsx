import { useAnalysisMonth } from '@/api/queries';
import type { AnalysisMonthQuery } from '@/api/types';
import { QueryView } from '@/components/QueryView';
import { PageSkeleton } from '@/components/States';
import type { LinkFilters } from '@/lib/transacoesLink';
import { SpendingCalendar } from './SpendingCalendar';
import { TagsInMonth } from './TagsInMonth';
import { WhatChanged } from './WhatChanged';

type Props = {
  /** The month, the person and the filters, as the screen read them. */
  query: AnalysisMonthQuery;
  /** The filters a link to Transações carries. */
  carried: LinkFilters;
};

/** Análise for one month: what changed against the average, spending by day, and the tags of the month. */
export function MonthView({ query, carried }: Props) {
  const analysis = useAnalysisMonth(query);
  return (
    <QueryView query={analysis} loading={<PageSkeleton />}>
      {(data) => (
        <>
          <WhatChanged month={query.month} data={data} carried={carried} />
          <SpendingCalendar data={data} carried={carried} />
          <TagsInMonth data={data} carried={carried} />
        </>
      )}
    </QueryView>
  );
}
