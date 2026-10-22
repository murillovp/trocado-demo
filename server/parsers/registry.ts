import { AppError } from '../../shared/errors';
import { itauCheckingParser } from './itauChecking';
import { nubankCardParser } from './nubankCard';
import { nubankCheckingParser } from './nubankChecking';
import type { Parser } from './types';

/** Every format Trocado reads. Adding a bank format means adding one parser here. */
export const PARSERS: readonly Parser[] = [nubankCheckingParser, nubankCardParser, itauCheckingParser];

/** Offers the file to each parser in turn. The first one that recognises it wins. */
export async function detectParser(bytes: Uint8Array): Promise<Parser> {
  for (const parser of PARSERS) {
    if (await parser.canRead(bytes)) return parser;
  }
  throw new AppError('format_unknown', 'No parser recognised this file');
}
