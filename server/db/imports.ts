import { and, asc, desc, eq } from 'drizzle-orm';
import { AppError } from '../../shared/errors';
import type { ImportStatus } from '../../shared/types';
import type { DbExecutor } from './client';
import { importImages, imports } from './schema';

export type ImportRow = typeof imports.$inferSelect;
export type ImportSummaryRow = Omit<ImportRow, 'fileBytes'>;

export type NewImport = typeof imports.$inferInsert;

export function insertImport(db: DbExecutor, row: NewImport): void {
  db.insert(imports).values(row).run();
}

export function requireImport(db: DbExecutor, householdId: string, id: string): ImportRow {
  const row = db
    .select()
    .from(imports)
    .where(and(eq(imports.householdId, householdId), eq(imports.id, id)))
    .get();

  if (!row) {
    throw new AppError('import_not_found', `No import ${id} in household ${householdId}`);
  }
  return row;
}

/** Every import, newest first, without the stored file. */
export function listImports(db: DbExecutor, householdId: string): ImportSummaryRow[] {
  return db
    .select({
      id: imports.id,
      householdId: imports.householdId,
      accountId: imports.accountId,
      fileName: imports.fileName,
      format: imports.format,
      status: imports.status,
      importedAt: imports.importedAt,
      periodStart: imports.periodStart,
      periodEnd: imports.periodEnd,
      lineCount: imports.lineCount,
    })
    .from(imports)
    .where(eq(imports.householdId, householdId))
    .orderBy(desc(imports.importedAt))
    .all();
}

export function setImportStatus(
  db: DbExecutor,
  householdId: string,
  id: string,
  status: ImportStatus,
): void {
  db.update(imports)
    .set({ status })
    .where(and(eq(imports.householdId, householdId), eq(imports.id, id)))
    .run();
}

export function deleteImport(db: DbExecutor, householdId: string, id: string): void {
  db.delete(imports)
    .where(and(eq(imports.householdId, householdId), eq(imports.id, id)))
    .run();
}

export type NewImportImage = typeof importImages.$inferInsert;

export function insertImportImages(db: DbExecutor, rows: NewImportImage[]): void {
  for (const row of rows) {
    db.insert(importImages).values(row).run();
  }
}

/** Throws the not-found AppError when the import has no screenshot at that position. */
export function getImportImage(
  db: DbExecutor,
  householdId: string,
  importId: string,
  position: number,
): { mimeType: string; bytes: Buffer } {
  const row = db
    .select({ mimeType: importImages.mimeType, bytes: importImages.bytes })
    .from(importImages)
    .where(
      and(
        eq(importImages.householdId, householdId),
        eq(importImages.importId, importId),
        eq(importImages.position, position),
      ),
    )
    .get();

  if (!row) {
    throw new AppError(
      'import_image_not_found',
      `No image at position ${position} for import ${importId} in household ${householdId}`,
    );
  }
  return row;
}

/** Every screenshot's position and file name, in the order they were sent. */
export function listImportImageNames(
  db: DbExecutor,
  householdId: string,
  importId: string,
): { position: number; fileName: string }[] {
  return db
    .select({ position: importImages.position, fileName: importImages.fileName })
    .from(importImages)
    .where(and(eq(importImages.householdId, householdId), eq(importImages.importId, importId)))
    .orderBy(asc(importImages.position))
    .all();
}

export function deleteImportImages(db: DbExecutor, householdId: string, importId: string): void {
  db.delete(importImages)
    .where(and(eq(importImages.householdId, householdId), eq(importImages.importId, importId)))
    .run();
}
