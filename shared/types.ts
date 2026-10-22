/** What a transaction does to the household's money. */
export type TransactionKind = 'expense' | 'income' | 'transfer' | 'savings';

/** Which 50/30/20 bucket a category belongs to. Empty means not yet assigned. */
export type CategoryBucket = 'needs' | 'wants' | 'savings';

/** Which bank an account is at. */
export type BankId = 'nubank' | 'itau' | 'swile';

/** What kind of account it is. */
export type AccountType = 'checking' | 'card' | 'benefit';

/** Whether a category is for money out or money in. */
export type CategoryAppliesTo = 'expense' | 'income';

export const TRANSACTION_KINDS: readonly TransactionKind[] = [
  'expense',
  'income',
  'transfer',
  'savings',
];

export const CATEGORY_BUCKETS: readonly CategoryBucket[] = ['needs', 'wants', 'savings'];

/** Whether an import is still waiting for review or has been confirmed. */
export type ImportStatus = 'pending' | 'confirmed';

/** Which parser read a file. Stored on the import row. */
export type ImportFormat = 'nubank_checking_csv' | 'nubank_card_csv' | 'itau_checking_pdf' | 'swile_screenshots';

/** What happened to one row of an uploaded file. */
export type ImportRowStatus = 'imported' | 'duplicate' | 'ignored';

/** Why a reader passed over a row that is not money moving. */
export type SkipReason = 'balance_row' | 'cut_off' | 'impossible_date';

/** The household's names for the three 50/30/20 groups. */
export type BucketLabels = Record<CategoryBucket, string>;
