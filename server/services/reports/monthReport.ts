import type { AccountSpending, CategorySpending, MonthTotals, PersonTotals, Totals } from '../../../shared/contract/reports';
import { monthOf } from '../../../shared/dates';
import type { ReportLine } from '../../db/reportLines';

export type { AccountSpending, CategorySpending, MonthTotals, PersonTotals, Totals };

/**
 * The four numbers at the top of Visão do mês. Spending and savings are money
 * leaving, stored negative, so their sign flips here; a refund is an expense
 * line with money arriving, so it lowers spending.
 */
export function totalsOf(lines: readonly ReportLine[]): Totals {
  let incomeCents = 0;
  let spendingCents = 0;
  let savingsCents = 0;

  for (const line of lines) {
    if (line.kind === 'income') incomeCents += line.amountCents;
    else if (line.kind === 'expense') spendingCents -= line.amountCents;
    else savingsCents -= line.amountCents;
  }

  return { incomeCents, spendingCents, savingsCents, resultCents: incomeCents - spendingCents - savingsCents };
}

/** Spending per category, largest first. Lines with no category collect under a null category. */
export function spendingByCategory(lines: readonly ReportLine[]): CategorySpending[] {
  const byCategory = new Map<string | null, CategorySpending>();

  for (const line of lines) {
    if (line.kind !== 'expense') continue;
    const entry = byCategory.get(line.categoryId) ?? {
      categoryId: line.categoryId,
      categoryName: line.categoryName,
      amountCents: 0,
    };
    entry.amountCents -= line.amountCents;
    byCategory.set(line.categoryId, entry);
  }

  return [...byCategory.values()].sort(
    (a, b) => b.amountCents - a.amountCents || (a.categoryName ?? '').localeCompare(b.categoryName ?? ''),
  );
}

/**
 * Spending per account, largest first, over the same lines as `spendingByCategory`.
 * Account labels are passed in rather than read here, so this stays pure.
 */
export function spendingByAccount(
  lines: readonly ReportLine[],
  accountLabels: ReadonlyMap<string, string>,
): AccountSpending[] {
  const byAccount = new Map<string, AccountSpending>();

  for (const line of lines) {
    if (line.kind !== 'expense') continue;
    const entry = byAccount.get(line.accountId) ?? {
      accountId: line.accountId,
      accountLabel: accountLabels.get(line.accountId) ?? '',
      personId: line.personId,
      amountCents: 0,
    };
    entry.amountCents -= line.amountCents;
    byAccount.set(line.accountId, entry);
  }

  return [...byAccount.values()].sort(
    (a, b) => b.amountCents - a.amountCents || a.accountLabel.localeCompare(b.accountLabel),
  );
}

/** Each person's own totals, in the order the people are given. */
export function totalsByPerson(
  lines: readonly ReportLine[],
  people: readonly { id: string; name: string }[],
): PersonTotals[] {
  return people.map((person) => ({
    personId: person.id,
    personName: person.name,
    ...totalsOf(lines.filter((line) => line.personId === person.id)),
  }));
}

/** Totals for each month asked for, in that order. A month with no lines is all zeros. */
export function totalsPerMonth(lines: readonly ReportLine[], months: readonly string[]): MonthTotals[] {
  return months.map((month) => ({
    month,
    ...totalsOf(lines.filter((line) => monthOf(line.date) === month)),
  }));
}
