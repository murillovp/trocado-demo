import { AppError } from '../../../shared/errors';
import type { CategoryAppliesTo, CategoryBucket } from '../../../shared/types';
import {
  findCategoryByName,
  insertCategory,
  restoreCategory,
  type CategoryRow,
} from '../../db/categories';
import type { Db } from '../../db/client';
import { alignKindsToCategory, clearCategoryOfWrongKind } from '../../db/transactions';

/**
 * Adds a category on the Categorias screen. A name stays taken after its
 * category is archived, so reusing an archived name brings that category back
 * with its id and old lines (ADR-0012): the new group and direction reach those
 * lines too. They follow the group, and lines of the wrong direction lose the
 * category. The count goes back to the screen. A name an active category holds
 * is refused.
 */
export function addCategory(
  db: Db,
  householdId: string,
  input: { name: string; appliesTo: CategoryAppliesTo; bucket: CategoryBucket | null; sortOrder?: number },
): { category: CategoryRow; linesChanged: number } {
  return db.transaction((tx) => {
    const existing = findCategoryByName(tx, householdId, input.name);
    if (existing && !existing.archived) {
      throw new AppError('category_name_taken', `Category already exists: ${input.name}`);
    }
    if (!existing) return { category: insertCategory(tx, householdId, input), linesChanged: 0 };

    const category = restoreCategory(tx, householdId, existing.id, input);
    const cleared = clearCategoryOfWrongKind(tx, householdId, category.id, category.appliesTo);
    const aligned =
      category.appliesTo === 'expense' ? alignKindsToCategory(tx, householdId, category.id, category.bucket) : 0;
    return { category, linesChanged: cleared + aligned };
  });
}
