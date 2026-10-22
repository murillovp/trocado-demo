import { randomUUID } from 'node:crypto';
import { listImportLines } from '../../db/transactions';
import { askAi } from './askAi';
import { decideImport } from './decide';
import { countNeedingReview } from './flags';
import { prepareImport } from './prepare';
import type { ImportReader } from './reader';
import { readSnapshot } from './snapshot';
import type { ImportDeps, ImportSummary } from './types';
import { writeImport } from './write';

/**
 * Runs one import from the reader to the stored rows: read the upload, read
 * the snapshot, prepare, ask the AI, decide, write (ADR-0016). Bank files and
 * Swile screenshots both come through here; only their readers differ.
 * Callers run it through `runSerially`, so no other import changes the
 * snapshot before the write. A hand edit made while the AI answers is not
 * seen by refund matching or by dedupe.
 */
export async function runImport(deps: ImportDeps, householdId: string, read: ImportReader): Promise<ImportSummary> {
  const { db } = deps;
  const newId = deps.newId ?? randomUUID;
  const upload = await read();

  deps.onStep?.({ step: 'checking' });
  const snapshot = readSnapshot(db, householdId, upload.account, upload.parsed.lines);
  const prepared = prepareImport(upload, snapshot, newId);

  const { suggestions, failed: aiFailed, failure: aiFailure } = await askAi(deps, householdId, prepared.questions);

  const plan = decideImport({ householdId, read: upload, prepared, suggestions, snapshot, newId });
  deps.onStep?.({ step: 'saving' });
  writeImport(db, plan);

  const importId = plan.importRow.id;
  return {
    importId,
    format: upload.format,
    ...plan.counts,
    needsReviewCount: countNeedingReview(listImportLines(db, householdId, importId)),
    aiFailed,
    aiFailure,
  };
}
