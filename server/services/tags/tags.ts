import type { TagSummary } from '../../../shared/contract/entities';
import { AppError } from '../../../shared/errors';
import { TAG_NAME_MAX_LENGTH } from '../../../shared/limits';
import { normalizeName } from '../../../shared/text';
import type { DbExecutor } from '../../db/client';
import { isUniqueViolation } from '../../db/constraints';
import {
  countTagLines,
  deleteTagRow,
  insertTag,
  listTagRows,
  renameTagRow,
  requireTag,
  type TagRow,
} from '../../db/tags';

export type { TagSummary };

const byName = new Intl.Collator('pt-BR', { sensitivity: 'base' });

function toSummary(row: Pick<TagRow, 'id' | 'name'>, lineCount: number): TagSummary {
  return { id: row.id, name: row.name, lineCount };
}

/** Every tag of the household with its number of lines, sorted by name ignoring case and accents. */
export function listTags(db: DbExecutor, householdId: string): TagSummary[] {
  return listTagRows(db, householdId)
    .map((row) => toSummary(row, row.lineCount))
    .sort((a, b) => byName.compare(a.name, b.name) || a.id.localeCompare(b.id));
}

/**
 * Creates a tag. The name is trimmed, 1 to 40 characters, and unique in the
 * household ignoring case and accents.
 */
export function createTag(db: DbExecutor, householdId: string, rawName: string): TagSummary {
  const name = checkedName(db, householdId, undefined, rawName);
  try {
    return toSummary(insertTag(db, householdId, name), 0);
  } catch (error) {
    // An exact clash that got past the check above is stopped by the index.
    if (isUniqueViolation(error)) throw new AppError('tag_name_taken', `Another tag is already called ${name}`);
    throw error;
  }
}

/** Renames a tag with the same rules as a new one. The id and the lines stay. */
export function renameTag(db: DbExecutor, householdId: string, id: string, rawName: string): TagSummary {
  const tag = requireTag(db, householdId, id);
  const name = checkedName(db, householdId, tag.id, rawName);
  try {
    renameTagRow(db, householdId, tag.id, name);
  } catch (error) {
    if (isUniqueViolation(error)) throw new AppError('tag_name_taken', `Another tag is already called ${name}`);
    throw error;
  }
  return toSummary({ id: tag.id, name }, countTagLines(db, tag.id));
}

/** Deletes a tag and takes it off its lines. The lines stay and no total changes. */
export function deleteTag(db: DbExecutor, householdId: string, id: string): { linesUntagged: number } {
  requireTag(db, householdId, id);
  return { linesUntagged: deleteTagRow(db, householdId, id) };
}

/** The trimmed name, or the error that says why it cannot be used. */
function checkedName(db: DbExecutor, householdId: string, ownId: string | undefined, rawName: string): string {
  const name = rawName.trim();
  if (name === '' || name.length > TAG_NAME_MAX_LENGTH) {
    throw new AppError('invalid_request', `A tag name needs 1 to ${TAG_NAME_MAX_LENGTH} characters`);
  }
  const wanted = normalizeName(name);
  const taken = listTagRows(db, householdId).some((tag) => tag.id !== ownId && normalizeName(tag.name) === wanted);
  if (taken) throw new AppError('tag_name_taken', `Another tag is already called ${name}`);
  return name;
}
