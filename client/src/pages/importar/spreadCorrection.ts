import type { Category, ReviewLine, TransactionKind } from '@/api/types';
import { categoryOptions, draftOf, kindChoices, withCategory, withKind, type LineDraft } from '@/lib/lines';
import { normalizeName } from '../../../../shared/text';

/** The three fields of a review row that spread to the seller's other lines. */
export type SpreadField = 'nickname' | 'category' | 'kind';

/** One change a row made, in the terms of the helper that made it. */
type Correction =
  | { field: 'nickname'; nickname: string }
  | { field: 'category'; categoryId: string | null }
  | { field: 'kind'; kind: TransactionKind | null };

/** The offer a row shows under itself: the checkbox, how many lines it covers and the seller's name. */
export type SpreadOffer = { lineId: string; count: number; name: string; checked: boolean };

/** The latest spread: who made it, who follows, and what each follower had before. */
type Spread = {
  leaderId: string;
  correction: Correction;
  name: string;
  followers: string[];
  /** A follower's draft before the spread; undefined when it had none. */
  previous: Map<string, LineDraft | undefined>;
  on: boolean;
};

/** Everything the review screen has changed, and who changed it. */
export type DraftState = {
  drafts: Record<string, LineDraft>;
  /** Lines edited by hand, or restored from a saved copy. A spread never touches them. */
  hand: ReadonlySet<string>;
  spread: Spread | null;
};

type Context = { lines: ReviewLine[]; categories: Category[] };

export const EMPTY_STATE: DraftState = { drafts: {}, hand: new Set(), spread: null };

function correctionOf(field: SpreadField, draft: LineDraft): Correction {
  if (field === 'nickname') return { field, nickname: draft.nickname };
  if (field === 'category') return { field, categoryId: draft.categoryId };
  return { field, kind: draft.kind };
}

/**
 * Makes the change on a follower's own draft, through the helpers the row uses, so the
 * result is the one a direct change would give. Null when the row could not offer that
 * change: no category list for its kind, a category its kind cannot have, a kind its
 * amount does not allow, or a kind change on a line paired as a transfer.
 */
function applyCorrection(line: ReviewLine, draft: LineDraft, correction: Correction, categories: Category[]): LineDraft | null {
  const applied = changedDraft(line, draft, correction, categories);
  // Confirming would unpair a transfer whose kind moves, and its other half may be a confirmed line elsewhere.
  if (applied && line.transferPairId && applied.kind !== line.kind) return null;
  return applied;
}

function changedDraft(line: ReviewLine, draft: LineDraft, correction: Correction, categories: Category[]): LineDraft | null {
  if (correction.field === 'nickname') return { ...draft, nickname: correction.nickname };
  if (correction.field === 'kind') {
    const allowed = correction.kind === null || kindChoices({ amountCents: line.amountCents, kind: draft.kind }, true).includes(correction.kind);
    return allowed ? withKind(draft, correction.kind, categories) : null;
  }
  const options = categoryOptions(categories, draft.kind, line);
  const fits = correction.categoryId === null || options.some((option) => option.id === correction.categoryId);
  return options.length > 0 && fits ? withCategory(draft, correction.categoryId, categories) : null;
}

function sameSeller(a: ReviewLine, b: ReviewLine): boolean {
  const name = normalizeName(a.vendorName);
  return name !== '' && name === normalizeName(b.vendorName);
}

/** The spread without a line that left it, or null when no follower is left. */
function withoutFollower(spread: Spread, lineId: string): Spread | null {
  if (!spread.followers.includes(lineId)) return spread;
  const followers = spread.followers.filter((id) => id !== lineId);
  const previous = new Map(spread.previous);
  previous.delete(lineId);
  return followers.length === 0 ? null : { ...spread, followers, previous };
}

/**
 * A row's change. The line becomes a hand edit. When the change is a nickname, category or
 * kind, the seller's other lines in the file that were not edited by hand get the same change
 * on their own drafts. Repeated changes to the same field, such as typing a nickname, stay one
 * spread, so unticking returns the followers to what they had before the first one.
 */
export function editLine(state: DraftState, context: Context, lineId: string, draft: LineDraft, field?: SpreadField): DraftState {
  const drafts = { ...state.drafts, [lineId]: draft };
  const hand = new Set(state.hand).add(lineId);
  const spread = state.spread ? withoutFollower(state.spread, lineId) : null;
  const leader = context.lines.find((line) => line.id === lineId);
  if (!field || !leader) return { drafts, hand, spread };

  const correction = correctionOf(field, draft);
  const continuing = spread?.leaderId === lineId && spread.correction.field === field ? spread : null;
  const on = continuing ? continuing.on : true;
  const next = new Map<string, LineDraft>();
  for (const line of context.lines) {
    if (line.id === lineId || hand.has(line.id) || !sameSeller(line, leader)) continue;
    const applied = applyCorrection(line, state.drafts[line.id] ?? draftOf(line), correction, context.categories);
    if (applied) next.set(line.id, applied);
  }
  if (next.size === 0) return { drafts, hand, spread: null };

  const previous = new Map<string, LineDraft | undefined>();
  for (const id of next.keys()) {
    previous.set(id, continuing?.previous.has(id) ? continuing.previous.get(id) : state.drafts[id]);
    if (on) drafts[id] = next.get(id)!;
  }
  const name = continuing?.name ?? leader.nickname ?? leader.vendorName;
  return { drafts, hand, spread: { leaderId: lineId, correction, name, followers: [...next.keys()], previous, on } };
}

/** The draft a line starts with, or undefined for a line the screen no longer has. */
function lineDraftOf(context: Context, lineId: string): LineDraft | undefined {
  const line = context.lines.find((candidate) => candidate.id === lineId);
  return line ? draftOf(line) : undefined;
}

/** Unticking gives the followers back their previous drafts; ticking makes the change on them again. */
export function setSpreadOn(state: DraftState, context: Context, on: boolean): DraftState {
  const { spread } = state;
  if (!spread || spread.on === on) return state;
  const drafts = { ...state.drafts };
  const previous = new Map(spread.previous);
  for (const id of spread.followers) {
    if (!on) {
      // The tags are not part of the spread, so unticking gives back the earlier draft but keeps the tags picked since.
      const tags = drafts[id]?.tags;
      const before = spread.previous.get(id) ?? (tags ? lineDraftOf(context, id) : undefined);
      if (before) drafts[id] = tags ? { ...before, tags } : before;
      else delete drafts[id];
      continue;
    }
    const line = context.lines.find((candidate) => candidate.id === id);
    const applied = line && applyCorrection(line, drafts[id] ?? draftOf(line), spread.correction, context.categories);
    previous.set(id, state.drafts[id]);
    if (applied) drafts[id] = applied;
  }
  return { ...state, drafts, spread: { ...spread, on, previous } };
}

/**
 * A state that starts from drafts saved earlier. Only the lines saved as hand edits count as
 * hand edits; the others were followers of a spread and keep following the next one.
 */
export function stateFromSaved(drafts: Record<string, LineDraft>, hand: readonly string[]): DraftState {
  return { drafts, hand: new Set(hand), spread: null };
}

/** What the row of the leader shows, or null when nothing is spread. */
export function offerOf(spread: Spread | null): SpreadOffer | null {
  if (!spread) return null;
  return { lineId: spread.leaderId, count: spread.followers.length, name: spread.name, checked: spread.on };
}
