/**
 * The rules behind Análise's year view (plan 19), all pure like `analysis.ts`:
 * they read plain line lists and answer plain objects. `reports.ts` feeds them
 * from `listCountedLines`. Only kind `expense` counts, refunds lower their
 * category, and which months a trend or a sentence may read is decided by the one
 * rule Visão and Mês share, `averagedMonths`.
 */
import type {
  AnalysisInsight,
  AnalysisYearAnswer,
  AnalysisYearCategory,
  AnalysisYearColumn,
  InsightDirection,
} from '../../../shared/contract/reports';
import { addMonthsToMonth, monthOf } from '../../../shared/dates';
import { MIN_INSIGHT_MONTHS } from '../../../shared/history';
import type { CategoryBucket } from '../../../shared/types';
import type { ReportLine } from '../../db/reportLines';
import { countedMonthsOf, expenseLinesIn, monthsRead, monthWindow, roundAwayFromZero, spentOf } from './spending';

/** A streak needs every rise (or fall) of a month over the one before to be at least R$ 25,00, so small wobbles are not a trend. */
export const MIN_STREAK_STEP_CENTS = 2_500;
/** The last counted month must sit at least R$ 100,00 away from the average of the months before it to be worth a sentence. */
export const MIN_AVERAGE_GAP_CENTS = 10_000;
/** The same gap must also be at least this many percent of that average, so a big category's small swing stays quiet. */
export const MIN_AVERAGE_GAP_PCT = 25;
/** A trend line needs this many counted months; with fewer the slope would be a guess. */
export const MIN_TREND_MONTHS = 3;

type CategoryKey = string | null;

/** A category across the columns, before its trend and sentences are worked out. */
type CategoryColumns = { categoryId: CategoryKey; categoryName: string | null; bucket: CategoryBucket | null; cents: number[] };

/** Every calendar month from `first` to `last` of the window, inclusive. */
function windowSlice(window: readonly string[], first: string, last: string): string[] {
  return window.slice(window.indexOf(first), window.indexOf(last) + 1);
}

/**
 * The slope of the straight line that best fits the points (least squares), as cents per month.
 * Computed from integer sums with one division at the end, so a half comes out exact.
 */
function leastSquaresSlope(points: readonly { x: number; y: number }[]): number {
  const count = points.length;
  const sumX = points.reduce((total, point) => total + point.x, 0);
  const sumY = points.reduce((total, point) => total + point.y, 0);
  const sumXY = points.reduce((total, point) => total + point.x * point.y, 0);
  const sumXX = points.reduce((total, point) => total + point.x * point.x, 0);
  return (count * sumXY - sumX * sumY) / (count * sumXX - sumX * sumX);
}

/** One row per category with a line in a column, its spending per column (refunds subtracted). */
function categoryColumns(spending: readonly ReportLine[], columns: readonly AnalysisYearColumn[]): CategoryColumns[] {
  const columnOf = new Map(columns.map((column, index): [string, number] => [column.month, index]));
  const rows = new Map<CategoryKey, CategoryColumns>();
  for (const line of spending) {
    const column = columnOf.get(monthOf(line.date));
    if (column === undefined) continue;
    const row = rows.get(line.categoryId) ?? {
      categoryId: line.categoryId,
      categoryName: line.categoryName,
      bucket: line.bucket,
      cents: columns.map(() => 0),
    };
    row.cents[column] = row.cents[column]! + spentOf(line);
    rows.set(line.categoryId, row);
  }
  return [...rows.values()];
}

/** Rising rows first, falling last. Rows with no trend follow, then ties go to the larger total and the name. */
function byTrend(a: AnalysisYearCategory, b: AnalysisYearCategory): number {
  return (
    Number(a.trendCentsPerMonth === null) - Number(b.trendCentsPerMonth === null) ||
    (b.trendCentsPerMonth ?? 0) - (a.trendCentsPerMonth ?? 0) ||
    b.totalCents - a.totalCents ||
    (a.categoryName ?? '').localeCompare(b.categoryName ?? '')
  );
}

/**
 * How many of the last steps in a row moved at least the minimum in `direction`, counting back from
 * the last month. A step only counts between two calendar months that follow each other: a month
 * skipped because the view had no spending in it ends the streak. `months` and `values` line up.
 */
function stepsInARow(months: readonly string[], values: readonly number[], direction: InsightDirection): number {
  const sign = direction === 'up' ? 1 : -1;
  let steps = 0;
  for (let index = values.length - 1; index >= 1; index -= 1) {
    if (addMonthsToMonth(months[index - 1]!, 1) !== months[index]) break;
    if ((values[index]! - values[index - 1]!) * sign < MIN_STREAK_STEP_CENTS) break;
    steps += 1;
  }
  return steps;
}

