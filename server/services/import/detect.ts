import type { FileDetection } from '../../../shared/contract/imports';
import { listAccounts } from '../../db/accounts';
import type { DbExecutor } from '../../db/client';
import { detectParser } from '../../parsers/registry';
import { isScreenshot } from '../../parsers/swileScreenshots';

export type { FileDetection };

/**
 * Recognises a file and lists the accounts that can take it, before anything
 * is read or saved. The Importar screen proposes the first account and lets
 * the user pick another from the list (plan 4, decision 13). A screenshot is
 * recognised by its bytes, never sent to the AI just to detect it.
 */
export async function detectFileAccounts(db: DbExecutor, householdId: string, bytes: Uint8Array): Promise<FileDetection> {
  if (isScreenshot(bytes)) {
    const accountIds = listAccounts(db, householdId)
      .filter((account) => account.bank === 'swile' && account.type === 'benefit')
      .map((account) => account.id);
    return { format: 'swile_screenshots', accountIds };
  }

  const parser = await detectParser(bytes);
  const accountIds = listAccounts(db, householdId)
    .filter((account) => account.bank === parser.bank && account.type === parser.accountType)
    .map((account) => account.id);
  return { format: parser.format, accountIds };
}
