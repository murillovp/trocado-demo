import { parse } from 'csv-parse/sync';
import { AppError } from '../../shared/errors';

/** Decodes a file as UTF-8 and drops the byte-order mark some exports start with. */
export function decodeText(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes).replace(/^﻿/, '');
}

/** The file's first line, trimmed. A CSV parser recognises its format by this header. */
export function firstLine(bytes: Uint8Array): string {
  const start = decodeText(bytes.subarray(0, 1024));
  return (start.split(/\r?\n/)[0] ?? '').trim();
}

/**
 * Every row as an array of trimmed cells, header included. Rows may have the
 * wrong number of cells; the parser checks each row and reports its line number.
 * A file the CSV library cannot split at all (a quote never closed) stops as
 * `file_unreadable`, so the user sees that message and not a server error.
 */
export function readCsvRows(bytes: Uint8Array): string[][] {
  try {
    return parse(decodeText(bytes), {
      relax_column_count: true,
      skip_empty_lines: true,
      trim: true,
    }) as string[][];
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new AppError('file_unreadable', `CSV cannot be split into rows: ${reason}`);
  }
}
