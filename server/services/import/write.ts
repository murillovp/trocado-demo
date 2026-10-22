import type { Db } from '../../db/client';
import { insertImportRows } from '../../db/importRows';
import { insertImport, insertImportImages } from '../../db/imports';
import { insertPlans } from '../../db/installmentPlans';
import { insertTransactions, pairTransfers } from '../../db/transactions';
import { createVendor } from '../../db/vendors';
import type { ImportPlan } from './plan';

/**
 * Step 4 of an import: one database transaction that inserts the plan exactly
 * as decided. It makes no choice and looks nothing up; either every row is
 * stored or none is. Order matters only for the foreign keys: the import and
 * the sellers come before the lines that point at them.
 */
export function writeImport(db: Db, plan: ImportPlan): void {
  const { householdId, accountId } = plan;
  db.transaction((tx) => {
    insertImport(tx, plan.importRow);
    insertImportImages(tx, plan.images);
    for (const vendor of plan.vendors) createVendor(tx, householdId, vendor);
    insertPlans(tx, householdId, accountId, plan.installmentPlans);
    insertTransactions(tx, plan.transactions);
    pairTransfers(tx, householdId, plan.pairs);
    insertImportRows(tx, plan.importRows);
  });
}
