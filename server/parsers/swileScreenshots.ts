import { isRealDate } from '../../shared/dates';
import type { ScreenshotRow } from '../ai/screenshots';
import { makeLine, periodOf, type ParsedFile, type ParsedLine } from './types';

export type SwileRead = ParsedFile & {
  /** Rows seen again in a later screenshot of the same import. Each points at the line it repeats. */
  repeats: (ParsedLine & { repeatOfKey: string })[];
};

const ESTORNO = /^estorno$/i;

/** Bank reference that identifies a Swile row across screenshots and imports. */
export function swileReference(row: { date: string; time: string; description: string; amountCents: number }): string {
  return `swile:${row.date}T${row.time}|${row.description.trim()}|${row.amountCents}`;
}

/** Builds the line a complete row would become, whether it is new or a repeat. */
function buildLine(
  row: { description: string; date: string; time: string; amountCents: number },
  reference: string,
  sourceLine: number,
  imageIndex: number,
): ParsedLine {
  const shared = {
    date: row.date,
    time: row.time,
    amountCents: row.amountCents,
    rawDescription: row.description,
    sourceLine,
    imageIndex,
    bankReference: reference,
  };

  if (ESTORNO.test(row.description.trim())) {
    return makeLine({ ...shared, vendorName: '', isRefund: true, refundOfEarlier: true });
  }
  if (row.amountCents > 0) {
    return makeLine({ ...shared, vendorName: row.description, categoryKey: 'bonus' });
  }
  return makeLine({ ...shared, vendorName: row.description });
}

/** Merges the rows of every screenshot, in the order sent, into one statement. */
export function readSwileRows(images: ScreenshotRow[][]): SwileRead {
  const lines: ParsedLine[] = [];
  const skipped: ParsedFile['skipped'] = [];
  const repeats: (ParsedLine & { repeatOfKey: string })[] = [];
  const seen = new Set<string>();
  let sourceLine = 0;

  images.forEach((rows, imageIndex) => {
    for (const row of rows) {
      sourceLine += 1;

      if (row.date == null || row.time == null || row.amountCents == null) {
        skipped.push({ sourceLine, date: row.date ?? null, text: row.description, reason: 'cut_off', imageIndex });
        continue;
      }

      // The model can misread a digit. A day that is not on the calendar must not become a stored line.
      if (!isRealDate(row.date)) {
        skipped.push({ sourceLine, date: row.date, text: row.description, reason: 'impossible_date', imageIndex });
        continue;
      }

      const complete = { description: row.description, date: row.date, time: row.time, amountCents: row.amountCents };
      const reference = swileReference(complete);
      const line = buildLine(complete, reference, sourceLine, imageIndex);

      if (seen.has(reference)) {
        repeats.push({ ...line, repeatOfKey: `ref:${reference}` });
      } else {
        seen.add(reference);
        lines.push(line);
      }
    }
  });

  return { lines, skipped, repeats, ...periodOf(lines) };
}

/** The image's mime type from its magic bytes, never trusting what the client claims. Null for neither PNG nor JPEG. */
export function mimeTypeOf(bytes: Uint8Array): string | null {
  const isPng = bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (isPng) return 'image/png';
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (isJpeg) return 'image/jpeg';
  return null;
}

/** True for PNG or JPEG bytes (magic numbers). */
export function isScreenshot(bytes: Uint8Array): boolean {
  return mimeTypeOf(bytes) !== null;
}
