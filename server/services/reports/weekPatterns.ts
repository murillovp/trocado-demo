/**
 * The rules behind Análise's week view (plan 19): how spending spreads over the days of
 * the week and over the parts of the month. Pure like `trends.ts`: they read plain line
 * lists and answer plain objects. The months they read are the ones the year view counts
 * (`countedMonthsOf`), so the two views never disagree.
 */
import type { AnalysisMonthPart, AnalysisWeekAnswer, AnalysisWeekday } from '../../../shared/contract/reports';
import { monthOf } from '../../../shared/dates';
import type { ReportLine } from '../../db/reportLines';
import { countedMonthsOf, expenseLinesIn, isLaterSlice, monthsRead, roundAwayFromZero, sum } from './spending';

const DAYS_IN_A_WEEK = 7;

/** The first day of each part of the month: 1 to 7, 8 to 14, 15 to 21, and 22 to the end. */
const MONTH_PART_FIRST_DAYS = [1, 8, 15, 22] as const;

/** Which part of the month a day of the month falls in, as an index into `MONTH_PART_FIRST_DAYS`. */
function partIndexOf(dayOfMonth: number): number {
  return MONTH_PART_FIRST_DAYS.filter((firstDay) => dayOfMonth >= firstDay).length - 1;
}

/** The day of the month of an ISO date. */
function dayOfMonthOf(isoDate: string): number {
  return Number(isoDate.slice(8, 10));
}

/** 0 (Sunday) to 6 (Saturday) for an ISO date. Read in UTC, so the local time zone cannot move the day. */
function weekdayOf(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}

/** How many days a month "2026-02" holds. */
function daysInMonth(month: string): number {
  const [year, monthNumber] = month.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

/** Every day of the months as an ISO date, in order. */
function daysOf(months: readonly string[]): string[] {
  return months.flatMap((month) =>
    Array.from({ length: daysInMonth(month) }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`),
  );
}

/** Spending per day, rounded to whole cents. 0 when there are no days. */
function averagePerDay(totalCents: number, dayCount: number): number {
  return dayCount === 0 ? 0 : roundAwayFromZero(totalCents / dayCount);
}

/** The seven weekday entries, Sunday first, from the days the months hold and the lines they spent. */
function weekdaysOf(days: readonly string[], lines: readonly ReportLine[]): AnalysisWeekday[] {
  return Array.from({ length: DAYS_IN_A_WEEK }, (_, weekday): AnalysisWeekday => {
    const dayCount = days.filter((day) => weekdayOf(day) === weekday).length;
    const totalCents = sum(lines.filter((line) => weekdayOf(line.date) === weekday));
    return { weekday, totalCents, dayCount, averageCents: averagePerDay(totalCents, dayCount) };
  });
}

/** The four month-part entries, in month order, from the days the months hold and the lines they spent. */
function monthPartsOf(days: readonly string[], lines: readonly ReportLine[]): AnalysisMonthPart[] {
  return MONTH_PART_FIRST_DAYS.map((firstDay, index): AnalysisMonthPart => {
    const next = MONTH_PART_FIRST_DAYS[index + 1];
    const dayCount = days.filter((day) => partIndexOf(dayOfMonthOf(day)) === index).length;
    const totalCents = sum(lines.filter((line) => partIndexOf(dayOfMonthOf(line.date)) === index));
    return {
      firstDay,
      lastDay: next === undefined ? null : next - 1,
      totalCents,
      dayCount,
      averageCents: averagePerDay(totalCents, dayCount),
    };
  });
}

/**
 * The Análise week view over lines that already passed the filters. It reads the counted
 * months only (`currentMonth`, the calendar month today, never counts). Slices of an
 * installment plan from the 2nd on stay out of both lists and are totalled apart, as on the
 * Mês calendar, because they land on the billing date and not on a choice. Refunds lower the
 * day they fall on.
 */
export function analyzeWeek(input: { lines: readonly ReportLine[]; month: string; currentMonth: string }): AnalysisWeekAnswer {
  const { month, currentMonth } = input;
  const spending = expenseLinesIn(input.lines, monthsRead(month));
  const countedMonths = countedMonthsOf(spending, month, currentMonth);
  const counted = new Set(countedMonths);
  const readable = spending.filter((line) => counted.has(monthOf(line.date)));
  const days = daysOf(countedMonths);
  const kept = readable.filter((line) => !isLaterSlice(line));

  return {
    month,
    countedMonths,
    weekdays: weekdaysOf(days, kept),
    monthParts: monthPartsOf(days, kept),
    leftOutInstallmentsCents: sum(readable.filter(isLaterSlice)),
  };
}
