import { AppError } from '../../../shared/errors';
import { kindFitsAmount } from '../../../shared/kindRule';
import { kindWithCategory } from '../../../shared/savings';
import type { CategoryAppliesTo, CategoryBucket, TransactionKind } from '../../../shared/types';

/** What the savings rule needs to know about a category. */
export type CategoryFacts = { appliesTo: CategoryAppliesTo; bucket: CategoryBucket | null };

export function categoryFactsOf(
  categories: readonly { id: string; appliesTo: CategoryAppliesTo; bucket: CategoryBucket | null }[],
): Map<string, CategoryFacts> {
  return new Map(categories.map((category) => [category.id, { appliesTo: category.appliesTo, bucket: category.bucket }]));
}

/** Expense and savings lines need an expense category; income lines an income one. */
function fitsDirection(kind: TransactionKind, category: CategoryFacts): boolean {
  return category.appliesTo === (kind === 'income' ? 'income' : 'expense');
}

/**
 * For imports and the AI re-run, where nobody is asked: the category's group
 * wins (ADR-0012). A savings-group category makes an expense savings; a savings
 * line in another group becomes an expense; a category of the wrong direction
 * is dropped, and the line waits for review.
 */
export function alignToCategory(
  kind: TransactionKind | null,
  categoryId: string | null,
  facts: Map<string, CategoryFacts>,
): { kind: TransactionKind | null; categoryId: string | null } {
  if (categoryId === null || kind === null || kind === 'transfer') return { kind, categoryId };
  const category = facts.get(categoryId);
  if (!category || !fitsDirection(kind, category)) return { kind, categoryId: null };
  if (kind === 'savings' && category.bucket !== 'savings') return { kind: 'expense', categoryId };
  return { kind: kindWithCategory(kind, category.bucket), categoryId };
}

/**
 * For the user's edits: the kind the line ends with. A savings-group category
 * makes an expense savings, as the screen already showed. A pair that cannot
 * be (a savings line in another group, or the wrong direction, AB-06) is
 * refused, so nothing is guessed behind his back.
 */
export function checkKindAndCategory(
  kind: TransactionKind | null,
  categoryId: string | null,
  facts: Map<string, CategoryFacts>,
): TransactionKind | null {
  if (categoryId === null || kind === null || kind === 'transfer') return kind;
  const category = facts.get(categoryId);
  if (!category) throw new AppError('category_not_found', `No category ${categoryId}`);
  if (!fitsDirection(kind, category) || (kind === 'savings' && category.bucket !== 'savings')) {
    throw new AppError('category_wrong_kind', `Category ${categoryId} cannot sit on a ${kind} line`);
  }
  return kindWithCategory(kind, category.bucket);
}

/**
 * Refuses Entrada on an imported line where money left (ADR-0013). The bank
 * amount decides: an adjusted amount keeps the bank's sign (ADR-0009). A hand-added
 * line flips its sign with its kind, so it is never refused.
 */
export function checkKindFitsAmount(
  kind: TransactionKind | null,
  line: { amountCents: number; importId: string | null },
): void {
  if (!kindFitsAmount(kind, line.amountCents, line.importId !== null)) {
    throw new AppError('kind_wrong_direction', 'An imported line where money left cannot be income');
  }
}
