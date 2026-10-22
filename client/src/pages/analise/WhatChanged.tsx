import { useBucketLabels } from '@/api/queries';
import type { AnalysisMonthAnswer } from '@/api/types';
import { Legend } from '@/components/bars/Legend';
import { EmptyState } from '@/components/States';
import { SectionCard, SectionHeader } from '@/components/SectionCard';
import { BUCKET_COLORS, UNCLASSIFIED_COLOR } from '@/lib/colors';
import { headingSentence, sharedBarMax } from '@/lib/analise';
import type { LinkFilters } from '@/lib/transacoesLink';
import { CategoryChangeRow } from './CategoryChangeRow';
import { NewSellers } from './NewSellers';
import { UnusualLines } from './UnusualLines';

type Props = {
  month: string;
  data: AnalysisMonthAnswer;
  /** Análise's current filters, carried by every link to Transações. */
  carried: LinkFilters;
};

/**
 * "O que mudou": the month's spending against the average of the months before it, every category with
 * its change, then the new sellers and the charges outside the pattern. With no earlier month to compare
 * with, the list shows this month's amounts under a note saying so.
 */
export function WhatChanged({ month, data, carried }: Props) {
  const { heading, categories } = data;
  const groupNames = useBucketLabels();
  const max = sharedBarMax(categories);
  const compared = heading.averageCents !== null;

  return (
    <SectionCard>
      <SectionHeader title="O que mudou" />
      <div className="flex flex-col gap-1">
        <p className="text-heading">{headingSentence(month, heading)}</p>
        {heading.inProgress ? <p className="text-xs text-muted-foreground">Mês em andamento</p> : null}
        {compared ? null : <p className="text-sm text-muted-foreground">Ainda não há meses anteriores para comparar.</p>}
      </div>
      {categories.length === 0 ? (
        <EmptyState compact>Nenhum gasto neste mês.</EmptyState>
      ) : (
        <>
          <Legend
            label="Cores dos grupos"
            items={[
              { label: groupNames.needs, color: BUCKET_COLORS.needs },
              { label: groupNames.wants, color: BUCKET_COLORS.wants },
              { label: 'Sem grupo', color: UNCLASSIFIED_COLOR },
            ]}
          />
          {compared ? <p className="text-xs text-muted-foreground">O traço em cada barra marca a média.</p> : null}
          <ul aria-label="Categorias" className="flex flex-col gap-3">
            {categories.map((row) => (
              <li key={row.categoryId ?? 'sem-categoria'}>
                <CategoryChangeRow row={row} max={max} carried={carried} />
              </li>
            ))}
          </ul>
        </>
      )}
      <NewSellers sellers={data.newSellers} carried={carried} />
      <UnusualLines lines={data.unusual} carried={carried} />
    </SectionCard>
  );
}
