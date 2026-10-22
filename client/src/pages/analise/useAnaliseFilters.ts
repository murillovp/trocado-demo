import { useSearchParams } from 'react-router';
import { readLinkFilters, withLinkFilters, type BucketFilter, type LinkFilters } from '@/lib/transacoesLink';

/** The groups Análise filters by. Poupança is left out: its lines are savings, which Análise does not count (ADR-0012). */
export const ANALISE_BUCKETS: readonly BucketFilter[] = ['needs', 'wants', 'unclassified'];

/** The four filters of the month view, as the address holds them. */
export type AnaliseFilterValues = {
  /** Account ids, or an empty list for every account. */
  accountIds: string[];
  bucket: BucketFilter | undefined;
  /** A category id, 'none' for lines with no category, or '' for any. */
  categoryId: string;
  /** A tag id, or '' for any. */
  tagId: string;
};

/** The filters as a Transações link carries them, so a link from Análise opens on the same lines. */
export function carriedFilters(values: AnaliseFilterValues): LinkFilters {
  return {
    accountIds: values.accountIds.length > 0 ? values.accountIds : undefined,
    bucket: values.bucket,
    categoryId: values.categoryId === '' ? undefined : values.categoryId,
    tagId: values.tagId === '' ? undefined : values.tagId,
  };
}

/** How many of the four filters are on. */
export function countAnaliseFilters(values: AnaliseFilterValues): number {
  return [values.accountIds.length > 0, values.bucket !== undefined, values.categoryId !== '', values.tagId !== ''].filter(Boolean).length;
}

/**
 * The filters of Análise, kept in the address under the names Transações uses
 * (`contas`, `balde`, `categoria`, `tag`), so a link between the two screens carries them.
 * A change adds a history entry, so Back undoes it. The month and person stay untouched.
 */
export function useAnaliseFilters() {
  const [params, setParams] = useSearchParams();
  const link = readLinkFilters(params);
  const values: AnaliseFilterValues = {
    accountIds: link.accountIds ?? [],
    bucket: link.bucket !== undefined && ANALISE_BUCKETS.includes(link.bucket) ? link.bucket : undefined,
    categoryId: link.categoryId ?? '',
    tagId: link.tagId ?? '',
  };

  function change(patch: Partial<LinkFilters>) {
    setParams((current) => {
      const now = readLinkFilters(current);
      return withLinkFilters(current, {
        accountIds: now.accountIds,
        bucket: now.bucket,
        categoryId: now.categoryId,
        tagId: now.tagId,
        ...patch,
      });
    });
  }

  return {
    values,
    setAccountIds: (accountIds: string[]) => change({ accountIds: accountIds.length > 0 ? accountIds : undefined }),
    setBucket: (bucket: BucketFilter | undefined) => change({ bucket }),
    setCategoryId: (categoryId: string) => change({ categoryId: categoryId || undefined }),
    setTagId: (tagId: string) => change({ tagId: tagId || undefined }),
    /** Drops every filter. Replaces the entry, so a reload or Back does not bring them back. */
    clear: () => setParams((current) => withLinkFilters(current, {}), { replace: true }),
  };
}
