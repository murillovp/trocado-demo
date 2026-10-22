import type { Db } from '../../db/client';
import { listVendorSummaries, requireVendor, updateVendor, type VendorSummary } from '../../db/vendors';

/**
 * Accepts a seller's rule as it stands, on the "Confirmar" button. The rule
 * becomes the user's (`source` is `user`, so the "IA" mark goes) and is reused
 * on the next import without asking the AI (`confirmed`). Nothing else about
 * the seller or its lines changes.
 */
export function acceptVendor(db: Db, householdId: string, id: string): VendorSummary {
  requireVendor(db, householdId, id);
  updateVendor(db, householdId, id, { confirmed: true, source: 'user' });
  return listVendorSummaries(db, householdId).find((summary) => summary.id === id)!;
}

/**
 * Accepts every listed seller as `acceptVendor` does, in one transaction. An id
 * that is not a seller of the household refuses the whole request and accepts
 * nobody. Answers how many sellers changed: one that was already the user's and
 * confirmed does not count, and a repeated id counts once.
 */
export function acceptVendors(db: Db, householdId: string, vendorIds: readonly string[]): { accepted: number } {
  const ids = [...new Set(vendorIds)];
  return db.transaction((tx) => {
    const vendors = ids.map((id) => requireVendor(tx, householdId, id));
    const toAccept = vendors.filter((vendor) => !vendor.confirmed || vendor.source !== 'user');
    for (const vendor of toAccept) updateVendor(tx, householdId, vendor.id, { confirmed: true, source: 'user' });
    return { accepted: toAccept.length };
  });
}
