/**
 * The rules behind Análise (plan 18), all pure: they read plain line lists and
 * answer plain objects, and know nothing of the database. `reports.ts` feeds
 * them from `listCountedLines`. Only kind `expense` counts here, as on Visão:
 * a refund (an expense with money arriving) lowers whatever it falls under.
 *
 * Seller: a line's seller is the name the screen shows for it (the seller rule's
 * nickname, else the bank's name), compared ignoring case and accents. Seller
 * rules that share a nickname are therefore one seller, in all three seller
 * rules (new, above the usual, charged twice). A line with no name (one added
 * by hand) has no seller and stays out of the seller rules.
 */
import type {
  AnalysisCategoryRow,
  AnalysisHeading,
  AnalysisMonthAnswer,
  CalendarDay,
  NewSeller,
  TagCategoryShare,
  TagDetail,
  TagSpending,
  TagTotals,
  UnusualLine,
} from '../../../shared/contract/reports';
import { addMonthsToMonth, monthOf } from '../../../shared/dates';
import { averagedMonths } from '../../../shared/history';
import { normalizeName } from '../../../shared/text';
import type { CategoryBucket } from '../../../shared/types';
import type { ReportLine } from '../../db/reportLines';
import type { TagLineStats } from '../../db/tags';
import { percentOf } from './budget';
import { isLaterSlice, monthWindow, spentOf, sum } from './spending';

/** An above-the-usual charge needs this many earlier lines of its seller to compare with. */
const MIN_EARLIER_LINES = 3;
/** An above-the-usual charge must also sit at least this far above the seller's median (R$ 50,00), so small lines stay out. */
const MIN_ABOVE_USUAL_CENTS = 5_000;

/** What the filter bar can narrow Análise to. Every field left out lets everything through. */
export type AnalysisFilters = {
  personId?: string;
  /** Any of these accounts. Empty or missing means all. */
  accountIds?: readonly string[];
  /** The group of the line's category, as Transações reads it; `unclassified` is a category with no group. */
  bucket?: CategoryBucket | 'unclassified';
  /** A category id, or 'none' for lines with no category. */
  categoryId?: string;
  tagId?: string;
};

/** The lines that pass every filter. Filters apply before any rule, so averages and "first line" follow them too. */
export function filterLines(lines: readonly ReportLine[], filters: AnalysisFilters): ReportLine[] {
  const accountIds = filters.accountIds && filters.accountIds.length > 0 ? new Set(filters.accountIds) : null;
  return lines.filter((line) => {
    if (filters.personId !== undefined && line.personId !== filters.personId) return false;
    if (accountIds && !accountIds.has(line.accountId)) return false;
    if (filters.bucket === 'unclassified' && line.bucket !== null) return false;
    if (filters.bucket !== undefined && filters.bucket !== 'unclassified' && line.bucket !== filters.bucket) return false;
    if (filters.categoryId === 'none' && line.categoryId !== null) return false;
    if (filters.categoryId !== undefined && filters.categoryId !== 'none' && line.categoryId !== filters.categoryId) return false;
    if (filters.tagId !== undefined && !line.tagIds.includes(filters.tagId)) return false;
    return true;
  });
}

/** A line the seller rules read: money going out, and not a later installment slice. */
function isPurchase(line: ReportLine): boolean {
  return line.amountCents < 0 && !isLaterSlice(line);
}

function sellerNameOf(line: ReportLine): string {
  const nickname = line.vendorNickname?.trim();
  return nickname ? nickname : line.vendorName;
}

function sellerKeyOf(line: ReportLine): string | null {
  const name = normalizeName(sellerNameOf(line));
  return name === '' ? null : name;
}

function byDateThenId(a: ReportLine, b: ReportLine): number {
  return a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
}

/** Twice the median of the amounts, kept doubled so an even count needs no rounding. */
function doubledMedian(amounts: readonly number[]): number {
  const sorted = [...amounts].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle]! * 2 : sorted[middle - 1]! + sorted[middle]!;
}

