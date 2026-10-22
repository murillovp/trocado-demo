import { randomUUID } from 'node:crypto';
import { and, asc, count, eq, inArray, max, min, type SQL } from 'drizzle-orm';
import { AppError } from '../../shared/errors';
import type { DbExecutor } from './client';
import { outsideReview } from './lineFilters';
import { accounts, imports, tags, transactions, transactionTags } from './schema';

export type TagRow = typeof tags.$inferSelect;
export type TagRowWithCount = TagRow & { lineCount: number };

/** A tag as a line carries it. */
export type LineTag = { id: string; name: string };

/** How many ids one query holds, well under SQLite's limit on bound values. */
const CHUNK_SIZE = 500;

function chunksOf<T>(items: readonly T[]): T[][] {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += CHUNK_SIZE) chunks.push(items.slice(start, start + CHUNK_SIZE));
  return chunks;
}

/** Every tag of the household with the number of lines carrying it, by name. The service sorts it for the screen. */
export function listTagRows(db: DbExecutor, householdId: string): TagRowWithCount[] {
  return db
    .select({
      id: tags.id,
      householdId: tags.householdId,
      name: tags.name,
      createdAt: tags.createdAt,
      lineCount: count(transactionTags.transactionId),
    })
    .from(tags)
    .leftJoin(transactionTags, eq(transactionTags.tagId, tags.id))
    .where(eq(tags.householdId, householdId))
    .groupBy(tags.id)
    .orderBy(asc(tags.name))
    .all();
}

/** The tag, or undefined when the household has none with this id. */
export function findTag(db: DbExecutor, householdId: string, id: string): TagRow | undefined {
  return db
    .select()
    .from(tags)
    .where(and(eq(tags.householdId, householdId), eq(tags.id, id)))
    .get();
}

export function requireTag(db: DbExecutor, householdId: string, id: string): TagRow {
  const row = findTag(db, householdId, id);
  if (!row) throw new AppError('tag_not_found', `No tag ${id} in household ${householdId}`);
  return row;
}

/** The ids, among those asked for, that are tags of the household. */
export function existingTagIds(db: DbExecutor, householdId: string, ids: readonly string[]): Set<string> {
  const found = chunksOf(ids).flatMap((chunk) =>
    db
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.householdId, householdId), inArray(tags.id, chunk)))
      .all(),
  );
  return new Set(found.map((row) => row.id));
}

/** Writes a new tag. The unique index on household and name stops an exact duplicate. */
export function insertTag(db: DbExecutor, householdId: string, name: string): TagRow {
  const id = randomUUID();
  db.insert(tags).values({ id, householdId, name }).run();
  return requireTag(db, householdId, id);
}

export function renameTagRow(db: DbExecutor, householdId: string, id: string, name: string): void {
  db.update(tags)
    .set({ name })
    .where(and(eq(tags.householdId, householdId), eq(tags.id, id)))
    .run();
}

/** How many lines carry the tag. */
export function countTagLines(db: DbExecutor, tagId: string): number {
  return db.select({ lines: count() }).from(transactionTags).where(eq(transactionTags.tagId, tagId)).get()?.lines ?? 0;
}

/** Deletes a tag and its links to lines. The lines stay. Returns how many lines it left. */
export function deleteTagRow(db: DbExecutor, householdId: string, id: string): number {
  const linesUntagged = countTagLines(db, id);
  db.delete(transactionTags).where(eq(transactionTags.tagId, id)).run();
  db.delete(tags)
    .where(and(eq(tags.householdId, householdId), eq(tags.id, id)))
    .run();
  return linesUntagged;
}

/** Each tagged line's tags, sorted by name. Lines with no tag are not in the map. */
export function listLineTags(db: DbExecutor, householdId: string): Map<string, LineTag[]> {
  const rows = db
    .select({ transactionId: transactionTags.transactionId, id: tags.id, name: tags.name })
    .from(transactionTags)
    .innerJoin(tags, eq(transactionTags.tagId, tags.id))
    .where(eq(tags.householdId, householdId))
    .orderBy(asc(tags.name), asc(tags.id))
    .all();
  const byLine = new Map<string, LineTag[]>();
  for (const { transactionId, id, name } of rows) {
    byLine.set(transactionId, [...(byLine.get(transactionId) ?? []), { id, name }]);
  }
  return byLine;
}

/** Replaces the tags of one line with exactly these tag ids. Callers check that the ids are tags of the household. */
export function setTransactionTags(db: DbExecutor, transactionId: string, tagIds: readonly string[]): void {
  db.delete(transactionTags).where(eq(transactionTags.transactionId, transactionId)).run();
  for (const tagId of new Set(tagIds)) {
    db.insert(transactionTags).values({ transactionId, tagId }).run();
  }
}

/** Puts the tag on each line that lacks it. Returns how many lines changed. */
export function addTagToLines(db: DbExecutor, tagId: string, transactionIds: readonly string[]): number {
  let changed = 0;
  for (const transactionId of transactionIds) {
    changed += db.insert(transactionTags).values({ transactionId, tagId }).onConflictDoNothing().run().changes;
  }
  return changed;
}

/** Takes the tag off each line that has it. Returns how many lines changed. */
export function removeTagFromLines(db: DbExecutor, tagId: string, transactionIds: readonly string[]): number {
  let changed = 0;
  for (const transactionId of transactionIds) {
    changed += db
      .delete(transactionTags)
      .where(and(eq(transactionTags.transactionId, transactionId), eq(transactionTags.tagId, tagId)))
      .run().changes;
  }
  return changed;
}

/** Whether each line asked for exists in the household, and whether it still waits in an import under review. */
export function listLineStates(
  db: DbExecutor,
  householdId: string,
  transactionIds: readonly string[],
): Map<string, { inReview: boolean }> {
  const states = new Map<string, { inReview: boolean }>();
  for (const chunk of chunksOf(transactionIds)) {
    const rows = db
      .select({ id: transactions.id, importId: transactions.importId, importStatus: imports.status })
      .from(transactions)
      .leftJoin(imports, eq(transactions.importId, imports.id))
      .where(and(eq(transactions.householdId, householdId), inArray(transactions.id, chunk)))
      .all();
    for (const row of rows) states.set(row.id, { inReview: row.importId !== null && row.importStatus !== 'confirmed' });
  }
  return states;
}

/** What a tag's lines look like for one subject: how many, and the first and last date. */
export type TagLineStats = { tagId: string; lineCount: number; firstDate: string; lastDate: string };

/**
 * For each tag that has lines, the number of lines outside review (any kind) and
 * the dates of the first and last, for the household or for one person. A tag with
 * no line for the subject has no entry.
 */
export function listTagLineStats(db: DbExecutor, householdId: string, personId?: string): TagLineStats[] {
  const conditions: SQL[] = [eq(transactions.householdId, householdId), outsideReview()];
  if (personId !== undefined) conditions.push(eq(accounts.personId, personId));
  return db
    .select({
      tagId: transactionTags.tagId,
      lineCount: count(),
      firstDate: min(transactions.date),
      lastDate: max(transactions.date),
    })
    .from(transactionTags)
    .innerJoin(transactions, eq(transactionTags.transactionId, transactions.id))
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(imports, eq(transactions.importId, imports.id))
    .where(and(...conditions))
    .groupBy(transactionTags.tagId)
    .all()
    .map((row) => ({ ...row, firstDate: row.firstDate!, lastDate: row.lastDate! }));
}
