import type {
  AnalysisMonthAnswer,
  AnalysisTagsAnswer,
  AnalysisWeekAnswer,
  AnalysisYearAnswer,
  MonthReport,
} from '../../../shared/contract/reports';
import type { AnalysisMonthQuery, AnalysisTagsQuery } from '../../../shared/contract/requests';
import { lastTwelveMonths, monthSpan, parseMonth } from '../../../shared/dates';
import { AppError } from '../../../shared/errors';
import { splitIdList } from '../../../shared/text';
import { listAccounts } from '../../db/accounts';
import type { Db } from '../../db/client';
import { listPlanProgress } from '../../db/installmentPlans';
import { listPeople, type PersonRow } from '../../db/people';
import { listTagLineStats, listTagRows } from '../../db/tags';
import { countUnsetLines, listCountedLines, type ReportLine } from '../../db/reportLines';
import { analyzeMonth, filterLines, tagDetail, tagTotals, type AnalysisFilters } from './analysis';
import { budgetView, type BudgetView } from './budget';
import { openInstallments, type OpenInstallments } from './installments';
import { monthsRead } from './spending';
import {
  spendingByAccount,
  spendingByCategory,
  totalsByPerson,
  totalsOf,
  totalsPerMonth,
  type AccountSpending,
  type CategorySpending,
  type MonthTotals,
  type PersonTotals,
  type Totals,
} from './monthReport';
import { analyzeYear } from './trends';
import { analyzeWeek } from './weekPatterns';

export type { MonthReport };

/**
 * Visão do mês: the household's month, or one person's when `personId` is
 * given. `byPerson` always covers the whole household; every other field
 * narrows to that person.
 */
export function getMonthReport(db: Db, householdId: string, monthText: string, personId?: string): MonthReport {
  const month = parseMonth(monthText);
  if (personId !== undefined) requirePerson(db, householdId, personId);
  const span = monthSpan(month, month);
  const householdLines = listCountedLines(db, householdId, span);
  const lines = linesFor(householdLines, personId);
  const accountLabels = new Map(listAccounts(db, householdId).map((account): [string, string] => [account.id, account.label]));

  return {
    month,
    totals: totalsOf(lines),
    byCategory: spendingByCategory(lines),
    byAccount: spendingByAccount(lines, accountLabels),
    byPerson: totalsByPerson(householdLines, listPeople(db, householdId)),
    unsetCount: countUnsetLines(db, householdId, span, personId),
  };
}

function linesFor(lines: readonly ReportLine[], personId: string | undefined): readonly ReportLine[] {
  return personId === undefined ? lines : lines.filter((line) => line.personId === personId);
}

/** The twelve months ending at `month`, for the household or for one person. */
export function getHistory(db: Db, householdId: string, monthText: string, personId?: string): MonthTotals[] {
  const month = parseMonth(monthText);
  if (personId !== undefined) requirePerson(db, householdId, personId);
  const months = lastTwelveMonths(month);
  const lines = listCountedLines(db, householdId, monthSpan(months[0]!, month)).filter(
    (line) => personId === undefined || line.personId === personId,
  );
  return totalsPerMonth(lines, months);
}

/** Orçamento: one person's 50/30/20 month, with the twelve months before it. */
export function getBudget(db: Db, householdId: string, monthText: string, personId: string): BudgetView {
  const month = parseMonth(monthText);
  const person = requirePerson(db, householdId, personId);
  const months = lastTwelveMonths(month);
  return budgetView(person, listCountedLines(db, householdId, monthSpan(months[0]!, month)), month);
}

/** Parcelas: open plans and the total still owed. */
export function getInstallments(db: Db, householdId: string): OpenInstallments {
  return openInstallments(listPlanProgress(db, householdId));
}

/** The first and last dates that hold every line, for reads that look at all time. */
const ALL_TIME = { start: '0000-01-01', endExclusive: '9999-12-31' };

