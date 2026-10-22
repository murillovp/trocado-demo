import { randomUUID } from 'node:crypto';
import type { EditLineResult, LedgerLine, TransferPartner } from '../../../shared/contract/lines';
import type { LedgerLineChanges, LedgerQuery, ManualLineInput } from '../../../shared/contract/requests';
import { addDays, monthSpan, parseIsoDate, parseMonth } from '../../../shared/dates';
import { AppError } from '../../../shared/errors';
import { normalizeName, splitIdList } from '../../../shared/text';
import { requireAccount } from '../../db/accounts';
import { listCategories } from '../../db/categories';
import type { Db, DbExecutor } from '../../db/client';
import { requireImport } from '../../db/imports';
import {
  countMovableVendorLines,
  deleteTransaction,
  latestLedgerDate,
  listLedgerRows,
  listPairPartners,
  listVendorCategoryGroups,
  type LedgerRow,
} from '../../db/ledger';
import { listLineTags } from '../../db/tags';
import { insertTransactions, requireTransaction } from '../../db/transactions';
import { applyAmountChange, applyLineChanges, spreadCategoryToVendor } from './editLine';
import { setLineTags } from '../tags/tagLines';
import { categoryFactsOf, checkKindAndCategory, type CategoryFacts } from './kindRule';

export type { EditLineResult, LedgerLine, LedgerLineChanges, LedgerQuery, ManualLineInput, TransferPartner };

/**
 * Every line outside review that matches the query, newest first. A `date`
 * limits the list to that one day and wins over `month`. `accountIds` is a
 * comma-separated list; with `accountId` too, a line must match both.
 */
export function listLedger(db: DbExecutor, householdId: string, query: LedgerQuery = {}): LedgerLine[] {
  const span = spanOf(query);
  const listedAccounts = splitIdList(query.accountIds);
  const accountIds = listedAccounts.length > 0 ? listedAccounts : undefined;
  const rows = listLedgerRows(db, householdId, {
    start: span?.start,
    endExclusive: span?.endExclusive,
    personId: query.personId,
    accountId: query.accountId,
    accountIds,
    tagId: query.tagId,
    categoryId: query.categoryId,
    kind: query.kind,
    bucket: query.bucket,
    savingsLabel: query.savingsLabel,
  });
  return toLedgerLines(
    db,
    householdId,
    rows.filter((row) => matchesSearch(row, query.search)),
  );
}

/** The dates a query limits the list to: one day, or one month, or none. */
function spanOf(query: LedgerQuery): { start: string; endExclusive: string } | undefined {
  if (query.date !== undefined) {
    const day = readDate(query.date);
    return { start: day, endExclusive: addDays(day, 1) };
  }
  if (query.month === undefined) return undefined;
  const month = parseMonth(query.month);
  return monthSpan(month, month);
}

/** One line outside review. A missing line, or one still in review, is not found. */
export function getLedgerLine(db: DbExecutor, householdId: string, id: string): LedgerLine {
  const [line] = toLedgerLines(db, householdId, listLedgerRows(db, householdId, { id }));
  if (!line) {
    throw new AppError('transaction_not_found', `No transaction ${id} outside review in household ${householdId}`);
  }
  return line;
}

/**
 * Search matches the nickname, the bank's vendor name, or the line's own text,
 * so a line added by hand, which has no nickname, can be found too.
 */
function matchesSearch(row: LedgerRow, search: string | undefined): boolean {
  if (!search) return true;
  const needle = normalizeName(search);
  return [row.nickname ?? '', row.vendorName, row.rawDescription].some((text) =>
    normalizeName(text).includes(needle),
  );
}

function toLedgerLines(db: DbExecutor, householdId: string, rows: LedgerRow[]): LedgerLine[] {
  const pairIds = [...new Set(rows.flatMap((row) => (row.transferPairId ? [row.transferPairId] : [])))];
  const halves = listPairPartners(db, householdId, pairIds);
  const vendorIds = [...new Set(rows.flatMap((row) => (row.vendorId ? [row.vendorId] : [])))];
  const vendorGroups = listVendorCategoryGroups(db, householdId, vendorIds);
  const tagsByLine = listLineTags(db, householdId);

  return rows.map(({ importId, installmentNumber, installmentTotal, adjustedAmountCents, ...row }) => {
    const partner = row.transferPairId
      ? halves.find((half) => half.transferPairId === row.transferPairId && half.id !== row.id)
      : undefined;
    return {
      ...row,
      // The seller's other lines a category change on this line could move.
      sameVendorCategoryCount: row.vendorId
        ? countMovableVendorLines(vendorGroups, {
            vendorId: row.vendorId,
            categoryId: row.categoryId,
            kind: row.kind,
            amountCents: row.amountCents,
            imported: importId !== null,
          })
        : 0,
      amountCents: adjustedAmountCents ?? row.amountCents,
      bankAmountCents: adjustedAmountCents === null ? null : row.amountCents,
      tags: tagsByLine.get(row.id) ?? [],
      isManual: importId === null,
      installment:
        installmentNumber !== null && installmentTotal !== null
          ? { number: installmentNumber, total: installmentTotal }
          : null,
      transferPartner: partner
        ? {
            id: partner.id,
            date: partner.date,
            amountCents: partner.amountCents,
            accountId: partner.accountId,
            accountLabel: partner.accountLabel,
            inReview: partner.inReview,
          }
        : null,
    };
  });
}

