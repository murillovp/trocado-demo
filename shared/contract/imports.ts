/** What the import endpoints answer, and the steps an import reports while it runs. */
import type { ImportFormat, ImportRowStatus, SkipReason, TransactionKind } from '../types';
import type { ImportRecord } from './entities';

/** Why an AI provider call failed, kept short enough to show. */
export type AiFailureReason = 'busy' | 'model' | 'key' | 'credit' | 'network' | 'timeout' | 'unreadable' | 'provider';

export type AiFailure = {
  reason: AiFailureReason;
  /** HTTP status from the provider, when there was one. */
  status: number | null;
  /** OpenRouter's own error text, trimmed to 200 characters, or null. */
  providerMessage: string | null;
};

/** What the import is doing on the server, sent to the browser as each step starts. */
export type ImportStepEvent =
  | { step: 'reading' }
  | { step: 'reading_image'; index: number; total: number }
  | { step: 'checking' }
  | { step: 'asking_ai'; count: number }
  | { step: 'saving' };

/** What an upload answers with: the counts of one stored import. */
export type ImportSummary = {
  importId: string;
  format: ImportFormat;
  lineCount: number;
  droppedCount: number;
  ignoredCount: number;
  pairedCount: number;
  needsReviewCount: number;
  aiFailed: boolean;
  /** Why vendor suggestions failed, or null when the AI answered or was not asked. */
  aiFailure: AiFailure | null;
};

/** What a picked file is, and the accounts that can take it. */
export type FileDetection = { format: ImportFormat; accountIds: string[] };

/** What the "run the AI again" button answers. */
export type ReclassifyResult = {
  askedCount: number;
  categorizedCount: number;
  aiFailed: boolean;
  aiFailure: AiFailure | null;
};

/** Why a line needs a look. An empty list means it can be confirmed as it is. */
export type ReviewFlag = 'kind_unset' | 'no_category' | 'low_confidence';

export type ReviewLine = {
  id: string;
  date: string;
  amountCents: number;
  rawDescription: string;
  vendorName: string;
  nickname: string | null;
  kind: TransactionKind | null;
  categoryId: string | null;
  categoryName: string | null;
  savingsLabel: string | null;
  transferPairId: string | null;
  installmentNumber: number | null;
  /** How many installments the purchase has. Null for a line that is not an installment. */
  installmentTotal: number | null;
  /** Which screenshot the line came from (Swile). Null for a bank file. */
  imageIndex: number | null;
  flags: ReviewFlag[];
};

export type ReviewRow = {
  sourceLine: number;
  date: string | null;
  amountCents: number | null;
  text: string;
  status: ImportRowStatus;
  reason: SkipReason | null;
  transactionId: string | null;
  earlierImportId: string | null;
  earlierImportedAt: string | null;
  /** Which screenshot the row came from (Swile). Null for a bank file. */
  imageIndex: number | null;
};

export type RowCounts = { total: number; imported: number; duplicate: number; ignored: number };

export type ImportReview = {
  import: ImportRecord;
  /** The import's screenshots, in order. Empty for a bank file. */
  images: { position: number; fileName: string }[];
  /** Every row the reader saw, in file order. */
  rows: ReviewRow[];
  counts: RowCounts;
  /** The imported lines, with what the rules decided. */
  lines: ReviewLine[];
  needsReviewCount: number;
};

/** One past import on the Importar screen, with what happened to its rows. */
export type ImportHistoryEntry = ImportRecord & { accountLabel: string; counts: RowCounts };
