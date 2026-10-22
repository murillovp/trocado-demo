import { keepPreviousData, skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from './client';
import * as endpoints from './endpoints';
import type {
  AnalysisMonthAnswer,
  AnalysisMonthQuery,
  AnalysisTagsAnswer,
  AnalysisTagsQuery,
  AnalysisWeekAnswer,
  AnalysisYearAnswer,
  BucketLabels,
  BudgetView,
  LedgerQuery,
  MonthReport,
  MonthTotals,
  TransactionsAnswer,
} from './types';
import { DEFAULT_BUCKET_LABELS } from '@/lib/labels';

/**
 * Every query key, in one place. The report keys end with the person, which
 * `keepWhileSamePerson` relies on. `imports` is a prefix of `importReview`, so
 * invalidating the list also reaches one import's review.
 */
export const keys = {
  people: ['people'] as const,
  household: ['household'] as const,
  integrity: ['integrity'] as const,
  accounts: ['accounts'] as const,
  categories: ['categories'] as const,
  tags: ['tags'] as const,
  monthReport: (month: string, personId?: string) => ['reports', 'month', month, personId ?? 'casa'],
  history: (month: string, personId?: string) => ['reports', 'history', month, personId ?? 'casa'],
  budget: (month: string, personId: string | undefined) => ['reports', 'budget', month, personId],
  analysisMonth: (query: AnalysisMonthQuery) => ['analysis', 'month', query, query.personId ?? 'casa'],
  analysisYear: (query: AnalysisMonthQuery) => ['analysis', 'year', query, query.personId ?? 'casa'],
  analysisWeek: (query: AnalysisMonthQuery) => ['analysis', 'week', query, query.personId ?? 'casa'],
  analysisTags: (query: AnalysisTagsQuery) => ['analysis', 'tags', query, query.personId ?? 'casa'],
  installments: ['installments'] as const,
  transactions: (query: LedgerQuery) => ['transactions', query],
  imports: ['imports'] as const,
  latestMonth: ['months', 'latest'] as const,
  importReview: (id: string) => ['imports', id],
  vendors: ['vendors'] as const,
  settings: ['settings'] as const,
};

export function usePeople() {
  return useQuery({
    queryKey: keys.people,
    queryFn: ({ signal }) => endpoints.listPeople(signal).then((answer) => answer.people),
  });
}

export function useHousehold() {
  return useQuery({
    queryKey: keys.household,
    queryFn: ({ signal }) => endpoints.getHousehold(signal).then((answer) => answer.household),
  });
}

/**
 * The 50/30/20 group names. While they load, or if they fail to, the default
 * names stand in: a name is never worth an error box.
 */
export function useBucketLabels(): BucketLabels {
  return useHousehold().data?.bucketLabels ?? DEFAULT_BUCKET_LABELS;
}

/** The rules the stored data breaks. An empty list means all is well. */
export function useIntegrity() {
  return useQuery({
    queryKey: keys.integrity,
    queryFn: ({ signal }) => endpoints.getIntegrity(signal).then((answer) => answer.problems),
  });
}

export function useAccounts() {
  return useQuery({
    queryKey: keys.accounts,
    queryFn: ({ signal }) => endpoints.listAccounts(signal).then((answer) => answer.accounts),
  });
}

/** The categories in use. Archived ones are left out. */
export function useCategories() {
  return useQuery({
    queryKey: keys.categories,
    queryFn: ({ signal }) => endpoints.listCategories(signal).then((answer) => answer.categories),
  });
}

/**
 * The household's tags, each with how many lines carry it, sorted as the server sends them.
 * A server that does not know tags fails this query, and the screens then hide their tag controls.
 */
export function useTags() {
  return useQuery({
    queryKey: keys.tags,
    queryFn: ({ signal }) => endpoints.listTags(signal).then((answer) => answer.tags),
  });
}

/**
 * Keeps the last answer on screen while the next month loads, so the page does
 * not blank out on every step. Another person's answer is never kept: it would
 * sit under the wrong name. Every report key ends with the person.
 */
function keepWhileSamePerson<T>(person: string | undefined) {
  return (previous: T | undefined, previousQuery: { queryKey: readonly unknown[] } | undefined): T | undefined =>
    previousQuery?.queryKey.at(-1) === person ? previous : undefined;
}

// Queries with `placeholderData` name their data type: with `signal` in `queryFn`, TypeScript no longer infers it.
export function useMonthReport(month: string, personId?: string) {
  return useQuery<MonthReport>({
    queryKey: keys.monthReport(month, personId),
    queryFn: ({ signal }) => endpoints.getMonthReport({ month, personId }, signal),
    placeholderData: keepWhileSamePerson<MonthReport>(personId ?? 'casa'),
  });
}

export function useHistory(month: string, personId?: string) {
  return useQuery<MonthTotals[]>({
    queryKey: keys.history(month, personId),
    queryFn: ({ signal }) =>
      endpoints.getHistory({ month, personId }, signal).then((answer) => answer.months),
    placeholderData: keepWhileSamePerson<MonthTotals[]>(personId ?? 'casa'),
  });
}

/** One person's 50/30/20 view. Waits until a person is known. */
export function useBudget(month: string, personId: string | undefined) {
  return useQuery<BudgetView>({
    queryKey: keys.budget(month, personId),
    queryFn: personId === undefined ? skipToken : ({ signal }) => endpoints.getBudget({ month, personId }, signal),
    placeholderData: keepWhileSamePerson<BudgetView>(personId),
  });
}

/**
 * One month of Análise for the filters in `query`. The last answer stays on screen, dimmed, while a
 * changed filter or month loads; another person's answer never does (the key ends with the person).
 */
export function useAnalysisMonth(query: AnalysisMonthQuery) {
  return useQuery<AnalysisMonthAnswer>({
    queryKey: keys.analysisMonth(query),
    queryFn: ({ signal }) => endpoints.getAnalysisMonth(query, signal),
    placeholderData: keepWhileSamePerson<AnalysisMonthAnswer>(query.personId ?? 'casa'),
  });
}

/**
 * The year view of Análise: a table of the twelve months ending with `query.month`, and Destaques. Keeps its last answer
 * on screen while a changed filter or month loads, for the same person only, as `useAnalysisMonth` does.
 */
export function useAnalysisYear(query: AnalysisMonthQuery) {
  return useQuery<AnalysisYearAnswer>({
    queryKey: keys.analysisYear(query),
    queryFn: ({ signal }) => endpoints.getAnalysisYear(query, signal),
    placeholderData: keepWhileSamePerson<AnalysisYearAnswer>(query.personId ?? 'casa'),
  });
}

/**
 * The week view of Análise: spending by weekday and by part of the month over the same twelve months. Keeps its
 * last answer on screen while a changed filter or month loads, for the same person only.
 */
export function useAnalysisWeek(query: AnalysisMonthQuery) {
  return useQuery<AnalysisWeekAnswer>({
    queryKey: keys.analysisWeek(query),
    queryFn: ({ signal }) => endpoints.getAnalysisWeek(query, signal),
    placeholderData: keepWhileSamePerson<AnalysisWeekAnswer>(query.personId ?? 'casa'),
  });
}

/**
 * Every tag with its totals for the subject, and with `tagId` the split of that one tag by category.
 * `enabled: false` skips the call, for a screen that has no tag selected. The list keeps its last answer
 * on screen while it reloads, for the same person only. A tag's detail never borrows another tag's answer.
 */
export function useAnalysisTags(query: AnalysisTagsQuery, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<AnalysisTagsAnswer>({
    queryKey: keys.analysisTags(query),
    queryFn: ({ signal }) => endpoints.getAnalysisTags(query, signal),
    placeholderData: query.tagId === undefined ? keepWhileSamePerson<AnalysisTagsAnswer>(query.personId ?? 'casa') : undefined,
    enabled,
  });
}

export function useInstallments() {
  return useQuery({
    queryKey: keys.installments,
    queryFn: ({ signal }) => endpoints.getInstallments(signal),
  });
}

export function useTransactions(query: LedgerQuery) {
  return useQuery<TransactionsAnswer>({
    queryKey: keys.transactions(query),
    queryFn: ({ signal }) => endpoints.listTransactions(query, signal),
    placeholderData: keepPreviousData,
  });
}

export function useImports() {
  return useQuery({
    queryKey: keys.imports,
    queryFn: ({ signal }) => endpoints.listImports(signal).then((answer) => answer.imports),
  });
}

/**
 * The latest month with lines outside review, or null when there is none. A server
 * that does not know the route answers like one with no lines. Never retried and
 * never paused offline: the app opens on the calendar month rather than wait.
 */
export function useLatestMonth(enabled = true) {
  return useQuery({
    queryKey: keys.latestMonth,
    queryFn: ({ signal }) =>
      endpoints.getLatestMonth(signal).then(
        (answer) => answer.month,
        (error: unknown) => {
          if (error instanceof ApiError && error.status === 404) return null;
          throw error;
        },
      ),
    enabled,
    retry: false,
    // An offline browser would otherwise pause the request and keep the app waiting; the wait has its own limit.
    networkMode: 'always',
  });
}

export function useImportReview(id: string) {
  return useQuery({
    queryKey: keys.importReview(id),
    queryFn: ({ signal }) => endpoints.getImportReview(id, signal),
  });
}

export function useVendors() {
  return useQuery({
    queryKey: keys.vendors,
    queryFn: ({ signal }) => endpoints.listVendors(signal).then((answer) => answer.vendors),
  });
}

/** The household's settings. A stored secret shows only as `<key>_set: "true"`. */
export function useSettings() {
  return useQuery({
    queryKey: keys.settings,
    queryFn: ({ signal }) => endpoints.getSettings(signal).then((answer) => answer.settings),
  });
}

/**
 * Every change the screens make goes through here. After a change succeeds,
 * every query refetches, so no screen keeps an old number (plan decision 5).
 * The change counts as done only when that refetch has finished, so `isPending`
 * (and a button's spinner) holds until the fresh data is on screen. The caller's
 * own `onSuccess` runs after that.
 */
export function useChange<TInput, TResult>(
  send: (input: TInput) => Promise<TResult>,
  options: { onSuccess?: (result: TResult, input: TInput) => void; toastErrors?: boolean } = {},
) {
  const queryClient = useQueryClient();
  return useMutation<TResult, ApiError, TInput>({
    mutationFn: send,
    onSuccess: async (result, input) => {
      await queryClient.invalidateQueries();
      options.onSuccess?.(result, input);
    },
    onError: (error) => {
      if (options.toastErrors !== false) toast.error(error.message);
    },
  });
}

/**
 * A call that asks the server something and changes nothing, such as telling
 * which kind of file was picked. Unlike `useChange`, it refetches no query and
 * leaves errors to the caller.
 */
export function useServerCall<TInput, TResult>(
  send: (input: TInput) => Promise<TResult>,
  options: { onSuccess?: (result: TResult, input: TInput) => void } = {},
) {
  return useMutation<TResult, ApiError, TInput>({ mutationFn: send, onSuccess: options.onSuccess });
}
