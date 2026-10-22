import { addMonths } from './dates';

/** The largest amount a typed value may hold: R$ 10.000.000,00, in centavos. */
export const MAX_AMOUNT_CENTS = 1_000_000_000;

/** Longest name of a category, an account, a seller's nickname or a savings label. */
export const NAME_MAX_LENGTH = 60;
/** A person's name keeps its older, stricter limit. */
export const PERSON_NAME_MAX_LENGTH = 40;
/** Longest name of a tag. */
export const TAG_NAME_MAX_LENGTH = 40;
/** A 50/30/20 group name keeps its older, stricter limit. */
export const GROUP_NAME_MAX_LENGTH = 30;
/** A budget target is a whole percentage from 0 to this. */
export const MAX_TARGET_PCT = 100;
/** Longest note, description or bank-text rule. */
export const TEXT_MAX_LENGTH = 500;

/** The most lines, or sellers, one batch request may name. */
export const MAX_BATCH_SIZE = 10_000;

/** The earliest date a typed date may hold. */
export const MIN_DATE = '2000-01-01';

/** The latest date a typed date may hold: one year after `today`. */
export function latestDate(today: string): string {
  return addMonths(today, 12);
}

export const AMOUNT_LIMIT_MESSAGE = 'O valor está fora do limite.';
export const TEXT_LIMIT_MESSAGE = `O texto passa de ${TEXT_MAX_LENGTH} letras.`;
export const DATE_LIMIT_MESSAGE = 'A data precisa ser de 2000 até daqui a um ano.';
export const INCOME_LIMIT_MESSAGE = 'A renda de referência precisa ser maior que zero.';
export const BATCH_LIMIT_MESSAGE = 'Selecione no máximo 10.000 lançamentos de uma vez.';
export const VENDOR_BATCH_LIMIT_MESSAGE = 'Selecione no máximo 10.000 fornecedores de uma vez.';

export function nameLimitMessage(maxLength: number): string {
  return `O nome passa de ${maxLength} letras.`;
}

/** Every message above. The server shows one of these when a request breaks a limit. */
export const LIMIT_MESSAGES: ReadonlySet<string> = new Set([
  AMOUNT_LIMIT_MESSAGE,
  TEXT_LIMIT_MESSAGE,
  DATE_LIMIT_MESSAGE,
  INCOME_LIMIT_MESSAGE,
  BATCH_LIMIT_MESSAGE,
  VENDOR_BATCH_LIMIT_MESSAGE,
  ...[NAME_MAX_LENGTH, PERSON_NAME_MAX_LENGTH, TAG_NAME_MAX_LENGTH, GROUP_NAME_MAX_LENGTH].map(nameLimitMessage),
]);
