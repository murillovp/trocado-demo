import type { TransactionKind } from './types';

/**
 * Money that left an account is never Entrada (ADR-0013). An imported line
 * keeps the bank's sign, so Entrada on a negative one would lower the month's
 * income. A hand-added line has no bank sign: its sign follows its kind. The
 * server and the browser both use this, so a menu offers what the server accepts.
 */
export function kindFitsAmount(kind: TransactionKind | null, amountCents: number, imported: boolean): boolean {
  return !(imported && kind === 'income' && amountCents < 0);
}
