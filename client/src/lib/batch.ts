import type { Category, LedgerLine, TransactionKind } from '@/api/types';
import { plural } from './format';
import { categoriesForKind } from './lines';
import { isSuggestedLine } from './vendors';

/** The types "Tipo" offers on the batch bar, in the order the menus use: Gasto, Entrada, Poupança, Fora dos totais. */
export const BATCH_KINDS: TransactionKind[] = ['expense', 'income', 'savings', 'transfer'];

/**
 * The categories that fit every selected line, by each line's type, as the line editor offers them.
 * A transfer or a line with no type has no category choice, so it leaves the list empty. With mixed
 * types only the categories both types accept stay: Gasto and Poupança share the savings group.
 */
export function categoriesInCommon(categories: Category[], lines: Pick<LedgerLine, 'kind'>[]): Category[] {
  if (lines.length === 0) return [];
  return categories.filter((category) =>
    lines.every((line) => categoriesForKind(categories, line.kind).some((fit) => fit.id === category.id)),
  );
}

const NOTHING_CHANGED = 'Nenhum lançamento mudou.';

/** "Categoria alterada em 5 lançamentos." The server counts only the lines that ended with a different category. */
export function categoryChangedMessage(changed: number): string {
  return changed === 0 ? NOTHING_CHANGED : `Categoria alterada em ${plural(changed, 'lançamento', 'lançamentos')}.`;
}

/** "Tipo alterado em 5 lançamentos." */
export function kindChangedMessage(changed: number): string {
  return changed === 0 ? NOTHING_CHANGED : `Tipo alterado em ${plural(changed, 'lançamento', 'lançamentos')}.`;
}

/** "2 fornecedores confirmados." The server counts only the sellers that were not confirmed before. */
export function vendorsConfirmedMessage(accepted: number): string {
  if (accepted === 0) return 'Nenhum fornecedor mudou.';
  return `${plural(accepted, 'fornecedor', 'fornecedores')} ${accepted === 1 ? 'confirmado' : 'confirmados'}.`;
}

/** The sellers of these lines whose rule still carries the "IA" mark, each once. "Confirmar IA" sends them. */
export function suggestedVendorIds(lines: Pick<LedgerLine, 'vendorId' | 'vendorSource'>[]): string[] {
  const ids = new Set<string>();
  for (const line of lines) {
    if (line.vendorId !== null && isSuggestedLine(line)) ids.add(line.vendorId);
  }
  return [...ids];
}
