import type { TransactionsAnswer } from '../../../shared/contract/answers';
import type { LedgerQuery } from '../../../shared/contract/requests';
import { snapshotName, splitRequestPath } from '../../../shared/demoSnapshot';
import { summarizeLines } from '../../../shared/lineSummary';
import { ApiError } from '../api/client';
import { filterLedger } from './filterLedger';

const DATA_URL = `${import.meta.env.BASE_URL}demo-data/`;

export const DEMO_READ_ONLY_MESSAGE = 'Esta é uma demonstração com dados de exemplo. Nada pode ser alterado.';
const MISSING_VIEW_MESSAGE = 'Essa combinação de filtros não está na demonstração.';

const cache = new Map<string, Promise<unknown>>();

function loadFile<T>(name: string, signal?: AbortSignal): Promise<T> {
  const cached = cache.get(name);
  if (cached) return cached as Promise<T>;
  const request = fetch(`${DATA_URL}${name}`, { signal }).then(async (response) => {
    if (!response.ok) throw new ApiError('not_found', MISSING_VIEW_MESSAGE, response.status);
    return (await response.json()) as T;
  });
  // A cancelled or failed request must not stay cached, or the next try would get the same failure.
  request.catch(() => cache.delete(name));
  cache.set(name, request);
  return request;
}

async function listDemoTransactions(query: LedgerQuery, signal?: AbortSignal): Promise<TransactionsAnswer> {
  const [all, categories] = await Promise.all([
    loadFile<TransactionsAnswer>('transactions.json', signal),
    loadFile<{ categories: { id: string; bucket: string | null }[] }>('categories.json', signal),
  ]);
  const buckets = new Map(categories.categories.map((category) => [category.id, category.bucket]));
  const transactions = filterLedger(all.transactions, query, buckets);
  return { transactions, summary: summarizeLines(transactions) };
}

/** Answers a read the way the server would, from the files saved when the demo was built. */
export function readDemo<T>(requestPath: string, signal?: AbortSignal): Promise<T> {
  const { path, params } = splitRequestPath(requestPath);
  if (path === '/api/transactions') {
    // `savingsLabel=` (empty) means "no label", so it is kept, unlike the other empty values.
    const query = Object.fromEntries(params.entries()) as LedgerQuery;
    return listDemoTransactions(query, signal) as Promise<T>;
  }
  return loadFile<T>(snapshotName(path, params), signal);
}
