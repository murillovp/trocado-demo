import { and, asc, count, desc, eq, gte, inArray, isNull, lt, max, or, sql, type SQL } from 'drizzle-orm';
import { kindFitsAmount } from '../../shared/kindRule';
import type { CategoryBucket, TransactionKind } from '../../shared/types';
import type { DbExecutor } from './client';
import { outsideReview } from './lineFilters';
import { accounts, categories, imports, installmentPlans, people, transactions, transactionTags, vendors } from './schema';
import type { VendorSource } from './vendors';

export type LedgerFilters = {
  id?: string;
  start?: string;
  endExclusive?: string;
  personId?: string;
  accountId?: string;
  /** Any of these accounts. Together with `accountId`, a line must match both. */
  accountIds?: string[];
  /** Only lines carrying this tag. */
  tagId?: string;
  /** A category id, or 'none' for lines with no category. */
  categoryId?: string;
  /** `unset` finds lines still waiting for a kind. */
  kind?: TransactionKind | 'unset';
  /** The budget pile a line lands in, the same rule as `pileOf` in server/services/reports/budget.ts. */
  bucket?: CategoryBucket | 'unclassified';
  /** A savings label; '' finds lines with no label. */
  savingsLabel?: string;
};

export type LedgerRow = {
  id: string;
  date: string;
  /** The bank's amount. */
  amountCents: number;
  /** the user's amount for the line, when he changed it. */
  adjustedAmountCents: number | null;
  rawDescription: string;
  vendorName: string;
  /** The seller rule the line follows, and who wrote it; null on a line with no seller. */
  vendorId: string | null;
  vendorSource: VendorSource | null;
  nickname: string | null;
  kind: TransactionKind | null;
  categoryId: string | null;
  categoryName: string | null;
  savingsLabel: string | null;
  note: string | null;
  accountId: string;
  accountLabel: string;
  personId: string;
  personName: string;
  importId: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  transferPairId: string | null;
};

export type PairPartnerRow = {
  id: string;
  transferPairId: string;
  date: string;
  amountCents: number;
  accountId: string;
  accountLabel: string;
  /** True while the partner still sits in an import the user has not confirmed. */
  inReview: boolean;
};

