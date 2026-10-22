import type {
  Account,
  AccountType,
  BankId,
  BucketLabels,
  ImportFormat,
  ImportRowStatus,
  ImportStatus,
  ReviewFlag,
  RowCounts,
  SkipReason,
  TransactionKind,
} from '@/api/types';
import { plural } from './format';

export const KIND_LABEL: Record<TransactionKind, string> = {
  expense: 'Gasto',
  income: 'Entrada',
  transfer: 'Fora dos totais',
  savings: 'Poupança',
};

/** Shown right under the kind select, only while the chosen kind is `transfer`. */
export const TRANSFER_HINT = 'Fica na lista, mas não entra em nenhum total.';

export function kindLabel(kind: TransactionKind | null): string {
  return kind === null ? 'Sem tipo' : KIND_LABEL[kind];
}

/** The group names before the user renames them, and while the stored names load. */
export const DEFAULT_BUCKET_LABELS: BucketLabels = {
  needs: 'Necessidades',
  wants: 'Desejos',
  savings: 'Poupança',
};

export const BANK_LABEL: Record<BankId, string> = { nubank: 'Nubank', itau: 'Itaú', swile: 'Swile' };

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  checking: 'Conta corrente',
  card: 'Cartão de crédito',
  benefit: 'Cartão benefício',
};

export const FORMAT_LABEL: Record<ImportFormat, string> = {
  nubank_checking_csv: 'Extrato CSV do Nubank',
  nubank_card_csv: 'Fatura CSV do Nubank',
  itau_checking_pdf: 'Extrato PDF do Itaú',
  swile_screenshots: 'Capturas do extrato Swile',
};

/** The file each account takes, in the words the bank's app uses. */
export function accountFileLabel(account: Account): string {
  if (account.bank === 'swile') return FORMAT_LABEL.swile_screenshots;
  if (account.bank === 'itau') return FORMAT_LABEL.itau_checking_pdf;
  return account.type === 'card' ? FORMAT_LABEL.nubank_card_csv : FORMAT_LABEL.nubank_checking_csv;
}

export const ROW_STATUS_LABEL: Record<ImportRowStatus, string> = {
  imported: 'Importada',
  duplicate: 'Já importada',
  ignored: 'Ignorada',
};

/** A duplicate row whose earlier occurrence is a screenshot of this same import, not an import already confirmed before. */
export const DUPLICATE_SAME_IMPORT_LABEL = 'Já lida na captura anterior';

export const SKIP_REASON_LABEL: Record<SkipReason, string> = {
  balance_row: 'linha de saldo',
  cut_off: 'cortada na captura',
  impossible_date: 'Data impossível',
};

export const FLAG_LABEL: Record<ReviewFlag, string> = {
  kind_unset: 'sem tipo',
  no_category: 'sem categoria',
  low_confidence: 'IA em dúvida',
};

export const IMPORT_STATUS_LABEL: Record<ImportStatus, string> = {
  pending: 'Em revisão',
  confirmed: 'Confirmada',
};

/** The box under an edited review row: the same change for the seller's other lines in the file. */
export function spreadSentence(count: number, name: string): string {
  return count === 1
    ? `Mudar também o outro lançamento de ${name} neste arquivo`
    : `Mudar também os outros ${count} lançamentos de ${name} neste arquivo`;
}

/** What happened to every row of a file. The three counts add up to the total (ADR-0006). */
export function rowsSentence(counts: RowCounts): string {
  return `${plural(counts.total, 'linha', 'linhas')} no arquivo: ${plural(counts.imported, 'nova', 'novas')}, ${plural(counts.duplicate, 'repetida', 'repetidas')}, ${plural(counts.ignored, 'ignorada', 'ignoradas')}`;
}
