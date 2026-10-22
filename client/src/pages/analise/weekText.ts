import type { AnalysisMonthPart, AnalysisWeekday } from '@/api/types';
import { WEEKDAY_NAMES } from '@/lib/calendar';
import { formatWholeReais, plural } from '@/lib/format';

/** One weekday in the plural and in the singular, Sunday first: "Sextas" leads a description, "sexta" counts days. */
const WEEKDAY_FORMS = [
  { lead: 'Domingos', one: 'domingo', many: 'domingos' },
  { lead: 'Segundas', one: 'segunda', many: 'segundas' },
  { lead: 'Terças', one: 'terça', many: 'terças' },
  { lead: 'Quartas', one: 'quarta', many: 'quartas' },
  { lead: 'Quintas', one: 'quinta', many: 'quintas' },
  { lead: 'Sextas', one: 'sexta', many: 'sextas' },
  { lead: 'Sábados', one: 'sábado', many: 'sábados' },
] as const;

/**
 * The entry with the highest average, or undefined when every average is zero. A tie goes to the
 * earlier entry, so the sentence never flips between two equal days.
 */
function topEntry<T extends { averageCents: number }>(entries: readonly T[]): T | undefined {
  let top: T | undefined;
  for (const entry of entries) {
    if (entry.averageCents > (top?.averageCents ?? 0)) top = entry;
  }
  return top;
}

/**
 * The heading sentence of Por dia da semana: "Sábado é o dia de maior gasto: R$ 210 em média."
 * Null when every average is zero, so the section shows no sentence.
 */
export function weekdayHeading(weekdays: readonly AnalysisWeekday[]): string | null {
  const top = topEntry(weekdays);
  if (!top) return null;
  return `${WEEKDAY_NAMES[top.weekday]} é o dia de maior gasto: ${formatWholeReais(top.averageCents)} em média.`;
}

/**
 * What a weekday column says on hover and to a screen reader: "Sextas: R$ 180 em média, R$ 2.340 em 13 sextas".
 * One day reads "em 1 sexta".
 */
export function weekdayDescription(day: AnalysisWeekday): string {
  const forms = WEEKDAY_FORMS[day.weekday]!;
  const days = plural(day.dayCount, forms.one, forms.many);
  return `${forms.lead}: ${formatWholeReais(day.averageCents)} em média, ${formatWholeReais(day.totalCents)} em ${days}`;
}

/** The caption under a part-of-month column: "1–7", "8–14", "15–21", "22–fim". */
export function monthPartCaption(part: AnalysisMonthPart): string {
  return `${part.firstDay}–${part.lastDay ?? 'fim'}`;
}

/** The days of a part inside a sentence: "1 a 7", or "22 ao fim" for the last part. */
function monthPartDays(part: AnalysisMonthPart): string {
  return part.lastDay === null ? `${part.firstDay} ao fim` : `${part.firstDay} a ${part.lastDay}`;
}

/**
 * The heading sentence of Por parte do mês: "Os dias 1 a 7 concentram mais gasto: R$ 260 por dia."
 * Null when every average is zero, so the section shows no sentence.
 */
export function monthPartHeading(parts: readonly AnalysisMonthPart[]): string | null {
  const top = topEntry(parts);
  if (!top) return null;
  return `Os dias ${monthPartDays(top)} concentram mais gasto: ${formatWholeReais(top.averageCents)} por dia.`;
}

/** What a part-of-month column says on hover: "Dias 22 ao fim: R$ 140 por dia, R$ 12.600 no total". */
export function monthPartDescription(part: AnalysisMonthPart): string {
  return `Dias ${monthPartDays(part)}: ${formatWholeReais(part.averageCents)} por dia, ${formatWholeReais(part.totalCents)} no total`;
}

/** What both Semana sections say in place of their chart when no month counts yet. */
export const NO_PATTERNS_NOTE = 'Ainda não há meses completos para mostrar padrões.';
