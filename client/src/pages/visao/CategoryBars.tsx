import { useBucketLabels, useCategories } from '@/api/queries';
import type { CategorySpending } from '@/api/types';
import { useTransacoesLink } from '@/app/view';
import { Legend } from '@/components/bars/Legend';
import { ShareBar } from '@/components/bars/ShareBar';
import { Money } from '@/components/Money';
import { RowChevron, RowLink } from '@/components/RowLink';
import { SectionCard, SectionHeader } from '@/components/SectionCard';
import { EmptyState, ErrorState } from '@/components/States';
import { BUCKET_COLORS, UNCLASSIFIED_COLOR } from '@/lib/colors';

/**
 * Spending by category, largest first, each bar in its group's colour, with a legend naming the colours.
 * At 375 px the row is 303 px: name 96 + amount 104 + arrow 16 + three 8 px gaps leave the bar 63 px
 * (at least 48 px), where the wider name column and 12 px gaps of sm and up would leave it 27.
 */
export function CategoryBars({ items }: { items: CategorySpending[] }) {
  const linkTo = useTransacoesLink();
  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data ?? [];
  const bucketOf = new Map(categories.map((category) => [category.id, category.bucket]));
  const max = Math.max(0, ...items.map((item) => item.amountCents));
  const groupNames = useBucketLabels();

  return (
    <SectionCard>
      <SectionHeader title="Gastos por categoria" />
      {categoriesQuery.isError ? (
        <ErrorState inline error={categoriesQuery.error} onRetry={() => void categoriesQuery.refetch()} />
      ) : null}
      {items.length === 0 ? (
        <EmptyState compact>Nenhum gasto neste mês.</EmptyState>
      ) : (
        <>
          <Legend
            label="Cores dos grupos"
            items={[
              { label: groupNames.needs, color: BUCKET_COLORS.needs },
              { label: groupNames.wants, color: BUCKET_COLORS.wants },
              { label: groupNames.savings, color: BUCKET_COLORS.savings },
              { label: 'Sem grupo', color: UNCLASSIFIED_COLOR },
            ]}
          />
          <ul className="flex flex-col gap-2.5">
            {items.map((item) => {
              const bucket = item.categoryId ? (bucketOf.get(item.categoryId) ?? null) : null;
              return (
                <li key={item.categoryId ?? 'sem-categoria'}>
                  <RowLink
                    to={linkTo({ kind: 'expense', categoryId: item.categoryId ?? 'none' })}
                    aria-label={item.categoryName ? `Ver gastos em ${item.categoryName}` : 'Ver gastos sem categoria'}
                    className="group grid grid-cols-[6rem_1fr_6.5rem_1rem] items-start gap-2 sm:grid-cols-[7.5rem_1fr_6.5rem_1rem] sm:gap-3"
                  >
                    <span title={item.categoryName ?? 'Sem categoria'} className="line-clamp-2 break-words">{item.categoryName ?? 'Sem categoria'}</span>
                    {/* mt-1 centres the 12 px bar on the name's first 20 px line, so a second line does not move it. */}
                    <ShareBar value={item.amountCents} max={max} color={bucket ? BUCKET_COLORS[bucket] : UNCLASSIFIED_COLOR} className="mt-1" />
                    <Money cents={item.amountCents} kind="expense" />
                    {/* mt-0.5 centres the 16 px arrow on the first 20 px line. */}
                    <RowChevron className="mt-0.5" />
                  </RowLink>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </SectionCard>
  );
}
