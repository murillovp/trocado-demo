import { AppError } from '../../../shared/errors';
import type { CategoryAppliesTo, ImportFormat } from '../../../shared/types';
import type { VendorQuestion } from '../../ai/types';
import type { AccountRow } from '../../db/accounts';
import type { ParsedFile } from '../../parsers/types';
import { classifyLine, type ClassifyContext, type Decision } from './classify';
import { assignDedupeKeys, dropKnownLines, findRepeatedReference, type KeyedLine } from './dedupe';
import type { ImportSnapshot } from './snapshot';
import { questionsFor } from './suggest';
import { matchTransferPairs, type TransferPair } from './transferPairs';

/**
 * Step 1 of an import: from the parsed lines and a snapshot of what the
 * database holds, find out which lines are new, which the account already has,
 * which pair as transfers, and what the rules alone decide for each new line.
 * Pure: no database, no network.
 */

export type StagedLine = KeyedLine & { id: string };
export type KnownLine = KeyedLine & { existingTransactionId: string };

export type Prepared = {
  /** The lines the account does not have yet, each with its new id. */
  staged: StagedLine[];
  /** Lines the account already holds, with the line that holds each. */
  duplicates: KnownLine[];
  droppedCount: number;
  pairs: TransferPair[];
  /** The rules' first decision for each staged line, by line id. */
  decisions: Map<string, Decision>;
  /** The sellers the rules could not decide, to put to the AI. */
  questions: VendorQuestion[];
};

export type PrepareInput = {
  account: Pick<AccountRow, 'id' | 'type'>;
  format: ImportFormat;
  parsed: Pick<ParsedFile, 'lines'>;
};

export function prepareImport(input: PrepareInput, snapshot: ImportSnapshot, newId: () => string): Prepared {
  const { account, format, parsed } = input;

  // Checked before anything is stored, so a damaged file leaves nothing behind.
  const repeated = findRepeatedReference(parsed.lines);
  if (repeated) {
    throw new AppError('file_repeats_line', `${format} repeats the bank id ${repeated.bankReference}`, {
      lineNumber: repeated.sourceLine,
    });
  }

  const keyed = assignDedupeKeys(account.id, parsed.lines);
  const { fresh, duplicates, droppedCount } = dropKnownLines(keyed, snapshot.knownDedupeKeys);
  const staged: StagedLine[] = fresh.map((line) => ({ ...line, id: newId() }));

  const pairs = matchTransferPairs(
    staged
      .filter((line) => line.transferCandidate)
      .map((line) => ({ id: line.id, accountId: account.id, date: line.date, amountCents: line.amountCents })),
    snapshot.openTransferCandidates,
  );

  const decisions = decideByRules(staged, pairs, account, snapshot);
  return { staged, duplicates, droppedCount, pairs, decisions, questions: questionsOf(staged, decisions) };
}

function decideByRules(
  staged: readonly StagedLine[],
  pairs: readonly TransferPair[],
  account: Pick<AccountRow, 'type'>,
  snapshot: ImportSnapshot,
): Map<string, Decision> {
  const context: ClassifyContext = {
    pairedIds: new Set(pairs.flatMap((pair) => [pair.firstId, pair.secondId])),
    rules: snapshot.vendorRules,
    otherPeopleNames: snapshot.otherPeopleNames,
    categoryIdsByKey: snapshot.categoryIdsByKey,
    categoryAppliesTo: new Map(
      [...snapshot.categoryFacts].map(([id, facts]): [string, CategoryAppliesTo] => [id, facts.appliesTo]),
    ),
    accountType: account.type,
  };
  return new Map(staged.map((line): [string, Decision] => [line.id, classifyLine(line, context)]));
}

function questionsOf(staged: readonly StagedLine[], decisions: ReadonlyMap<string, Decision>): VendorQuestion[] {
  return questionsFor(
    staged.flatMap((line) => {
      const decision = decisions.get(line.id)!;
      if (!decision.askAi) return [];
      const { kind } = decision;
      // `askAi` decisions always carry `kindFromSign`'s result (expense or
      // income, never null or transfer); this narrows without a cast.
      return kind === 'expense' || kind === 'income' ? [{ vendorName: line.vendorName, kind }] : [];
    }),
  );
}
