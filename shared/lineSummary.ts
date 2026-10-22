import type { LedgerLine, LedgerSummary } from './contract/lines';

/**
 * The totals Transações shows above its list, over the lines the query found.
 * They use the amount that counts (an amount the user changed wins over the
 * bank's) and the month report's signs. A line with no kind adds to nothing.
 */
export function summarizeLines(lines: readonly Pick<LedgerLine, 'kind' | 'amountCents'>[]): LedgerSummary {
  let spendingCents = 0;
  let incomeCents = 0;
  let savingsCents = 0;
  let transferCount = 0;
  for (const line of lines) {
    if (line.kind === 'expense') spendingCents -= line.amountCents;
    else if (line.kind === 'income') incomeCents += line.amountCents;
    else if (line.kind === 'savings') savingsCents -= line.amountCents;
    else if (line.kind === 'transfer') transferCount += 1;
  }
  return { spendingCents, incomeCents, savingsCents, transferCount, pileTotalCents: spendingCents + savingsCents };
}
