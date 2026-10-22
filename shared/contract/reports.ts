/** What the report, budget, installment and integrity endpoints answer. */
import type { CategoryBucket } from '../types';

export type Totals = {
  incomeCents: number;
  spendingCents: number;
  savingsCents: number;
  /** Income minus spending minus savings: what is left. */
  resultCents: number;
};

export type CategorySpending = { categoryId: string | null; categoryName: string | null; amountCents: number };

export type AccountSpending = { accountId: string; accountLabel: string; personId: string; amountCents: number };

export type PersonTotals = Totals & { personId: string; personName: string };

export type MonthTotals = Totals & { month: string };

export type MonthReport = {
  month: string;
  totals: Totals;
  byCategory: CategorySpending[];
  byAccount: AccountSpending[];
  byPerson: PersonTotals[];
  /** Lines this month still waiting for a kind. They count nowhere until the user chooses one. */
  unsetCount: number;
};

/** One entry in a bucket's drill-down: a category, or a savings label for savings with no category. */
export type BucketItem = {
  categoryId: string | null;
  categoryName: string | null;
  savingsLabel: string | null;
  amountCents: number;
  shareOfBucketPct: number | null;
};

export type BucketView = {
  bucket: CategoryBucket;
  targetPct: number;
  /** Null when there is no income to measure against. */
  targetCents: number | null;
  actualCents: number;
  actualPct: number | null;
  /** Actual minus target. Positive means the bucket went over its target. */
  gapCents: number | null;
  items: BucketItem[];
};

export type UnclassifiedView = { actualCents: number; actualPct: number | null; items: BucketItem[] };

export type BudgetMonth = {
  month: string;
  needsPct: number | null;
  wantsPct: number | null;
  savingsPct: number | null;
  /**
   * True when the person has any counted line (income, expense or savings) that month. With a reference
   * income the percentages are 0, not null, for a month with no lines, so this tells that month apart.
   */
  hasLines: boolean;
};

export type BudgetView = {
  personId: string;
  month: string;
  /** The person's income lines this month. */
  actualIncomeCents: number;
  referenceIncomeCents: number | null;
  /** What the percentages measure against: the reference income when set, else the month's income. */
  baseIncomeCents: number;
  /** Needs, wants, savings, in that order. */
  buckets: BucketView[];
  unclassified: UnclassifiedView;
  /** The twelve months ending at `month`, oldest first. */
  history: BudgetMonth[];
};

export type OpenPlan = {
  id: string;
  description: string;
  accountId: string;
  accountLabel: string;
  personId: string;
  installmentAmountCents: number;
  totalInstallments: number;
  /** The highest slice number imported: the card bill for month N prints slice N. */
  paidCount: number;
  remainingCount: number;
  owedCents: number;
  /** The month of the last slice. */
  endMonth: string;
};

export type OwedByPerson = { personId: string; owedCents: number };

/** What the open plans take from one coming month. */
export type CommittedMonth = { month: string; cents: number };

/** The coming months of one person's open plans. A person with no open plan has no entry. */
export type PersonForecast = { personId: string; months: CommittedMonth[] };

export type OpenInstallments = {
  plans: OpenPlan[];
  totalOwedCents: number;
  owedByPerson: OwedByPerson[];
  /** How much all open plans take from each coming month, soonest first, at most twelve months (Casa). */
  forecast: CommittedMonth[];
  /** The same forecast for each person's plans alone, so a person's screen needs no arithmetic. */
  forecastByPerson: PersonForecast[];
};

/** The rules the stored data can break, for the totals to stay right. */
export type IntegrityCheckKey =
  | 'pair_incomplete'
  | 'pair_mismatch'
  | 'pair_on_non_transfer'
  | 'date_invalid'
  | 'adjusted_amount_invalid'
  | 'import_rows_mismatch'
  | 'import_row_missing_line'
  | 'hand_added_sign'
  | 'category_wrong_direction'
  | 'transfer_with_category'
  | 'imported_income_negative'
  | 'expense_in_savings_category'
  | 'savings_outside_savings_category';

