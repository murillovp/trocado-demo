import { MAX_AMOUNT_CENTS } from '../../../shared/limits';
import { formatCentavos, parseBrazilianAmount } from '../../../shared/money';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const SHORT_MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "R$ 1.234,56". A negative amount reads "-R$ 12,00". */
export function formatReais(cents: number): string {
  return `${cents < 0 ? '-' : ''}R$ ${formatCentavos(Math.abs(cents))}`;
}

/**
 * "R$ 2.026": an amount in whole reais, rounded to the nearest real (half away from zero), where
 * cents would only crowd the line, as in Destaques and Mês a mês. A negative amount reads "-R$ 31".
 */
export function formatWholeReais(cents: number): string {
  const reais = Math.round(Math.abs(cents) / 100);
  return `${cents < 0 && reais > 0 ? '-' : ''}R$ ${reais.toLocaleString('pt-BR')}`;
}

/**
 * Whole thousands with dots, then an optional comma and one or two decimals.
 * "1.5" is refused rather than read as 15: a dot here only groups thousands.
 */
const AMOUNT = /^-?(?:R\$)?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/;

/** Reads an amount typed by a person. Returns null when the text is not one. */
export function parseReais(text: string): number | null {
  const compact = text.replace(/\s/g, '');
  if (!AMOUNT.test(compact)) return null;
  // People type "45,9" for 45,90; the bank pattern wants two decimals.
  const twoDecimals = /,\d$/.test(compact) ? `${compact}0` : compact;
  return parseBrazilianAmount(twoDecimals);
}

/** The message for an amount over the ceiling the server accepts (R$ 10.000.000,00). */
export const AMOUNT_TOO_BIG = 'O valor passa de R$ 10.000.000,00.';

/** True when a typed amount is over the ceiling, in either direction. */
export function overAmountLimit(cents: number): boolean {
  return Math.abs(cents) > MAX_AMOUNT_CENTS;
}

/** "24,5%". A percentage with nothing to measure against reads "—". */
export function formatPct(value: number | null): string {
  if (value === null) return '—';
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function monthParts(month: string): { year: string; index: number } {
  return { year: month.slice(0, 4), index: Number(month.slice(5, 7)) - 1 };
}

/** "Setembro 2026" */
export function monthLabel(month: string): string {
  const { year, index } = monthParts(month);
  return `${MONTH_NAMES[index]} ${year}`;
}

/** "setembro de 2026": a month inside running text. Headings and the month stepper use `monthLabel`. */
export function monthSentence(month: string): string {
  const { year, index } = monthParts(month);
  return `${MONTH_NAMES[index]?.toLowerCase()} de ${year}`;
}

/** "Setembro de 2026": the same, where it starts a sentence. */
export function monthSentenceStart(month: string): string {
  const text = monthSentence(month);
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

/** "set" */
export function shortMonth(month: string): string {
  return SHORT_MONTHS[monthParts(month).index] ?? '';
}

/** "set 2026" */
export function shortMonthYear(month: string): string {
  return `${shortMonth(month)} ${monthParts(month).year}`;
}

/** "03/09" */
export function formatDay(isoDate: string): string {
  return `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}`;
}

/** "18 de outubro": a day inside running text, such as a filter chip. */
export function formatDayLong(isoDate: string): string {
  const { index } = monthParts(isoDate.slice(0, 7));
  return `${Number(isoDate.slice(8, 10))} de ${MONTH_NAMES[index]?.toLowerCase()}`;
}

/** "03/09/2026" */
export function formatDate(isoDate: string): string {
  return `${formatDay(isoDate)}/${isoDate.slice(0, 4)}`;
}

/** The date part of a database timestamp such as "2026-09-20 18:04:11". */
export function formatTimestamp(text: string): string {
  return formatDate(text.slice(0, 10));
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** The hour and minute on this computer's clock, "14:32". */
export function timeOfDay(at: Date): string {
  return `${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

/** The month on this computer's clock, "2026-09". */
export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

/** Today on this computer's clock, "2026-09-25". */
export function todayIso(now: Date = new Date()): string {
  return `${currentMonth(now)}-${pad(now.getDate())}`;
}

/** A bar's width as a percentage of the largest bar. Never negative, never NaN. */
export function barPercent(value: number, max: number): number {
  if (!(max > 0) || !(value > 0)) return 0;
  return Math.min(100, (value / max) * 100);
}

/** "1 lançamento", "3 lançamentos" */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Lower case with accents removed, for search that ignores both: "Saúde" → "saude". */
export function foldText(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}
