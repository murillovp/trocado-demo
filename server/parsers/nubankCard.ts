import { parseIsoDate } from '../../shared/dates';
import { parseBrazilianAmount } from '../../shared/money';
import { firstLine, readCsvRows } from './csv';
import { makeLine, periodOf, readRow, type Parser } from './types';

const HEADER = 'date,title,amount';
const PAYMENT = 'Pagamento recebido';
const INSTALLMENT = /^(.*) - Parcela (\d+)\/(\d+)$/;

export const nubankCardParser: Parser = {
  format: 'nubank_card_csv',
  bank: 'nubank',
  accountType: 'card',

  async canRead(bytes) {
    return firstLine(bytes) === HEADER;
  },

  async parse(bytes) {
    const rows = readCsvRows(bytes).slice(1);
    const lines = rows.map((row, index) => {
      const sourceLine = index + 2;
      return readRow('nubank_card_csv', sourceLine, () => {
        const [date, title, amount] = row;
        if (!date || !title || !amount) {
          throw new Error('expected three columns');
        }
        // The card export writes a purchase as a positive charge. Trocado stores
        // money leaving as negative on every account, so the sign flips here.
        const amountCents = -parseBrazilianAmount(amount);
        const isPayment = title === PAYMENT;
        const isFee = title.startsWith('IOF de');
        const slice = INSTALLMENT.exec(title);
        const installment = slice
          ? { number: Number(slice[2]), total: Number(slice[3]), description: slice[1]!.trim() }
          : null;

        return makeLine({
          date: parseIsoDate(date),
          amountCents,
          sourceLine,
          rawDescription: title,
          vendorName: isFee
            ? 'IOF'
            : (installment?.description ?? title.replace(/^Estorno de /i, '').trim()),
          transferCandidate: isPayment,
          isRefund: amountCents > 0 && !isPayment,
          categoryKey: isFee ? 'taxes_fees' : null,
          installment,
        });
      });
    });

    return { lines, skipped: [], ...periodOf(lines) };
  },
};
