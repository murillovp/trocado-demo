import { createHash } from 'node:crypto';
import type { ScreenshotRow } from './screenshots';

/** A read stays reusable for this long. */
const MAX_AGE_MS = 60 * 60 * 1000;

/** The oldest read is dropped past this many. */
const MAX_ENTRIES = 200;

type Entry = { rows: ScreenshotRow[]; readAt: number };

// Module level on purpose: the app builds a new reader for every request,
// so a cache inside the reader would be empty at the next import.
const entries = new Map<string, Entry>();

function keyFor(bytes: Uint8Array, model: string): string {
  return `${createHash('sha256').update(bytes).digest('hex')}:${model}`;
}

/** The rows read from this image by this model in the last hour, or null. */
export function getCachedScreenshotRows(bytes: Uint8Array, model: string): ScreenshotRow[] | null {
  const key = keyFor(bytes, model);
  const entry = entries.get(key);
  if (!entry) return null;
  if (Date.now() - entry.readAt >= MAX_AGE_MS) {
    entries.delete(key);
    return null;
  }

  return entry.rows.map((row) => ({ ...row }));
}

/** Remembers a successful read. Never call it with an error. */
export function cacheScreenshotRows(bytes: Uint8Array, model: string, rows: ScreenshotRow[]): void {
  const key = keyFor(bytes, model);
  entries.delete(key);
  entries.set(key, { rows: rows.map((row) => ({ ...row })), readAt: Date.now() });

  while (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next();
    if (oldest.done) return;
    entries.delete(oldest.value);
  }
}

/** Empties the cache. Tests call it so one test's reads do not reach the next. */
export function clearScreenshotCache(): void {
  entries.clear();
}
