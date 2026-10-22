import { sql } from 'drizzle-orm';
import { blob, index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import type { CategoryKey } from '../../shared/categoryKeys';
import type { VendorSource } from '../../shared/contract/entities';
import type {
  AccountType,
  BankId,
  CategoryAppliesTo,
  CategoryBucket,
  ImportFormat,
  ImportRowStatus,
  ImportStatus,
  SkipReason,
  TransactionKind,
} from '../../shared/types';

export const households = sqliteTable('households', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  /** The 50/30/20 group names, shared by the whole household. the user can rename them. */
  needsLabel: text('needs_label').notNull().default('Necessidades'),
  wantsLabel: text('wants_label').notNull().default('Desejos'),
  savingsLabel: text('savings_label').notNull().default('Poupança'),
});

export const people = sqliteTable(
  'people',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id')
      .notNull()
      .references(() => households.id),
    name: text('name').notNull(),
    targetNeedsPct: integer('target_needs_pct').notNull().default(50),
    targetWantsPct: integer('target_wants_pct').notNull().default(30),
    targetSavingsPct: integer('target_savings_pct').notNull().default(20),
    referenceIncomeCents: integer('reference_income_cents'),
    /** Picks the person's identity colour from PERSON_COLORS (client/src/lib/colors.ts). Renaming never changes it. */
    colorSlot: integer('color_slot').notNull().default(0),
  },
  (table) => ({
    // Stops an exact duplicate. The people service also compares ignoring case and accents.
    nameUnique: uniqueIndex('people_household_name').on(table.householdId, table.name),
  }),
);

export const accounts = sqliteTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id')
      .notNull()
      .references(() => households.id),
    personId: text('person_id')
      .notNull()
      .references(() => people.id),
    bank: text('bank').notNull().$type<BankId>(),
    type: text('type').notNull().$type<AccountType>(),
    label: text('label').notNull(),
  },
  (table) => ({
    // Stops an exact duplicate. The accounts service also compares ignoring case and accents.
    labelUnique: uniqueIndex('accounts_household_label').on(table.householdId, table.label),
  }),
);

export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id')
      .notNull()
      .references(() => households.id),
    name: text('name').notNull(),
    /** Set on the seeded categories the code relies on; stays through renames. Null on every other category. */
    systemKey: text('system_key').$type<CategoryKey>(),
    appliesTo: text('applies_to').notNull().$type<CategoryAppliesTo>(),
    bucket: text('bucket').$type<CategoryBucket>(),
    sortOrder: integer('sort_order').notNull().default(0),
    archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => ({
    nameUnique: uniqueIndex('categories_household_name').on(table.householdId, table.name),
    systemKeyUnique: uniqueIndex('categories_household_system_key').on(table.householdId, table.systemKey),
  }),
);

export const vendors = sqliteTable(
  'vendors',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id')
      .notNull()
      .references(() => households.id),
    matchName: text('match_name').notNull(),
    matchAmountCents: integer('match_amount_cents'),
    nickname: text('nickname').notNull(),
    defaultCategoryId: text('default_category_id').references(() => categories.id),
    defaultKind: text('default_kind').$type<TransactionKind>(),
    confirmed: integer('confirmed', { mode: 'boolean' }).notNull().default(false),
    source: text('source').notNull().default('ai').$type<VendorSource>(),
    aiConfidence: real('ai_confidence'),
  },
  (table) => ({
    matchIndex: index('vendors_household_match').on(table.householdId, table.matchName),
  }),
);

export const imports = sqliteTable('imports', {
  id: text('id').primaryKey(),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id),
  fileName: text('file_name').notNull(),
  fileBytes: blob('file_bytes', { mode: 'buffer' }).notNull(),
  format: text('format').notNull().$type<ImportFormat>(),
  status: text('status').notNull().default('pending').$type<ImportStatus>(),
  importedAt: text('imported_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  periodStart: text('period_start'),
  periodEnd: text('period_end'),
  lineCount: integer('line_count').notNull().default(0),
});

/** One screenshot kept with the import it was read from (Swile). */
export const importImages = sqliteTable(
  'import_images',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id')
      .notNull()
      .references(() => households.id),
    importId: text('import_id')
      .notNull()
      .references(() => imports.id),
    /** 0-based order in which the screenshots were sent. */
    position: integer('position').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    bytes: blob('bytes', { mode: 'buffer' }).notNull(),
  },
  (table) => ({
    importIndex: index('import_images_import_position').on(table.importId, table.position),
  }),
);

