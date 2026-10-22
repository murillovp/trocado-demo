import type { AnalysisCategoryRow, AnalysisHeading, UnusualLine } from '@/api/types';
import { formatDayLong, formatReais, formatWholeReais, monthSentenceStart, plural } from './format';

/** The true minus sign the spec writes ("−R$ 120"), not the hyphen. */
const MINUS = '−';

/** "+R$ 240,00" for a rise, "−R$ 120,00" for a fall, "R$ 0,00" for no change. */
export function signedReais(cents: number): string {
  if (cents === 0) return formatReais(0);
  return `${cents > 0 ? '+' : MINUS}${formatReais(Math.abs(cents))}`;
}

/** "+R$ 45" for a rise, "−R$ 120" for a fall, in whole reais. An amount that rounds to zero reads "R$ 0". */
export function signedWholeReais(cents: number): string {
  if (Math.round(Math.abs(cents) / 100) === 0) return formatWholeReais(0);
  return `${cents > 0 ? '+' : MINUS}${formatWholeReais(Math.abs(cents))}`;
}

/** "+38%" or "−40%". The server sends a whole percent. */
function signedPct(pct: number): string {
  if (pct === 0) return '0%';
  return `${pct > 0 ? '+' : MINUS}${Math.abs(pct).toLocaleString('pt-BR')}%`;
}

/**
 * What a category row says about its change: "+R$ 240,00 (+38%)", "−R$ 120,00 (−40%)".
 * "novo" stands in for the percentage when the average is zero, and "nada este mês" when the month is zero.
 * Null when there is no average to compare with.
 */
export function categoryChangeText(row: AnalysisCategoryRow): string | null {
  if (row.changeCents === null || row.averageCents === null) return null;
  const amount = signedReais(row.changeCents);
  if (row.monthCents === 0) return `${amount} (nada este mês)`;
  if (row.averageCents === 0) return `${amount} (novo)`;
  return row.changePct === null ? amount : `${amount} (${signedPct(row.changePct)})`;
}

/**
 * The one sentence over the category list: "Outubro de 2026: R$ 8.420,00 em gastos, R$ 610,00 acima da média de 9 meses."
 * With no counted month before, it states the spending only.
 */
export function headingSentence(month: string, heading: AnalysisHeading): string {
  const spent = `${monthSentenceStart(month)}: ${formatReais(heading.spendingCents)} em gastos`;
  if (heading.averageCents === null || heading.changeCents === null) return `${spent}.`;
  const months = plural(heading.averagedMonthCount, 'mês', 'meses');
  if (heading.changeCents === 0) return `${spent}, igual à média de ${months}.`;
  const direction = heading.changeCents > 0 ? 'acima' : 'abaixo';
  return `${spent}, ${formatReais(Math.abs(heading.changeCents))} ${direction} da média de ${months}.`;
}

/** How many times a charge repeated: "duas vezes", "três vezes", then "4 vezes" and up. */
function timesWord(count: number): string {
  if (count === 2) return 'duas vezes';
  if (count === 3) return 'três vezes';
  return `${count} vezes`;
}

/** What one "Fora do padrão" row says, as the spec words it. */
export function unusualSentence(line: UnusualLine): string {
  if (line.reason === 'charged_twice') {
    return `${line.sellerName} cobrou ${formatReais(line.amountCents)} ${timesWord(line.lineIds.length)} em ${formatDayLong(line.date)}`;
  }
  const usual = line.usualCents === null ? '' : ` · normalmente ${formatReais(line.usualCents)}`;
  return `${line.sellerName} ${formatReais(line.amountCents)}${usual}`;
}

/**
 * The amount the longest bar stands for, so every bar of the list shares one scale.
 * It counts the averages too, so a mark never sits past the end of its track.
 */
export function sharedBarMax(rows: AnalysisCategoryRow[]): number {
  return Math.max(0, ...rows.flatMap((row) => [row.monthCents, row.averageCents ?? 0]));
}