/** The change as a whole percent of the average, rounded away from zero on a half. Null when the average is not positive. */
function changePercent(changeCents: number, averageCents: number): number | null {
  if (averageCents <= 0) return null;
  return Math.sign(changeCents) * Math.round((Math.abs(changeCents) * 100) / averageCents);
}

type CategoryKey = string | null;

function categoryRows(
  thisMonth: readonly ReportLine[],
  countedLines: readonly ReportLine[],
  countedMonthCount: number,
): AnalysisCategoryRow[] {
  const facts = new Map<CategoryKey, { name: string | null; bucket: CategoryBucket | null }>();
  const monthTotals = new Map<CategoryKey, number>();
  const countedTotals = new Map<CategoryKey, number>();
  const add = (totals: Map<CategoryKey, number>, line: ReportLine) => {
    facts.set(line.categoryId, { name: line.categoryName, bucket: line.bucket });
    totals.set(line.categoryId, (totals.get(line.categoryId) ?? 0) + spentOf(line));
  };
  for (const line of thisMonth) add(monthTotals, line);
  for (const line of countedLines) add(countedTotals, line);

  const hasAverage = countedMonthCount > 0;
  const rows = [...facts.entries()].map(([categoryId, { name, bucket }]): AnalysisCategoryRow => {
    const monthCents = monthTotals.get(categoryId) ?? 0;
    const averageCents = hasAverage ? Math.round((countedTotals.get(categoryId) ?? 0) / countedMonthCount) : null;
    const changeCents = averageCents === null ? null : monthCents - averageCents;
    return {
      categoryId,
      categoryName: name,
      bucket,
      monthCents,
      averageCents,
      changeCents,
      changePct: changeCents === null || averageCents === null ? null : changePercent(changeCents, averageCents),
    };
  });

  return rows.sort(
    (a, b) =>
      (b.changeCents ?? 0) - (a.changeCents ?? 0) ||
      b.monthCents - a.monthCents ||
      (a.categoryName ?? '').localeCompare(b.categoryName ?? ''),
  );
}

/**
 * Sellers whose first purchase in the filtered view falls in `month`, biggest month first.
 * With no purchase before the month (its earliest month of data) every seller would be new, so none is listed.
 */
function newSellers(purchases: readonly ReportLine[], month: string): NewSeller[] {
  if (!purchases.some((line) => monthOf(line.date) < month)) return [];
  const firstBySeller = new Map<string, ReportLine>();
  const monthBySeller = new Map<string, ReportLine[]>();
  for (const line of [...purchases].sort(byDateThenId)) {
    const key = sellerKeyOf(line);
    if (key === null) continue;
    if (!firstBySeller.has(key)) firstBySeller.set(key, line);
    if (monthOf(line.date) === month) monthBySeller.set(key, [...(monthBySeller.get(key) ?? []), line]);
  }

  const found: NewSeller[] = [];
  for (const [key, first] of firstBySeller) {
    if (monthOf(first.date) !== month) continue;
    const inMonth = monthBySeller.get(key) ?? [];
    found.push({
      sellerName: sellerNameOf(first),
      firstDate: first.date,
      amountCents: sum(inMonth),
      lineCount: inMonth.length,
      categoryId: first.categoryId,
      categoryName: first.categoryName,
    });
  }
  return found.sort((a, b) => b.amountCents - a.amountCents || a.sellerName.localeCompare(b.sellerName));
}

/**
 * Charges of `month` that break the pattern. A line the same seller charged twice
 * (same account, date and amount) shows once as a group. Any other line shows when
 * its seller has at least three earlier lines and it is at least twice their
 * median and at least R$ 50,00 above it (exactly twice and exactly R$ 50,00 both
 * count). Earlier means an earlier date. Refunds and later installment slices
 * never count, as a charge or as an earlier line. Biggest first.
 */
