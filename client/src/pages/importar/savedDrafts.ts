import type { Tag, TransactionKind } from '@/api/types';
import { draftOf, type EditableLine, type LineDraft } from '@/lib/lines';

/** The fields of a draft that differ from the line it belongs to. A field that is absent was not changed. */
export type DraftChanges = Partial<LineDraft>;

/**
 * What the browser keeps for one import's review: for each edited line, only the fields
 * the user changed (tags included, as the tag objects, so a reload can show the chips), which lines he edited by hand, and when it was last written. Saving only
 * the changes means a restored draft cannot put back a value he never touched, such as a
 * category changed on Fornecedores in the meantime.
 */
export type SavedDrafts = { savedAt: number; changes: Record<string, DraftChanges>; hand: string[] };

const KEY_PREFIX = 'trocado.revisao.';
const KINDS: ReadonlyArray<TransactionKind | null> = ['expense', 'income', 'transfer', 'savings', null];

/** The `localStorage` key of one import's drafts. */
export function savedDraftsKey(importId: string): string {
  return `${KEY_PREFIX}${importId}`;
}

/** The import id inside a saved-drafts key, or null for any other key. */
export function importIdOfKey(key: string): string | null {
  return key.startsWith(KEY_PREFIX) ? key.slice(KEY_PREFIX.length) : null;
}

/** The fields of `draft` that differ from the draft a line starts with. */
export function draftChanges(line: EditableLine, draft: LineDraft): DraftChanges {
  const base = draftOf(line);
  const changes: DraftChanges = {};
  if (draft.nickname !== base.nickname) changes.nickname = draft.nickname;
  if (draft.kind !== base.kind) changes.kind = draft.kind;
  if (draft.categoryId !== base.categoryId) changes.categoryId = draft.categoryId;
  if (draft.savingsLabel !== base.savingsLabel) changes.savingsLabel = draft.savingsLabel;
  if (draft.note !== undefined && draft.note !== base.note) changes.note = draft.note;
  if (draft.rememberAmount !== base.rememberAmount) changes.rememberAmount = draft.rememberAmount;
  // A review line starts with no tags, so any tag on the draft is a change; a draft emptied again is none.
  if (draft.tags && draft.tags.length > 0) changes.tags = draft.tags;
  return changes;
}

/** Whether a saved tag has an id and a name. The name only shows the chip until the tag list loads and refreshes it. */
function isTag(value: unknown): value is Tag {
  if (typeof value !== 'object' || value === null) return false;
  const { id, name } = value as Record<string, unknown>;
  return typeof id === 'string' && id !== '' && typeof name === 'string';
}

/** Whether a saved change has the shape of the field it names. Anything unknown makes the whole entry unreadable. */
function isChanges(value: unknown): value is DraftChanges {
  if (typeof value !== 'object' || value === null) return false;
  const changes = value as Record<string, unknown>;
  return Object.entries(changes).every(([field, entry]) => {
    if (field === 'nickname' || field === 'savingsLabel' || field === 'note') return typeof entry === 'string';
    if (field === 'rememberAmount') return typeof entry === 'boolean';
    if (field === 'categoryId') return entry === null || typeof entry === 'string';
    if (field === 'kind') return KINDS.includes(entry as TransactionKind | null);
    if (field === 'tags') return Array.isArray(entry) && entry.every(isTag);
    return false;
  });
}

/** The saved drafts of an import, or null when there are none, they cannot be read or the browser blocks storage. */
export function loadSavedDrafts(importId: string): SavedDrafts | null {
  try {
    const text = window.localStorage.getItem(savedDraftsKey(importId));
    if (text === null) return null;
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { savedAt, changes, hand } = parsed as { savedAt?: unknown; changes?: unknown; hand?: unknown };
    if (typeof savedAt !== 'number' || typeof changes !== 'object' || changes === null) return null;
    const valid = Object.entries(changes).filter(([, entry]) => isChanges(entry)) as [string, DraftChanges][];
    const handIds = Array.isArray(hand) ? hand.filter((id): id is string => typeof id === 'string') : [];
    return { savedAt, changes: Object.fromEntries(valid), hand: handIds };
  } catch {
    return null;
  }
}

/** Writes the saved drafts, or forgets the copy when there are none. Storage that fails leaves the review working, unsaved. */
export function saveDrafts(importId: string, saved: Omit<SavedDrafts, 'savedAt'>, now: number = Date.now()): void {
  if (Object.keys(saved.changes).length === 0) {
    clearSavedDrafts(importId);
    return;
  }
  try {
    window.localStorage.setItem(savedDraftsKey(importId), JSON.stringify({ savedAt: now, ...saved } satisfies SavedDrafts));
  } catch {
    // Nothing to do: the corrections last for this visit only.
  }
}

/** Deletes an import's saved drafts, once it is confirmed or discarded. */
export function clearSavedDrafts(importId: string): void {
  try {
    window.localStorage.removeItem(savedDraftsKey(importId));
  } catch {
    // Nothing to do: the review of a confirmed import ignores any copy left behind.
  }
}

/** Deletes the saved drafts of every import that is not in `pendingIds`: confirmed or discarded elsewhere. */
export function clearSavedDraftsExcept(pendingIds: ReadonlySet<string>): void {
  try {
    const stale: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      const importId = key === null ? null : importIdOfKey(key);
      if (key !== null && importId !== null && !pendingIds.has(importId)) stale.push(key);
    }
    for (const key of stale) window.localStorage.removeItem(key);
  } catch {
    // Nothing to do: a copy left behind is ignored once its import is not pending.
  }
}
