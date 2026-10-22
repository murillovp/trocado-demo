import type { IntegrityCheckKey, IntegrityProblem } from '../../shared/contract/reports';
import type { Db } from '../db/client';

export type { IntegrityCheckKey, IntegrityProblem };

/** One rule the stored data must keep, for the totals to stay right. */
type IntegrityCheck = {
  key: IntegrityCheckKey;
  /** Selects one row for each thing that breaks the rule. Every query is scoped to `@household`. */
  offenders: string;
};

/**
 * Ported from docs/audits/evidence/integrity-checks.cjs. The audit's "line
 * category archived" is left out on purpose: archiving a category keeps its old
 * lines (the Categorias screen says so), so it is not an error and the notice
 * must never fire for a normal action.
 */
const CHECKS = [
  {
    key: 'pair_incomplete',
    offenders: `SELECT transfer_pair_id FROM transactions
      WHERE household_id = @household AND transfer_pair_id IS NOT NULL
      GROUP BY transfer_pair_id HAVING COUNT(*) <> 2`,
  },
  {
    key: 'pair_mismatch',
    offenders: `SELECT a.id FROM transactions a
      JOIN transactions b ON a.transfer_pair_id = b.transfer_pair_id AND a.id < b.id AND b.household_id = @household
      WHERE a.household_id = @household
        AND (a.amount_cents <> -b.amount_cents OR a.account_id = b.account_id
          OR a.kind IS NOT 'transfer' OR b.kind IS NOT 'transfer'
          OR ABS(julianday(a.date) - julianday(b.date)) > 3)`,
  },
  {
    key: 'pair_on_non_transfer',
    offenders: `SELECT id FROM transactions
      WHERE household_id = @household AND transfer_pair_id IS NOT NULL AND kind IS NOT 'transfer'`,
  },
  {
    key: 'date_invalid',
    // date() answers NULL for a day that does not exist, such as 2026-02-30.
    offenders: `SELECT id FROM transactions WHERE household_id = @household AND date(date) IS NOT date`,
  },
  {
    key: 'adjusted_amount_invalid',
    offenders: `SELECT id FROM transactions
      WHERE household_id = @household AND adjusted_amount_cents IS NOT NULL
        AND (import_id IS NULL OR adjusted_amount_cents = 0 OR adjusted_amount_cents = amount_cents
          OR (adjusted_amount_cents > 0) <> (amount_cents > 0))`,
  },
  {
    key: 'import_rows_mismatch',
    // ADR-0006: every row the reader saw is accounted for, so imported rows and lines match.
    offenders: `SELECT i.id FROM imports i
      WHERE i.household_id = @household
        AND (SELECT COUNT(*) FROM import_rows r WHERE r.import_id = i.id AND r.status = 'imported')
          <> (SELECT COUNT(*) FROM transactions t WHERE t.import_id = i.id)`,
  },
  {
    key: 'import_row_missing_line',
    offenders: `SELECT r.id FROM import_rows r
      WHERE r.household_id = @household AND r.transaction_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.id = r.transaction_id)`,
  },
  {
    key: 'hand_added_sign',
    offenders: `SELECT id FROM transactions
      WHERE household_id = @household AND import_id IS NULL
        AND ((kind = 'income' AND amount_cents < 0) OR (kind IN ('expense', 'savings') AND amount_cents > 0))`,
  },
  {
    key: 'category_wrong_direction',
    offenders: `SELECT t.id FROM transactions t JOIN categories c ON c.id = t.category_id
      WHERE t.household_id = @household
        AND ((t.kind IN ('expense', 'savings') AND c.applies_to = 'income')
          OR (t.kind = 'income' AND c.applies_to = 'expense'))`,
  },
  {
    key: 'transfer_with_category',
    offenders: `SELECT id FROM transactions
      WHERE household_id = @household AND kind = 'transfer' AND category_id IS NOT NULL`,
  },
  {
    key: 'imported_income_negative',
    // ADR-0013: money that left is never Entrada.
    offenders: `SELECT id FROM transactions
      WHERE household_id = @household AND import_id IS NOT NULL AND kind = 'income' AND amount_cents < 0`,
  },
  {
    key: 'expense_in_savings_category',
    // ADR-0012: a savings-group category makes the line savings, so an expense never keeps one.
    offenders: `SELECT t.id FROM transactions t JOIN categories c ON c.id = t.category_id
      WHERE t.household_id = @household AND t.kind = 'expense' AND c.bucket = 'savings'`,
  },
  {
    key: 'savings_outside_savings_category',
    // ADR-0012, the other half: a savings line only keeps a savings-group category.
    offenders: `SELECT t.id FROM transactions t JOIN categories c ON c.id = t.category_id
      WHERE t.household_id = @household AND t.kind = 'savings' AND c.bucket IS NOT 'savings'`,
  },
] as const satisfies readonly IntegrityCheck[];

export const INTEGRITY_CHECK_KEYS: readonly IntegrityCheckKey[] = CHECKS.map((check) => check.key);

/** Runs every check on one household. Answers only the failed ones, in a fixed order. */
export function runIntegrityChecks(db: Db, householdId: string): IntegrityProblem[] {
  const problems: IntegrityProblem[] = [];
  for (const check of CHECKS) {
    const row = db.$client
      .prepare(`SELECT COUNT(*) AS count FROM (${check.offenders})`)
      .get({ household: householdId }) as { count: number };
    if (row.count > 0) problems.push({ check: check.key, count: row.count });
  }
  return problems;
}

/** The start-up log line for a failed check. It holds the key and the count, never the contents of a line. */
export function integrityLogLine(problem: IntegrityProblem): string {
  return `Integrity check failed: ${problem.check} (${problem.count})`;
}
