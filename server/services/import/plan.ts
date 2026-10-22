import type { NewImportRow } from '../../db/importRows';
import type { NewImport, NewImportImage } from '../../db/imports';
import type { NewTransaction } from '../../db/transactions';
import type { NewVendor } from '../../db/vendors';
import type { NewPlan } from './installments';
import type { TransferPair } from './transferPairs';

/**
 * The output of the decide step and the only input of the write step: every
 * row an import stores, with its id, fully decided. Writing it needs no
 * lookup and no choice (ADR-0016).
 */
export type ImportPlan = {
  householdId: string;
  accountId: string;
  importRow: NewImport;
  images: NewImportImage[];
  /** Sellers the AI suggested, created unconfirmed. Lines reference them by `id`. */
  vendors: (NewVendor & { id: string })[];
  installmentPlans: NewPlan[];
  transactions: NewTransaction[];
  /** Lines to mark as one transfer, after the lines exist. */
  pairs: TransferPair[];
  importRows: NewImportRow[];
  /** The counts the summary reports. */
  counts: { lineCount: number; droppedCount: number; ignoredCount: number; pairedCount: number };
};
