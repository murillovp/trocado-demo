import type { ImportHistoryEntry } from '../../../shared/contract/imports';
import { listAccounts } from '../../db/accounts';
import type { DbExecutor } from '../../db/client';
import { countRowsByImport } from '../../db/importRows';
import { listImports } from '../../db/imports';
import { toImportRecord } from '../answers';

export type { ImportHistoryEntry };

/** The Importar screen's list of past imports, newest first, with what happened to each file's rows. */
export function listImportHistory(db: DbExecutor, householdId: string): ImportHistoryEntry[] {
  const labels = new Map(listAccounts(db, householdId).map((account): [string, string] => [account.id, account.label]));
  const counts = countRowsByImport(db, householdId);

  return listImports(db, householdId).map((entry) => {
    const rows = counts.get(entry.id) ?? { imported: 0, duplicate: 0, ignored: 0 };
    return {
      ...toImportRecord(entry),
      accountLabel: labels.get(entry.accountId) ?? '',
      counts: { total: rows.imported + rows.duplicate + rows.ignored, ...rows },
    };
  });
}
