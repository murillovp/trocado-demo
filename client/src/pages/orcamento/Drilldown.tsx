import { Settings } from 'lucide-react';
import { useBucketLabels } from '@/api/queries';
import type { BudgetView, CategoryBucket } from '@/api/types';
import { useTransacoesLink, useViewPath } from '@/app/view';
import { ShareBar } from '@/components/bars/ShareBar';
import { IconLink } from '@/components/IconButton';
import { Money } from '@/components/Money';
import { RowLink } from '@/components/RowLink';
import { SectionCard, SectionHeader } from '@/components/SectionCard';
import { EmptyState } from '@/components/States';
import { TextLink } from '@/components/TextLink';
import { BUCKET_COLORS, UNCLASSIFIED_COLOR } from '@/lib/colors';
import { formatPct, formatReais } from '@/lib/format';
import type { LinkFilters } from '@/lib/transacoesLink';

export type Pile = CategoryBucket | 'unclassified';

/**
 * What sits inside one pile, largest first (spec 4a, drill-down). The header's settings icon opens
 * Categorias, where a category gets its group; the footer holds the Sem grupo shortcut (only while
 * that amount is not zero) and, at the right, the link to the pile's lines.
 */
export function Drilldown({
  view,
  pile,
  onSelect,
}: {
  view: BudgetView;
  pile: Pile;
  onSelect: (pile: Pile) => void;
}) {
  const linkTo = useTransacoesLink();
  const viewPath = useViewPath();
  const labels = useBucketLabels();
  const bucket = pile === 'unclassified' ? null : view.buckets.find((candidate) => candidate.bucket === pile);
  const items = pile === 'unclassified' ? view.unclassified.items : (bucket?.items ?? []);
  const total = pile === 'unclassified' ? view.unclassified.actualCents : (bucket?.actualCents ?? 0);
  const label = pile === 'unclassified' ? 'Sem grupo' : labels[pile];
  const color = pile === 'unclassified' ? UNCLASSIFIED_COLOR : BUCKET_COLORS[pile];
  const max = Math.max(0, ...items.map((item) => item.amountCents));

  return (
    <SectionCard>
      <SectionHeader
        title={`Dentro de ${label}`}
        action={
          <IconLink label="Classificar categorias" to={viewPath('/configuracoes/categorias')}>
            <Settings aria-hidden="true" />
          </IconLink>
        }
      />
      {items.length === 0 ? (
        <EmptyState compact>Nada em {label} neste mês.</EmptyState>
      ) : (
        <ul aria-label={`Categorias em ${label}`} className="flex flex-col gap-2.5">
          {items.map((item) => {
            const name = item.categoryName ?? item.savingsLabel ?? 'sem categoria';
            const filters: LinkFilters = { bucket: pile, categoryId: item.categoryId ?? 'none' };
            if (item.categoryId === null) filters.savingsLabel = item.savingsLabel ?? '';
            return (
              <li key={`${item.categoryId ?? ''}-${item.savingsLabel ?? ''}`}>
                <RowLink
                  to={linkTo(filters)}
                  aria-label={`Ver lançamentos de ${name}`}
                  className="group grid grid-cols-[1fr_4rem_6.5rem] items-start gap-3 md:grid-cols-[12rem_1fr_4rem_6.5rem]"
                >
                  <span title={item.categoryName ?? item.savingsLabel ?? 'Sem categoria'} className="line-clamp-2 break-words">{item.categoryName ?? item.savingsLabel ?? 'Sem categoria'}</span>
                  {/* mt-1 centres the 12 px bar on the name's first 20 px line, so a second line does not move it. */}
                  <ShareBar value={item.amountCents} max={max} color={color} className="mt-1 hidden md:block" />
                  <span className="text-right text-muted-foreground">{formatPct(item.shareOfBucketPct)}</span>
                  <Money cents={item.amountCents} tone={pile === 'savings' ? 'savings' : 'plain'} />
                </RowLink>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3 border-t pt-3 text-sm">
        {pile === 'unclassified' || view.unclassified.actualCents === 0 ? null : (
          <button type="button" className="underline underline-offset-4" onClick={() => onSelect('unclassified')}>
            Sem grupo: {formatReais(view.unclassified.actualCents)} em categorias sem grupo
          </button>
        )}
        <TextLink to={linkTo({ bucket: pile })} aria-label={`Ver lançamentos de ${label}`} className="ml-auto">
          Ver os lançamentos ({formatReais(total)})
        </TextLink>
      </div>
    </SectionCard>
  );
}
