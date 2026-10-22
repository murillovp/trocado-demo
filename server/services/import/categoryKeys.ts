import type { CategoryKey } from '../../../shared/categoryKeys';
import type { CategoryRow } from '../../db/categories';

/**
 * Reads the stable keys off the household's categories (ADR-0016). Parsers
 * name a category by key, and the AI prompt names the catch-alls by the key's
 * current display name, so a rename never breaks either.
 */

/** The id of each given category by its key. A category with no key is left out. */
export function categoryIdsByKeyOf(rows: readonly CategoryRow[]): Map<CategoryKey, string> {
  const result = new Map<CategoryKey, string>();
  for (const row of rows) {
    if (row.systemKey !== null) result.set(row.systemKey, row.id);
  }
  return result;
}

/** The current name of the category holding a key, or null when none of the given categories holds it. */
export function nameOfKey(rows: readonly CategoryRow[], key: CategoryKey): string | null {
  return rows.find((row) => row.systemKey === key)?.name ?? null;
}
