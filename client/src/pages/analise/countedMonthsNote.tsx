import { monthSentence, plural } from '@/lib/format';

/**
 * The note under the Ano and Semana views, naming the months they read:
 * "Com base em julho a setembro de 2026 (3 meses)." Months in one year share the year at the end.
 * Null with no counted month, so the screen leaves the note out.
 */
export function countedMonthsNote(countedMonths: readonly string[]): string | null {
  const first = countedMonths[0];
  const last = countedMonths.at(-1);
  if (first === undefined || last === undefined) return null;
  const count = plural(countedMonths.length, 'mês', 'meses');
  if (first === last) return `Com base em ${monthSentence(last)} (${count}).`;
  const start = monthSentence(first);
  const startText = first.slice(0, 4) === last.slice(0, 4) ? start.slice(0, start.indexOf(' de ')) : start;
  return `Com base em ${startText} a ${monthSentence(last)} (${count}).`;
}

/** The line of small text that holds `countedMonthsNote`. Shows nothing when no month counts. */
export function CountedMonthsNote({ countedMonths }: { countedMonths: readonly string[] }) {
  const note = countedMonthsNote(countedMonths);
  return note ? <p className="text-sm text-muted-foreground">{note}</p> : null;
}
