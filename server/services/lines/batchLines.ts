import type { BatchChange } from '../../../shared/contract/requests';
import { AppError } from '../../../shared/errors';
import { categoryFitsKind } from '../../../shared/savings';
import { listCategories } from '../../db/categories';
import type { Db } from '../../db/client';
import { listLineStates } from '../../db/tags';
import { requireTransaction } from '../../db/transactions';
import { applyLineChanges } from './editLine';
import { categoryFactsOf, type CategoryFacts } from './kindRule';
import type { TransactionKind } from '../../../shared/types';

/**
 * Why a batch was refused, as counts: lines that are money out and were asked
 * to be Entrada (ADR-0013), and lines whose category and type do not fit
 * (ADR-0012 and the direction rule). `change` says which of the two the user
 * asked for, so the message can name the right side.
 */
export type BatchRefusal = {
  change: 'category' | 'kind';
  outgoingAsIncome: number;
  categoryMismatch: number;
};

/**
 * Sets one category, or one kind, on every listed line, in one transaction.
 * Each line goes through the line editor's rules, so a savings-group category
 * makes an expense savings (ADR-0012) and money that left is never Entrada
 * (ADR-0013). A kind change also clears a line's category when it does not fit
 * the new kind, as the editor does, so only money out asked to be Entrada
 * refuses a kind change. It is all or nothing: an unknown line, a line still in an import
 * under review or an unknown category refuses the request with its own code,
 * and lines the rules refuse refuse it with `batch_refused` and their count.
 * Nothing is written in any refusal. No seller rule learns from the change.
 * Answers how many lines ended with a different kind or category; a line that
 * already had the value does not count, and a repeated id counts once.
 */
export function changeLinesInBatch(db: Db, householdId: string, request: BatchChange): { changed: number } {
  const transactionIds = [...new Set(request.transactionIds)];
  const { change } = request;

  return db.transaction((tx) => {
    const categories = categoryFactsOf(listCategories(tx, householdId, { includeArchived: true }));
    if ('categoryId' in change && !categories.has(change.categoryId)) {
      throw new AppError('category_not_found', `No category ${change.categoryId}`);
    }
    const states = listLineStates(tx, householdId, transactionIds);
    const missing = transactionIds.find((id) => !states.has(id));
    if (missing !== undefined) throw new AppError('transaction_not_found', `No transaction ${missing} in household ${householdId}`);
    const inReview = transactionIds.find((id) => states.get(id)?.inReview);
    if (inReview !== undefined) {
      throw new AppError('transaction_pending_review', `Transaction ${inReview} is in an import still under review`);
    }

    const refusal: BatchRefusal = { change: 'categoryId' in change ? 'category' : 'kind', outgoingAsIncome: 0, categoryMismatch: 0 };
    let changed = 0;
    for (const id of transactionIds) {
      // Read again for each line: an earlier line's change can clear the pair this one belongs to.
      const before = requireTransaction(tx, householdId, id);
      const changes = 'categoryId' in change ? { categoryId: change.categoryId } : kindChange(change.kind, before.categoryId, categories);
      try {
        applyLineChanges(tx, householdId, before, changes, categories, { teachVendor: false });
      } catch (error) {
        if (!(error instanceof AppError)) throw error;
        if (error.code === 'kind_wrong_direction') refusal.outgoingAsIncome += 1;
        else if (error.code === 'category_wrong_kind') refusal.categoryMismatch += 1;
        else throw error;
        continue;
      }
      const after = requireTransaction(tx, householdId, id);
      if (after.kind !== before.kind || after.categoryId !== before.categoryId) changed += 1;
    }

    // Throwing here undoes every line written above.
    if (refusal.outgoingAsIncome + refusal.categoryMismatch > 0) {
      throw new AppError('batch_refused', 'Some lines cannot take the change, so none were changed', refusal);
    }
    return { changed };
  });
}

/** The editor's change for a new kind: it drops a category the new kind cannot keep (`categoryFitsKind`). */
function kindChange(
  kind: TransactionKind,
  categoryId: string | null,
  categories: Map<string, CategoryFacts>,
): { kind: TransactionKind; categoryId?: null } {
  if (categoryId === null) return { kind };
  const category = categories.get(categoryId);
  return category !== undefined && categoryFitsKind(kind, category) ? { kind } : { kind, categoryId: null };
}
