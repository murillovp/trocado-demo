import type { CalendarDay } from '@/api/types';
import { formatDayLong, formatReais, plural } from './format';

/** Weekday names, Sunday first, as Brazilian calendars print them. */
export const WEEKDAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'] as const;
const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
/** The one-letter column headers: "D S T Q Q S S". */
export const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;

/** The number of shade steps a day can have, from the lightest (1) to the full colour. */
export const SHADE_STEPS = 5;

/** The weekday of a date, 0 for Sunday. Read in UTC so the computer's time zone never moves it. */
export function weekdayOf(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay();
}

/**
 * The days as week rows of seven, Sunday first. The first day sits under its weekday, and the
 * places before it and after the last day are null.
 */
export function calendarWeeks(days: CalendarDay[]): (CalendarDay | null)[][] {
  if (days.length === 0) return [];
  const cells: (CalendarDay | null)[] = [...Array<null>(weekdayOf(days[0]!.date)).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (CalendarDay | null)[][] = [];
  for (let start = 0; start < cells.length; start += 7) weeks.push(cells.slice(start, start + 7));
  return weeks;
}

/**
 * Each day's shade step, in the order of `days`: 0 for a day with no spending (left blank), 1 for a
 * day where refunds exceed spending, and 1 to 5 for the rest, spread evenly from the smallest
 * spending day to the largest. When every spending day is equal, they all take the full colour.
 */
export function shadeSteps(days: CalendarDay[]): number[] {
  const spending = days.map((day) => day.spendingCents).filter((cents) => cents > 0);
  const smallest = Math.min(...spending);
  const largest = Math.max(...spending);
  return days.map(({ spendingCents }) => {
    if (spendingCents === 0) return 0;
    if (spendingCents < 0) return 1;
    if (largest === smallest) return SHADE_STEPS;
    return Math.min(SHADE_STEPS, 1 + Math.floor(((spendingCents - smallest) * SHADE_STEPS) / (largest - smallest)));
  });
}

/** "Sáb, 18 de outubro": a date as the calendar's tooltip opens. */
export function dayTitle(isoDate: string): string {
  return `${WEEKDAY_SHORT[weekdayOf(isoDate)]}, ${formatDayLong(isoDate)}`;
}

/** "Sáb, 18 de outubro: R$ 412,00 em 6 lançamentos", or "…: sem gastos" for a day with no lines. */
export function daySentence(day: CalendarDay): string {
  if (day.lineCount === 0) return `${dayTitle(day.date)}: sem gastos`;
  return `${dayTitle(day.date)}: ${formatReais(day.spendingCents)} em ${plural(day.lineCount, 'lançamento', 'lançamentos')}`;
}

/** What sits under the calendar: the day that spent most, and the average over the days that spent. */
export type CalendarFigures = { highest: CalendarDay; averageCents: number };

/**
 * The highest spending day (the earliest wins a tie) and the average per day with spending.
 * Days with no spending and days where refunds exceed spending are left out of both.
 * Null when no day has spending.
 */
export function calendarFigures(days: CalendarDay[]): CalendarFigures | null {
  const spending = days.filter((day) => day.spendingCents > 0);
  if (spending.length === 0) return null;
  const highest = spending.reduce((best, day) => (day.spendingCents > best.spendingCents ? day : best));
  const total = spending.reduce((sum, day) => sum + day.spendingCents, 0);
  return { highest, averageCents: Math.round(total / spending.length) };
}
