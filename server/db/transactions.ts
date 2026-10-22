import { randomUUID } from 'node:crypto';
import { and, asc, eq, gte, inArray, isNotNull, isNull, lte, or } from 'drizzle-orm';
import { AppError } from '../../shared/errors';
import { kindFitsAmount } from '../../shared/kindRule';
import { isCompanyPix, isHouseholdPerson, isPixDescription } from '../../shared/pix';
import { isCardBillPayment } from '../../shared/transfers';
import type { AccountType, CategoryAppliesTo, CategoryBucket, TransactionKind } from '../../shared/types';
import type { DbExecutor } from './client';
import { outsideReview } from './lineFilters';
import { definedEntries } from './patch';
import { accounts, categories, imports, installmentPlans, people, transactions, vendors } from './schema';

/** A purchase a Swile "ESTORNO" refund line might return money for (Purchase in refunds.ts). */
export type RefundCandidate = {
  id: string;
  date: string;
  time: string | null;
  amountCents: number;
  vendorId: string | null;
  vendorName: string;
  categoryId: string | null;
};

/**
 * Which of a vendor's lines a bulk change may touch: `all` of them, or only
 * those `outsideReview`, which leaves lines of an import still waiting for review alone.
 */
export type LineScope = 'all' | 'outsideReview';

export type TransactionRow = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type TransactionPatch = {
  kind?: TransactionKind | null;
  kindSetByUser?: boolean;
  categoryId?: string | null;
  vendorId?: string | null;
  savingsLabel?: string | null;
  note?: string | null;
  transferPairId?: string | null;
  amountCents?: number;
  adjustedAmountCents?: number | null;
};

/** A line as the review screen needs it: the row plus its vendor and category. */
export type ImportLine = TransactionRow & {
  vendorNickname: string | null;
  vendorSource: string | null;
  vendorConfirmed: boolean | null;
  vendorAiConfidence: number | null;
  categoryName: string | null;
  /** How many installments the line's plan has, or null when the line is not an installment. */
  installmentTotal: number | null;
};

/** Every dedupe key the account holds, with the line that holds it. */
export function knownDedupeKeys(db: DbExecutor, accountId: string): Map<string, string> {
  const rows = db
    .select({ key: transactions.dedupeKey, id: transactions.id })
    .from(transactions)
    .where(eq(transactions.accountId, accountId))
    .all();
  return new Map(rows.map((row): [string, string] => [row.key, row.id]));
}

/**
 * Earlier lines that may still find their other half: transfer-like, not yet
 * paired, and not given a kind by hand (a hand-set kind is the user's call).
 */
export function openTransferCandidates(
  db: DbExecutor,
  householdId: string,
): { id: string; accountId: string; date: string; amountCents: number }[] {
  return db
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      date: transactions.date,
      amountCents: transactions.amountCents,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.householdId, householdId),
        eq(transactions.transferCandidate, true),
        isNull(transactions.transferPairId),
        eq(transactions.kindSetByUser, false),
      ),
    )
    .all();
}

export function insertTransactions(db: DbExecutor, rows: NewTransaction[]): void {
  for (const row of rows) {
    db.insert(transactions).values(row).run();
  }
}

/** Marks each pair's two lines as one transfer, sharing a new pair id. */
export function pairTransfers(
  db: DbExecutor,
  householdId: string,
  pairs: { firstId: string; secondId: string }[],
): void {
  for (const pair of pairs) {
    db.update(transactions)
      .set({ kind: 'transfer', transferPairId: randomUUID(), categoryId: null })
      .where(
        and(
          eq(transactions.householdId, householdId),
          inArray(transactions.id, [pair.firstId, pair.secondId]),
        ),
      )
      .run();
  }
}