function unusualLines(purchases: readonly ReportLine[], month: string): UnusualLine[] {
  const sellable = purchases.filter((line) => sellerKeyOf(line) !== null);
  const monthLines = sellable.filter((line) => monthOf(line.date) === month);

  const groups = new Map<string, ReportLine[]>();
  for (const line of monthLines) {
    const key = [sellerKeyOf(line), line.accountId, line.date, line.amountCents].join('|');
    groups.set(key, [...(groups.get(key) ?? []), line]);
  }
  const repeated = [...groups.values()].filter((group) => group.length >= 2);
  const inRepeat = new Set(repeated.flat().map((line) => line.id));

  const found: UnusualLine[] = repeated.map((group) => {
    const first = [...group].sort(byDateThenId)[0]!;
    return {
      reason: 'charged_twice',
      sellerName: sellerNameOf(first),
      date: first.date,
      amountCents: spentOf(first),
      lineIds: group.map((line) => line.id).sort(),
      usualCents: null,
      accountId: first.accountId,
      categoryId: first.categoryId,
      categoryName: first.categoryName,
    };
  });

  const bySeller = new Map<string, ReportLine[]>();
  for (const line of sellable) bySeller.set(sellerKeyOf(line)!, [...(bySeller.get(sellerKeyOf(line)!) ?? []), line]);

  for (const line of monthLines) {
    if (inRepeat.has(line.id)) continue;
    const earlier = (bySeller.get(sellerKeyOf(line)!) ?? []).filter((other) => other.date < line.date);
    if (earlier.length < MIN_EARLIER_LINES) continue;
    const usualTwice = doubledMedian(earlier.map(spentOf));
    if (spentOf(line) < usualTwice) continue;
    // Kept doubled, like the median: amount - median >= minimum, without rounding an even count.
    if (spentOf(line) * 2 - usualTwice < MIN_ABOVE_USUAL_CENTS * 2) continue;
    found.push({
      reason: 'above_usual',
      sellerName: sellerNameOf(line),
      date: line.date,
      amountCents: spentOf(line),
      lineIds: [line.id],
      usualCents: Math.round(usualTwice / 2),
      accountId: line.accountId,
      categoryId: line.categoryId,
      categoryName: line.categoryName,
    });
  }

  return found.sort(
    (a, b) => b.amountCents - a.amountCents || a.date.localeCompare(b.date) || a.sellerName.localeCompare(b.sellerName),
  );
}

function daysInMonth(month: string): number {
  const [year, number] = month.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(year, number, 0)).getUTCDate();
}

/** One entry per day of the month. Later installment slices are left out, and `leftOutCents` says how much. */
function calendarOf(
  thisMonth: readonly ReportLine[],
  month: string,
): { calendar: CalendarDay[]; leftOutInstallmentsCents: number } {
  const days: CalendarDay[] = Array.from({ length: daysInMonth(month) }, (_, index) => ({
    date: `${month}-${String(index + 1).padStart(2, '0')}`,
    spendingCents: 0,
    lineCount: 0,
  }));
  let leftOutInstallmentsCents = 0;
  for (const line of thisMonth) {
    if (isLaterSlice(line)) {
      leftOutInstallmentsCents += spentOf(line);
      continue;
    }
    const day = days[Number(line.date.slice(8, 10)) - 1];
    if (!day) continue;
    day.spendingCents += spentOf(line);
    day.lineCount += 1;
  }
  return { calendar: days, leftOutInstallmentsCents };
}

/** Each tag with spending in the lines, largest first. A line with two tags counts under both. */
function tagSpending(lines: readonly ReportLine[], tagNames: ReadonlyMap<string, string>): TagSpending[] {
  const totals = new Map<string, number>();
  for (const line of lines) {
    for (const tagId of line.tagIds) totals.set(tagId, (totals.get(tagId) ?? 0) + spentOf(line));
  }
  return [...totals.entries()]
    .filter(([tagId, cents]) => cents > 0 && tagNames.has(tagId))
    .map(([tagId, spendingCents]) => ({ tagId, tagName: tagNames.get(tagId)!, spendingCents }))
    .sort((a, b) => b.spendingCents - a.spendingCents || a.tagName.localeCompare(b.tagName));
}

/**
 * The Análise month view over lines that already passed the filters: every
 * counted line from the start of the data up to the end of `month`. `currentMonth`
 * is the calendar month today, which is not over and so never enters the average.
 */
