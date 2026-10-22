import { AppError } from '../../../shared/errors';
import { listCategories, setCategorySortOrders, type CategoryRow } from '../../db/categories';
import type { Db } from '../../db/client';

/**
 * Puts the household's active categories in a new order, in one transaction.
 * The order is one numbering across all of them; the screen's groups are views
 * of it. The list must hold every active category once and nothing else. A list
 * with a missing, extra, unknown or repeated id changes nothing. Archived
 * categories keep their numbers.
 */
export function reorderCategories(db: Db, householdId: string, orderedIds: readonly string[]): CategoryRow[] {
  return db.transaction((tx) => {
    const active = listCategories(tx, householdId);
    const wanted = new Set(orderedIds);
    const sameSet = wanted.size === orderedIds.length && wanted.size === active.length && active.every((row) => wanted.has(row.id));
    if (!sameSet) {
      throw new AppError(
        'category_order_invalid',
        `The order must list each of the ${active.length} active categories once; it listed ${orderedIds.length} ids`,
      );
    }
    setCategorySortOrders(tx, householdId, orderedIds);
    return listCategories(tx, householdId);
  });
}
