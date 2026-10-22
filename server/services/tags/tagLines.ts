import type { TagLines } from '../../../shared/contract/requests';
import { AppError } from '../../../shared/errors';
import type { Db, DbExecutor } from '../../db/client';
import {
  addTagToLines,
  existingTagIds,
  listLineStates,
  removeTagFromLines,
  requireTag,
  setTransactionTags,
} from '../../db/tags';
import { requireTransaction } from '../../db/transactions';

/**
 * Replaces the tags of one line with exactly `tagIds`, in any order, repeats
 * counted once. An id that is not a tag of the household refuses the whole
 * change. Run it inside the transaction that saves the rest of the line, so
 * a refusal changes nothing.
 */
export function setLineTags(db: DbExecutor, householdId: string, transactionId: string, tagIds: readonly string[]): void {
  requireTransaction(db, householdId, transactionId);
  requireKnownTags(db, householdId, tagIds);
  setTransactionTags(db, transactionId, tagIds);
}

/** Refuses an id that is not a tag of the household, before anything is written. */
export function requireKnownTags(db: DbExecutor, householdId: string, tagIds: readonly string[]): void {
  const known = existingTagIds(db, householdId, tagIds);
  const unknown = tagIds.find((id) => !known.has(id));
  if (unknown !== undefined) throw new AppError('tag_not_found', `No tag ${unknown} in household ${householdId}`);
}

/**
 * Adds a tag to, or removes it from, every listed line, in one transaction.
 * Answers how many lines changed: a line that already had the tag (or lacked
 * it) does not count. An unknown line refuses the whole request, and so does a
 * line still in an import under review: that line takes its tags when the
 * import is confirmed.
 */
export function bulkTagLines(db: Db, householdId: string, request: TagLines): { changed: number } {
  const transactionIds = [...new Set(request.transactionIds)];
  return db.transaction((tx) => {
    requireTag(tx, householdId, request.tagId);
    const states = listLineStates(tx, householdId, transactionIds);
    const missing = transactionIds.find((id) => !states.has(id));
    if (missing !== undefined) throw new AppError('transaction_not_found', `No transaction ${missing} in household ${householdId}`);
    const inReview = transactionIds.find((id) => states.get(id)?.inReview);
    if (inReview !== undefined) {
      throw new AppError('transaction_pending_review', `Transaction ${inReview} is in an import still under review`);
    }
    const changed =
      request.action === 'add'
        ? addTagToLines(tx, request.tagId, transactionIds)
        : removeTagFromLines(tx, request.tagId, transactionIds);
    return { changed };
  });
}
