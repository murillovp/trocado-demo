import type { ScreenshotReader } from '../../ai/screenshots';
import { bankFileReader, type BankFileInput, screenshotReader, type ScreenshotInput } from './reader';
import { runImport } from './run';
import { runSerially } from './serial';
import type { ImportDeps, ImportSummary } from './types';

export type { ImportDeps, ImportSummary } from './types';
export type { BankFileInput as ImportInput, ScreenshotInput } from './reader';

/**
 * Two uploads reading dedupe keys and open transfer candidates at the same
 * time can each miss the other's lines, or collide on the account's unique
 * dedupe index. `runSerially` runs one import at a time so that never happens.
 */
export function importFile(deps: ImportDeps, input: BankFileInput): Promise<ImportSummary> {
  return runSerially(() => runImport(deps, input.householdId, bankFileReader(deps, input)));
}

/** Reads Swile screenshots and imports them the same way a bank file is imported (task 7). */
export function importScreenshots(
  deps: ImportDeps & { reader: ScreenshotReader | null },
  input: ScreenshotInput,
): Promise<ImportSummary> {
  return runSerially(() => runImport(deps, input.householdId, screenshotReader(deps, input)));
}
