import { AppError } from '../../../shared/errors';
import type { ImportFormat } from '../../../shared/types';
import type { ScreenshotReader, ScreenshotRow } from '../../ai/screenshots';
import { type AccountRow, requireAccount } from '../../db/accounts';
import type { Db } from '../../db/client';
import { detectParser } from '../../parsers/registry';
import { isScreenshot, readSwileRows } from '../../parsers/swileScreenshots';
import type { ParsedFile, ParsedLine } from '../../parsers/types';
import type { OnStep } from './progress';

/**
 * The first step of an import: turning an upload into parsed lines. A bank
 * file and a set of Swile screenshots each have a reader, and both hand the
 * rest of the import the same `ReadImport`, so the four steps after reading
 * are written once (ADR-0016).
 */

export type ImportImage = { position: number; fileName: string; mimeType: string; bytes: Buffer };

/** An upload read into lines, plus what only some formats carry. */
export type ReadImport = {
  account: AccountRow;
  format: ImportFormat;
  fileName: string;
  fileBytes: Buffer;
  parsed: ParsedFile;
  /** Rows seen again in a later screenshot of the same import (Swile only). */
  repeats: (ParsedLine & { repeatOfKey: string })[];
  /** The import's screenshots, in order (Swile only; empty for a bank file). */
  images: ImportImage[];
};

/** A reader runs on its own and reports its progress through `onStep`. */
export type ImportReader = () => Promise<ReadImport>;

export type BankFileInput = { householdId: string; accountId: string; fileName: string; bytes: Uint8Array };
export type ScreenshotInput = {
  householdId: string;
  accountId: string;
  images: { fileName: string; mimeType: string; bytes: Uint8Array }[];
};

const MIN_SCREENSHOTS = 1;
const MAX_SCREENSHOTS = 20;

export function bankFileReader(deps: { db: Db; onStep?: OnStep }, input: BankFileInput): ImportReader {
  return async () => {
    const account = requireAccount(deps.db, input.householdId, input.accountId);

    deps.onStep?.({ step: 'reading' });
    const parser = await detectParser(input.bytes);
    if (parser.bank !== account.bank || parser.accountType !== account.type) {
      throw new AppError('format_account_mismatch', `${parser.format} does not belong in ${account.label}`);
    }
    const parsed = await parser.parse(input.bytes);

    return {
      account,
      format: parser.format,
      fileName: input.fileName,
      // The bank file is read and dropped, never stored (ADR-0014).
      fileBytes: Buffer.alloc(0),
      parsed,
      repeats: [],
      images: [],
    };
  };
}

export function screenshotReader(
  deps: { db: Db; reader: ScreenshotReader | null; onStep?: OnStep },
  input: ScreenshotInput,
): ImportReader {
  return async () => {
    const { db, reader } = deps;
    const { images } = input;

    if (!reader) {
      throw new AppError('ai_not_configured', 'No screenshot reader configured for this household');
    }

    const account = requireAccount(db, input.householdId, input.accountId);
    if (account.bank !== 'swile' || account.type !== 'benefit') {
      throw new AppError('format_account_mismatch', `swile_screenshots does not belong in ${account.label}`);
    }
    checkScreenshots(images);

    const rows = await readEachScreenshot(reader, images, deps.onStep);
    const read = readSwileRows(rows);

    return {
      account,
      format: 'swile_screenshots',
      fileName: images.length === 1 ? images[0]!.fileName : `${images.length} capturas`,
      fileBytes: Buffer.alloc(0),
      parsed: read,
      repeats: read.repeats,
      images: images.map((image, position) => ({
        position,
        fileName: image.fileName,
        mimeType: image.mimeType,
        bytes: Buffer.from(image.bytes),
      })),
    };
  };
}

function checkScreenshots(images: ScreenshotInput['images']): void {
  if (images.length < MIN_SCREENSHOTS || images.length > MAX_SCREENSHOTS) {
    throw new AppError('invalid_request', `Send between ${MIN_SCREENSHOTS} and ${MAX_SCREENSHOTS} screenshots`);
  }
  images.forEach((image, position) => {
    if (!isScreenshot(image.bytes)) {
      throw new AppError('invalid_request', `${image.fileName} is not a PNG or JPEG image`, {
        fileName: image.fileName,
        position,
      });
    }
  });
}

async function readEachScreenshot(
  reader: ScreenshotReader,
  images: ScreenshotInput['images'],
  onStep: OnStep | undefined,
): Promise<ScreenshotRow[][]> {
  const rows: ScreenshotRow[][] = [];
  for (let position = 0; position < images.length; position++) {
    const image = images[position]!;
    onStep?.({ step: 'reading_image', index: position + 1, total: images.length });
    try {
      rows.push(await reader.readSwileScreenshot({ bytes: image.bytes, mimeType: image.mimeType }));
    } catch (error) {
      throw nameTheScreenshot(error, image.fileName, position);
    }
  }
  return rows;
}

/** Every failure while reading a screenshot says which screenshot it was. */
function nameTheScreenshot(error: unknown, fileName: string, position: number): AppError {
  if (error instanceof AppError) {
    return new AppError(error.code, error.message, {
      ...(typeof error.details === 'object' && error.details !== null ? error.details : {}),
      fileName,
      position,
    });
  }
  // Anything else (a network failure the reader itself did not wrap) still
  // needs to name the screenshot, so it is never silently unattributed.
  const detail = error instanceof Error ? error.message : String(error);
  return new AppError('ai_unreachable', `Screenshot reader failed: ${detail}`, {
    fileName,
    position,
    reason: 'provider',
    status: null,
    providerMessage: null,
  });
}
