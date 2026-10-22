/** The months a spending average counts, the range they cover and the average itself. */
export interface AveragedMonths<T extends MonthSpending> {
  months: T[];
  /** The first and last month averaged, "2026-07" and "2026-09". */
  from: string;
  to: string;
  /** How many calendar months `from` to `to` holds. Larger than `months.length` when a month inside had no spending. */
  spanMonths: number;
  averageCents: number;
}

/** The part of a month's totals the average reads. */
export type MonthSpending = { month: string; spendingCents: number };

/** Destaques need this many counted months: two to average, and the last one to compare. The server answers no insight below it, and the screen says why the list is empty. */
export const MIN_INSIGHT_MONTHS = 3;

/**
 * The months a spending average counts: the one rule Visão's twelve-month chart and
 * Análise share. A month counts when it is over (before `today`'s calendar month) and
 * had spending. The first month with spending is left out when empty columns come
 * before it, because the import may have started in the middle of that month; when it
 * is the window's first column, older data exists, so it stays. Returns null when no
 * month qualifies. `window` is oldest first, one entry per calendar month.
 */
export function averagedMonths<T extends MonthSpending>(window: readonly T[], today: string): AveragedMonths<T> | null {
  const firstSpending = window.findIndex((entry) => entry.spendingCents > 0);
  const counted = window.filter(
    (entry, index) => entry.spendingCents > 0 && entry.month < today && (index !== firstSpending || index === 0),
  );
  const first = counted[0];
  const last = counted[counted.length - 1];
  if (!first || !last) return null;
  const spanMonths = window.findIndex((entry) => entry.month === last.month) - window.findIndex((entry) => entry.month === first.month) + 1;
  const total = counted.reduce((sum, entry) => sum + entry.spendingCents, 0);
  return { months: counted, from: first.month, to: last.month, spanMonths, averageCents: Math.round(total / counted.length) };
}
