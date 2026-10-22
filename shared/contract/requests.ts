/**
 * What the browser may send, one Zod schema per request body or query. The
 * routes check requests with these schemas. The browser takes only the types
 * (`z.input`), so it never loads Zod: see client/src/api/boundary.test.ts.
 */
import { z } from 'zod';
import { BATCH_LIMIT_MESSAGE, GROUP_NAME_MAX_LENGTH, MAX_BATCH_SIZE, PERSON_NAME_MAX_LENGTH, TAG_NAME_MAX_LENGTH, VENDOR_BATCH_LIMIT_MESSAGE } from '../limits';
import {
  amountCentsSchema,
  dateInRangeSchema,
  nameSchema,
  referenceIncomeSchema,
  signedAmountCentsSchema,
  textSchema,
} from './fields';

const transactionKind = z.enum(['expense', 'income', 'transfer', 'savings']);
const bucket = z.enum(['needs', 'wants', 'savings']);
const tagIdsSchema = z.array(z.string().min(1));

// People and accounts

export const personPatchSchema = z.object({
  name: nameSchema(PERSON_NAME_MAX_LENGTH).optional(),
  targetNeedsPct: z.number().int().optional(),
  targetWantsPct: z.number().int().optional(),
  targetSavingsPct: z.number().int().optional(),
  referenceIncomeCents: referenceIncomeSchema.nullable().optional(),
});
export type PersonPatch = z.input<typeof personPatchSchema>;

export const newAccountSchema = z.object({
  personId: z.string().trim().min(1),
  bank: z.enum(['nubank', 'itau', 'swile']),
  type: z.enum(['checking', 'card', 'benefit']),
  label: nameSchema(),
});
export type NewAccount = z.input<typeof newAccountSchema>;

export const accountRenameSchema = z.object({ label: nameSchema() });
export type AccountRename = z.input<typeof accountRenameSchema>;

// Categories and the household

export const newCategorySchema = z.object({
  name: nameSchema(),
  appliesTo: z.enum(['expense', 'income']),
  bucket: bucket.nullable(),
  sortOrder: z.number().int().optional(),
});
export type NewCategory = z.input<typeof newCategorySchema>;

export const categoryPatchSchema = z.object({
  name: nameSchema().optional(),
  bucket: bucket.nullable().optional(),
  sortOrder: z.number().int().optional(),
});
export type CategoryPatch = z.input<typeof categoryPatchSchema>;

/** The household's active categories in their new order, every id once. The list position becomes the sort order. */
export const categoryOrderSchema = z.object({ ids: z.array(z.string().min(1)) });
export type CategoryOrder = z.input<typeof categoryOrderSchema>;

const groupName = nameSchema(GROUP_NAME_MAX_LENGTH);
export const householdPatchSchema = z.object({
  bucketLabels: z.object({ needs: groupName.optional(), wants: groupName.optional(), savings: groupName.optional() }).strict(),
});
export type HouseholdPatch = z.input<typeof householdPatchSchema>;

// Settings

/** The service refuses the reserved `_set` keys and hides secret values. */
export const settingsUpdateSchema = z.record(z.string(), z.string());
export type SettingsUpdate = z.input<typeof settingsUpdateSchema>;

// Reports

export const monthQuerySchema = z.object({ month: z.string().min(1), personId: z.string().min(1).optional() });
export type MonthQuery = z.input<typeof monthQuerySchema>;

export const budgetQuerySchema = z.object({ month: z.string().min(1), personId: z.string().min(1) });
export type BudgetQuery = z.input<typeof budgetQuerySchema>;

// Análise

export const analysisMonthQuerySchema = z.object({
  month: z.string().min(1),
  personId: z.string().min(1).optional(),
  /** Several account ids, comma-separated. Empty means every account. */
  accountIds: z.string().min(1).optional(),
  /** The old single-account name. The client sends it with a lone `accountIds` entry; the server reads `accountIds` only. */
  accountId: z.string().min(1).optional(),
  /** The group a line's category sits in, as on Transações. `savings` and `unclassified` are accepted for the same address. */
  bucket: z.enum(['needs', 'wants', 'savings', 'unclassified']).optional(),
  /** A category id, or 'none' for lines with no category. */
  categoryId: z.string().min(1).optional(),
  tagId: z.string().min(1).optional(),
});
export type AnalysisMonthQuery = z.input<typeof analysisMonthQuerySchema>;

export const analysisTagsQuerySchema = z.object({
  personId: z.string().min(1).optional(),
  /** The tag to describe in detail. */
  tagId: z.string().min(1).optional(),
});
export type AnalysisTagsQuery = z.input<typeof analysisTagsQuerySchema>;

// Transações

export const ledgerQuerySchema = z.object({
  month: z.string().min(1).optional(),
  personId: z.string().min(1).optional(),
  accountId: z.string().min(1).optional(),
  /** A category id, or 'none' for lines with no category. */
  categoryId: z.string().min(1).optional(),
  kind: z.enum(['expense', 'income', 'transfer', 'savings', 'unset']).optional(),
  /** The budget pile a line lands in, the same rule as `pileOf` in server/services/reports/budget.ts. */
  bucket: z.enum(['needs', 'wants', 'savings', 'unclassified']).optional(),
  /** A savings label; '' finds lines with no label. */
  savingsLabel: z.string().optional(),
  search: z.string().trim().min(1).optional(),
  /** Several account ids, comma-separated. Together with `accountId`, a line must match both. */
  accountIds: z.string().min(1).optional(),
  /** A tag id: only lines carrying it. */
  tagId: z.string().min(1).optional(),
  /** One day (YYYY-MM-DD). It wins over `month`. */
  date: z.string().min(1).optional(),
});
export type LedgerQuery = z.input<typeof ledgerQuerySchema>;

