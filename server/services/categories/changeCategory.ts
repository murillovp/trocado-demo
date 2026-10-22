import { AppError } from '../../../shared/errors';
import type { CategoryBucket } from '../../../shared/types';
import { findCategoryByName, requireCategory, updateCategory, type CategoryRow } from '../../db/categories';
import type { Db } from '../../db/client';
import { alignKindsToCategory } from '../../db/transactions';

/**
 * Changes a category on the Categorias screen. A change of group moves its
 * lines with it, so the budget and the cards keep agreeing (ADR-0012). The
 * count goes back to the screen, which says how many lines moved. A name that
 * another category holds is refused, and an archived category's name counts too,
 * because a name stays taken after archiving.
 */
export function changeCategory(
  db: Db,
  householdId: string,
  id: string,
  patch: { name?: string; bucket?: CategoryBucket | null; sortOrder?: number },
): { category: CategoryRow; linesChanged: number } {
  return db.transaction((tx) => {
    requireCategory(tx, householdId, id);
    if (patch.name !== undefined) {
      const holder = findCategoryByName(tx, householdId, patch.name);
      if (holder && holder.id !== id) {
        throw new AppError('category_name_taken', `Category already exists: ${patch.name}`);
      }
    }
    const category = updateCategory(tx, householdId, id, patch);
    const linesChanged =
      patch.bucket !== undefined && category.appliesTo === 'expense'
        ? alignKindsToCategory(tx, householdId, id, category.bucket)
        : 0;
    return { category, linesChanged };
  });
}
