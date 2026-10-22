/**
 * The body of each answer, one type per shape the API sends. Most wrap their
 * data under one key (`{ people: [...] }`) so an answer can grow a field
 * later without breaking the browser. The routes build their answers with
 * `satisfies` one of these types, and the browser reads them through them.
 */
import type { Account, Category, Household, Person, TagSummary, VendorSummary } from './entities';
import type { ImportHistoryEntry, ImportSummary } from './imports';
import type { LedgerLine, LedgerSummary } from './lines';
import type { IntegrityProblem, MonthTotals, OpenInstallments } from './reports';

export type PeopleAnswer = { people: Person[] };
export type PersonAnswer = { person: Person };

export type AccountsAnswer = { accounts: Account[] };
export type AccountAnswer = { account: Account };

export type CategoriesAnswer = { categories: Category[] };
/** A category saved, and how many lines moved with it (a new group re-aligns the lines). */
export type CategoryChangeAnswer = { category: Category; linesChanged: number };
export type CategoryAnswer = { category: Category };

export type HouseholdAnswer = { household: Household };

export type ImportsAnswer = { imports: ImportHistoryEntry[] };
export type ImportSummaryAnswer = { import: ImportSummary };

export type InstallmentsAnswer = OpenInstallments;
export type IntegrityAnswer = { problems: IntegrityProblem[] };
export type LatestMonthAnswer = { month: string | null };
export type HistoryAnswer = { months: MonthTotals[] };
export type SettingsAnswer = { settings: Record<string, string> };

/** The lines a query lists, and their totals (over all of them, not a page). */
export type TransactionsAnswer = { transactions: LedgerLine[]; summary: LedgerSummary };
export type TransactionAnswer = { transaction: LedgerLine };

/** A change applied to many lines: how many of them ended with a different value. */
export type BatchChangeAnswer = { changed: number };

export type TagsAnswer = { tags: TagSummary[] };
export type TagAnswer = { tag: TagSummary };
/** A tag deleted, and how many lines it left (the lines stay). */
export type TagDeletedAnswer = { linesUntagged: number };
/** A tag added to or removed from several lines: how many lines changed. */
export type TagLinesAnswer = { changed: number };

export type VendorsAnswer = { vendors: VendorSummary[] };
export type VendorAnswer = { vendor: VendorSummary };
/** Sellers accepted in bulk: how many were not accepted before. */
export type AcceptVendorsAnswer = { accepted: number };
export type VendorEditAnswer = { vendor: VendorSummary; linesUpdated: number; linesSkipped: number };
