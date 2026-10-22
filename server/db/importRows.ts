import { and, asc, count, eq, ne } from 'drizzle-orm';
import type { ImportRowStatus } from '../../shared/types';
import type { DbExecutor } from './client';
import { importRows, imports, transactions } from './schema';

export type ImportRowRecord = typeof importRows.$inferSelect;

/** A row plus, for a duplicate, the earlier import that already holds its line. */
export type ImportRowView = ImportRowRecord & {
  earlierImportId: string | null;
  earlierImportedAt: string | null;
};

export type NewImportRow = typeof importRows.$inferInsert;

export function insertImportRows(db: DbExecutor, rows: NewImportRow[]): void {
  for (const row of rows) {
    db.insert(importRows).values(row).run();
  }
}

export function listImportRows(db: DbExecutor, householdId: string, importId: string): ImportRowView[] {
  return db
    .select({ row: importRows, earlierImportId: imports.id, earlierImportedAt: imports.importedAt })
    .from(importRows)
    .leftJoin(transactions, eq(importRows.transactionId, transactions.id))
    .leftJoin(imports, eq(transactions.importId, imports.id))
    .where(and(eq(importRows.householdId, householdId), eq(importRows.importId, importId)))
    .orderBy(asc(importRows.sourceLine))
    .all()
    .map(({ row, earlierImportId, earlierImportedAt }) => {
      const isDuplicate = row.status === 'duplicate';
      return {
        ...row,
        earlierImportId: isDuplicate ? earlierImportId : null,
        earlierImportedAt: isDuplicate ? earlierImportedAt : null,
      };
    });
}

/**
 * True when a row of a DIFFERENT import points at one of this import's lines
 * (a later duplicate upload keeping history against an earlier line). Cancelling
 * this import while that is true would orphan the other import's history.
 */
export function hasDependentRows(db: DbExecutor, householdId: string, importId: string): boolean {
  const row = db
    .select({ id: importRows.id })
    .from(importRows)
    .innerJoin(transactions, eq(importRows.transactionId, transactions.id))
    .where(
      and(
        eq(importRows.householdId, householdId),
        eq(transactions.importId, importId),
        ne(importRows.importId, importId),
      ),
    )
    .get();
  return row !== undefined;
}

export function deleteImportRows(db: DbExecutor, householdId: string, importId: string): void {
  db.delete(importRows)
    .where(and(eq(importRows.householdId, householdId), eq(importRows.importId, importId)))
    .run();
}

/** How many rows of each import were imported, already imported, or ignored. */
export function countRowsByImport(
  db: DbExecutor,
  householdId: string,
): Map<string, Record<ImportRowStatus, number>> {
  const rows = db
    .select({ importId: importRows.importId, status: importRows.status, rows: count() })
    .from(importRows)
    .where(eq(importRows.householdId, householdId))
    .groupBy(importRows.importId, importRows.status)
    .all();

  const counts = new Map<string, Record<ImportRowStatus, number>>();
  for (const row of rows) {
    const entry = counts.get(row.importId) ?? { imported: 0, duplicate: 0, ignored: 0 };
    entry[row.status] = row.rows;
    counts.set(row.importId, entry);
  }
  return counts;
}