/** A rule the data breaks, and how many things break it. */
export type IntegrityProblem = { check: IntegrityCheckKey; count: number };

// Análise

/** The sentence above the category list: the month's spending against the average of earlier months. */
export type AnalysisHeading = {
  /** What the month spent in the filtered view, refunds subtracted. */
  spendingCents: number;
  /** The average spending of the counted months; null when no earlier month counts. */
  averageCents: number | null;
  /** `spendingCents` minus `averageCents`; null when there is no average. */
  changeCents: number | null;
  /** How many months the average counts, 0 when none. */
  averagedMonthCount: number;
  /** True when the month is the current calendar month, still running. */
  inProgress: boolean;
};

/** One category against its own average. The browser words it: "novo" when the average is 0, "nada este mês" when the month is 0. */
export type AnalysisCategoryRow = {
  /** Null on the row of lines with no category ("Sem categoria"). */
  categoryId: string | null;
  categoryName: string | null;
  bucket: CategoryBucket | null;
  /** This month's spending in the category. */
  monthCents: number;
  /** The category's total over the counted months divided by their number; null when no month counts. */
  averageCents: number | null;
  /** `monthCents` minus `averageCents`; null when there is no average. */
  changeCents: number | null;
  /** The change as a whole percent of the average; null when the average is 0 or missing. */
  changePct: number | null;
};

/** A seller whose first spending line in the filtered view falls in the month. */
export type NewSeller = {
  /** The seller's nickname, or the name the bank printed. */
  sellerName: string;
  firstDate: string;
  /** What the seller took this month. */
  amountCents: number;
  lineCount: number;
  /** The category of the seller's first line. */
  categoryId: string | null;
  categoryName: string | null;
};

/** Why a charge stands out: well above the seller's usual, or the same charge twice. */
export type UnusualReason = 'above_usual' | 'charged_twice';

/** A charge of the month that breaks the pattern. `charged_twice` holds every line of the repeat in `lineIds`. */
export type UnusualLine = {
  reason: UnusualReason;
  sellerName: string;
  date: string;
  /** What one line charged, as a positive number. */
  amountCents: number;
  lineIds: string[];
  /** The seller's usual amount (the median of its earlier lines); null for `charged_twice`. */
  usualCents: number | null;
  accountId: string;
  categoryId: string | null;
  categoryName: string | null;
};

/** One day of the calendar. Later installment slices are not in it. */
export type CalendarDay = {
  date: string;
  /** The day's spending, refunds subtracted. Negative when refunds exceed it. */
  spendingCents: number;
  lineCount: number;
};

/** A tag with spending in the month. A line with two tags counts in both, so these do not add up. */
export type TagSpending = { tagId: string; tagName: string; spendingCents: number };

export type AnalysisMonthAnswer = {
  month: string;
  heading: AnalysisHeading;
  /** Every category with lines this month or in the counted months, largest rise first. */
  categories: AnalysisCategoryRow[];
  newSellers: NewSeller[];
  unusual: UnusualLine[];
  /** One entry per day of the month, in date order. */
  calendar: CalendarDay[];
  /** Spending of installment slices 2 onward this month. Days add up to the heading's spending minus this. */
  leftOutInstallmentsCents: number;
  tags: TagSpending[];
};

/** A tag's whole story on the Tags page: spending across all time, and its lines. */
export type TagTotals = {
  tagId: string;
  name: string;
  /** Spending under the tag, refunds subtracted. Other kinds of line add nothing. */
  spendingCents: number;
  /** Lines carrying the tag, of any kind; 0 for a tag with no lines. */
  lineCount: number;
  firstDate: string | null;
  lastDate: string | null;
};

export type TagCategoryShare = {
  categoryId: string | null;
  categoryName: string | null;
  bucket: CategoryBucket | null;
  amountCents: number;
  /** Share of the tag's spending, one decimal; null when the tag's spending is not positive. */
  sharePct: number | null;
};

export type TagDetail = TagTotals & { byCategory: TagCategoryShare[] };

export type AnalysisTagsAnswer = {
  /** Every tag, newest last date first; a tag with no lines goes last. */
  tags: TagTotals[];
  /** The tag asked for with `tagId`, or null when none was asked for or that tag no longer exists. */
  detail: TagDetail | null;
};

