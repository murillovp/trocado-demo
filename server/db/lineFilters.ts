import { eq, isNull, or, type SQL } from 'drizzle-orm';
import { imports, transactions } from './schema';

/**
 * A line that is no longer waiting for review: entered by hand (no import) or
 * part of a confirmed import. Only for queries that left-join `imports` on the
 * line's import id. Reports, the transaction list and installments read only
 * these lines; a pending import's lines live on its review screen.
 */
export function outsideReview(): SQL {
  return or(isNull(transactions.importId), eq(imports.status, 'confirmed')) as SQL;
}
