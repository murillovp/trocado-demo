import type { CategoryAppliesTo, CategoryBucket, TransactionKind } from './types';

/**
 * A spending line in a category of the savings group is savings: the category's
 * group decides (ADR-0012). Every other pair stays as it is. The server and the
 * browser both use this, so a screen shows the kind the server will store.
 */
export function kindWithCategory(
  kind: TransactionKind | null,
  bucket: CategoryBucket | null | undefined,
): TransactionKind | null {
  return kind === 'expense' && bucket === 'savings' ? 'savings' : kind;
}

/**
 * Whether a line of this kind can keep this category when its kind changes.
 * Gasto keeps an expense category outside the savings group, Entrada an income
 * category, Poupança an expense category in the savings group (ADR-0012). A
 * transfer or an untyped line keeps none. The line editor and the batch type
 * change both clear a category that fails this, so the two agree.
 */
export function categoryFitsKind(
  kind: TransactionKind | null,
  category: { appliesTo: CategoryAppliesTo; bucket: CategoryBucket | null },
): boolean {
  if (kind === 'income') return category.appliesTo === 'income';
  if (kind === 'expense') return category.appliesTo === 'expense' && category.bucket !== 'savings';
  if (kind === 'savings') return category.appliesTo === 'expense' && category.bucket === 'savings';
  return false;
}