// Análise, year view (plan 19)

/** One column of the year table: a calendar month, and whether it is still running (never counted). */
export type AnalysisYearColumn = { month: string; running: boolean };

/** One category across the year table's columns. */
export type AnalysisYearCategory = {
  /** Null on the row of lines with no category ("Sem categoria"). */
  categoryId: string | null;
  categoryName: string | null;
  bucket: CategoryBucket | null;
  /** Spending in each column, refunds subtracted, in the order of `columns`. 0 for a month with nothing. */
  cents: number[];
  /** All columns added together, the running month included. Orders the rows that have no trend. */
  totalCents: number;
  /** Average change per month, a straight line fitted to the counted months (least squares), whole cents. Null with fewer than three counted months. */
  trendCentsPerMonth: number | null;
};

/** Which way a category moved. */
export type InsightDirection = 'up' | 'down';

/** Fields every Destaques sentence carries. `changeCents` is signed and orders the list by its size. */
type InsightBase = {
  direction: InsightDirection;
  categoryId: string | null;
  categoryName: string | null;
  changeCents: number;
};

/** A category rose (or fell) in each of the last counted months, every step big enough. The browser words it. */
export type StreakInsight = InsightBase & {
  kind: 'streak';
  fromMonth: string;
  fromCents: number;
  toMonth: string;
  toCents: number;
  /** How many months in a row, at least 2. */
  steps: number;
};

/** The last counted month against the average of the counted months before it. The browser words it. */
export type AverageInsight = InsightBase & {
  kind: 'average';
  month: string;
  monthCents: number;
  averageCents: number;
  /** How many earlier counted months the average holds, at least 2. */
  averagedMonthCount: number;
};

/** One Destaques sentence as data. */
export type AnalysisInsight = StreakInsight | AverageInsight;

export type AnalysisYearAnswer = {
  /** The selected month: the last column. */
  month: string;
  /** From the first counted month to the selected month. Only the selected month when none counts. */
  columns: AnalysisYearColumn[];
  /** The months a trend and a sentence may read, oldest first: what `averagedMonths` counts in the twelve months ending with `month`. */
  countedMonths: string[];
  /** Every category with lines in a column, fastest-rising first, fastest-falling last, rows with no trend after them. */
  categories: AnalysisYearCategory[];
  /** Destaques, largest change first, one per category. Empty with fewer than three counted months. */
  insights: AnalysisInsight[];
};

// Análise, week view (plan 19)

/** Spending on one day of the week across the counted months. Later installment slices are not in it. */
export type AnalysisWeekday = {
  /** 0 (Sunday) to 6 (Saturday). */
  weekday: number;
  /** Everything spent on this weekday in the counted months, refunds subtracted. */
  totalCents: number;
  /** How many of this weekday the counted months hold, with spending or not. */
  dayCount: number;
  /** `totalCents` per day, rounded to whole cents. 0 when no month counts. */
  averageCents: number;
};

/** Spending in one part of the month (days 1 to 7, 8 to 14, 15 to 21, 22 to the end) across the counted months. */
export type AnalysisMonthPart = {
  firstDay: number;
  /** Null for the last part, which runs to the end of the month. */
  lastDay: number | null;
  /** Everything spent in this part in the counted months, refunds subtracted. */
  totalCents: number;
  /** The days this part holds, added over the counted months. */
  dayCount: number;
  /** `totalCents` per day, rounded to whole cents. 0 when no month counts. */
  averageCents: number;
};

export type AnalysisWeekAnswer = {
  /** The selected month: the last month of the window. */
  month: string;
  /** The months the patterns read, oldest first: the same months as the year view for the same filters. */
  countedMonths: string[];
  /** Seven entries, Sunday first. */
  weekdays: AnalysisWeekday[];
  /** Four entries, in month order. */
  monthParts: AnalysisMonthPart[];
  /** Spending on installment slices from the 2nd on in the counted months. It is in neither list above. */
  leftOutInstallmentsCents: number;
};
