/**
 * The building blocks of the request schemas: a name, a note, an amount, a
 * date. Each carries the limit message the browser shows when a value is too big.
 */
import { z } from 'zod';
import { isRealDate } from '../dates';
import {
  AMOUNT_LIMIT_MESSAGE,
  DATE_LIMIT_MESSAGE,
  INCOME_LIMIT_MESSAGE,
  latestDate,
  MAX_AMOUNT_CENTS,
  MIN_DATE,
  NAME_MAX_LENGTH,
  nameLimitMessage,
  TEXT_LIMIT_MESSAGE,
  TEXT_MAX_LENGTH,
} from '../limits';

/** A name: trimmed, at least one letter, at most `maxLength`. */
export function nameSchema(maxLength: number = NAME_MAX_LENGTH) {
  return z.string().trim().min(1).max(maxLength, { message: nameLimitMessage(maxLength) });
}

/** A note, a description or a bank-text rule: trimmed, at least one letter, at most 500. */
export const textSchema = z.string().trim().min(1).max(TEXT_MAX_LENGTH, { message: TEXT_LIMIT_MESSAGE });

/** A money amount typed as a positive whole number of centavos, up to the ceiling. */
export const amountCentsSchema = z
  .number()
  .int({ message: AMOUNT_LIMIT_MESSAGE })
  .positive({ message: AMOUNT_LIMIT_MESSAGE })
  .max(MAX_AMOUNT_CENTS, { message: AMOUNT_LIMIT_MESSAGE });

/** A rule amount signed like the bank's: negative when money leaves. */
export const signedAmountCentsSchema = z
  .number()
  .int({ message: AMOUNT_LIMIT_MESSAGE })
  .refine((value) => Math.abs(value) <= MAX_AMOUNT_CENTS, { message: AMOUNT_LIMIT_MESSAGE });

/** A reference income: above zero, up to the ceiling. */
export const referenceIncomeSchema = z
  .number()
  .int({ message: AMOUNT_LIMIT_MESSAGE })
  .positive({ message: INCOME_LIMIT_MESSAGE })
  .max(MAX_AMOUNT_CENTS, { message: AMOUNT_LIMIT_MESSAGE });

/**
 * A date from 2000 to one year after today. The "today" is read when the
 * request is checked. A text that is not a calendar day passes through, and
 * the service answers it with `date_invalid`.
 */
export const dateInRangeSchema = z
  .string()
  .min(1)
  .refine(
    (value) => {
      const text = value.trim();
      if (!isRealDate(text)) return true;
      return text >= MIN_DATE && text <= latestDate(new Date().toISOString().slice(0, 10));
    },
    { message: DATE_LIMIT_MESSAGE },
  );
