import type { TransactionKind } from '@/api/types';

/** What an amount's colour says. `plain` is the normal text colour; `negative-on-dark` is the red for the dark Saldo do mês card. */
export type MoneyTone = 'positive' | 'negative' | 'negative-on-dark' | 'savings' | 'muted-out' | 'plain';

/** The text colour class for each tone. The colours live in index.css. */
export const TONE_CLASS: Record<MoneyTone, string> = {
  positive: 'text-positive',
  negative: 'text-negative',
  'negative-on-dark': 'text-result-card-negative',
  savings: 'text-savings',
  'muted-out': 'text-muted-out',
  plain: '',
};

/**
 * The tone of one amount. The kind decides first, because the sign alone lies:
 * a refund typed Gasto is positive and is still spending, and savings are
 * stored negative and still are not spending.
 *
 * - transfer: muted, whatever the sign (the line is outside every total)
 * - savings: blue, whatever the sign
 * - income: green when money arrived; a negative or zero income line stays plain
 * - expense: plain, whatever the sign
 * - kind unknown (a file row, a line with no type yet): the sign decides, so
 *   money arriving is green and anything else is plain
 *
 * The words ("Fora dos totais", "Poupança") and the minus sign stay on screen,
 * so the colour is never the only signal.
 */
export function moneyTone(kind: TransactionKind | null | undefined, cents: number): MoneyTone {
  if (kind === 'transfer') return 'muted-out';
  if (kind === 'savings') return 'savings';
  if (kind === 'expense') return 'plain';
  return cents > 0 ? 'positive' : 'plain';
}
