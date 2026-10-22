import type { CategoryKey } from '../../shared/categoryKeys';
import { AppError } from '../../shared/errors';
import type { AccountType, BankId, ImportFormat, SkipReason } from '../../shared/types';

/** One line of money from a bank file, before any rule has looked at it. */
export type ParsedLine = {
  /** The purchase date, ISO. */
  date: string;
  /** Signed whole centavos. Negative is money leaving the account. */
  amountCents: number;
  /** The bank's text for the line, untouched. */
  rawDescription: string;
  /** The name vendor rules match on: the merchant or Pix counterparty without bank prefixes. */
  vendorName: string;
  /** The row's number as the user counts it in the file. */
  sourceLine: number;
  /** The bank's own id for the line, when the format gives one. */
  bankReference: string | null;
  /** Money that may be moving between the household's own accounts. Only these can pair. */
  transferCandidate: boolean;
  /** The other person's name on a Pix line. Never sent to the AI. */
  pixCounterparty: string | null;
  /** A Pix whose text names a company (a CNPJ). Only these Pix names may reach the AI (ADR-0011). */
  pixCompany: boolean;
  /** Money back from a vendor, counted in that vendor's category. */
  isRefund: boolean;
  /** A category the line's own text decides, by its stable key (`taxes_fees` for IOF). Classification resolves it to the household's category. */
  categoryKey: CategoryKey | null;
  /** Set on "Parcela N/M" slices. `description` is the purchase without the slice suffix. */
  installment: { number: number; total: number; description: string } | null;
  /** "18:56" when the source shows a time (Swile). */
  time: string | null;
  /** Which screenshot the line came from (Swile). */
  imageIndex: number | null;
  /** A Swile "ESTORNO": money back for an earlier purchase whose seller the line does not name. */
  refundOfEarlier: boolean;
};

/** A row the reader saw and passed over because it is not money moving. */
export type SkippedRow = {
  sourceLine: number;
  date: string | null;
  text: string;
  reason: SkipReason;
  /** Which screenshot the row came from (Swile). Null for bank files. */
  imageIndex: number | null;
};

export type ParsedFile = {
  lines: ParsedLine[];
  /** Every row passed over, so the review can account for the whole file. */
  skipped: SkippedRow[];
  periodStart: string | null;
  periodEnd: string | null;
};

/** One reader per bank file format. */
export type Parser = {
  format: ImportFormat;
  bank: BankId;
  accountType: AccountType;
  /** Decides from the file's content, never its name. */
  canRead(bytes: Uint8Array): Promise<boolean>;
  /** Throws AppError('file_unreadable') naming the first line it could not read. */
  parse(bytes: Uint8Array): Promise<ParsedFile>;
};

type RequiredFields = Pick<ParsedLine, 'date' | 'amountCents' | 'rawDescription' | 'vendorName' | 'sourceLine'>;

/** Builds a line with every optional hint switched off unless given. */
export function makeLine(fields: RequiredFields & Partial<ParsedLine>): ParsedLine {
  return {
    bankReference: null,
    transferCandidate: false,
    pixCounterparty: null,
    pixCompany: false,
    isRefund: false,
    categoryKey: null,
    installment: null,
    time: null,
    imageIndex: null,
    refundOfEarlier: false,
    ...fields,
  };
}

/** The first and last date among the lines, used when the file does not state its period. */
export function periodOf(lines: ParsedLine[]): { periodStart: string | null; periodEnd: string | null } {
  if (lines.length === 0) return { periodStart: null, periodEnd: null };
  const dates = lines.map((line) => line.date).sort();
  return { periodStart: dates[0]!, periodEnd: dates[dates.length - 1]! };
}

/**
 * Runs one row's reading and turns any failure into the error the user sees:
 * which format was tried and which line broke. An amount that cannot be read
 * keeps its own error, with the value and the line, and never the bank's line.
 */
export function readRow<T>(format: ImportFormat, lineNumber: number, read: () => T): T {
  try {
    return read();
  } catch (error) {
    if (error instanceof AppError && error.code === 'amount_unreadable') {
      const { value } = error.details as { value: string };
      throw new AppError('amount_unreadable', `${format} line ${lineNumber}: ${error.message}`, { value, lineNumber });
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new AppError('file_unreadable', `${format} line ${lineNumber}: ${reason}`, {
      format,
      lineNumber,
    });
  }
}
