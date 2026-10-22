import { useSearchParams } from 'react-router';
import type { KindFilter } from '@/lib/lines';
import { readLinkFilters, withLinkFilters, type FilterValues, type LinkFilters } from '@/lib/transacoesLink';

/**
 * The filters on Transações, kept in the address (`busca`, `tipo`, `categoria`,
 * `contas`, `balde`, `rotulo`, `tag`, `dia`, `meses`). A change adds a history entry, so Back undoes it.
 * The search text replaces the entry instead, because every pause in typing
 * would otherwise leave an entry behind. The month and person stay untouched.
 */
export function useTransacoesFilters() {
  const [params, setParams] = useSearchParams();
  const link = readLinkFilters(params);
  const values: FilterValues = {
    search: link.search ?? '',
    accountIds: link.accountIds ?? [],
    categoryId: link.categoryId ?? '',
    kind: link.kind ?? '',
    bucket: link.bucket,
    savingsLabel: link.savingsLabel,
    tagId: link.tagId ?? '',
    date: link.date ?? '',
    allMonths: link.allMonths === true,
  };

  function change(patch: LinkFilters, replace = false) {
    setParams((current) => withLinkFilters(current, { ...readLinkFilters(current), ...patch }), { replace });
  }

  return {
    values,
    setSearch: (search: string) => change({ search }, true),
    setKind: (kind: KindFilter) => change({ kind: kind || undefined }),
    setAccountIds: (accountIds: string[]) => change({ accountIds: accountIds.length > 0 ? accountIds : undefined }),
    setCategoryId: (categoryId: string) => change({ categoryId: categoryId || undefined }),
    removeBucket: () => change({ bucket: undefined }),
    removeSavingsLabel: () => change({ savingsLabel: undefined }),
    setTagId: (tagId: string) => change({ tagId: tagId || undefined }),
    removeDate: () => change({ date: undefined }),
    removeAllMonths: () => change({ allMonths: undefined }),
    /** Drops every filter. Replaces the entry, so a reload or Back does not bring them back. */
    clear: () => setParams((current) => withLinkFilters(current, {}), { replace: true }),
  };
}