/** The sentence about a streak ending at the last counted month, or null when there is none. `months` and `values` line up. */
function streakInsight(row: CategoryColumns, months: readonly string[], values: readonly number[]): AnalysisInsight | null {
  for (const direction of ['up', 'down'] as const) {
    const steps = stepsInARow(months, values, direction);
    if (steps < 2) continue;
    const from = values.length - 1 - steps;
    const fromCents = values[from]!;
    const toCents = values[values.length - 1]!;
    return {
      kind: 'streak',
      direction,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      changeCents: toCents - fromCents,
      fromMonth: months[from]!,
      fromCents,
      toMonth: months[months.length - 1]!,
      toCents,
      steps,
    };
  }
  return null;
}

/**
 * The sentence about the last counted month against the average of the counted months before it, or null
 * when it is close. An average of zero or below (months with nothing, or only refunds) gives no sentence:
 * "above the average" says nothing when there was no spending to average.
 */
function averageInsight(row: CategoryColumns, months: readonly string[], values: readonly number[]): AnalysisInsight | null {
  const earlier = values.slice(0, -1);
  if (earlier.length < MIN_INSIGHT_MONTHS - 1) return null;
  const monthCents = values[values.length - 1]!;
  const averageCents = Math.round(earlier.reduce((total, cents) => total + cents, 0) / earlier.length);
  if (averageCents <= 0) return null;
  const changeCents = monthCents - averageCents;
  const gap = Math.abs(changeCents);
  if (gap < MIN_AVERAGE_GAP_CENTS || gap * 100 < MIN_AVERAGE_GAP_PCT * averageCents) return null;
  return {
    kind: 'average',
    direction: changeCents > 0 ? 'up' : 'down',
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    changeCents,
    month: months[months.length - 1]!,
    monthCents,
    averageCents,
    averagedMonthCount: earlier.length,
  };
}

/** One sentence per category, the streak when both apply, largest change in reais first. Empty with too little history. */
function insightsOf(rows: readonly CategoryColumns[], columns: readonly AnalysisYearColumn[], countedMonths: readonly string[]): AnalysisInsight[] {
  if (countedMonths.length < MIN_INSIGHT_MONTHS) return [];
  const columnOf = new Map(columns.map((column, index): [string, number] => [column.month, index]));
  const found = rows.flatMap((row) => {
    const values = countedMonths.map((month) => row.cents[columnOf.get(month)!]!);
    const insight = streakInsight(row, countedMonths, values) ?? averageInsight(row, countedMonths, values);
    return insight ? [insight] : [];
  });
  return found.sort(
    (a, b) => Math.abs(b.changeCents) - Math.abs(a.changeCents) || (a.categoryName ?? '').localeCompare(b.categoryName ?? ''),
  );
}

/**
 * The Análise year view over lines that already passed the filters. The window is the
 * twelve calendar months ending with `month`; the counted months are what
 * `averagedMonths` answers for it (`currentMonth`, the calendar month today, is not
 * over and never counts). The columns run from the first counted month to `month`,
 * which is listed as running when it is the current month. Trends and sentences read
 * the counted months only.
 */
export function analyzeYear(input: { lines: readonly ReportLine[]; month: string; currentMonth: string }): AnalysisYearAnswer {
  const { month, currentMonth } = input;
  const window = monthWindow(month);
  const spending = expenseLinesIn(input.lines, monthsRead(month));
  const countedMonths = countedMonthsOf(spending, month, currentMonth);
  const columns = windowSlice(window, countedMonths[0] ?? month, month).map(
    (columnMonth): AnalysisYearColumn => ({ month: columnMonth, running: columnMonth === currentMonth }),
  );

  const rows = categoryColumns(spending, columns);
  const hasTrend = countedMonths.length >= MIN_TREND_MONTHS;
  const categories = rows
    .map((row): AnalysisYearCategory => {
      const points = countedMonths.map((countedMonth) => ({
        x: window.indexOf(countedMonth),
        y: row.cents[columns.findIndex((column) => column.month === countedMonth)]!,
      }));
      return {
        ...row,
        totalCents: row.cents.reduce((total, cents) => total + cents, 0),
        trendCentsPerMonth: hasTrend ? roundAwayFromZero(leastSquaresSlope(points)) : null,
      };
    })
    .sort(byTrend);

  return { month, columns, countedMonths, categories, insights: insightsOf(rows, columns, countedMonths) };
}
