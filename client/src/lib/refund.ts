import type { TransactionKind } from '@/api/types';
import { kindLabel } from './labels';

/** The word on screen for money that came back from a purchase. It is a label only: the line stays an expense. */
export const REFUND_LABEL = 'Estorno';

/** Shown under the kind select while the line is a refund. */
export const REFUND_HINT = 'Estorno: o dinheiro voltou e diminui os gastos do mês.';

/**
 * A line of kind expense with a positive amount is a refund. `amountCents` is the amount the row
 * shows: the adjusted one when the line has it, else the bank's. Nothing else reads this, so no
 * filter, total or sign depends on it.
 */
export function isRefund(line: { kind: TransactionKind | null; amountCents: number }): boolean {
  return line.kind === 'expense' && line.amountCents > 0;
}

/** The kind name a row shows: "Estorno" for a refund, otherwise the kind's own name. */
export function lineKindLabel(line: { kind: TransactionKind | null; amountCents: number }): string {
  return isRefund(line) ? REFUND_LABEL : kindLabel(line.kind);
}
