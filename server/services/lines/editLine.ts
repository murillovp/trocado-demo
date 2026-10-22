import type { LineChanges } from '../../../shared/contract/requests';
import { AppError } from '../../../shared/errors';
import { kindWithCategory } from '../../../shared/savings';
import type { TransactionKind } from '../../../shared/types';
import type { DbExecutor } from '../../db/client';
import { alignKindsToCategory, recategorizeVendorLines, unpair, updateTransaction, type TransactionRow } from '../../db/transactions';
import { createVendor, findAmountVendor, findNameVendor, requireVendor, updateVendor } from '../../db/vendors';
import { checkKindAndCategory, checkKindFitsAmount, type CategoryFacts } from './kindRule';

export type { LineChanges };

/**
 * Applies one line's changes and turns them into vendor memory, so next month
 * the same name arrives already right. `categories` holds the household's
 * categories, archived ones included. The category's group decides the kind
 * (ADR-0012). With `teachVendor: false` the change stays on the line: no seller
 * rule is saved or made from it (a batch change uses this). Run it inside a
 * transaction.
 */
export function applyLineChanges(
  tx: DbExecutor,
  householdId: string,
  line: TransactionRow,
  changes: LineChanges,
  categories: Map<string, CategoryFacts>,
  { teachVendor = true }: { teachVendor?: boolean } = {},
): void {
  if (changes.categoryId && !categories.has(changes.categoryId)) {
    throw new AppError('category_not_found', `No category ${changes.categoryId}`);
  }

  const requestedKind = changes.kind !== undefined ? changes.kind : line.kind;
  const categoryId =
    requestedKind === 'transfer' ? null : changes.categoryId !== undefined ? changes.categoryId : line.categoryId;
  // Checked first, so the refusal names the direction rather than the category. An
  // old line already stored as Entrada may still take a note or a new type: only a
  // move to Entrada is refused (ADR-0013).
  if (requestedKind !== line.kind) checkKindFitsAmount(requestedKind, line);
  // Only a change to the kind or the category is checked, so an old line can
  // still take a note. A savings-group category makes an expense savings (ADR-0012).
  const touchesKind = changes.kind !== undefined || changes.categoryId !== undefined;
  const kind = touchesKind ? checkKindAndCategory(requestedKind, categoryId, categories) : line.kind;
  const kindChanged = kind !== line.kind;

  // Half a transfer is not a transfer: changing one half clears the pair on both.
  if (kindChanged && line.transferPairId) unpair(tx, householdId, line.transferPairId);

  // A hand-added line has no bank sign to protect: flip it when the kind moves
  // between income (money arriving, stored positive) and expense/savings
  // (money leaving, stored negative). An imported line keeps its bank sign.
  const flipsSign =
    line.importId === null &&
    kindChanged &&
    ((line.kind === 'income' && (kind === 'expense' || kind === 'savings')) ||
      ((line.kind === 'expense' || line.kind === 'savings') && kind === 'income'));

  updateTransaction(tx, householdId, line.id, {
    kind: kindChanged ? kind : undefined,
    kindSetByUser: kindChanged ? true : undefined,
    categoryId: kind === 'transfer' ? null : changes.categoryId,
    // A label only means something on a savings line: clear it once the kind
    // moves away, unless this same change is setting a new one.
    savingsLabel: kind !== 'savings' && changes.savingsLabel === undefined ? null : changes.savingsLabel,
    note: changes.note,
    vendorId: teachVendor ? (rememberVendor(tx, householdId, line, changes, kindChanged ? kind : undefined) ?? undefined) : undefined,
    amountCents: flipsSign ? -line.amountCents : undefined,
  });
}

/**
 * After a line's category changed from `before` to `after`, moves the seller's
 * other lines outside review that still had the old category to the new one.
 * It goes through `recategorizeVendorLines`, so the Fornecedores editor's kind
 * and direction rules apply, and the moved lines follow the new category's
 * group (ADR-0012). Lines of an import under review stay as they are. Returns
 * how many lines moved; 0 when the category did not change or the line has no
 * seller. It also moves nothing when the new category is none, or when the kind
 * changed in this edit for a reason other than the category's group (ADR-0012):
 * a kind change alone is not a category correction. Run it inside the same
 * transaction as the line change.
 */
