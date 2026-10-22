import type { ReviewLine, Tag } from '@/api/types';
import { distinctTags, type TagAction } from '@/lib/tags';
import { draftOf, type LineDraft } from '@/lib/lines';
import type { DraftChanges } from './savedDrafts';
import type { DraftState } from './spreadCorrection';

/*
 * Tags on the review screen. They live in a row's draft and nowhere else: nothing here reaches the
 * server, and the confirm request writes them with the lines. A tag change never marks a row as a
 * hand edit and never spreads to the seller's other lines, because the plan 14 spread covers
 * nickname, category and kind only.
 */

/** A tag as the drafts keep it: id and name only, whatever extra fields the list it came from had. */
export function plainTag(tag: Tag): Tag {
  return { id: tag.id, name: tag.name };
}

/** The tags on a draft; none for a row that was never tagged. */
export function tagsOfDraft(draft: LineDraft | undefined): readonly Tag[] {
  return draft?.tags ?? [];
}

/**
 * The draft with these tags. A row with no draft yet gets one that differs from its line in nothing but the tags.
 * Editing tags changes neither `hand` nor `spread`, so a follower of a spread stays a follower.
 */
export function withLineTags(state: DraftState, lines: readonly ReviewLine[], lineId: string, tags: readonly Tag[]): DraftState {
  const line = lines.find((candidate) => candidate.id === lineId);
  if (!line) return state;
  const draft = state.drafts[lineId] ?? draftOf(line);
  return { ...state, drafts: { ...state.drafts, [lineId]: { ...draft, tags: tags.map(plainTag) } } };
}

/** The tags a line ends with after `action`, or null when it would not change: it has the tag already (add) or lacks it (remove). */
function tagsAfter(current: readonly Tag[], tag: Tag, action: TagAction): Tag[] | null {
  const has = current.some((other) => other.id === tag.id);
  if (action === 'add') return has ? null : [...current, tag];
  return has ? current.filter((other) => other.id !== tag.id) : null;
}

/** Adds the tag to, or takes it off, each listed line's draft. A line it would not change keeps its draft. */
export function withBulkTag(state: DraftState, lines: readonly ReviewLine[], lineIds: readonly string[], tag: Tag, action: TagAction): DraftState {
  return lineIds.reduce((next, lineId) => {
    const after = tagsAfter(tagsOfDraft(next.drafts[lineId]), tag, action);
    return after ? withLineTags(next, lines, lineId, after) : next;
  }, state);
}

/** How many of these lines the bulk action would change, for the toast. */
export function countTagChanges(drafts: Readonly<Record<string, LineDraft>>, lineIds: readonly string[], tag: Tag, action: TagAction): number {
  return lineIds.filter((lineId) => tagsAfter(tagsOfDraft(drafts[lineId]), tag, action) !== null).length;
}

/** The tags on any of these lines, each once, for "Remover tag". */
export function tagsOnLines(drafts: Readonly<Record<string, LineDraft>>, lineIds: readonly string[]): Tag[] {
  return distinctTags(lineIds.map((lineId) => tagsOfDraft(drafts[lineId])));
}

/**
 * A saved copy's tags, checked against the tags that exist now: a tag that was deleted since is dropped, and a
 * renamed one shows its new name. `known` undefined means the tag list did not load, so nothing can be judged
 * and the saved tags stay. A line left with no tags loses the key.
 */
export function withKnownTags(changes: DraftChanges, known: readonly Tag[] | undefined): DraftChanges {
  const { tags, ...rest } = changes;
  if (tags === undefined || known === undefined) return changes;
  const byId = new Map(known.map((tag) => [tag.id, tag]));
  const kept = tags.flatMap((tag) => {
    const current = byId.get(tag.id);
    return current ? [plainTag(current)] : [];
  });
  return kept.length > 0 ? { ...rest, tags: kept } : rest;
}

/**
 * The tag ids the confirm request carries for a draft: the tags that still exist, or undefined when there are none
 * to write, so a row with no tags adds nothing to `edits`. `known` undefined means the tag list did not load, and
 * the ids go as they are.
 */
export function tagIdsToSend(draft: LineDraft, known: readonly Tag[] | undefined): string[] | undefined {
  const ids = tagsOfDraft(draft).map((tag) => tag.id);
  const kept = known === undefined ? ids : ids.filter((id) => known.some((tag) => tag.id === id));
  return kept.length > 0 ? kept : undefined;
}
