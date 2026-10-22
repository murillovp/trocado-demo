import type { MonthTotals } from '@/api/types';

// The average rule is shared with the server, so Visão and Análise count the same months.
export { averagedMonths, MIN_INSIGHT_MONTHS, type AveragedMonths } from '../../../shared/history';

/** The month with the most spending in the window, or null when nothing was spent. */
export function highestMonth(window: MonthTotals[]): MonthTotals | null {
  let best: MonthTotals | null = null;
  for (const entry of window) {
    if (entry.spendingCents > (best?.spendingCents ?? 0)) best = entry;
  }
  return best;
}
