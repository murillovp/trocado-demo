import type { AccountType } from './types';

/**
 * True for money arriving on a card that the parser marked a transfer
 * candidate. Only the bill payment ("Pagamento recebido") is marked, so the
 * line never counts, even with no partner (ADR-0008).
 */
export function isCardBillPayment(line: {
  accountType: AccountType;
  transferCandidate: boolean;
  amountCents: number;
}): boolean {
  return line.accountType === 'card' && line.transferCandidate && line.amountCents > 0;
}
