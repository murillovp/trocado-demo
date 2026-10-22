import type { BucketItem, BucketView, BudgetMonth, BudgetView, UnclassifiedView } from '../../../shared/contract/reports';
import { lastTwelveMonths, monthOf } from '../../../shared/dates';
import type { CategoryBucket } from '../../../shared/types';
import type { ReportLine } from '../../db/reportLines';

export type { BucketItem, BucketView, BudgetMonth, BudgetView, UnclassifiedView };

/** The part of a person the budget reads. Plan 1's person row has these fields. */
export type BudgetPerson = {
  id: string;
  targetNeedsPct: number;
  targetWantsPct: number;
  targetSavingsPct: number;
  referenceIncomeCents: number | null;
};

type Pile = CategoryBucket | 'unclassified';

const TARGETS: { bucket: CategoryBucket; targetOf: (person: BudgetPerson) => number }[] = [
  { bucket: 'needs', targetOf: (person) => person.targetNeedsPct },
  { bucket: 'wants', targetOf: (person) => person.targetWantsPct },
  { bucket: 'savings', targetOf: (person) => person.targetSavingsPct },
];

/** `part` as a percent of `whole`, one decimal, rounded half up. Null when `whole` is not positive. */
export function percentOf(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part * 1000) / whole) / 10;
}

/**
 * The Orçamento screen for one person and one month (spec section 4a). Every
 * savings line feeds Poupança whatever its category; an expense line feeds the
 * bucket its category carries, or "Sem grupo" when it has none.
 */
export function budgetView(person: BudgetPerson, lines: readonly ReportLine[], month: string): BudgetView {
  const own = lines.filter((line) => line.personId === person.id);
  const current = own.filter((line) => monthOf(line.date) === month);
  const actualIncomeCents = incomeOf(current);
  const baseIncomeCents = person.referenceIncomeCents ?? actualIncomeCents;

  const buckets = TARGETS.map(({ bucket, targetOf }): BucketView => {
    const actualCents = pileAmount(current, bucket);
    const targetPct = targetOf(person);
    const targetCents = baseIncomeCents > 0 ? Math.round((baseIncomeCents * targetPct) / 100) : null;
    return {
      bucket,
      targetPct,
      targetCents,
      actualCents,
      actualPct: percentOf(actualCents, baseIncomeCents),
      gapCents: targetCents === null ? null : actualCents - targetCents,
      items: itemsOf(current, bucket),
    };
  });

  const unclassifiedCents = pileAmount(current, 'unclassified');

  return {
    personId: person.id,
    month,
    actualIncomeCents,
    referenceIncomeCents: person.referenceIncomeCents,
    baseIncomeCents,
    buckets,
    unclassified: {
      actualCents: unclassifiedCents,
      actualPct: percentOf(unclassifiedCents, baseIncomeCents),
      items: itemsOf(current, 'unclassified'),
    },
    history: lastTwelveMonths(month).map((historyMonth) => {
      const monthLines = own.filter((line) => monthOf(line.date) === historyMonth);
      const base = person.referenceIncomeCents ?? incomeOf(monthLines);
      return {
        month: historyMonth,
        needsPct: percentOf(pileAmount(monthLines, 'needs'), base),
        wantsPct: percentOf(pileAmount(monthLines, 'wants'), base),
        savingsPct: percentOf(pileAmount(monthLines, 'savings'), base),
        hasLines: monthLines.length > 0,
      };
    }),
  };
}

function pileOf(line: ReportLine): Pile | null {
  if (line.kind === 'income') return null;
  if (line.kind === 'savings') return 'savings';
  return line.bucket ?? 'unclassified';
}

function incomeOf(lines: readonly ReportLine[]): number {
  return lines.reduce((sum, line) => (line.kind === 'income' ? sum + line.amountCents : sum), 0);
}

/** Money into a pile, as a positive number: its lines are money leaving, stored negative. */
function pileAmount(lines: readonly ReportLine[], pile: Pile): number {
  return lines.reduce((sum, line) => (pileOf(line) === pile ? sum - line.amountCents : sum), 0);
}

function itemsOf(lines: readonly ReportLine[], pile: Pile): BucketItem[] {
  const total = pileAmount(lines, pile);
  const byKey = new Map<string, Omit<BucketItem, 'shareOfBucketPct'>>();

  for (const line of lines) {
    if (pileOf(line) !== pile) continue;
    const savingsLabel = line.categoryId === null ? line.savingsLabel : null;
    const key = `${line.categoryId ?? ''}|${savingsLabel ?? ''}`;
    const item = byKey.get(key) ?? {
      categoryId: line.categoryId,
      categoryName: line.categoryName,
      savingsLabel,
      amountCents: 0,
    };
    item.amountCents -= line.amountCents;
    byKey.set(key, item);
  }

  return [...byKey.values()]
    .map((item) => ({ ...item, shareOfBucketPct: percentOf(item.amountCents, total) }))
    .sort(
      (a, b) =>
        b.amountCents - a.amountCents ||
        (a.categoryName ?? a.savingsLabel ?? '').localeCompare(b.categoryName ?? b.savingsLabel ?? ''),
    );
}
