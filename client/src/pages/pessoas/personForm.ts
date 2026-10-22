import { formatCentavos } from '../../../../shared/money';
import type { Person, PersonPatch } from '@/api/types';
import { AMOUNT_TOO_BIG, overAmountLimit, parseReais } from '@/lib/format';

export type PersonForm = { needs: string; wants: string; savings: string; income: string };
export type PersonFormErrors = Partial<Record<keyof PersonForm, string>>;

const PCT_ERROR = 'Use um número inteiro de 0 a 100.';
const INCOME_ERROR = 'Escreva um valor maior que zero, como 8.000,00, ou deixe vazio.';

export function personFormOf(person: Person): PersonForm {
  return {
    needs: String(person.targetNeedsPct),
    wants: String(person.targetWantsPct),
    savings: String(person.targetSavingsPct),
    income: person.referenceIncomeCents === null ? '' : formatCentavos(person.referenceIncomeCents),
  };
}

function readPct(text: string): number | null {
  const value = text.trim();
  if (!/^\d{1,3}$/.test(value)) return null;
  const number = Number(value);
  return number <= 100 ? number : null;
}

/** The targets and income that changed, or why the form cannot be sent. */
export function diffPerson(person: Person, form: PersonForm): { patch: PersonPatch | null } | { errors: PersonFormErrors } {
  const errors: PersonFormErrors = {};
  const needs = readPct(form.needs);
  const wants = readPct(form.wants);
  const savings = readPct(form.savings);
  if (needs === null) errors.needs = PCT_ERROR;
  if (wants === null) errors.wants = PCT_ERROR;
  if (savings === null) errors.savings = PCT_ERROR;

  let income: number | null = null;
  if (form.income.trim()) {
    income = parseReais(form.income);
    if (income === null || income <= 0) errors.income = INCOME_ERROR;
    else if (overAmountLimit(income)) errors.income = AMOUNT_TOO_BIG;
  }
  if (Object.keys(errors).length > 0 || needs === null || wants === null || savings === null) return { errors };

  const patch: PersonPatch = {};
  if (needs !== person.targetNeedsPct) patch.targetNeedsPct = needs;
  if (wants !== person.targetWantsPct) patch.targetWantsPct = wants;
  if (savings !== person.targetSavingsPct) patch.targetSavingsPct = savings;
  if (income !== person.referenceIncomeCents) patch.referenceIncomeCents = income;
  return { patch: Object.keys(patch).length > 0 ? patch : null };
}

/** The three targets added up, or null while one box is not a whole number. */
export function targetsSum(form: PersonForm): number | null {
  const values = [form.needs, form.wants, form.savings].map(readPct);
  return values.every((value) => value !== null) ? values.reduce<number>((sum, value) => sum + (value ?? 0), 0) : null;
}

/** R$ amounts for the three targets from the typed income, or null when income or a percentage cannot be read. */
export function targetAmounts(form: PersonForm): { needs: number | null; wants: number | null; savings: number | null } | null {
  if (!form.income.trim()) return null;
  const income = parseReais(form.income);
  if (income === null || income <= 0) return null;

  return {
    needs: amountFor(income, form.needs),
    wants: amountFor(income, form.wants),
    savings: amountFor(income, form.savings),
  };
}

function amountFor(income: number, text: string): number | null {
  const pct = readPct(text);
  return pct === null ? null : Math.round((income * pct) / 100);
}
