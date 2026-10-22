import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ErrorState, LoadingState } from '@/components/States';
import { cn } from '@/lib/utils';

/** What a dimmed block looks like while old data stands in for new. Kept in one place so every screen dims the same way. */
export const STALE_CLASSES = 'opacity-60 transition-opacity motion-reduce:transition-none';

/** The part of a query result that `QueryView` reads. */
export type QueryState<T> = Pick<UseQueryResult<T, Error>, 'data' | 'error' | 'isError' | 'isPlaceholderData' | 'refetch'>;

type Props<T> = {
  query: QueryState<T>;
  /** Shown above the answer in every state: loading, error and content. A function gets the data once there is some. */
  header?: ReactNode | ((data: T | undefined) => ReactNode);
  /** Shown on the first load. The default is the plain "Carregando…"; `null` shows nothing. */
  loading?: ReactNode;
  /** The small error line, for a block that sits inside a card. */
  inline?: boolean;
  /** Replaces the content wrapper's classes. The default spaces the children like the page does. */
  className?: string;
  children: (data: T) => ReactNode;
};

/**
 * The one way a screen shows a read: the header, then the loading placeholder,
 * the error with a retry, or the content. A failed first read shows its error
 * where the content would be, never an empty or a forever-loading block. A failed
 * reload keeps the content it already has and shows a one-line error above it, so
 * what the person typed or opened stays. While
 * a new answer loads and the last one stands in, the content is dimmed and
 * marked busy, so old numbers never pass as new ones.
 */
export function QueryView<T>({ query, header, loading, inline = false, className, children }: Props<T>) {
  const head = typeof header === 'function' ? header(query.data) : header;
  const retry = () => void query.refetch();
  if (query.isError && query.data === undefined) {
    return (
      <>
        {head}
        <ErrorState inline={inline} error={query.error} onRetry={retry} />
      </>
    );
  }
  if (query.data === undefined) {
    return (
      <>
        {head}
        {loading === undefined ? <LoadingState /> : loading}
      </>
    );
  }
  const stale = query.isPlaceholderData;
  return (
    <>
      {head}
      {query.isError ? <ErrorState inline error={query.error} onRetry={retry} /> : null}
      <div aria-busy={stale || undefined} className={cn(className ?? 'flex flex-col gap-6', stale && STALE_CLASSES)}>
        {children(query.data)}
      </div>
    </>
  );
}
