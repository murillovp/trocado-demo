import type { AnalysisYearAnswer } from '@/api/types';
import { RowLink } from '@/components/RowLink';
import { SectionCard, SectionHeader } from '@/components/SectionCard';
import { ShowMoreList } from '@/components/ShowMoreList';
import { MIN_INSIGHT_MONTHS } from '@/lib/history';
import { insightFilterId, insightSentence } from './highlightText';
import { useAnaliseFilters } from './useAnaliseFilters';

type Props = {
  data: AnalysisYearAnswer;
};

/**
 * "Destaques": short sentences about the categories that rose, fell or sit far from their average,
 * in the order the server sends them (largest change first). The list shows five, then "Ver todos (N)".
 * Selecting a sentence filters Análise by that category and stays on the same period.
 * With too little history, or nothing worth saying, one line says which.
 */
export function Highlights({ data }: Props) {
  const filters = useAnaliseFilters();
  const { insights, countedMonths, month } = data;

  return (
    <SectionCard>
      <SectionHeader title="Destaques" />
      {insights.length > 0 ? (
        <ShowMoreList
          items={insights}
          itemKey={(insight) => `${insight.kind}-${insight.categoryId ?? 'none'}`}
          renderItem={(insight) => (
            <RowLink onClick={() => filters.setCategoryId(insightFilterId(insight))} className="block w-full">
              {insightSentence(insight, month)}
            </RowLink>
          )}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          {countedMonths.length < MIN_INSIGHT_MONTHS
            ? `Os destaques aparecem com ${MIN_INSIGHT_MONTHS} meses completos. Hoje há ${countedMonths.length}.`
            : 'Nenhuma categoria mudou muito nos últimos meses.'}
        </p>
      )}
    </SectionCard>
  );
}