/** A line added by hand. The amount is positive; the kind decides the sign. */
export const manualLineSchema = z.object({
  accountId: z.string().min(1),
  date: dateInRangeSchema,
  amountCents: amountCentsSchema,
  kind: z.enum(['expense', 'income', 'savings']),
  description: textSchema,
  categoryId: z.string().min(1).nullable().optional(),
  savingsLabel: nameSchema().nullable().optional(),
  note: textSchema.nullable().optional(),
});
export type ManualLineInput = z.input<typeof manualLineSchema>;

/** What Transações can change on a line: everything the review screen can, plus the note and the amount. */
export const ledgerLineChangesSchema = z.object({
  kind: transactionKind.nullable().optional(),
  categoryId: z.string().min(1).nullable().optional(),
  nickname: nameSchema().optional(),
  savingsLabel: nameSchema().nullable().optional(),
  note: textSchema.nullable().optional(),
  /** Save the rule for this exact amount only, not for every line with this name. */
  rememberAmount: z.boolean().optional(),
  amountCents: amountCentsSchema.nullable().optional(),
  /** Also move the seller's other lines outside review that had this line's old category. */
  applyToVendorLines: z.boolean().optional(),
  /** The line's full list of tags. A missing field leaves its tags as they are. */
  tagIds: tagIdsSchema.optional(),
});
export type LedgerLineChanges = z.input<typeof ledgerLineChangesSchema>;

/**
 * What the user can change on one line, without the amount and the tags: the
 * part the review screen shares. Tags are written by their own step.
 */
export type LineChanges = Omit<LedgerLineChanges, 'amountCents' | 'applyToVendorLines' | 'tagIds'>;

/**
 * One change applied to many lines at once: a category or a kind, never both.
 * Each line goes through the same rules as editing it alone. Nothing else
 * changes with it, and no seller rule learns from it.
 */
export const batchChangeSchema = z.object({
  transactionIds: z.array(z.string().min(1)).min(1).max(MAX_BATCH_SIZE, { message: BATCH_LIMIT_MESSAGE }),
  change: z.union([z.object({ categoryId: z.string().min(1) }).strict(), z.object({ kind: transactionKind }).strict()]),
});
export type BatchChange = z.input<typeof batchChangeSchema>;

// Tags

export const newTagSchema = z.object({ name: nameSchema(TAG_NAME_MAX_LENGTH) });
export type NewTag = z.input<typeof newTagSchema>;

export const tagRenameSchema = z.object({ name: nameSchema(TAG_NAME_MAX_LENGTH) });
export type TagRename = z.input<typeof tagRenameSchema>;

/** Adds a tag to, or removes it from, every listed line. */
export const tagLinesSchema = z.object({
  transactionIds: z.array(z.string().min(1)).min(1),
  tagId: z.string().min(1),
  action: z.enum(['add', 'remove']),
});
export type TagLines = z.input<typeof tagLinesSchema>;

// Sellers

/** Accepts many sellers' rules as they stand, as "Confirmar" does for one. */
export const acceptVendorsSchema = z.object({
  vendorIds: z.array(z.string().min(1)).min(1).max(MAX_BATCH_SIZE, { message: VENDOR_BATCH_LIMIT_MESSAGE }),
});
export type AcceptVendors = z.input<typeof acceptVendorsSchema>;

export const vendorEditSchema = z.object({
  nickname: nameSchema().optional(),
  defaultCategoryId: z.string().min(1).nullable().optional(),
  defaultKind: transactionKind.nullable().optional(),
  matchName: textSchema.optional(),
  matchAmountCents: signedAmountCentsSchema.nullable().optional(),
  /** Also move past lines that still carry the old default category to the new one. */
  applyToLines: z.boolean().optional(),
});
export type VendorEdit = z.input<typeof vendorEditSchema>;

// Imports

export const importUploadSchema = z.object({
  accountId: z.string().min(1),
  fileName: z.string().trim().min(1),
  fileBase64: z.string().min(1),
});
export type ImportUpload = z.input<typeof importUploadSchema>;

export const screenshotUploadSchema = z.object({
  accountId: z.string().min(1),
  images: z.array(z.object({ fileName: z.string().trim().min(1), fileBase64: z.string().min(1) })),
});
export type ScreenshotUpload = z.input<typeof screenshotUploadSchema>;

export const detectRequestSchema = z.object({ fileBase64: z.string().min(1) });
export type DetectRequest = z.input<typeof detectRequestSchema>;

export const lineEditSchema = z.object({
  transactionId: z.string().min(1),
  kind: transactionKind.nullable().optional(),
  categoryId: z.string().min(1).nullable().optional(),
  nickname: nameSchema().optional(),
  savingsLabel: nameSchema().nullable().optional(),
  rememberAmount: z.boolean().optional(),
  /** The line's full list of tags, written with the lines when the import is confirmed. */
  tagIds: tagIdsSchema.optional(),
});
export type LineEdit = z.input<typeof lineEditSchema>;

export const confirmRequestSchema = z.object({ edits: z.array(lineEditSchema).default([]) });
export type ConfirmRequest = z.input<typeof confirmRequestSchema>;
