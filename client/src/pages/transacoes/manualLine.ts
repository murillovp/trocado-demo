import type { ManualLineInput } from '@/api/types';
import { AMOUNT_TOO_BIG, currentMonth, overAmountLimit, parseReais, todayIso } from '@/lib/format';

export type ManualLineForm = {
  accountId: string;
  date: string;
  amount: string;
  kind: 'expense' | 'income' | 'savings';
  description: string;
  categoryId: string;
  savingsLabel: string;
  note: string;
};

export type ManualLineErrors = Partial<Record<'accountId' | 'date' | 'amount' | 'description', string>>;

/** Checks the form and builds the API's input. The amount is typed positive; the kind decides the sign. */
export function buildManualLine(form: ManualLineForm): { input: ManualLineInput } | { errors: ManualLineErrors } {
  const errors: ManualLineErrors = {};
  const amountCents = parseReais(form.amount);
  if (!form.accountId) errors.accountId = 'Escolha a conta.';
  if (!form.date) errors.date = 'Escolha a data.';
  if (amountCents === null || amountCents <= 0) errors.amount = 'Escreva um valor maior que zero, como 45,90.';
  else if (overAmountLimit(amountCents)) errors.amount = AMOUNT_TOO_BIG;
  const description = form.description.trim();
  if (!description) errors.description = 'Escreva o que foi, como "Feira" ou "Aluguel".';
  if (Object.keys(errors).length > 0 || amountCents === null) return { errors };

  const label = form.savingsLabel.trim();
  const note = form.note.trim();
  return {
    input: {
      accountId: form.accountId,
      date: form.date,
      amountCents,
      kind: form.kind,
      description,
      categoryId: form.categoryId || null,
      savingsLabel: form.kind === 'savings' && label ? label : null,
      note: note || null,
    },
  };
}

/** Today when the month on screen is the current one, else that month's first day. */
export function defaultDate(month: string, now: Date = new Date()): string {
  return month === currentMonth(now) ? todayIso(now) : `${month}-01`;
}
