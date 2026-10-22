import { AppError } from '../../shared/errors';
import { parseBrDate } from '../../shared/dates';
import { parseBrazilianAmount } from '../../shared/money';
import { extractPdfRows, type PdfRow } from './pdfText';
import { makeLine, periodOf, readRow, type ParsedLine, type Parser, type SkippedRow } from './types';

const FORMAT = 'itau_checking_pdf';
const DATE = /^\d{2}\/\d{2}\/\d{4}$/;
// Itaú always prints two decimals after a comma.
const AMOUNT = /^-?[\d.]+,\d{2}$/;
// Any cell in the amount column made of digits, dots and commas is meant as an
// amount. One that fails AMOUNT stops the import, naming the value.
const AMOUNT_LIKE = /^-?\s*[\d.,]+$/;
const EMBEDDED_DATE = /(\d{2})\/(\d{2})$/;
const REFUND = /^(ESTORNO|AJUSTE)\b|-EST\b/;
const MAX_VALUE_LENGTH = 40;
const PERIOD = /(\d{2}\/\d{2}\/\d{4})\s+até\s+(\d{2}\/\d{2}\/\d{4})/;

/** Where the "valor" and "saldo" columns start, read from the header row. */
type Columns = { valorX: number; saldoX: number };

export const itauCheckingParser: Parser = {
  format: FORMAT,
  bank: 'itau',
  accountType: 'checking',

  async canRead(bytes) {
    if (!startsWithPdfSignature(bytes)) return false;
    try {
      return findColumns(await extractPdfRows(bytes)) !== null;
    } catch {
      return false;
    }
  },

  async parse(bytes) {
    const rows = await extractPdfRows(bytes);
    const columns = findColumns(rows);
    if (!columns) {
      throw new AppError('file_unreadable', 'Itaú header row not found', { format: FORMAT, lineNumber: 1 });
    }

    const lines: ParsedLine[] = [];
    const skipped: SkippedRow[] = [];
    let period: { start: string; end: string } | null = null;
    // Only dated rows are statement rows; the user counts them from 1.
    let sourceLine = 0;

    for (const row of rows) {
      const text = row.cells.map((cell) => cell.text).join(' ');
      const stated = PERIOD.exec(text);
      if (stated && !period) {
        period = { start: parseBrDate(stated[1]!), end: parseBrDate(stated[2]!) };
      }
      if (!DATE.test(row.cells[0]?.text ?? '')) continue;

      sourceLine += 1;
      const lineNumber = sourceLine;
      const result = readRow(FORMAT, lineNumber, () => readLineRow(row, columns, lineNumber));
      if ('reason' in result) skipped.push(result);
      else lines.push(result);
    }

    const fallback = periodOf(lines);
    const found = period as { start: string; end: string } | null;
    return {
      lines,
      skipped,
      periodStart: found?.start ?? fallback.periodStart,
      periodEnd: found?.end ?? fallback.periodEnd,
    };
  },
};

/**
 * "29/08" posted on 2026-08-31 is 2026-08-29. A purchase cannot come after its
 * posting, so "30/12" posted on 2027-01-02 belongs to the previous year.
 */
export function purchaseDate(day: string, month: string, postingDate: string): string {
  const year = Number(postingDate.slice(0, 4));
  const sameYear = parseBrDate(`${day}/${month}/${year}`);
  return sameYear > postingDate ? parseBrDate(`${day}/${month}/${year - 1}`) : sameYear;
}

function startsWithPdfSignature(bytes: Uint8Array): boolean {
  return new TextDecoder().decode(bytes.subarray(0, 5)) === '%PDF-';
}

function findColumns(rows: PdfRow[]): Columns | null {
  for (const row of rows) {
    const texts = row.cells.map((cell) => cell.text.toLowerCase());
    const valor = row.cells.find((cell) => cell.text.toLowerCase().startsWith('valor'));
    const saldo = row.cells.find((cell) => cell.text.toLowerCase().startsWith('saldo ('));
    if (texts.includes('data') && texts.includes('lançamentos') && valor && saldo) {
      return { valorX: valor.x, saldoX: saldo.x };
    }
  }
  return null;
}

/** Reads one dated row: a line of money, or a balance row reported as skipped. */
function readLineRow(row: PdfRow, columns: Columns, sourceLine: number): ParsedLine | SkippedRow {
  const [dateCell, ...rest] = row.cells;
  const postingDate = parseBrDate(dateCell!.text);
  // Amounts are right-aligned under "valor", so they start a little to its right;
  // descriptions start far to its left.
  const descriptionEdge = columns.valorX - 10;
  const description = rest
    .filter((cell) => cell.x < descriptionEdge)
    .map((cell) => cell.text)
    .join(' ')
    .trim();

  if (/^SALDO\b/.test(description)) {
    return { sourceLine, date: postingDate, text: description, reason: 'balance_row', imageIndex: null };
  }

  const amountCell = rest.find(
    (cell) => cell.x >= descriptionEdge && cell.x < columns.saldoX && AMOUNT_LIKE.test(cell.text),
  );
  if (!amountCell) {
    throw new Error(`no amount in "${description}"`);
  }

  if (!AMOUNT.test(amountCell.text)) {
    throw new AppError('amount_unreadable', `Cannot read amount: ${amountCell.text}`, {
      value: amountCell.text.slice(0, MAX_VALUE_LENGTH),
    });
  }

  const embedded = EMBEDDED_DATE.exec(description);
  const date = embedded ? purchaseDate(embedded[1]!, embedded[2]!, postingDate) : postingDate;
  const withoutDate = embedded ? description.slice(0, embedded.index).trim() : description;
  const isPix = /^PIX\b/.test(withoutDate);
  // Itaú prints names cut short ("PIX TRANSF Marina Fic"), so rules match the short form.
  const vendorName = isPix
    ? withoutDate.replace(/^PIX\s+\S+\s*/, '').trim()
    : withoutDate.replace(/^(ESTORNO|AJUSTE)\s+/, '').replace(/\s*-EST\b.*$/, '').trim();

  return makeLine({
    date,
    amountCents: parseBrazilianAmount(amountCell.text),
    sourceLine,
    rawDescription: description,
    vendorName,
    transferCandidate: isPix,
    pixCounterparty: isPix ? vendorName : null,
    isRefund: REFUND.test(description),
    categoryKey: /^REMUNERACAO\/SALARIO/.test(withoutDate) ? 'salary' : null,
  });
}