/** The calendar month on this computer's clock, "2026-10". */
function calendarMonth(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Análise, month view: the household's or one person's spending, narrowed by the
 * filters, read from the first line up to the end of the month so averages, new
 * sellers and usual amounts see the whole history. `now` is the clock, for tests.
 */
export function getAnalysisMonth(
  db: Db,
  householdId: string,
  query: AnalysisMonthQuery,
  now: Date = new Date(),
): AnalysisMonthAnswer {
  const month = parseMonth(query.month);
  if (query.personId !== undefined) requirePerson(db, householdId, query.personId);
  const lines = filterLines(
    listCountedLines(db, householdId, { start: ALL_TIME.start, endExclusive: monthSpan(month, month).endExclusive }),
    filtersOf(query),
  );
  const tagNames = new Map(listTagRows(db, householdId).map((tag): [string, string] => [tag.id, tag.name]));
  return analyzeMonth({ lines, month, currentMonth: calendarMonth(now), tagNames });
}

/**
 * Análise, year view: the twelve calendar months ending with the selected month,
 * narrowed by the same filters as the month view. Reads only those months' lines and the
 * month before them, which is never shown but decides whether a first month is partial.
 * `now` is the clock, for tests.
 */
export function getAnalysisYear(
  db: Db,
  householdId: string,
  query: AnalysisMonthQuery,
  now: Date = new Date(),
): AnalysisYearAnswer {
  const month = parseMonth(query.month);
  if (query.personId !== undefined) requirePerson(db, householdId, query.personId);
  const lines = filterLines(listCountedLines(db, householdId, monthSpan(monthsRead(month)[0]!, month)), filtersOf(query));
  return analyzeYear({ lines, month, currentMonth: calendarMonth(now) });
}

/**
 * Análise, week view: spending by weekday and by part of the month, over the counted
 * months of the twelve ending with the selected month. Reads and filters exactly as
 * the year view does. `now` is the clock, for tests.
 */
export function getAnalysisWeek(
  db: Db,
  householdId: string,
  query: AnalysisMonthQuery,
  now: Date = new Date(),
): AnalysisWeekAnswer {
  const month = parseMonth(query.month);
  if (query.personId !== undefined) requirePerson(db, householdId, query.personId);
  const lines = filterLines(listCountedLines(db, householdId, monthSpan(monthsRead(month)[0]!, month)), filtersOf(query));
  return analyzeWeek({ lines, month, currentMonth: calendarMonth(now) });
}

/** The filter bar's choices in a request, as the rules read them. */
function filtersOf(query: AnalysisMonthQuery): AnalysisFilters {
  return {
    personId: query.personId,
    accountIds: splitIdList(query.accountIds),
    bucket: query.bucket,
    categoryId: query.categoryId,
    tagId: query.tagId,
  };
}

/**
 * Análise, Tags page: every tag with its spending, lines and dates across all
 * time for the household or one person, and the split by category for `tagId`.
 */
export function getAnalysisTags(db: Db, householdId: string, query: AnalysisTagsQuery): AnalysisTagsAnswer {
  if (query.personId !== undefined) requirePerson(db, householdId, query.personId);
  const lines = listCountedLines(db, householdId, ALL_TIME).filter(
    (line) => query.personId === undefined || line.personId === query.personId,
  );
  const tags = tagTotals(lines, listTagLineStats(db, householdId, query.personId), listTagRows(db, householdId));
  // A tag that is gone (deleted in another tab, an old bookmark) is no error: the answer has no detail and the page says so.
  const selected = query.tagId === undefined ? undefined : tags.find((entry) => entry.tagId === query.tagId);
  return { tags, detail: selected === undefined ? null : tagDetail(lines, selected) };
}

function requirePerson(db: Db, householdId: string, personId: string): PersonRow {
  const person = listPeople(db, householdId).find((candidate) => candidate.id === personId);
  if (!person) {
    throw new AppError('person_not_found', `No person ${personId} in household ${householdId}`);
  }
  return person;
}
