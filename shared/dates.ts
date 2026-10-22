import { AppError } from './errors';

/** Turns "01/08/2026" into "2026-08-01". */
export function parseBrDate(text: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!match) {
    throw new AppError('date_unreadable', `Cannot read date: ${text}`);
  }
  const [, day, month, year] = match as unknown as [string, string, string, string];
  const iso = `${year}-${month}-${day}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso) {
    throw new AppError('date_unreadable', `Cannot read date: ${text}`);
  }
  return iso;
}

/** Turns "2026-08-31" into "2026-08". */
export function monthOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** True when `text` is written YYYY-MM-DD and is a day on the calendar. */
export function isRealDate(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const parsed = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text;
}

/** Checks that "2026-08-31" is a real ISO date and returns it. */
export function parseIsoDate(text: string): string {
  const value = text.trim();
  if (!isRealDate(value)) {
    throw new AppError('date_unreadable', `Cannot read date: ${text}`);
  }
  return value;
}

/** Whole days between two ISO dates, in either order. */
export function daysBetween(a: string, b: string): number {
  const milliseconds = Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`));
  return Math.round(milliseconds / 86_400_000);
}

/** Moves an ISO date by whole days, in either direction. */
export function addDays(isoDate: string, days: number): string {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

/** Moves an ISO date by whole months, clamping the day to the target month's length. */
export function addMonths(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split('-').map(Number) as [number, number, number];
  const index = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(index / 12);
  const targetMonth = (index % 12) + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDay);
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}

/** Checks that "2026-08" is a real month and returns it. */
export function parseMonth(text: string): string {
  const value = text.trim();
  const match = /^\d{4}-(\d{2})$/.exec(value);
  const month = match ? Number(match[1]) : 0;
  if (month < 1 || month > 12) {
    throw new AppError('month_invalid', `Cannot read month: ${text}`);
  }
  return value;
}

/** Moves "2026-08" by whole months. */
export function addMonthsToMonth(month: string, months: number): string {
  return addMonths(`${month}-01`, months).slice(0, 7);
}

/** The twelve months ending at `month`, oldest first. */
export function lastTwelveMonths(month: string): string[] {
  return Array.from({ length: 12 }, (_, index) => addMonthsToMonth(month, index - 11));
}

/**
 * The dates from the first day of `first` up to, not including, the first day
 * after `last`. ISO dates compare as text, so this range works in a query.
 */
export function monthSpan(first: string, last: string): { start: string; endExclusive: string } {
  return { start: `${first}-01`, endExclusive: `${addMonthsToMonth(last, 1)}-01` };
}