export function analyzeMonth(input: {
  lines: readonly ReportLine[];
  month: string;
  currentMonth: string;
  tagNames: ReadonlyMap<string, string>;
}): AnalysisMonthAnswer {
  const { month, currentMonth, tagNames } = input;
  const spending = input.lines.filter((line) => line.kind === 'expense' && monthOf(line.date) <= month);
  const thisMonth = spending.filter((line) => monthOf(line.date) === month);

  // The twelve calendar months before the selected month, never the month itself.
  const window = monthWindow(addMonthsToMonth(month, -1)).map((windowMonth) => ({
    month: windowMonth,
    spendingCents: sum(spending.filter((line) => monthOf(line.date) === windowMonth)),
  }));
  const average = averagedMonths(window, currentMonth);
  const countedMonths = new Set(average?.months.map((entry) => entry.month));
  const countedLines = spending.filter((line) => countedMonths.has(monthOf(line.date)));

  const spendingCents = sum(thisMonth);
  const heading: AnalysisHeading = {
    spendingCents,
    averageCents: average?.averageCents ?? null,
    changeCents: average ? spendingCents - average.averageCents : null,
    averagedMonthCount: average?.months.length ?? 0,
    inProgress: month === currentMonth,
  };

  const purchases = spending.filter(isPurchase);
  const { calendar, leftOutInstallmentsCents } = calendarOf(thisMonth, month);
  return {
    month,
    heading,
    categories: categoryRows(thisMonth, countedLines, countedMonths.size),
    newSellers: newSellers(purchases, month),
    unusual: unusualLines(purchases, month),
    calendar,
    leftOutInstallmentsCents,
    tags: tagSpending(thisMonth, tagNames),
  };
}

/**
 * Every tag with its spending across all time (the lines given), the number of
 * lines it carries and their first and last date (`stats`, which counts lines of
 * any kind). Newest last date first; a tag with no lines goes last.
 */
export function tagTotals(
  lines: readonly ReportLine[],
  stats: readonly TagLineStats[],
  tags: readonly { id: string; name: string }[],
): TagTotals[] {
  const statsByTag = new Map(stats.map((entry) => [entry.tagId, entry]));
  const spending = lines.filter((line) => line.kind === 'expense');
  return tags
    .map((tag): TagTotals => {
      const entry = statsByTag.get(tag.id);
      return {
        tagId: tag.id,
        name: tag.name,
        spendingCents: sum(spending.filter((line) => line.tagIds.includes(tag.id))),
        lineCount: entry?.lineCount ?? 0,
        firstDate: entry?.firstDate ?? null,
        lastDate: entry?.lastDate ?? null,
      };
    })
    .sort((a, b) => {
      if (a.lastDate === null || b.lastDate === null) return (a.lastDate === null ? 1 : 0) - (b.lastDate === null ? 1 : 0) || a.name.localeCompare(b.name);
      return b.lastDate.localeCompare(a.lastDate) || a.name.localeCompare(b.name);
    });
}

/** One tag's spending split by category, largest first, each with its share of the tag's spending. */
export function tagDetail(lines: readonly ReportLine[], totals: TagTotals): TagDetail {
  const byCategory = new Map<CategoryKey, TagCategoryShare>();
  for (const line of lines) {
    if (line.kind !== 'expense' || !line.tagIds.includes(totals.tagId)) continue;
    const entry = byCategory.get(line.categoryId) ?? {
      categoryId: line.categoryId,
      categoryName: line.categoryName,
      bucket: line.bucket,
      amountCents: 0,
      sharePct: null,
    };
    entry.amountCents += spentOf(line);
    byCategory.set(line.categoryId, entry);
  }
  const shares = [...byCategory.values()]
    .map((entry) => ({ ...entry, sharePct: percentOf(entry.amountCents, totals.spendingCents) }))
    .sort((a, b) => b.amountCents - a.amountCents || (a.categoryName ?? '').localeCompare(b.categoryName ?? ''));
  return { ...totals, byCategory: shares };
}
