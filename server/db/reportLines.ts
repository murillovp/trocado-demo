import { and, asc, count, eq, gte, inArray, isNull, lt, type SQL } from 'drizzle-orm';
import type { CategoryBucket } from '../../shared/types';
import type { DbExecutor } from './client';
import { outsideReview } from './lineFilters';
import { accounts, categories, imports, transactions, transactionTags, vendors } from './schema';

/** The kinds that count in reports. Transfers never do. */
export type CountedKind = 'expense' | 'income' | 'savings';

const COUNTED_KINDS: CountedKind[] = ['expense', 'income', 'savings'];

/** What the report math needs from one line, and nothing else. */
export type ReportLine = {
  id: string;
  date: string;
  /** The amount that counts: the user's when he changed it, else the bank's. */
  amountCents: number;
  kind: CountedKind;
  categoryId: string | null;
  categoryName: string | null;
  bucket: CategoryBucket | null;
  savingsLabel: string | null;
  personId: string;
  accountId: string;
  /** The seller rule the line follows; null on a line with no seller (a hand-added one). */
  vendorId: string | null;
  /** The name the bank printed; '' on a line with no seller. */
  vendorName: string;
  /** The readable name the seller rule gives, when there is one. */
  vendorNickname: string | null;
  /** Which slice of an installment plan this line is; null on any other line. */
  installmentNumber: number | null;
  /** The ids of the tags on the line. Tags never change what a line counts for. */
  tagIds: string[];
};

/**
 * Every line that counts in reports, dated inside the span: an expense, income
 * or savings line entered by hand or in a confirmed import. Oldest first.
 */
export function listCountedLines(
  db: DbExecutor,
  householdId: string,
  span: { start: string; endExclusive: string },
): ReportLine[] {
  const tagIdsByLine = listTagIdsByLine(db, householdId, span);
  return db
    .select({
      id: transactions.id,
      date: transactions.date,
      amountCents: transactions.amountCents,
      adjustedAmountCents: transactions.adjustedAmountCents,
      kind: transactions.kind,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      bucket: categories.bucket,
      savingsLabel: transactions.savingsLabel,
      personId: accounts.personId,
      accountId: transactions.accountId,
      vendorId: transactions.vendorId,
      vendorName: transactions.vendorName,
      vendorNickname: vendors.nickname,
      installmentNumber: transactions.installmentNumber,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(imports, eq(transactions.importId, imports.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(vendors, eq(transactions.vendorId, vendors.id))
    .where(
      and(
        eq(transactions.householdId, householdId),
        gte(transactions.date, span.start),
        lt(transactions.date, span.endExclusive),
        inArray(transactions.kind, COUNTED_KINDS),
        outsideReview(),
      ),
    )
    .orderBy(asc(transactions.date), asc(transactions.id))
    .all()
    .map(({ adjustedAmountCents, ...rest }) => ({
      ...rest,
      amountCents: adjustedAmountCents ?? rest.amountCents,
      kind: rest.kind as CountedKind,
      tagIds: tagIdsByLine.get(rest.id) ?? [],
    }));
}

/** The tag ids on each line dated inside the span. Lines with no tag are not in the map. */
function listTagIdsByLine(
  db: DbExecutor,
  householdId: string,
  span: { start: string; endExclusive: string },
): Map<string, string[]> {
  const rows = db
    .select({ transactionId: transactionTags.transactionId, tagId: transactionTags.tagId })
    .from(transactionTags)
    .innerJoin(transactions, eq(transactionTags.transactionId, transactions.id))
    .where(
      and(
        eq(transactions.householdId, householdId),
        gte(transactions.date, span.start),
        lt(transactions.date, span.endExclusive),
      ),
    )
    .orderBy(asc(transactionTags.tagId))
    .all();
  const byLine = new Map<string, string[]>();
  for (const { transactionId, tagId } of rows) byLine.set(transactionId, [...(byLine.get(transactionId) ?? []), tagId]);
  return byLine;
}

/** How many lines in the span still wait for the user to choose a kind, for the household or for one person. */
export function countUnsetLines(
  db: DbExecutor,
  householdId: string,
  span: { start: string; endExclusive: string },
  personId?: string,
): number {
  const conditions: SQL[] = [
    eq(transactions.householdId, householdId),
    gte(transactions.date, span.start),
    lt(transactions.date, span.endExclusive),
    isNull(transactions.kind),
    outsideReview(),
  ];
  if (personId !== undefined) conditions.push(eq(accounts.personId, personId));

  const row = db
    .select({ lines: count() })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(imports, eq(transactions.importId, imports.id))
    .where(and(...conditions))
    .get();
  return row?.lines ?? 0;
}
