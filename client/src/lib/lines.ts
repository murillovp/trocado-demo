import type { Category, LedgerLineChanges, LineChanges, Tag, TransactionKind, TransferPartner } from '@/api/types';
import { kindFitsAmount } from '../../../shared/kindRule';
import { categoryFitsKind, kindWithCategory } from '../../../shared/savings';
import { AMOUNT_TOO_BIG, formatDay, overAmountLimit, parseReais } from './format';
import { KIND_LABEL } from './labels';

/** What an edit form needs from a line; both Transações and the review screen have these fields. */
export type EditableLine = {
  vendorName: string;
  nickname: string | null;
  kind: TransactionKind | null;
  categoryId: string | null;
  categoryName: string | null;
  savingsLabel: string | null;
  /** Transações lines have a note; review lines do not. */
  note?: string | null;
};

/** The edit form's values. `note` is absent on the review screen, which cannot change notes. */
export type LineDraft = {
  nickname: string;
  kind: TransactionKind | null;
  categoryId: string | null;
  savingsLabel: string;
  note?: string;
  rememberAmount: boolean;
  /**
   * The tags picked for the line. Only the import review keeps them here (Transações' editor holds its own list),
   * and a line starts with none, so absent and empty both mean no tags. `diffLine` leaves them out: the confirm
   * request carries them as `tagIds`, beside the changes.
   */
  tags?: Tag[];
};

export function draftOf(line: EditableLine): LineDraft {
  return {
    nickname: line.nickname ?? line.vendorName,
    kind: line.kind,
    categoryId: line.categoryId,
    savingsLabel: line.savingsLabel ?? '',
    ...(line.note !== undefined ? { note: line.note ?? '' } : {}),
    rememberAmount: false,
  };
}

const KINDS: TransactionKind[] = ['expense', 'income', 'transfer', 'savings'];

/**
 * The types a line's menu offers. Entrada is left out of an imported line where
 * money left (ADR-0013), unless the line already has it, so the menu can still
 * show its value. `imported` is false for a line added by hand.
 */
export function kindChoices(line: { amountCents: number; kind: TransactionKind | null }, imported: boolean): TransactionKind[] {
  return KINDS.filter((kind) => kind === line.kind || kindFitsAmount(kind, line.amountCents, imported));
}

export function categoriesForKind(categories: Category[], kind: TransactionKind | null): Category[] {
  if (kind === 'expense') return categories.filter((category) => category.appliesTo === 'expense');
  if (kind === 'income') return categories.filter((category) => category.appliesTo === 'income');
  if (kind === 'savings') {
    return categories.filter((category) => category.appliesTo === 'expense' && category.bucket === 'savings');
  }
  return [];
}

/** The category choices for a line, keeping its current category even if it is archived. */
export function categoryOptions(
  categories: Category[],
  kind: TransactionKind | null,
  line: { categoryId: string | null; categoryName: string | null },
): { id: string; name: string }[] {
  const options = categoriesForKind(categories, kind).map((category) => ({ id: category.id, name: category.name }));
  if (line.categoryId && line.categoryName && !options.some((option) => option.id === line.categoryId)) {
    options.push({ id: line.categoryId, name: line.categoryName });
  }
  return options;
}

/** The two fields every edit form keeps in step: a line's draft and a seller's rule (through `vendors.ts`). */
type KindAndCategory = { kind: TransactionKind | null; categoryId: string | null };

/**
 * Changes the kind, dropping a category the new kind cannot have. A savings-group
 * category does not fit Gasto: the server would turn the line back into Poupança
 * (ADR-0012), so choosing Gasto clears it.
 */
export function withKind<T extends KindAndCategory>(draft: T, kind: TransactionKind | null, categories: Category[]): T {
  const current = categories.find((category) => category.id === draft.categoryId);
  const fits = current !== undefined && categoryFitsKind(kind, current);
  return { ...draft, kind, categoryId: fits ? draft.categoryId : null };
}

/** Picks a category. A savings-group category turns a Gasto into Poupança, as the server will (ADR-0012). */
export function withCategory<T extends KindAndCategory>(draft: T, categoryId: string | null, categories: Category[]): T {
  const bucket = categories.find((category) => category.id === categoryId)?.bucket;
  return { ...draft, categoryId, kind: kindWithCategory(draft.kind, bucket) };
}

