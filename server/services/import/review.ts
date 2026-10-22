import type { ImportReview, ReclassifyResult, ReviewLine, ReviewRow, RowCounts } from '../../../shared/contract/imports';
import { AppError } from '../../../shared/errors';
import type { VendorClassifier } from '../../ai/types';
import { listCategories } from '../../db/categories';
import type { Db, DbExecutor } from '../../db/client';
import { deleteImportRows, hasDependentRows, listImportRows } from '../../db/importRows';
import {
  deleteImport,
  deleteImportImages,
  listImportImageNames,
  requireImport,
  setImportStatus,
} from '../../db/imports';
import { deleteEmptyPlans } from '../../db/installmentPlans';
import {
  deleteImportLines,
  findTransaction,
  listImportLines,
  requireTransaction,
  uncategorizedLines,
  updateTransaction,
} from '../../db/transactions';
import { confirmVendors, createVendor, deleteUnusedAiVendors, findNameVendor } from '../../db/vendors';
import { toImportRecord } from '../answers';
import { setLineTags } from '../tags/tagLines';
import { applyLineChanges, type LineChanges } from '../lines/editLine';
import { alignToCategory, categoryFactsOf, type CategoryFacts } from '../lines/kindRule';
import { countNeedingReview, reviewFlags } from './flags';
import { runSerially } from './serial';
import { questionsFor, suggestVendors } from './suggest';

export type { ImportReview, ReviewLine, ReviewRow, RowCounts };

/** One line's changes at confirm: the shared line changes, plus the line's full list of tags when the browser sent one. */
export type LineEdit = LineChanges & { transactionId: string; tagIds?: string[] };

export function getImportReview(db: DbExecutor, householdId: string, importId: string): ImportReview {
  const record = toImportRecord(requireImport(db, householdId, importId));
  const lines = listImportLines(db, householdId, importId);
  const rows: ReviewRow[] = listImportRows(db, householdId, importId).map((row) => ({
    sourceLine: row.sourceLine,
    date: row.date,
    amountCents: row.amountCents,
    text: row.text,
    status: row.status,
    reason: row.reason,
    transactionId: row.transactionId,
    earlierImportId: row.earlierImportId,
    earlierImportedAt: row.earlierImportedAt,
    imageIndex: row.imageIndex,
  }));
  const counts: RowCounts = {
    total: rows.length,
    imported: rows.filter((row) => row.status === 'imported').length,
    duplicate: rows.filter((row) => row.status === 'duplicate').length,
    ignored: rows.filter((row) => row.status === 'ignored').length,
  };
  // A line's own screenshot: the imported row that created it named it, this
  // just joins that back onto the transaction the client already groups by.
  const imageIndexByTransactionId = new Map(
    rows
      .filter((row) => row.status === 'imported' && row.transactionId)
      .map((row): [string, number | null] => [row.transactionId!, row.imageIndex]),
  );

  return {
    import: record,
    images: listImportImageNames(db, householdId, importId),
    rows,
    counts,
    lines: lines.map((line) => ({
      id: line.id,
      date: line.date,
      amountCents: line.amountCents,
      rawDescription: line.rawDescription,
      vendorName: line.vendorName,
      nickname: line.vendorNickname,
      kind: line.kind,
      categoryId: line.categoryId,
      categoryName: line.categoryName,
      savingsLabel: line.savingsLabel,
      transferPairId: line.transferPairId,
      installmentNumber: line.installmentNumber,
      installmentTotal: line.installmentTotal,
      imageIndex: imageIndexByTransactionId.get(line.id) ?? null,
      flags: reviewFlags(line),
    })),
    needsReviewCount: countNeedingReview(lines),
  };
}

/**
 * Applies the user's edits, turns them into vendor memory, accepts every vendor
 * the import uses, and marks the import confirmed. All or nothing. It waits
 * behind any import that is running, so it never changes lines under one.
 */
export function confirmImport(
  db: Db,
  householdId: string,
  importId: string,
  edits: LineEdit[],
): Promise<ImportReview> {
  return runSerially(async () => doConfirmImport(db, householdId, importId, edits));
}

function doConfirmImport(db: Db, householdId: string, importId: string, edits: LineEdit[]): ImportReview {
  requirePending(db, householdId, importId);
  const categories = categoryFactsOf(listCategories(db, householdId, { includeArchived: true }));

  db.transaction((tx) => {
    for (const edit of edits) applyEdit(tx, householdId, importId, edit, categories);

    const vendorIds = [
      ...new Set(
        listImportLines(tx, householdId, importId).flatMap((line) => (line.vendorId ? [line.vendorId] : [])),
      ),
    ];
    confirmVendors(tx, householdId, vendorIds);
    setImportStatus(tx, householdId, importId, 'confirmed');
  });

  return getImportReview(db, householdId, importId);
}

