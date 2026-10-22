import { randomUUID } from 'node:crypto';
import { and, asc, count, eq, inArray, isNotNull, isNull, notExists } from 'drizzle-orm';
import type { VendorSource } from '../../shared/contract/entities';
import { AppError } from '../../shared/errors';
import { normalizeName } from '../../shared/text';
import type { TransactionKind } from '../../shared/types';
import type { DbExecutor } from './client';
import { outsideReview } from './lineFilters';
import { definedEntries } from './patch';
import { categories, imports, transactions, vendors } from './schema';

export type VendorRow = typeof vendors.$inferSelect;
export type { VendorSource };

export type NewVendor = {
  /** Chosen by the caller when the id must be known before the row is written (an import's plan). */
  id?: string;
  matchName: string;
  matchAmountCents?: number | null;
  nickname: string;
  defaultCategoryId: string | null;
  defaultKind?: TransactionKind | null;
  confirmed: boolean;
  source: VendorSource;
  aiConfidence?: number | null;
};

export type VendorPatch = {
  nickname?: string;
  defaultCategoryId?: string | null;
  defaultKind?: TransactionKind | null;
  matchName?: string;
  matchAmountCents?: number | null;
  confirmed?: boolean;
  source?: VendorSource;
};

export function listVendors(db: DbExecutor, householdId: string): VendorRow[] {
  return db
    .select()
    .from(vendors)
    .where(eq(vendors.householdId, householdId))
    .orderBy(asc(vendors.matchName))
    .all();
}

export function requireVendor(db: DbExecutor, householdId: string, id: string): VendorRow {
  const row = db
    .select()
    .from(vendors)
    .where(and(eq(vendors.householdId, householdId), eq(vendors.id, id)))
    .get();

  if (!row) {
    throw new AppError('vendor_not_found', `No vendor ${id} in household ${householdId}`);
  }
  return row;
}

/** The rule for this name at any amount, compared without case or accents. */
export function findNameVendor(
  db: DbExecutor,
  householdId: string,
  matchName: string,
): VendorRow | undefined {
  const name = normalizeName(matchName);
  return listVendors(db, householdId).find(
    (vendor) => vendor.matchAmountCents === null && normalizeName(vendor.matchName) === name,
  );
}

/** The rule for this name and this exact signed amount, compared without case or accents. */
export function findAmountVendor(
  db: DbExecutor,
  householdId: string,
  matchName: string,
  amountCents: number,
): VendorRow | undefined {
  const name = normalizeName(matchName);
  return listVendors(db, householdId).find(
    (vendor) => vendor.matchAmountCents === amountCents && normalizeName(vendor.matchName) === name,
  );
}

/**
 * Up to `limit` vendors the user confirmed, with their category name, shown to the AI as examples.
 * Excludes any vendor a transfer-candidate line ever used: a Pix counterparty's name must never
 * reach the AI, even after `rememberVendor` turns a review edit into a confirmed vendor (spec 5).
 */
export function vendorExamples(
  db: DbExecutor,
  householdId: string,
  limit = 50,
): { rawName: string; nickname: string; category: string }[] {
  return db
    .select({ rawName: vendors.matchName, nickname: vendors.nickname, category: categories.name })
    .from(vendors)
    .innerJoin(categories, eq(vendors.defaultCategoryId, categories.id))
    .where(
      and(
        eq(vendors.householdId, householdId),
        eq(vendors.confirmed, true),
        isNull(vendors.matchAmountCents),
        notExists(
          db
            .select({ id: transactions.id })
            .from(transactions)
            .where(and(eq(transactions.vendorId, vendors.id), eq(transactions.transferCandidate, true))),
        ),
      ),
    )
    .orderBy(asc(vendors.matchName))
    .limit(limit)
    .all();
}

export function createVendor(db: DbExecutor, householdId: string, input: NewVendor): VendorRow {
  const id = input.id ?? randomUUID();
  db.insert(vendors)
    .values({
      id,
      householdId,
      matchName: input.matchName,
      matchAmountCents: input.matchAmountCents ?? null,
      nickname: input.nickname,
      defaultCategoryId: input.defaultCategoryId,
      defaultKind: input.defaultKind ?? null,
      confirmed: input.confirmed,
      source: input.source,
      aiConfidence: input.aiConfidence ?? null,
    })
    .run();

  return requireVendor(db, householdId, id);
}

export function updateVendor(
  db: DbExecutor,
  householdId: string,
  id: string,
  patch: VendorPatch,
): VendorRow {
  requireVendor(db, householdId, id);

  const changes = definedEntries(patch);
  if (Object.keys(changes).length > 0) {
    db.update(vendors)
      .set(changes)
      .where(and(eq(vendors.householdId, householdId), eq(vendors.id, id)))
      .run();
  }

  return requireVendor(db, householdId, id);
}

/** Marks vendors as accepted by the user. A confirmed vendor is reused without asking the AI. */
export function confirmVendors(db: DbExecutor, householdId: string, ids: string[]): void {
  if (ids.length === 0) return;
  db.update(vendors)
    .set({ confirmed: true })
    .where(and(eq(vendors.householdId, householdId), inArray(vendors.id, ids)))
    .run();
}

/** A vendor as the Fornecedores screen shows it: its rule, its category's name, and how many lines use it. */
export type VendorSummary = VendorRow & { defaultCategoryName: string | null; lineCount: number };

/**
 * Every vendor with its default category and how many of its lines are
 * outside review, matching what Transações would show for it. Counted with a
 * separate grouped query, not a join filtered in the `WHERE`: filtering a
 * left-joined `transactions` row there would drop a vendor whose only lines
 * are still in review, instead of showing it with a count of zero.
 */
export function listVendorSummaries(db: DbExecutor, householdId: string): VendorSummary[] {
  const rows = db
    .select({ vendor: vendors, defaultCategoryName: categories.name })
    .from(vendors)
    .leftJoin(categories, eq(vendors.defaultCategoryId, categories.id))
    .where(eq(vendors.householdId, householdId))
    .orderBy(asc(vendors.nickname), asc(vendors.matchName), asc(vendors.id))
    .all();

  const counted = db
    .select({ vendorId: transactions.vendorId, lineCount: count() })
    .from(transactions)
    .leftJoin(imports, eq(transactions.importId, imports.id))
    .where(and(eq(transactions.householdId, householdId), isNotNull(transactions.vendorId), outsideReview()))
    .groupBy(transactions.vendorId)
    .all();
  const lineCounts = new Map(counted.map((row) => [row.vendorId as string, row.lineCount]));

  return rows.map(({ vendor, defaultCategoryName }) => ({
    ...vendor,
    defaultCategoryName,
    lineCount: lineCounts.get(vendor.id) ?? 0,
  }));
}

/** Removes AI suggestions nobody confirmed and no line points at, such as those from a cancelled import. */
export function deleteUnusedAiVendors(db: DbExecutor, householdId: string): number {
  const result = db
    .delete(vendors)
    .where(
      and(
        eq(vendors.householdId, householdId),
        eq(vendors.source, 'ai'),
        eq(vendors.confirmed, false),
        notExists(
          db
            .select({ id: transactions.id })
            .from(transactions)
            .where(eq(transactions.vendorId, vendors.id)),
        ),
      ),
    )
    .run();
  return result.changes;
}
