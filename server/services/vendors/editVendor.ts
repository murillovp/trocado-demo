import type { VendorEdit } from '../../../shared/contract/requests';
import { AppError } from '../../../shared/errors';
import { listCategories } from '../../db/categories';
import type { Db } from '../../db/client';
import { alignKindsToCategory, recategorizeVendorLines } from '../../db/transactions';
import {
  findAmountVendor,
  findNameVendor,
  listVendorSummaries,
  requireVendor,
  updateVendor,
  type VendorSummary,
} from '../../db/vendors';
import { categoryFactsOf, checkKindAndCategory } from '../lines/kindRule';

export type { VendorEdit };

/**
 * Changes a vendor's rule on the Fornecedores screen. The edit makes the
 * vendor the user's, so the AI is not asked about it again. Past lines keep
 * their category unless `applyToLines` is set; `linesSkipped` counts the lines
 * that setting left alone because money left on them and the seller is Entrada.
 */
export function editVendor(
  db: Db,
  householdId: string,
  id: string,
  edit: VendorEdit,
): { vendor: VendorSummary; linesUpdated: number; linesSkipped: number } {
  const before = requireVendor(db, householdId, id);
  const facts = categoryFactsOf(listCategories(db, householdId, { includeArchived: true }));
  if (edit.defaultCategoryId && !facts.has(edit.defaultCategoryId)) {
    throw new AppError('category_not_found', `No category ${edit.defaultCategoryId}`);
  }
  // The rule's type follows its category's group (ADR-0012); a pair that cannot be is refused.
  let defaultKind = edit.defaultKind;
  if (edit.defaultKind !== undefined || edit.defaultCategoryId !== undefined) {
    const kind = checkKindAndCategory(
      edit.defaultKind !== undefined ? edit.defaultKind : before.defaultKind,
      edit.defaultCategoryId !== undefined ? edit.defaultCategoryId : before.defaultCategoryId,
      facts,
    );
    // The aligned kind wins over what the edit asked for, even when it equals the stored one.
    defaultKind = kind === before.defaultKind ? undefined : kind;
  }
  if (edit.matchName !== undefined || edit.matchAmountCents !== undefined) {
    const matchName = edit.matchName ?? before.matchName;
    const matchAmountCents = edit.matchAmountCents !== undefined ? edit.matchAmountCents : before.matchAmountCents;
    // Compared the same way the matcher looks up a rule (findNameVendor / findAmountVendor).
    const taken =
      matchAmountCents === null
        ? findNameVendor(db, householdId, matchName)
        : findAmountVendor(db, householdId, matchName, matchAmountCents);
    if (taken && taken.id !== id) {
      throw new AppError('vendor_rule_taken', `Vendor rule ${matchName} / ${matchAmountCents} already taken`);
    }
  }

  let linesUpdated = 0;
  let linesSkipped = 0;
  db.transaction((tx) => {
    updateVendor(tx, householdId, id, {
      nickname: edit.nickname,
      defaultCategoryId: edit.defaultCategoryId,
      defaultKind,
      matchName: edit.matchName,
      matchAmountCents: edit.matchAmountCents,
      confirmed: true,
      source: 'user',
    });
    if (
      edit.applyToLines &&
      edit.defaultCategoryId !== undefined &&
      edit.defaultCategoryId !== before.defaultCategoryId
    ) {
      // An Entrada seller leaves imported lines where money left as they were (ADR-0013).
      ({ moved: linesUpdated, skipped: linesSkipped } = recategorizeVendorLines(
        tx,
        householdId,
        id,
        before.defaultCategoryId,
        edit.defaultCategoryId,
        defaultKind !== undefined ? defaultKind : before.defaultKind,
      ));
      if (edit.defaultCategoryId !== null) {
        const { bucket } = facts.get(edit.defaultCategoryId)!;
        alignKindsToCategory(tx, householdId, edit.defaultCategoryId, bucket, id);
      }
    }
  });

  const vendor = listVendorSummaries(db, householdId).find((summary) => summary.id === id)!;
  return { vendor, linesUpdated, linesSkipped };
}