/**
 * Changes a line on Transações with the same rules as the review screen, plus
 * its amount. A line still in an import under review is changed on that
 * review instead.
 */
export function editLine(db: Db, householdId: string, id: string, changes: LedgerLineChanges): LedgerLine {
  return editLineWithSpread(db, householdId, id, changes).transaction;
}

/**
 * Like `editLine`, and when `applyToVendorLines` is set, also moves the seller's
 * other lines outside review from the line's old category to its new one, in the
 * same transaction and under the same kind and direction rules as the Fornecedores
 * editor. `vendorLinesMoved` counts them; it is 0 when the category did not change.
 */
export function editLineWithSpread(db: Db, householdId: string, id: string, changes: LedgerLineChanges): EditLineResult {
  const line = requireTransaction(db, householdId, id);
  if (line.importId !== null && requireImport(db, householdId, line.importId).status === 'pending') {
    throw new AppError('transaction_pending_review', `Transaction ${id} is in an import still under review`);
  }
  if (changes.applyToVendorLines && changes.rememberAmount) {
    throw new AppError('invalid_request', 'applyToVendorLines cannot be combined with rememberAmount');
  }

  const categories = householdCategoryFacts(db, householdId);
  const { amountCents, applyToVendorLines, tagIds, ...lineChanges } = changes;
  let vendorLinesMoved = 0;
  db.transaction((tx) => {
    // Tags first: an unknown tag refuses the whole save before anything else is written.
    if (tagIds !== undefined) setLineTags(tx, householdId, id, tagIds);
    applyLineChanges(tx, householdId, line, lineChanges, categories);
    if (amountCents !== undefined) {
      applyAmountChange(tx, householdId, requireTransaction(tx, householdId, id), amountCents);
    }
    if (applyToVendorLines) {
      vendorLinesMoved = spreadCategoryToVendor(tx, householdId, line, requireTransaction(tx, householdId, id), categories);
    }
  });
  return { transaction: getLedgerLine(db, householdId, id), vendorLinesMoved };
}

/** The month (YYYY-MM) of the latest line outside review in the household, or null when it has none. */
export function latestLedgerMonth(db: DbExecutor, householdId: string): string | null {
  return latestLedgerDate(db, householdId)?.slice(0, 7) ?? null;
}

/**
 * Adds a line by hand: cash, a transfer abroad, anything no bank file shows.
 * It has no vendor and teaches no vendor rule, and its kind counts as chosen
 * by the user, so it never pairs.
 */
export function addManualLine(db: Db, householdId: string, input: ManualLineInput): LedgerLine {
  requireAccount(db, householdId, input.accountId);
  const date = readDate(input.date);
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new AppError('invalid_request', 'amountCents must be a positive whole number');
  }
  // A savings-group category makes an expense savings; an impossible pair is refused (ADR-0012).
  const kind = checkKindAndCategory(input.kind, input.categoryId ?? null, householdCategoryFacts(db, householdId));

  const id = randomUUID();
  insertTransactions(db, [
    {
      id,
      householdId,
      accountId: input.accountId,
      importId: null,
      date,
      amountCents: kind === 'income' ? input.amountCents : -input.amountCents,
      rawDescription: input.description,
      vendorName: '',
      kind,
      kindSetByUser: true,
      categoryId: input.categoryId ?? null,
      savingsLabel: kind === 'savings' ? (input.savingsLabel ?? null) : null,
      note: input.note ?? null,
      dedupeKey: `manual:${id}`,
    },
  ]);
  return getLedgerLine(db, householdId, id);
}

/** Deletes a line added by hand. A line read from a bank file stays; its kind can be changed instead. */
export function deleteManualLine(db: Db, householdId: string, id: string): void {
  const line = requireTransaction(db, householdId, id);
  if (line.importId !== null) {
    throw new AppError('transaction_not_manual', `Transaction ${id} came from an import`);
  }
  deleteTransaction(db, householdId, id);
}

function householdCategoryFacts(db: Db, householdId: string): Map<string, CategoryFacts> {
  return categoryFactsOf(listCategories(db, householdId, { includeArchived: true }));
}

function readDate(text: string): string {
  try {
    return parseIsoDate(text);
  } catch {
    throw new AppError('date_invalid', `Cannot read date: ${text}`);
  }
}
