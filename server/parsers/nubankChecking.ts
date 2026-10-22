import { parseBrDate } from '../../shared/dates';
import { parseDecimalAmount } from '../../shared/money';
import { isCompanyPix } from '../../shared/pix';
import { firstLine, readCsvRows } from './csv';
import { makeLine, periodOf, readRow, type Parser } from './types';

const HEADER = 'Data,Valor,Identificador,Descrição';
const PIX_PREFIXES = ['Transferência enviada pelo Pix', 'Transferência recebida pelo Pix'];
const TRANSFER_PREFIXES = [...PIX_PREFIXES, 'Pagamento de fatura'];

export const nubankCheckingParser: Parser = {
  format: 'nubank_checking_csv',
  bank: 'nubank',
  accountType: 'checking',

  async canRead(bytes) {
    return firstLine(bytes) === HEADER;
  },

  async parse(bytes) {
    const rows = readCsvRows(bytes).slice(1);
    const lines = rows.map((row, index) => {
      // +2: line 1 is the header, and people count lines from 1.
      const sourceLine = index + 2;
      return readRow('nubank_checking_csv', sourceLine, () => {
        const [date, amount, id, description] = row;
        if (!date || !amount || !id || !description) {
          throw new Error('expected four columns');
        }
        const vendorName = vendorNameOf(description);
        // A refund of a Pix reads as a Pix, so a person's name stays private
        // (ADR-0011). It is not a transfer candidate, because a refund never pairs.
        const isRefund = /^Estorno/i.test(description);
        const unrefunded = description.replace(/^Estorno - /i, '');
        const isPix = PIX_PREFIXES.some((prefix) => unrefunded.startsWith(prefix));

        return makeLine({
          date: parseBrDate(date),
          amountCents: parseDecimalAmount(amount),
          sourceLine,
          rawDescription: description,
          vendorName,
          bankReference: id,
          transferCandidate: TRANSFER_PREFIXES.some((prefix) => description.startsWith(prefix)),
          pixCounterparty: isPix ? vendorName : null,
          pixCompany: isPix && isCompanyPix(description),
          isRefund,
        });
      });
    });

    return { lines, skipped: [], ...periodOf(lines) };
  },
};

/**
 * "Compra no débito - PADARIA SOL - extra" gives "PADARIA SOL". A Pix line
 * gives the counterparty's name. Text with no " - " is used whole.
 */
export function vendorNameOf(description: string): string {
  const parts = description.replace(/^Estorno - /i, '').split(' - ');
  return (parts.length > 1 ? parts[1]! : parts[0]!).trim();
}
