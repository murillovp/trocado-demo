import { randomUUID } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import { AppError } from '../../shared/errors';
import type { CategoryAppliesTo, CategoryBucket } from '../../shared/types';
import type { Db, DbExecutor } from './client';
import { definedEntries } from './patch';
import { categories } from './schema';

export type CategoryRow = typeof categories.$inferSelect;

/** Where a category added without a position goes: after the seeded ones. */
const DEFAULT_SORT_ORDER = 999;

export function listCategories(
  db: DbExecutor,
  householdId: string,
  options: { includeArchived?: boolean } = {},
): CategoryRow[] {
  const rows = db
    .select()
    .from(categories)
    .where(eq(categories.householdId, householdId))
    .orderBy(asc(categories.sortOrder), asc(categories.name))
    .all();

  return options.includeArchived ? rows : rows.filter((row) => !row.archived);
}

/** The category with exactly this name, archived or not. A name stays taken after archiving (unique index). */
export function findCategoryByName(db: DbExecutor, householdId: string, name: string): CategoryRow | undefined {
  return db
    .select()
    .from(categories)
    .where(and(eq(categories.householdId, householdId), eq(categories.name, name)))
    .get();
}

/** Inserts a category. The unique index on household and name stops an exact duplicate name. */
export function insertCategory(
  db: DbExecutor,
  householdId: string,
  input: {
    name: string;
    appliesTo: CategoryAppliesTo;
    bucket: CategoryBucket | null;
    sortOrder?: number;
  },
): CategoryRow {
  const id = randomUUID();
  db.insert(categories)
    .values({
      id,
      householdId,
      name: input.name,
      appliesTo: input.appliesTo,
      bucket: input.bucket,
      sortOrder: input.sortOrder ?? DEFAULT_SORT_ORDER,
    })
    .run();

  return requireCategory(db, householdId, id);
}

/** Brings an archived category back with the given settings, keeping its id, key and lines. */
export function restoreCategory(
  db: DbExecutor,
  householdId: string,
  id: string,
  input: { appliesTo: CategoryAppliesTo; bucket: CategoryBucket | null; sortOrder?: number },
): CategoryRow {
  db.update(categories)
    .set({
      archived: false,
      appliesTo: input.appliesTo,
      bucket: input.bucket,
      ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
    })
    .where(and(eq(categories.householdId, householdId), eq(categories.id, id)))
    .run();
  return requireCategory(db, householdId, id);
}

/** Writes the given columns of one category. The unique index stops an exact duplicate name. */
export function updateCategory(
  db: DbExecutor,
  householdId: string,
  id: string,
  patch: { name?: string; bucket?: CategoryBucket | null; sortOrder?: number },
): CategoryRow {
  requireCategory(db, householdId, id);

  const changes = definedEntries(patch);
  if (Object.keys(changes).length === 0) {
    return requireCategory(db, householdId, id);
  }

  db.update(categories)
    .set(changes)
    .where(and(eq(categories.householdId, householdId), eq(categories.id, id)))
    .run();

  return requireCategory(db, householdId, id);
}

/** Writes each listed category's sort order as its position in the list (0, 1, 2…). The caller checks the list. */
export function setCategorySortOrders(db: DbExecutor, householdId: string, orderedIds: readonly string[]): void {
  orderedIds.forEach((id, index) => {
    db.update(categories)
      .set({ sortOrder: index })
      .where(and(eq(categories.householdId, householdId), eq(categories.id, id)))
      .run();
  });
}

export function archiveCategory(db: Db, householdId: string, id: string): CategoryRow {
  requireCategory(db, householdId, id);

  db.update(categories)
    .set({ archived: true })
    .where(and(eq(categories.householdId, householdId), eq(categories.id, id)))
    .run();

  return requireCategory(db, householdId, id);
}

export function requireCategory(db: DbExecutor, householdId: string, id: string): CategoryRow {
  const row = db
    .select()
    .from(categories)
    .where(and(eq(categories.householdId, householdId), eq(categories.id, id)))
    .get();

  if (!row) {
    throw new AppError('category_not_found', `No category ${id} in household ${householdId}`);
  }
  return row;
}