export const installmentPlans = sqliteTable('installment_plans', {
  id: text('id').primaryKey(),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id),
  vendorId: text('vendor_id').references(() => vendors.id),
  description: text('description').notNull(),
  totalInstallments: integer('total_installments').notNull(),
  installmentAmountCents: integer('installment_amount_cents').notNull(),
  firstDate: text('first_date').notNull(),
});

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id')
      .notNull()
      .references(() => households.id),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    importId: text('import_id').references(() => imports.id),
    date: text('date').notNull(),
    amountCents: integer('amount_cents').notNull(),
    /**
     * the user's own amount for the line, signed like the bank's. Reports and
     * Transações read it in place of `amountCents`; matching against the bank
     * (duplicates, transfer pairs, refunds, installments) never does.
     */
    adjustedAmountCents: integer('adjusted_amount_cents'),
    rawDescription: text('raw_description').notNull(),
    vendorId: text('vendor_id').references(() => vendors.id),
    categoryId: text('category_id').references(() => categories.id),
    kind: text('kind').$type<TransactionKind>(),
    savingsLabel: text('savings_label'),
    installmentPlanId: text('installment_plan_id').references(() => installmentPlans.id),
    installmentNumber: integer('installment_number'),
    note: text('note'),
    bankReference: text('bank_reference'),
    transferPairId: text('transfer_pair_id'),
    dedupeKey: text('dedupe_key').notNull(),
    kindSetByUser: integer('kind_set_by_user', { mode: 'boolean' }).notNull().default(false),
    transferCandidate: integer('transfer_candidate', { mode: 'boolean' }).notNull().default(false),
    vendorName: text('vendor_name').notNull().default(''),
  },
  (table) => ({
    dedupeUnique: uniqueIndex('transactions_account_dedupe').on(table.accountId, table.dedupeKey),
    dateIndex: index('transactions_household_date').on(table.householdId, table.date),
    transferPairIndex: index('transactions_transfer_pair').on(table.transferPairId),
  }),
);

/** A label the household puts on lines to add up a trip or a project across categories ("Lisboa 2026"). */
export const tags = sqliteTable(
  'tags',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id')
      .notNull()
      .references(() => households.id),
    name: text('name').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    // Stops an exact duplicate. The tags service also compares ignoring case and accents.
    nameUnique: uniqueIndex('tags_household_name').on(table.householdId, table.name),
  }),
);

/**
 * Which tags a line carries. A line holds a tag once. Deleting a line or a tag
 * takes its links with it, so a hand-added line with tags can still be deleted.
 */
export const transactionTags = sqliteTable(
  'transaction_tags',
  {
    transactionId: text('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.transactionId, table.tagId] }),
    tagIndex: index('transaction_tags_tag').on(table.tagId),
  }),
);

/**
 * One row per row the reader saw in an uploaded file, so the review can show
 * everything read and what happened to it. `transactionId` has no foreign key:
 * a duplicate row points at a line from an earlier import, so that history
 * survives even after the line's own import is gone. Cancelling an import is
 * refused instead while another import's rows still point at its lines
 * (`hasDependentRows`), so history is never silently orphaned.
 */
export const importRows = sqliteTable(
  'import_rows',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id')
      .notNull()
      .references(() => households.id),
    importId: text('import_id')
      .notNull()
      .references(() => imports.id),
    sourceLine: integer('source_line').notNull(),
    date: text('date'),
    amountCents: integer('amount_cents'),
    text: text('text').notNull(),
    status: text('status').notNull().$type<ImportRowStatus>(),
    reason: text('reason').$type<SkipReason>(),
    transactionId: text('transaction_id'),
    /** Which screenshot the row came from (Swile). Null for bank files. */
    imageIndex: integer('image_index'),
  },
  (table) => ({
    importIndex: index('import_rows_import').on(table.importId, table.sourceLine),
  }),
);

export const settings = sqliteTable(
  'settings',
  {
    householdId: text('household_id')
      .notNull()
      .references(() => households.id),
    key: text('key').notNull(),
    value: text('value').notNull(),
  },
  (table) => ({
    settingUnique: uniqueIndex('settings_household_key').on(table.householdId, table.key),
  }),
);
