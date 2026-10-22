import { formatCentavos } from '../../../shared/money';
import { normalizeName } from '../../../shared/text';
import type { Category, LedgerLine, TransactionKind, VendorEdit, VendorSummary } from '@/api/types';
import { AMOUNT_TOO_BIG, overAmountLimit, parseReais } from './format';
import { categoriesForKind, withCategory, withKind } from './lines';

export type VendorFilter = 'all' | 'mine' | 'suggested' | 'amount';

export const VENDOR_FILTERS: { value: VendorFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'mine', label: 'Corrigidos por mim' },
  { value: 'suggested', label: 'Sugeridos pela IA' },
  { value: 'amount', label: 'Com regra de valor' },
];

/**
 * A seller rule that still comes from the AI, so it carries the "IA" mark. Confirming an
 * import keeps the mark (`confirmed` only means the rule is reused without asking the
 * AI); editing the seller or accepting it makes the rule the user's.
 */
export function isSuggested(vendor: Pick<VendorSummary, 'source'>): boolean {
  return vendor.source === 'ai';
}

/** The same rule for a Transações line. A missing source (an older server) means no mark. */
export function isSuggestedLine(line: Pick<LedgerLine, 'vendorSource'>): boolean {
  return line.vendorSource === 'ai';
}

export function matchesVendor(vendor: VendorSummary, search: string, filter: VendorFilter): boolean {
  const needle = normalizeName(search);
  const found =
    needle === '' || normalizeName(vendor.nickname).includes(needle) || normalizeName(vendor.matchName).includes(needle);
  if (!found) return false;
  if (filter === 'mine') return vendor.source === 'user';
  if (filter === 'suggested') return isSuggested(vendor);
  if (filter === 'amount') return vendor.matchAmountCents !== null;
  return true;
}

export type VendorDraft = {
  nickname: string;
  matchName: string;
  /** Typed the way the statement shows it: "-500,00" for money leaving. Empty means any amount. */
  amount: string;
  defaultCategoryId: string | null;
  defaultKind: TransactionKind | null;
  applyToLines: boolean;
};

export function vendorDraftOf(vendor: VendorSummary): VendorDraft {
  return {
    nickname: vendor.nickname,
    matchName: vendor.matchName,
    amount: vendor.matchAmountCents === null ? '' : formatCentavos(vendor.matchAmountCents),
    defaultCategoryId: vendor.defaultCategoryId,
    defaultKind: vendor.defaultKind,
    applyToLines: false,
  };
}

/** Changes the rule's type, dropping a category the new type cannot have. No type keeps the category. */
export function withVendorKind(draft: VendorDraft, kind: TransactionKind | null, categories: Category[]): VendorDraft {
  if (kind === null) return { ...draft, defaultKind: null };
  const next = withKind({ kind: draft.defaultKind, categoryId: draft.defaultCategoryId }, kind, categories);
  return { ...draft, defaultKind: next.kind, defaultCategoryId: next.categoryId };
}

/** Picks the rule's category. A savings-group category turns a Gasto rule into Poupança, as the server will (ADR-0012). */
export function withVendorCategory(draft: VendorDraft, categoryId: string | null, categories: Category[]): VendorDraft {
  const next = withCategory({ kind: draft.defaultKind, categoryId: draft.defaultCategoryId }, categoryId, categories);
  return { ...draft, defaultKind: next.kind, defaultCategoryId: next.categoryId };
}

/**
 * The categories a rule can pick: those that fit its type, or all when it has none.
 * The rule's own category stays in the list when it is archived, so the picker can still name it.
 */
export function vendorCategoryOptions(
  categories: Category[],
  kind: TransactionKind | null,
  vendor: Pick<VendorSummary, 'defaultCategoryId' | 'defaultCategoryName'>,
): { id: string; name: string }[] {
  const options = (kind === null ? categories : categoriesForKind(categories, kind)).map((category) => ({
    id: category.id,
    name: category.name,
  }));
  const archived =
    vendor.defaultCategoryId !== null && !categories.some((category) => category.id === vendor.defaultCategoryId);
  if (archived && vendor.defaultCategoryName) {
    options.push({ id: vendor.defaultCategoryId!, name: vendor.defaultCategoryName });
  }
  return options;
}

export function diffVendor(vendor: VendorSummary, draft: VendorDraft): { edit: VendorEdit | null } | { error: string } {
  const edit: VendorEdit = {};

  const nickname = draft.nickname.trim();
  if (!nickname) return { error: 'O apelido não pode ficar vazio.' };
  if (nickname !== vendor.nickname) edit.nickname = nickname;

  const matchName = draft.matchName.trim();
  if (!matchName) return { error: 'O nome no extrato não pode ficar vazio.' };
  if (matchName !== vendor.matchName) edit.matchName = matchName;

  let amount: number | null = null;
  if (draft.amount.trim()) {
    amount = parseReais(draft.amount);
    if (amount === null) return { error: 'Valor inválido. Escreva como no extrato, por exemplo -500,00.' };
    if (overAmountLimit(amount)) return { error: AMOUNT_TOO_BIG };
  }
  if (amount !== vendor.matchAmountCents) edit.matchAmountCents = amount;

  if (draft.defaultCategoryId !== vendor.defaultCategoryId) {
    edit.defaultCategoryId = draft.defaultCategoryId;
    if (draft.applyToLines) edit.applyToLines = true;
  }
  if (draft.defaultKind !== vendor.defaultKind) edit.defaultKind = draft.defaultKind;

  return { edit: Object.keys(edit).length > 0 ? edit : null };
}
