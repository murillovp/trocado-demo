import type { BudgetMonth, BudgetView, CategoryBucket } from '@/api/types';
import { BUCKET_COLORS, NEUTRAL_BAR } from './colors';
import { formatReais } from './format';
import type { MoneyTone } from './moneyTone';

/**
 * What a group took this month, in reais: "Gasto" for needs and wants, and the
 * savings group's own name (from `useBucketLabels()`) for savings.
 */
export function spentText(bucket: CategoryBucket, actualCents: number, savingsName: string): string {
  return `${bucket === 'savings' ? savingsName : 'Gasto'}: ${formatReais(actualCents)}`;
}

/**
 * How far a bucket is from its target, in words. The API's gap is actual minus
 * target: over is bad news for needs and wants, and good news for savings.
 */
export function gapText(bucket: CategoryBucket, gapCents: number | null): string {
  if (gapCents === null) return '';
  if (gapCents === 0) return 'Na meta';
  const amount = formatReais(Math.abs(gapCents));
  if (bucket === 'savings') return gapCents > 0 ? `${amount} além da meta` : `Faltam ${amount} para a meta`;
  return gapCents > 0 ? `${amount} acima da meta` : `${amount} abaixo da meta`;
}

/**
 * The colour of the gap, from the same over/under reading as `gapText`: red when
 * the news is bad (over target for needs and wants, under for savings), green
 * when it is good. On target, or with no target to measure against, no colour.
 */
export function gapTone(bucket: CategoryBucket, gapCents: number | null): MoneyTone {
  if (gapCents === null || gapCents === 0) return 'plain';
  const over = gapCents > 0;
  const good = bucket === 'savings' ? over : !over;
  return good ? 'positive' : 'negative';
}

/** What the budget percentages measure against, in one sentence (spec 4a). */
export function incomeSentence(view: BudgetView): string {
  if (view.referenceIncomeCents !== null) {
    return `Medindo contra a renda de referência, ${formatReais(view.referenceIncomeCents)}. Entradas do mês: ${formatReais(view.actualIncomeCents)}.`;
  }
  if (view.baseIncomeCents > 0) return `Medindo contra as entradas do mês, ${formatReais(view.baseIncomeCents)}.`;
  return 'Sem entradas neste mês e sem renda de referência. Os valores aparecem, as porcentagens não.';
}

type StripPart = { key: 'needs' | 'wants' | 'savings' | 'left'; pct: number; color: string };

/**
 * One month of the twelve-month strip. The three buckets stack up, then what
 * was left. When the buckets add up to more than the income, the column
 * shrinks to fit rather than overflowing. A month with no income, or with no lines at all, draws nothing.
 * `hasLines` is false only when the server says so; a server that does not send it keeps the old reading.
 */
export function stripParts(month: BudgetMonth): StripPart[] {
  if (month.hasLines === false) return [];
  if (month.needsPct === null || month.wantsPct === null || month.savingsPct === null) return [];
  const needs = Math.max(0, month.needsPct);
  const wants = Math.max(0, month.wantsPct);
  const savings = Math.max(0, month.savingsPct);
  const used = needs + wants + savings;
  const left = Math.max(0, 100 - used);
  const scale = Math.max(100, used);
  const share = (value: number) => (value / scale) * 100;
  return [
    { key: 'needs', pct: share(needs), color: BUCKET_COLORS.needs },
    { key: 'wants', pct: share(wants), color: BUCKET_COLORS.wants },
    { key: 'savings', pct: share(savings), color: BUCKET_COLORS.savings },
    { key: 'left', pct: share(left), color: NEUTRAL_BAR },
  ];
}