/** The fields that changed, as the API wants them, or null when nothing did. */
export function diffLine(line: EditableLine, draft: LineDraft): LineChanges | null {
  const changes: LineChanges = {};

  const nickname = draft.nickname.trim();
  if (nickname !== '' && nickname !== (line.nickname ?? line.vendorName)) changes.nickname = nickname;

  if (draft.kind !== line.kind) changes.kind = draft.kind;

  // A transfer has no category; the server clears it.
  if (draft.kind !== 'transfer' && draft.categoryId !== line.categoryId) changes.categoryId = draft.categoryId;

  if (draft.kind === 'savings') {
    const label = draft.savingsLabel.trim();
    if (label !== (line.savingsLabel ?? '')) changes.savingsLabel = label === '' ? null : label;
  }

  if (draft.note !== undefined) {
    const note = draft.note.trim();
    if (note !== (line.note ?? '')) changes.note = note === '' ? null : note;
  }

  if (Object.keys(changes).length === 0) return null;

  const teachesVendor =
    changes.nickname !== undefined || changes.kind !== undefined || changes.categoryId !== undefined;
  if (draft.rememberAmount && teachesVendor) changes.rememberAmount = true;
  return changes;
}

/**
 * Reads the "Valor" field: a positive amount in reais, without a sign. An
 * amount equal to the line's current one is no change.
 */
export function amountChange(line: { amountCents: number }, text: string): { amountCents?: number; error?: string } {
  const cents = parseReais(text);
  if (cents === null) return { error: 'Digite um valor como 45,90.' };
  if (cents <= 0) return { error: 'O valor precisa ser maior que zero.' };
  if (overAmountLimit(cents)) return { error: AMOUNT_TOO_BIG };
  if (cents === Math.abs(line.amountCents)) return {};
  return { amountCents: cents };
}

/** A line that still needs the user: no kind, or an expense or income with no category (plan decision 7). */
export function stillNeedsYou(draft: Pick<LineDraft, 'kind' | 'categoryId'>): boolean {
  if (draft.kind === null) return true;
  return (draft.kind === 'expense' || draft.kind === 'income') && draft.categoryId === null;
}

/**
 * Newest day first, the order Transações lists in. Lines of the same day keep the
 * order they came in, so the review of an import reads like the ledger it joins.
 */
export function newestFirst<T extends { date: string }>(lines: T[]): T[] {
  return [...lines].sort((a, b) => b.date.localeCompare(a.date));
}

export function displayName(line: { nickname: string | null; vendorName: string; rawDescription: string }): string {
  return line.nickname ?? (line.vendorName || line.rawDescription);
}

/** What a save toast says about the seller's other lines that moved with it ("12 outros lançamentos de iFood também mudaram."). */
function movedSentence(count: number, sellerName: string): string {
  return count === 1
    ? `1 outro lançamento de ${sellerName} também mudou.`
    : `${count} outros lançamentos de ${sellerName} também mudaram.`;
}

/**
 * The toast after saving a line on Transações. It says how many of the seller's other
 * lines moved with it, and what the app will now use for the seller in the next files:
 * the new category's name, or the new nickname when only that changed. `sent` is what
 * the save sent. A line added by hand or one with no seller teaches nothing.
 */
export function savedLineMessage(
  line: { nickname: string | null; vendorName: string; rawDescription: string; isManual: boolean },
  sent: LedgerLineChanges,
  categories: Category[],
  vendorLinesMoved: number | undefined,
): string {
  const sellerName = displayName(line);
  const categoryName = sent.categoryId ? categories.find((category) => category.id === sent.categoryId)?.name : undefined;
  const remembered = categoryName ?? sent.nickname;
  const parts = ['Lançamento salvo.'];
  if (vendorLinesMoved) parts.push(movedSentence(vendorLinesMoved, sellerName));
  if (!line.isManual && line.vendorName !== '' && remembered) {
    parts.push(`O Trocado vai usar "${remembered}" para ${sellerName} nos próximos arquivos.`);
  }
  return parts.join(' ');
}

export function partnerSentence(partner: TransferPartner, amountCents: number): string {
  const direction = amountCents < 0 ? 'Foi para' : 'Veio de';
  const review = partner.inReview ? ' Essa outra ponta ainda está numa importação em revisão.' : '';
  return `${direction} ${partner.accountLabel} em ${formatDay(partner.date)}.${review}`;
}

export type KindFilter = '' | TransactionKind | 'unset';

export const KIND_FILTERS: { value: KindFilter; label: string }[] = [
  { value: '', label: 'Todos os tipos' },
  { value: 'expense', label: KIND_LABEL.expense },
  { value: 'income', label: KIND_LABEL.income },
  { value: 'transfer', label: KIND_LABEL.transfer },
  { value: 'savings', label: KIND_LABEL.savings },
  { value: 'unset', label: 'Sem tipo' },
];

export function parseKindFilter(text: string | null): KindFilter {
  return KIND_FILTERS.find((filter) => filter.value !== '' && filter.value === text)?.value ?? '';
}
