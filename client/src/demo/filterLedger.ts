import type { LedgerLine } from '../../../shared/contract/lines';
import type { LedgerQuery } from '../../../shared/contract/requests';
import { normalizeName, splitIdList } from '../../../shared/text';

type CategoryBuckets = ReadonlyMap<string, string | null>;

/** The day or month a line falls in; a day wins over a month, as on the server. */
function inSpan(line: LedgerLine, query: LedgerQuery): boolean {
  if (query.date !== undefined) return line.date === query.date;
  if (query.month !== undefined) return line.date.startsWith(`${query.month}-`);
  return true;
}

function matchesBucket(line: LedgerLine, bucket: string | undefined, buckets: CategoryBuckets): boolean {
  if (bucket === undefined) return true;
  const categoryBucket = line.categoryId ? (buckets.get(line.categoryId) ?? null) : null;
  if (bucket === 'needs' || bucket === 'wants') return line.kind === 'expense' && categoryBucket === bucket;
  if (bucket === 'savings') return line.kind === 'savings' || (line.kind === 'expense' && categoryBucket === 'savings');
  return line.kind === 'expense' && categoryBucket === null;
}

function matchesSearch(line: LedgerLine, search: string | undefined): boolean {
  if (!search) return true;
  const needle = normalizeName(search);
  return [line.nickname ?? '', line.vendorName, line.rawDescription].some((text) => normalizeName(text).includes(needle));
}

/**
 * The lines a Transações query finds among all of the demo's lines. It follows the
 * server's rules for each filter, so the screen behaves as it does with a live server.
 */
export function filterLedger(lines: readonly LedgerLine[], query: LedgerQuery, buckets: CategoryBuckets): LedgerLine[] {
  const accountIds = splitIdList(query.accountIds);
  return lines.filter(
    (line) =>
      inSpan(line, query) &&
      (query.personId === undefined || line.personId === query.personId) &&
      (query.accountId === undefined || line.accountId === query.accountId) &&
      (accountIds.length === 0 || accountIds.includes(line.accountId)) &&
      (query.tagId === undefined || line.tags.some((tag) => tag.id === query.tagId)) &&
      (query.categoryId === undefined || (query.categoryId === 'none' ? line.categoryId === null : line.categoryId === query.categoryId)) &&
      (query.kind === undefined || (query.kind === 'unset' ? line.kind === null : line.kind === query.kind)) &&
      matchesBucket(line, query.bucket, buckets) &&
      (query.savingsLabel === undefined || (query.savingsLabel === '' ? line.savingsLabel === null : line.savingsLabel === query.savingsLabel)) &&
      matchesSearch(line, query.search),
  );
}