/** Lines outside review that match every filter given, newest first. */
export function listLedgerRows(db: DbExecutor, householdId: string, filters: LedgerFilters): LedgerRow[] {
  const conditions: SQL[] = [eq(transactions.householdId, householdId), outsideReview()];
  if (filters.id) conditions.push(eq(transactions.id, filters.id));
  if (filters.start) conditions.push(gte(transactions.date, filters.start));
  if (filters.endExclusive) conditions.push(lt(transactions.date, filters.endExclusive));
  if (filters.personId) conditions.push(eq(accounts.personId, filters.personId));
  if (filters.accountId) conditions.push(eq(transactions.accountId, filters.accountId));
  if (filters.accountIds) conditions.push(inArray(transactions.accountId, filters.accountIds));
  if (filters.tagId) {
    conditions.push(
      inArray(
        transactions.id,
        db.select({ id: transactionTags.transactionId }).from(transactionTags).where(eq(transactionTags.tagId, filters.tagId)),
      ),
    );
  }
  if (filters.categoryId === 'none') conditions.push(isNull(transactions.categoryId));
  else if (filters.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId));
  if (filters.kind === 'unset') conditions.push(isNull(transactions.kind));
  else if (filters.kind) conditions.push(eq(transactions.kind, filters.kind));
  if (filters.bucket === 'needs' || filters.bucket === 'wants') {
    conditions.push(and(eq(transactions.kind, 'expense'), eq(categories.bucket, filters.bucket)) as SQL);
  } else if (filters.bucket === 'savings') {
    conditions.push(
      or(
        eq(transactions.kind, 'savings'),
        and(eq(transactions.kind, 'expense'), eq(categories.bucket, 'savings')),
      ) as SQL,
    );
  } else if (filters.bucket === 'unclassified') {
    conditions.push(and(eq(transactions.kind, 'expense'), isNull(categories.bucket)) as SQL);
  }
  if (filters.savingsLabel === '') conditions.push(isNull(transactions.savingsLabel));
  else if (filters.savingsLabel !== undefined) conditions.push(eq(transactions.savingsLabel, filters.savingsLabel));

  return db
    .select({
      id: transactions.id,
      date: transactions.date,
      amountCents: transactions.amountCents,
      adjustedAmountCents: transactions.adjustedAmountCents,
      rawDescription: transactions.rawDescription,
      vendorName: transactions.vendorName,
      vendorId: transactions.vendorId,
      vendorSource: vendors.source,
      nickname: vendors.nickname,
      kind: transactions.kind,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      savingsLabel: transactions.savingsLabel,
      note: transactions.note,
      accountId: transactions.accountId,
      accountLabel: accounts.label,
      personId: accounts.personId,
      personName: people.name,
      importId: transactions.importId,
      installmentNumber: transactions.installmentNumber,
      installmentTotal: installmentPlans.totalInstallments,
      transferPairId: transactions.transferPairId,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(people, eq(accounts.personId, people.id))
    .leftJoin(imports, eq(transactions.importId, imports.id))
    .leftJoin(vendors, eq(transactions.vendorId, vendors.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(installmentPlans, eq(transactions.installmentPlanId, installmentPlans.id))
    .where(and(...conditions))
    .orderBy(desc(transactions.date), asc(transactions.id))
    .all()
    .map((row) => ({ ...row, vendorSource: row.vendorSource as VendorSource | null }));
}

/** The kinds a seller correction can move; transfers and lines with no kind stay where they are. */
const SPREADABLE_KINDS: TransactionKind[] = ['expense', 'income', 'savings'];

/**
 * The lines outside review of these sellers that a category correction could
 * touch, grouped by seller, category, kind, direction and origin, in one query.
 * A group carries the seller's own kind, which decides whether the lines fit
 * (ADR-0013). `countMovableVendorLines` reads the groups.
 */
export type VendorCategoryGroup = {
  vendorId: string;
  categoryId: string | null;
  kind: TransactionKind;
  /** Money left the account (a negative bank amount). */
  negative: boolean;
  /** The line came from a bank file; a hand-added line has no bank sign. */
  imported: boolean;
  /** The seller's own kind, the one `recategorizeVendorLines` checks each line against. */
  sellerKind: TransactionKind | null;
  lines: number;
};

export function listVendorCategoryGroups(db: DbExecutor, householdId: string, vendorIds: string[]): VendorCategoryGroup[] {
  if (vendorIds.length === 0) return [];
  const negative = sql<number>`${transactions.amountCents} < 0`;
  const imported = sql<number>`${transactions.importId} is not null`;
  return db
    .select({
      vendorId: transactions.vendorId,
      categoryId: transactions.categoryId,
      kind: transactions.kind,
      negative: negative.mapWith(Boolean),
      imported: imported.mapWith(Boolean),
      sellerKind: vendors.defaultKind,
      lines: count(),
    })
    .from(transactions)
    .leftJoin(imports, eq(transactions.importId, imports.id))
    .leftJoin(vendors, eq(transactions.vendorId, vendors.id))
    .where(
      and(
        eq(transactions.householdId, householdId),
        inArray(transactions.vendorId, vendorIds),
        inArray(transactions.kind, SPREADABLE_KINDS),
        outsideReview(),
      ),
    )
    .groupBy(transactions.vendorId, transactions.categoryId, transactions.kind, negative, imported, vendors.defaultKind)
    .all()
    .map((row) => ({ ...row, vendorId: row.vendorId as string, kind: row.kind as TransactionKind }));
}

/**
 * How many of the seller's other lines a category change on `line` could move:
 * the lines `recategorizeVendorLines` moves for a category of the same direction
 * as this line's kind, with the same filter (kind, category, seller's kind rule).
 * The category it moves to is not known here, so a category of the other
 * direction would move fewer.
 */
export function countMovableVendorLines(
  groups: VendorCategoryGroup[],
  line: { vendorId: string; categoryId: string | null; kind: TransactionKind | null; amountCents: number; imported: boolean },
): number {
  if (!isSpreadableKind(line.kind)) return 0;
  const sameSide = (kind: TransactionKind) => (kind === 'income') === (line.kind === 'income');
  const fits = (group: VendorCategoryGroup) => kindFitsAmount(group.sellerKind, group.negative ? -1 : 1, group.imported);
  let total = 0;
  for (const group of groups) {
    if (group.vendorId !== line.vendorId || group.categoryId !== line.categoryId || !sameSide(group.kind) || !fits(group)) continue;
    const isThisLinesGroup = group.kind === line.kind && group.negative === line.amountCents < 0 && group.imported === line.imported;
    // The group holds this line itself too, and it is not one of the "others".
    total += group.lines - (isThisLinesGroup ? 1 : 0);
  }
  return total;
}

/** Whether a line of this kind is one a seller correction can move. */
export function isSpreadableKind(kind: TransactionKind | null): boolean {
  return kind !== null && SPREADABLE_KINDS.includes(kind);
}

/** The date of the latest line outside review in the household, or null when there is none. */
export function latestLedgerDate(db: DbExecutor, householdId: string): string | null {
  const row = db
    .select({ date: max(transactions.date) })
    .from(transactions)
    .leftJoin(imports, eq(transactions.importId, imports.id))
    .where(and(eq(transactions.householdId, householdId), outsideReview()))
    .get();
  return row?.date ?? null;
}

/**
 * Both halves of each pair asked for, with the account each half sits in.
 * Left-joins `imports` so a partner still under review can be flagged rather
 * than hidden (Task 7's ruling: the partner is still shown).
 */
export function listPairPartners(db: DbExecutor, householdId: string, pairIds: string[]): PairPartnerRow[] {
  if (pairIds.length === 0) return [];
  return db
    .select({
      id: transactions.id,
      transferPairId: transactions.transferPairId,
      date: transactions.date,
      amountCents: transactions.amountCents,
      accountId: transactions.accountId,
      accountLabel: accounts.label,
      importId: transactions.importId,
      importStatus: imports.status,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(imports, eq(transactions.importId, imports.id))
    .where(and(eq(transactions.householdId, householdId), inArray(transactions.transferPairId, pairIds)))
    .all()
    .map(({ importId, importStatus, ...row }) => ({
      ...row,
      transferPairId: row.transferPairId as string,
      inReview: importId !== null && importStatus !== 'confirmed',
    }));
}

/** Deletes one line of the household. */
export function deleteTransaction(db: DbExecutor, householdId: string, id: string): void {
  db.delete(transactions)
    .where(and(eq(transactions.householdId, householdId), eq(transactions.id, id)))
    .run();
}