/**
 * Breaks a pair. Half a transfer is not a transfer, so a half whose kind
 * nobody set by hand takes the kind an import would give it with no partner
 * (`classifyLine`): a card's bill payment stays a transfer (ADR-0008), then its
 * seller's remembered type, unless ADR-0013 forbids it. A Pix to or from a
 * household person stays untyped (ADR-0011), another Pix is spending or income
 * by its sign, other money arriving is income, and other money leaving keeps
 * its kind unset (ADR-0003). A half the user did set by hand keeps that kind.
 */
export function unpair(db: DbExecutor, householdId: string, pairId: string): void {
  const partners = db
    .select({
      id: transactions.id,
      amountCents: transactions.amountCents,
      rawDescription: transactions.rawDescription,
      vendorName: transactions.vendorName,
      transferCandidate: transactions.transferCandidate,
      importId: transactions.importId,
      accountType: accounts.type,
      ownerId: accounts.personId,
      sellerKind: vendors.defaultKind,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(vendors, eq(transactions.vendorId, vendors.id))
    .where(
      and(
        eq(transactions.householdId, householdId),
        eq(transactions.transferPairId, pairId),
        eq(transactions.kindSetByUser, false),
      ),
    )
    .all();
  const household = db
    .select({ id: people.id, name: people.name })
    .from(people)
    .where(eq(people.householdId, householdId))
    .all();

  for (const partner of partners) {
    const otherPeopleNames = household.filter((person) => person.id !== partner.ownerId).map((person) => person.name);
    db.update(transactions)
      .set({ kind: kindWithoutPartner({ ...partner, imported: partner.importId !== null }, otherPeopleNames) })
      .where(and(eq(transactions.householdId, householdId), eq(transactions.id, partner.id)))
      .run();
  }

  db.update(transactions)
    .set({ transferPairId: null })
    .where(and(eq(transactions.householdId, householdId), eq(transactions.transferPairId, pairId)))
    .run();
}

function kindWithoutPartner(
  line: {
    amountCents: number;
    rawDescription: string;
    vendorName: string;
    transferCandidate: boolean;
    imported: boolean;
    accountType: AccountType;
    sellerKind: TransactionKind | null;
  },
  otherPeopleNames: string[],
): TransactionKind | null {
  if (isCardBillPayment(line)) return 'transfer';
  if (line.sellerKind !== null) {
    return kindFitsAmount(line.sellerKind, line.amountCents, line.imported) ? line.sellerKind : null;
  }
  const isPix = isPixDescription(line.rawDescription);
  if (isPix && isHouseholdPerson(line.vendorName, otherPeopleNames)) return null;
  if (line.amountCents > 0) return 'income';
  return isPix ? 'expense' : null;
}

export function findTransaction(db: DbExecutor, householdId: string, id: string): TransactionRow | undefined {
  return db
    .select()
    .from(transactions)
    .where(and(eq(transactions.householdId, householdId), eq(transactions.id, id)))
    .get();
}

export function requireTransaction(db: DbExecutor, householdId: string, id: string): TransactionRow {
  const row = findTransaction(db, householdId, id);
  if (!row) {
    throw new AppError('transaction_not_found', `No transaction ${id} in household ${householdId}`);
  }
  return row;
}

export function updateTransaction(
  db: DbExecutor,
  householdId: string,
  id: string,
  patch: TransactionPatch,
): TransactionRow {
  requireTransaction(db, householdId, id);

  const changes = definedEntries(patch);
  if (Object.keys(changes).length > 0) {
    db.update(transactions)
      .set(changes)
      .where(and(eq(transactions.householdId, householdId), eq(transactions.id, id)))
      .run();
  }

  return requireTransaction(db, householdId, id);
}

export function listImportLines(db: DbExecutor, householdId: string, importId: string): ImportLine[] {
  return db
    .select({
      line: transactions,
      vendorNickname: vendors.nickname,
      vendorSource: vendors.source,
      vendorConfirmed: vendors.confirmed,
      vendorAiConfidence: vendors.aiConfidence,
      categoryName: categories.name,
      installmentTotal: installmentPlans.totalInstallments,
    })
    .from(transactions)
    .leftJoin(vendors, eq(transactions.vendorId, vendors.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(installmentPlans, eq(transactions.installmentPlanId, installmentPlans.id))
    .where(and(eq(transactions.householdId, householdId), eq(transactions.importId, importId)))
    .orderBy(asc(transactions.date), asc(transactions.dedupeKey))
    .all()
    .map(({ line, ...joined }) => ({ ...line, ...joined }));
}

/** Deletes an import's lines. Their partners in other imports lose the pair and go back to review. */
export function deleteImportLines(db: DbExecutor, householdId: string, importId: string): void {
  const paired = db
    .select({ pairId: transactions.transferPairId })
    .from(transactions)
    .where(
      and(
        eq(transactions.householdId, householdId),
        eq(transactions.importId, importId),
        isNotNull(transactions.transferPairId),
      ),
    )
    .all();

  for (const { pairId } of paired) {
    if (pairId) unpair(db, householdId, pairId);
  }

  db.delete(transactions)
    .where(and(eq(transactions.householdId, householdId), eq(transactions.importId, importId)))
    .run();
}

/**
 * Expense and income lines still without a category: no vendor at all, or a
 * vendor that is an unconfirmed AI suggestion with no default category of its
 * own (the AI answered but named no category). Transfer-like lines and
 * transfers are never included; "run the AI again" is about naming a line,
 * not about its kind.
 */
/**
 * Moves a vendor's lines to a new category, but only the lines that still
 * carry `fromCategoryId` (null means lines with no category): a line whose
 * category the user picked by hand keeps it. Transfers are left alone. A line
 * moves only when the new category fits that line's own kind: an income
 * category on income lines, an expense category on expense and savings lines.
 * When the seller's type is Entrada, an imported line where money left stays
 * as it was (ADR-0013). `scope` limits which lines are considered. Returns how
 * many lines moved and how many were skipped.
 */
export function recategorizeVendorLines(
  db: DbExecutor,
  householdId: string,
  vendorId: string,
  fromCategoryId: string | null,
  toCategoryId: string | null,
  vendorKind: TransactionKind | null = null,
  scope: LineScope = 'all',
): { moved: number; skipped: number } {
  const candidates = db
    .select({
      id: transactions.id,
      kind: transactions.kind,
      amountCents: transactions.amountCents,
      importId: transactions.importId,
    })
    .from(transactions)
    .leftJoin(imports, eq(transactions.importId, imports.id))
    .where(
      and(
        eq(transactions.householdId, householdId),
        eq(transactions.vendorId, vendorId),
        fromCategoryId === null ? isNull(transactions.categoryId) : eq(transactions.categoryId, fromCategoryId),
        inArray(transactions.kind, ['expense', 'income', 'savings']),
        scope === 'outsideReview' ? outsideReview() : undefined,
      ),
    )
    .all();
  const appliesTo =
    toCategoryId === null
      ? null
      : db
          .select({ appliesTo: categories.appliesTo })
          .from(categories)
          .where(and(eq(categories.householdId, householdId), eq(categories.id, toCategoryId)))
          .get()?.appliesTo ?? null;
  const movable = candidates.filter(
    (line) =>
      kindFitsAmount(vendorKind, line.amountCents, line.importId !== null) &&
      (appliesTo === null || appliesTo === (line.kind === 'income' ? 'income' : 'expense')),
  );
  if (movable.length > 0) {
    db.update(transactions)
      .set({ categoryId: toCategoryId })
      .where(
        and(
          eq(transactions.householdId, householdId),
          inArray(
            transactions.id,
            movable.map((line) => line.id),
          ),
        ),
      )
      .run();
  }
  return { moved: movable.length, skipped: candidates.length - movable.length };
}

/** Part of an UPDATE, which cannot join `imports`: the line is entered by hand or belongs to a confirmed import. */
function notInPendingImport(db: DbExecutor) {
  return or(
    isNull(transactions.importId),
    inArray(transactions.importId, db.select({ id: imports.id }).from(imports).where(eq(imports.status, 'confirmed'))),
  );
}

/**
 * Puts the lines of one category in step with its group (ADR-0012): expense
 * lines become savings when the group is savings, and savings lines become
 * expenses, losing their savings label, when it is not. With `vendorId`, only
 * that vendor's lines move; without it, every line of the category does.
 * `scope` limits which lines change. Returns how many changed.
 */
export function alignKindsToCategory(
  db: DbExecutor,
  householdId: string,
  categoryId: string,
  bucket: CategoryBucket | null,
  vendorId?: string,
  scope: LineScope = 'all',
): number {
  const linesOf = (kind: TransactionKind) =>
    and(
      eq(transactions.householdId, householdId),
      eq(transactions.categoryId, categoryId),
      eq(transactions.kind, kind),
      vendorId === undefined ? undefined : eq(transactions.vendorId, vendorId),
      scope === 'outsideReview' ? notInPendingImport(db) : undefined,
    );
  if (bucket === 'savings') {
    return db.update(transactions).set({ kind: 'savings' }).where(linesOf('expense')).run().changes;
  }
  return db.update(transactions).set({ kind: 'expense', savingsLabel: null }).where(linesOf('savings')).run().changes;
}

/**
 * Takes a category off the lines whose kind its direction cannot have: income
 * lines when it is an expense category, expense and savings lines when it is an
 * income category. The lines keep their kind. Returns how many changed.
 */
export function clearCategoryOfWrongKind(
  db: DbExecutor,
  householdId: string,
  categoryId: string,
  appliesTo: CategoryAppliesTo,
): number {
  const wrongKinds: TransactionKind[] = appliesTo === 'expense' ? ['income'] : ['expense', 'savings'];
  return db
    .update(transactions)
    .set({ categoryId: null })
    .where(
      and(
        eq(transactions.householdId, householdId),
        eq(transactions.categoryId, categoryId),
        inArray(transactions.kind, wrongKinds),
      ),
    )
    .run().changes;
}

/**
 * Expense lines on this account with this exact amount, dated between `start`
 * and `end` inclusive: confirmed imports, pending imports, and hand-added
 * lines alike, since the table holds them all the same way. `time` is always
 * null, as the table keeps no time of day.
 */
export function refundCandidates(
  db: DbExecutor,
  accountId: string,
  amountCents: number,
  start: string,
  end: string,
): RefundCandidate[] {
  return db
    .select({
      id: transactions.id,
      date: transactions.date,
      amountCents: transactions.amountCents,
      vendorId: transactions.vendorId,
      vendorName: transactions.vendorName,
      categoryId: transactions.categoryId,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        eq(transactions.kind, 'expense'),
        eq(transactions.amountCents, amountCents),
        gte(transactions.date, start),
        lte(transactions.date, end),
      ),
    )
    .all()
    .map((row) => ({ ...row, time: null }));
}

/**
 * Expense and income lines still waiting for a category, for the AI re-run.
 * A transfer-like line counts only when it is a Pix to or from a company.
 */
export function uncategorizedLines(db: DbExecutor, householdId: string): TransactionRow[] {
  return db
    .select({ line: transactions })
    .from(transactions)
    .leftJoin(vendors, eq(transactions.vendorId, vendors.id))
    .where(
      and(
        eq(transactions.householdId, householdId),
        isNull(transactions.categoryId),
        inArray(transactions.kind, ['expense', 'income']),
        or(
          isNull(transactions.vendorId),
          and(eq(vendors.confirmed, false), eq(vendors.source, 'ai'), isNull(vendors.defaultCategoryId)),
        ),
      ),
    )
    .all()
    .map(({ line }) => line)
    // A transfer-like line, or any Pix text, reaches the AI only when it is a Pix
    // to or from a company; a person's name never does (ADR-0011).
    .filter(
      (line) =>
        (!line.transferCandidate && !isPixDescription(line.rawDescription)) || isCompanyPix(line.rawDescription),
    );
}