/**
 * Deletes a pending import and whatever only it created: lines, screenshots, plans, unconfirmed AI vendors.
 * It waits behind any import that is running, so that import never marks lines as repeats of ones deleted here.
 */
export function cancelImport(db: Db, householdId: string, importId: string): Promise<void> {
  return runSerially(async () => doCancelImport(db, householdId, importId));
}

function doCancelImport(db: Db, householdId: string, importId: string): void {
  requirePending(db, householdId, importId);
  if (hasDependentRows(db, householdId, importId)) {
    throw new AppError('import_has_dependents', `Import ${importId} has rows another import depends on`);
  }

  db.transaction((tx) => {
    deleteImportRows(tx, householdId, importId);
    deleteImportImages(tx, householdId, importId);
    deleteImportLines(tx, householdId, importId);
    deleteEmptyPlans(tx, householdId);
    deleteUnusedAiVendors(tx, householdId);
    deleteImport(tx, householdId, importId);
  });
}

/** The Importar screen's "run the AI again" button: asks about every line still missing a category. */
export function reclassifyUncategorized(
  deps: { db: Db; classifier: VendorClassifier | null },
  householdId: string,
): Promise<ReclassifyResult> {
  return runSerially(() => doReclassifyUncategorized(deps, householdId));
}

async function doReclassifyUncategorized(
  deps: { db: Db; classifier: VendorClassifier | null },
  householdId: string,
): Promise<ReclassifyResult> {
  const { db } = deps;
  const lines = uncategorizedLines(db, householdId);
  const questions = questionsFor(
    // `uncategorizedLines` returns only expense and income lines; this narrows
    // the stored kind (which can also be null, transfer, or savings) without a cast.
    lines.flatMap((line) =>
      line.kind === 'expense' || line.kind === 'income' ? [{ vendorName: line.vendorName, kind: line.kind }] : [],
    ),
  );
  const { suggestions, failed, failure } = await suggestVendors(db, householdId, deps.classifier, questions);
  const categoryIdsByName = new Map(
    listCategories(db, householdId).map((category): [string, string] => [category.name, category.id]),
  );
  const categoryFacts = categoryFactsOf(listCategories(db, householdId, { includeArchived: true }));

  let categorizedCount = 0;
  db.transaction((tx) => {
    for (const [name, suggestion] of suggestions) {
      // The AI took a while. Re-read each line here, and leave alone any that
      // got a category or another kind meanwhile: the user's choice wins (AR-18).
      const stillOpen = lines
        .filter((candidate) => candidate.vendorName === name)
        .flatMap((candidate) => {
          const current = findTransaction(tx, householdId, candidate.id);
          const stillAsked = current && (current.kind === 'expense' || current.kind === 'income');
          return stillAsked && current.categoryId === null ? [current] : [];
        });
      if (stillOpen.length === 0) continue;

      const vendor =
        findNameVendor(tx, householdId, name) ??
        createVendor(tx, householdId, {
          matchName: name,
          nickname: suggestion.nickname,
          defaultCategoryId: categoryIdsByName.get(suggestion.category) ?? null,
          confirmed: false,
          source: 'ai',
          aiConfidence: suggestion.confidence,
        });

      for (const line of stillOpen) {
        const aligned = alignToCategory(line.kind, vendor.defaultCategoryId, categoryFacts);
        updateTransaction(tx, householdId, line.id, {
          vendorId: vendor.id,
          categoryId: aligned.categoryId,
          kind: aligned.kind ?? undefined,
        });
        if (aligned.categoryId) categorizedCount++;
      }
    }
  });

  return { askedCount: questions.length, categorizedCount, aiFailed: failed, aiFailure: failure };
}

function requirePending(db: DbExecutor, householdId: string, importId: string): void {
  if (requireImport(db, householdId, importId).status !== 'pending') {
    throw new AppError('import_already_confirmed', `Import ${importId} is already confirmed`);
  }
}

function applyEdit(
  tx: DbExecutor,
  householdId: string,
  importId: string,
  edit: LineEdit,
  categories: Map<string, CategoryFacts>,
): void {
  const line = requireTransaction(tx, householdId, edit.transactionId);
  if (line.importId !== importId) {
    throw new AppError('transaction_not_found', `Transaction ${line.id} is not in import ${importId}`);
  }
  applyLineChanges(tx, householdId, line, edit, categories);
  // Tags are written once, with the lines, and only here: a discarded import writes none.
  if (edit.tagIds !== undefined) setLineTags(tx, householdId, line.id, edit.tagIds);
}
