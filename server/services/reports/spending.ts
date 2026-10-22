/**
 * Small helpers that the Análise rules share (plan 18 month view, plan 19 year
 * and week views): what a line spent, which lines are later installment
 * slices, and which months a view reads. All pure.
 */
import { addMonthsToMonth, lastTwelveMonths, monthOf } from '../../../shared/dates';
import { averagedMonths } from '../../../shared/history';
import type { ReportLine } from '../../db/reportLines';

/** Money out of the line, positive for a purchase and negative for a refund. */
export function spentOf(line: ReportLine): number {
  return -line.amountCents;
}

/** What the lines spent together, refunds subtracted. */
export function sum(lines: readonly ReportLine[]): number {
  return lines.reduce((total, line) => total + spentOf(line), 0);
}

/** A slice of an installment plan after the first. The card bill repeats the same charge, so it is not a new decision. */
export function isLaterSlice(line: ReportLine): boolean {
  return line.installmentNumber !== null && line.installmentNumber >= 2;
}

/** The twelve calendar months ending with `month`, oldest first: the window every Análise average and trend reads. */
export function monthWindow(month: string): string[] {
  return lastTwelveMonths(month);
}

/** Whole cents, a half rounded away from zero, and never negative zero. */
export function roundAwayFromZero(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value)) || 0;
}

/** The expense lines that fall in `window`: what the year and week views read, with income and transfers out. */
export function expenseLinesIn(lines: readonly ReportLine[], window: readonly string[]): ReportLine[] {
  const inWindow = new Set(window);
  return lines.filter((line) => line.kind === 'expense' && inWindow.has(monthOf(line.date)));
}

/**
 * The months the year and week views read, oldest first: the twelve of `monthWindow(month)` and
 * the one before them. That first month is never shown. It only tells `countedMonthsOf` whether
 * older data exists, so a partial first month is judged as Mês judges it. Reading lines from
 * here on is how both views get that month.
 */
export function monthsRead(month: string): string[] {
  return [addMonthsToMonth(month, -12), ...monthWindow(month)];
}

/**
 * The months the year and week views may show and read, oldest first: what `averagedMonths`
 * counts in the twelve months ending with `month`. `spending` is the expense lines of
 * `monthsRead(month)` and `currentMonth` the calendar month today, which is not over and never
 * counts. The rule runs over those thirteen months and the extra first one is dropped from the
 * answer: a month that opens Ano's window is then left out as partial exactly when Mês, whose
 * window starts one month earlier, leaves it out. Both views call this, so they cannot
 * disagree about which months count.
 */
export function countedMonthsOf(spending: readonly ReportLine[], month: string, currentMonth: string): string[] {
  const read = monthsRead(month);
  const average = averagedMonths(
    read.map((readMonth) => ({
      month: readMonth,
      spendingCents: sum(spending.filter((line) => monthOf(line.date) === readMonth)),
    })),
    currentMonth,
  );
  return average?.months.map((entry) => entry.month).filter((counted) => counted !== read[0]) ?? [];
}
