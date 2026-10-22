/**
 * Turns database rows into the answers the API sends (shared/contract). A
 * mapper names every field it copies, so a column added to a table never
 * reaches the browser until someone adds it to the answer type. `householdId`
 * is the main one that must stay behind.
 */
import type { Account, Category, ImportRecord, Person, VendorSummary } from '../../shared/contract/entities';
import type { AccountRow } from '../db/accounts';
import type { CategoryRow } from '../db/categories';
import type { ImportSummaryRow } from '../db/imports';
import type { PersonRow } from '../db/people';
import type { VendorSummary as VendorSummaryRow } from '../db/vendors';

export function toPerson(row: PersonRow): Person {
  return {
    id: row.id,
    name: row.name,
    targetNeedsPct: row.targetNeedsPct,
    targetWantsPct: row.targetWantsPct,
    targetSavingsPct: row.targetSavingsPct,
    referenceIncomeCents: row.referenceIncomeCents,
    colorSlot: row.colorSlot,
  };
}

export function toAccount(row: AccountRow): Account {
  return { id: row.id, personId: row.personId, bank: row.bank, type: row.type, label: row.label };
}

/** The category's stable `systemKey` stays on the server: the browser has no use for it. */
export function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    appliesTo: row.appliesTo,
    bucket: row.bucket,
    sortOrder: row.sortOrder,
    archived: row.archived,
  };
}

export function toVendorSummary(row: VendorSummaryRow): VendorSummary {
  return {
    id: row.id,
    matchName: row.matchName,
    matchAmountCents: row.matchAmountCents,
    nickname: row.nickname,
    defaultCategoryId: row.defaultCategoryId,
    defaultKind: row.defaultKind,
    confirmed: row.confirmed,
    source: row.source,
    aiConfidence: row.aiConfidence,
    defaultCategoryName: row.defaultCategoryName,
    lineCount: row.lineCount,
  };
}

/** An import without its household and its stored file. */
export function toImportRecord(row: ImportSummaryRow): ImportRecord {
  return {
    id: row.id,
    accountId: row.accountId,
    fileName: row.fileName,
    format: row.format,
    status: row.status,
    importedAt: row.importedAt,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    lineCount: row.lineCount,
  };
}
