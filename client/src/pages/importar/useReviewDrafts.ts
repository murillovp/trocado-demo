import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Category, LineEdit, ReviewLine, Tag } from '@/api/types';
import type { TagAction } from '@/lib/tags';
import { timeOfDay } from '@/lib/format';
import { diffLine, draftOf, stillNeedsYou, type LineDraft } from '@/lib/lines';
import { clearSavedDrafts, draftChanges, loadSavedDrafts, saveDrafts, type DraftChanges, type SavedDrafts } from './savedDrafts';
import { tagIdsToSend, withBulkTag, withKnownTags, withLineTags } from './reviewTags';
import { EMPTY_STATE, editLine, offerOf, setSpreadOn, stateFromSaved, type DraftState, type SpreadField } from './spreadCorrection';

/** A saved change with its category dropped when the category no longer exists. */
function withoutVanishedCategory(changes: DraftChanges, line: ReviewLine, categories: Category[]): DraftChanges {
  const { categoryId, ...rest } = changes;
  if (categoryId === undefined) return changes;
  // An empty list means the categories did not load, so nothing can be judged. The line's own category stays valid even when archived.
  const known = categories.length === 0 || categoryId === null || categoryId === line.categoryId || categories.some((category) => category.id === categoryId);
  return known ? changes : rest;
}

/**
 * The saved changes that still belong to a line of this import, laid over the lines as they
 * are now, and when they were saved. A change for a line the import no longer has, and a
 * category or tag that was deleted since, are dropped from the saved copy too. A line that was
 * edited by hand stays a hand edit; the others stay lines a spread may change.
 */
function restore(importId: string | null, lines: ReviewLine[], categories: Category[], tags: Tag[] | undefined): { state: DraftState; savedAt: number | null } {
  const saved = importId === null ? null : loadSavedDrafts(importId);
  if (importId === null || !saved) return { state: EMPTY_STATE, savedAt: null };
  const byId = new Map(lines.map((line) => [line.id, line]));
  const drafts: Record<string, LineDraft> = {};
  for (const [lineId, changes] of Object.entries(saved.changes)) {
    const line = byId.get(lineId);
    if (!line) continue;
    const kept = withKnownTags(withoutVanishedCategory(changes, line, categories), tags);
    if (Object.keys(kept).length > 0) drafts[lineId] = { ...draftOf(line), ...kept };
  }
  if (Object.keys(drafts).length === 0) {
    clearSavedDrafts(importId);
    return { state: EMPTY_STATE, savedAt: null };
  }
  const state = stateFromSaved(drafts, saved.hand.filter((lineId) => byId.has(lineId)));
  // Rewrites the copy only when something was dropped, and keeps the time it was first saved.
  const copy = savedCopyOf(lines, state);
  const sameHand = [...copy.hand].sort().join() === [...saved.hand].sort().join();
  if (!sameHand || JSON.stringify(copy.changes) !== JSON.stringify(saved.changes)) saveDrafts(importId, copy, saved.savedAt);
  return { state, savedAt: saved.savedAt };
}

/** What the browser keeps for these drafts: each line's changed fields, and the hand edits. */
function savedCopyOf(lines: ReviewLine[], state: DraftState): Omit<SavedDrafts, 'savedAt'> {
  const changes: Record<string, DraftChanges> = {};
  for (const line of lines) {
    const draft = state.drafts[line.id];
    const diff = draft ? draftChanges(line, draft) : {};
    if (Object.keys(diff).length > 0) changes[line.id] = diff;
  }
  return { changes, hand: [...state.hand].filter((lineId) => lineId in changes) };
}

/**
 * What the review screen has changed so far. A line has no draft until it is edited,
 * so a row that was never touched keeps the same props from one render to the next.
 * `setDraft`, `setTags`, `tagLines` and `setSpread` never change, which lets a memoised row skip a render it does not need.
 *
 * A nickname, category or kind change also goes to the seller's other lines in the file
 * (`spread` is the offer to undo it). Tags are part of a row's draft but follow neither the spread
 * nor the hand edits: `setTags` and `tagLines` touch the tags only. `tags` is the household's tag
 * list, used to drop a saved tag that no longer exists. Every change is saved in the browser under the
 * import's id and restored on the next visit. `importId` is null when the import is
 * not pending, which keeps the browser out of it.
 */
export function useReviewDrafts(lines: ReviewLine[], categories: Category[], importId: string | null, tags?: Tag[]) {
  const [restored] = useState(() => restore(importId, lines, categories, tags));
  const [state, setState] = useState<DraftState>(restored.state);
  // The handlers read the latest lines and categories from here, so they can stay the same function.
  const context = useRef({ lines, categories });
  useEffect(() => {
    context.current = { lines, categories };
  });

  // What was last written, so restoring does not rewrite the time the drafts were saved.
  const written = useRef(restored.state);
  useEffect(() => {
    if (importId === null || (written.current.drafts === state.drafts && written.current.hand === state.hand)) return;
    written.current = state;
    saveDrafts(importId, savedCopyOf(context.current.lines, state));
  }, [importId, state]);

  const setDraft = useCallback(
    (lineId: string, draft: LineDraft, field?: SpreadField) =>
      setState((current) => editLine(current, context.current, lineId, draft, field)),
    [],
  );
  const setSpread = useCallback(
    (on: boolean) => setState((current) => setSpreadOn(current, context.current, on)),
    [],
  );

  // Tag changes are never a hand edit and never spread (plan 18): they bypass `editLine`.
  const setTags = useCallback(
    (lineId: string, picked: Tag[]) => setState((current) => withLineTags(current, context.current.lines, lineId, picked)),
    [],
  );
  const tagLines = useCallback(
    (lineIds: readonly string[], tag: Tag, action: TagAction) =>
      setState((current) => withBulkTag(current, context.current.lines, lineIds, tag, action)),
    [],
  );

  const { drafts } = state;
  const spread = useMemo(() => offerOf(state.spread), [state.spread]);
  const draftFor = (line: ReviewLine) => drafts[line.id] ?? draftOf(line);
  const waiting = lines.filter((line) => stillNeedsYou(draftFor(line))).length;
  const edits: LineEdit[] = lines.flatMap((line) => {
    const draft = drafts[line.id];
    const changes = draft ? diffLine(line, draft) : null;
    // `tags` undefined means the list did not load, so the ids go as they are. A tag deleted since it was picked is left out: the server would refuse the whole confirm over it.
    const tagIds = draft ? tagIdsToSend(draft, tags) : undefined;
    return changes || tagIds ? [{ transactionId: line.id, ...changes, ...(tagIds ? { tagIds } : {}) }] : [];
  });
  const restoredAt = restored.savedAt === null ? null : timeOfDay(new Date(restored.savedAt));

  return { drafts, setDraft, setTags, tagLines, setSpread, spread, draftFor, waiting, edits, restoredAt };
}
