import { createHash } from 'node:crypto';
import type { ParsedLine } from '../../parsers/types';

export type KeyedLine = ParsedLine & { dedupeKey: string };

/**
 * Gives each line a key that comes out the same every time that line is
 * imported. Nubank checking has its own line id. Other formats get a hash of
 * account, date, description and amount, plus the line's position among
 * identical lines that day, so two R$ 8,00 coffees stay two lines and a later
 * export that adds a different line the same day does not shift the keys.
 */
export function assignDedupeKeys(accountId: string, lines: ParsedLine[]): KeyedLine[] {
  const seen = new Map<string, number>();

  return lines.map((line) => {
    if (line.bankReference) {
      return { ...line, dedupeKey: `ref:${line.bankReference}` };
    }
    const identity = [line.date, line.rawDescription, line.amountCents].join('|');
    const position = seen.get(identity) ?? 0;
    seen.set(identity, position + 1);
    const hash = createHash('sha256').update([accountId, identity, position].join('|')).digest('hex');
    return { ...line, dedupeKey: `hash:${hash}` };
  });
}

/**
 * The second line in a file that carries a bank id an earlier line already
 * carried, or null. The bank's id is unique per line, so a repeat means the
 * file is damaged, and importing it would collide on the account's unique key.
 */
export function findRepeatedReference(lines: ParsedLine[]): ParsedLine | null {
  const seen = new Set<string>();
  for (const line of lines) {
    if (!line.bankReference) continue;
    if (seen.has(line.bankReference)) return line;
    seen.add(line.bankReference);
  }
  return null;
}

/** Splits lines into fresh ones and ones the account already holds, keeping which earlier line each repeats. */
export function dropKnownLines(
  lines: KeyedLine[],
  known: Map<string, string>,
): {
  fresh: KeyedLine[];
  duplicates: (KeyedLine & { existingTransactionId: string })[];
  droppedCount: number;
} {
  const fresh: KeyedLine[] = [];
  const duplicates: (KeyedLine & { existingTransactionId: string })[] = [];
  for (const line of lines) {
    const existingTransactionId = known.get(line.dedupeKey);
    if (existingTransactionId) duplicates.push({ ...line, existingTransactionId });
    else fresh.push(line);
  }
  return { fresh, duplicates, droppedCount: duplicates.length };
}
