import type { CategoryKey } from '../../../shared/categoryKeys';
import type { AccountRow } from '../../db/accounts';
import { listCategories } from '../../db/categories';
import type { Db } from '../../db/client';
import { listPlanSummaries } from '../../db/installmentPlans';
import { listPeople } from '../../db/people';
import { knownDedupeKeys, openTransferCandidates, refundCandidates } from '../../db/transactions';
import { listVendors } from '../../db/vendors';
import type { ParsedLine } from '../../parsers/types';
import { type CategoryFacts, categoryFactsOf } from '../lines/kindRule';
import { categoryIdsByKeyOf } from './categoryKeys';
import type { PlanSummary } from './installments';
import { type Purchase, refundWindows } from './refunds';
import type { PairCandidate } from './transferPairs';
import type { VendorRule } from './vendorMatch';

/**
 * Everything the database already holds that an import needs to decide, read
 * once before the first step. The steps after it never touch the database
 * except the write at the end (ADR-0016). Imports run one at a time
 * (`runSerially`), so no other import changes this while the AI answers. A
 * hand edit made in that time (a category, a vendor, a line) is not seen by
 * refund matching or by dedupe.
 */
export type ImportSnapshot = {
  /** Dedupe key to the id of the line already holding it, for the account. */
  knownDedupeKeys: Map<string, string>;
  /** Earlier transfer-like lines still waiting for a partner, in the whole household. */
  openTransferCandidates: PairCandidate[];
  /** The id of each keyed category that is active. */
  categoryIdsByKey: Map<CategoryKey, string>;
  /** The id of each active category by its current name, for the AI's answers. */
  categoryIdsByName: Map<string, string>;
  /** Direction and group of every category, archived ones included. */
  categoryFacts: Map<string, CategoryFacts>;
  vendorRules: VendorRule[];
  /** Household people other than the account's owner. */
  otherPeopleNames: string[];
  /** The account's installment plans with the slice numbers already imported. */
  plans: PlanSummary[];
  /**
   * The account's earlier expense lines a refund in this file could return
   * money for: for each refund amount, the lines of that amount dated from
   * 7 days before the earliest such refund to the date of the latest.
   */
  refundCandidates: Purchase[];
};

export function readSnapshot(
  db: Db,
  householdId: string,
  account: AccountRow,
  lines: readonly ParsedLine[],
): ImportSnapshot {
  // Includes archived categories: a vendor rule saved earlier may still point
  // at one, and its category should be dropped, not kept as a false fit.
  const allCategories = listCategories(db, householdId, { includeArchived: true });
  const activeCategories = allCategories.filter((category) => !category.archived);

  return {
    knownDedupeKeys: knownDedupeKeys(db, account.id),
    openTransferCandidates: openTransferCandidates(db, householdId),
    categoryIdsByKey: categoryIdsByKeyOf(activeCategories),
    categoryIdsByName: new Map(activeCategories.map((category): [string, string] => [category.name, category.id])),
    categoryFacts: categoryFactsOf(allCategories),
    vendorRules: listVendors(db, householdId),
    otherPeopleNames: listPeople(db, householdId)
      .filter((person) => person.id !== account.personId)
      .map((person) => person.name),
    plans: listPlanSummaries(db, account.id),
    refundCandidates: refundWindows(lines).flatMap((window) =>
      refundCandidates(db, account.id, window.amountCents, window.start, window.end),
    ),
  };
}