export function spreadCategoryToVendor(
  tx: DbExecutor,
  householdId: string,
  before: TransactionRow,
  after: TransactionRow,
  categories: Map<string, CategoryFacts>,
): number {
  if (!after.vendorId || after.kind === 'transfer' || after.categoryId === null || after.categoryId === before.categoryId) return 0;
  const alignedKind = kindWithCategory(before.kind, categories.get(after.categoryId)?.bucket);
  if (after.kind !== before.kind && after.kind !== alignedKind) return 0;
  const vendor = requireVendor(tx, householdId, after.vendorId);
  const { moved } = recategorizeVendorLines(
    tx,
    householdId,
    vendor.id,
    before.categoryId,
    after.categoryId,
    vendor.defaultKind,
    'outsideReview',
  );
  if (moved > 0) {
    alignKindsToCategory(tx, householdId, after.categoryId, categories.get(after.categoryId)!.bucket, vendor.id, 'outsideReview');
  }
  return moved;
}

/**
 * Sets the amount a line counts with. A line from a bank file keeps the bank's
 * amount in `amountCents` and gets the user's in `adjustedAmountCents`, signed
 * like the bank's; typing the bank's own amount, or null, clears it. A line
 * added by hand has no bank amount: its `amountCents` changes, signed by its
 * current kind (income positive, expense and savings negative, otherwise the
 * sign it already has). `line` is the row after any other change in the same save.
 */
export function applyAmountChange(tx: DbExecutor, householdId: string, line: TransactionRow, amountCents: number | null): void {
  if (amountCents !== null && (!Number.isInteger(amountCents) || amountCents <= 0)) {
    throw new AppError('invalid_request', 'amountCents must be a positive whole number');
  }
  if (line.importId === null) {
    if (amountCents === null) throw new AppError('invalid_request', 'A hand-added line has no bank amount to go back to');
    // Income arrives (positive), expense and savings leave (negative); a transfer or no kind keeps the current sign.
    const negative = line.kind === 'income' ? false : line.kind === 'expense' || line.kind === 'savings' ? true : line.amountCents < 0;
    updateTransaction(tx, householdId, line.id, { amountCents: negative ? -amountCents : amountCents });
    return;
  }
  const sign = line.amountCents < 0 ? -1 : 1;
  const adjusted = amountCents === null || amountCents === Math.abs(line.amountCents) ? null : sign * amountCents;
  updateTransaction(tx, householdId, line.id, { adjustedAmountCents: adjusted });
}

/**
 * Turns the changes into the vendor's rule. A kind that changed is saved too,
 * including one the category's group decided: a Pix set to transfer by hand is
 * a transfer next month (ADR-0003). `newKind` is undefined when the kind did
 * not change. A line with no vendor name, such as one added by hand, teaches nothing.
 */
function rememberVendor(
  tx: DbExecutor,
  householdId: string,
  line: TransactionRow,
  changes: LineChanges,
  newKind: TransactionKind | null | undefined,
): string | null {
  if (!line.vendorName) return null;
  if (changes.nickname === undefined && changes.categoryId === undefined && newKind === undefined) return null;

  const defaultKind = newKind;
  const existing = changes.rememberAmount
    ? findAmountVendor(tx, householdId, line.vendorName, line.amountCents)
    : line.vendorId
      ? requireVendor(tx, householdId, line.vendorId)
      : findNameVendor(tx, householdId, line.vendorName);

  if (existing) {
    updateVendor(tx, householdId, existing.id, {
      nickname: changes.nickname,
      defaultCategoryId: changes.categoryId,
      defaultKind,
      confirmed: true,
      source: 'user',
    });
    return existing.id;
  }

  return createVendor(tx, householdId, {
    matchName: line.vendorName,
    matchAmountCents: changes.rememberAmount ? line.amountCents : null,
    nickname: changes.nickname ?? line.vendorName,
    defaultCategoryId: changes.categoryId ?? null,
    defaultKind: defaultKind ?? null,
    confirmed: true,
    source: 'user',
  }).id;
}
