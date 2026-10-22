/**
 * The people, accounts, categories, sellers and imports the API sends. Each
 * type names every field the browser may read. The server maps a database row
 * into one of these (server/services/answers.ts), so a column that is not named
 * here, such as `householdId`, never leaves the server.
 */
import type { AccountType, BankId, BucketLabels, CategoryAppliesTo, CategoryBucket, ImportFormat, ImportStatus, TransactionKind } from '../types';

export type Person = {
  id: string;
  name: string;
  targetNeedsPct: number;
  targetWantsPct: number;
  targetSavingsPct: number;
  referenceIncomeCents: number | null;
  /** Picks the person's identity colour. Renaming never changes it. */
  colorSlot: number;
};

export type Account = {
  id: string;
  personId: string;
  bank: BankId;
  type: AccountType;
  label: string;
};

export type Category = {
  id: string;
  name: string;
  appliesTo: CategoryAppliesTo;
  bucket: CategoryBucket | null;
  sortOrder: number;
  archived: boolean;
};

/** Who wrote a seller's rule: the AI, or the user. */
export type VendorSource = 'ai' | 'user';

/** A seller as the Fornecedores screen shows it: its rule, its category's name, and how many lines use it. */
export type VendorSummary = {
  id: string;
  matchName: string;
  matchAmountCents: number | null;
  nickname: string;
  defaultCategoryId: string | null;
  defaultKind: TransactionKind | null;
  confirmed: boolean;
  source: VendorSource;
  aiConfidence: number | null;
  defaultCategoryName: string | null;
  lineCount: number;
};

/** A tag as a line carries it. */
export type Tag = { id: string; name: string };

/** A tag as the Tags page lists it, with how many lines carry it. */
export type TagSummary = Tag & { lineCount: number };

export type Household = { bucketLabels: BucketLabels };

/** One stored import, without the file. */
export type ImportRecord = {
  id: string;
  accountId: string;
  fileName: string;
  format: ImportFormat;
  status: ImportStatus;
  importedAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  lineCount: number;
};
