import { AppError } from './errors';

/**
 * An optional sign (a space may follow it), an optional "R$", then digits that
 * are grouped in threes by dots or not grouped at all, then an optional comma
 * with exactly two decimals. "12.34" and "1.5" are refused: a dot here only
 * groups thousands, so reading them would be a guess.
 */
const BRAZILIAN_AMOUNT = /^(-?)\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{2}))?$/;

/** An optional sign, ungrouped digits, then an optional dot with exactly two decimals. */
const DECIMAL_AMOUNT = /^(-?)(\d+)(?:\.(\d{2}))?$/;

/** Longest value kept in an error, so a garbled cell cannot flood a message. */
const MAX_VALUE_LENGTH = 40;

/** Reads a Brazilian-format amount ("1.575,56", "- 1.575,56") as whole centavos. */
export function parseBrazilianAmount(text: string): number {
  return toCentavos(text, BRAZILIAN_AMOUNT, (whole) => whole.replaceAll('.', ''));
}

/** Reads a dot-decimal amount ("-242.87", "170.00") as whole centavos. */
export function parseDecimalAmount(text: string): number {
  return toCentavos(text, DECIMAL_AMOUNT, (whole) => whole);
}

function toCentavos(text: string, pattern: RegExp, digitsOf: (whole: string) => string): number {
  const match = pattern.exec(text.trim());
  if (!match) throw unreadable(text);

  const [, sign, whole, fraction = '00'] = match;
  const centavos = Number(digitsOf(whole!)) * 100 + Number(fraction);
  if (!Number.isSafeInteger(centavos)) throw unreadable(text);
  return sign === '-' ? -centavos : centavos;
}

/** The error a parser turns into "could not read the value ... on line N" by adding the line. */
function unreadable(value: string): AppError {
  return new AppError('amount_unreadable', `Cannot read amount: ${value}`, {
    value: value.slice(0, MAX_VALUE_LENGTH),
  });
}

/** Writes whole centavos as PT-BR text, with no currency symbol. */
export function formatCentavos(cents: number): string {
  const negative = cents < 0;
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / 100).toString();
  const fraction = (absolute % 100).toString().padStart(2, '0');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}${grouped},${fraction}`;
}
