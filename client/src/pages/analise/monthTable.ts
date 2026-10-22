import { SHADE_STEPS } from '@/lib/calendar';
import { formatWholeReais, monthSentence } from '@/lib/format';
import { signedWholeReais } from '@/lib/analise';

/**
 * A cell's shade step, 1 to 5, in five equal bands of the row's highest month: up to a fifth of it is
 * step 1, the highest month is step 5. A month with nothing, or with refunds ahead of spending, is 0 and stays blank.
 */
export function shadeStep(cents: number, rowMaxCents: number): number {
  if (cents <= 0 || rowMaxCents <= 0) return 0;
  return Math.min(SHADE_STEPS, Math.max(1, Math.ceil((cents * SHADE_STEPS) / rowMaxCents)));
}

/** The Tendência column: "+R$ 45/mês", "−R$ 120/mês", or "—" for a row with fewer than three counted months. */
export function trendText(trendCentsPerMonth: number | null): string {
  return trendCentsPerMonth === null ? '—' : `${signedWholeReais(trendCentsPerMonth)}/mês`;
}

/** What a cell is named and what its tooltip says: "Mercado, agosto de 2026: R$ 2.026". */
export function cellSentence(categoryName: string, month: string, cents: number): string {
  return `${categoryName}, ${monthSentence(month)}: ${formatWholeReais(cents)}`;
}
