import type { AnalysisMonthAnswer } from '@/api/types';
import { Money } from '@/components/Money';
import { RowLink } from '@/components/RowLink';
import { SectionCard, SectionHeader } from '@/components/SectionCard';
import { TextLink } from '@/components/TextLink';
import type { LinkFilters } from '@/lib/transacoesLink';
import { useAnaliseFilters } from './useAnaliseFilters';

type Props = {
  data: AnalysisMonthAnswer;
  /** Análise's current filters; the tag on, if any, shows as selected. */
  carried: LinkFilters;
};

/**
 * "Tags no mês": each tag with spending this month, largest first. Selecting one filters Análise by it,
 * and a link opens the Tags page. A line can carry several tags, so the amounts do not add up.
 * Left out when no tag has spending this month.
 */
export function TagsInMonth({ data, carried }: Props) {
  const { setTagId } = useAnaliseFilters();
  if (data.tags.length === 0) return null;
  return (
    <SectionCard>
      <SectionHeader
        title="Tags no mês"
        action={
          <TextLink to="/configuracoes/tags" className="text-sm">
            Ver todas as tags
          </TextLink>
        }
      />
      <ul aria-label="Tags" className="flex flex-col gap-1">
        {data.tags.map((tag) => (
          <li key={tag.tagId}>
            <RowLink
              selected={carried.tagId === tag.tagId}
              onClick={() => setTagId(tag.tagId)}
              title="Filtrar Análise por esta tag"
              className="flex w-full items-center gap-2"
            >
              <span className="line-clamp-2 min-w-0 flex-1 break-words">{tag.tagName}</span>
              <Money cents={tag.spendingCents} kind="expense" />
            </RowLink>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Um lançamento pode ter mais de uma tag, então estes valores não se somam.</p>
    </SectionCard>
  );
}
