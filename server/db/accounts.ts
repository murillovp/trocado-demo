import { randomUUID } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import { AppError } from '../../shared/errors';
import type { AccountType, BankId } from '../../shared/types';
import type { DbExecutor } from './client';
import { accounts } from './schema';

export type AccountRow = typeof accounts.$inferSelect;

export function listAccounts(db: DbExecutor, householdId: string): AccountRow[] {
  return db
    .select()
    .from(accounts)
    .where(eq(accounts.householdId, householdId))
    .orderBy(asc(accounts.label))
    .all();
}

export function requireAccount(db: DbExecutor, householdId: string, id: string): AccountRow {
  const row = db
    .select()
    .from(accounts)
    .where(and(eq(accounts.householdId, householdId), eq(accounts.id, id)))
    .get();

  if (!row) {
    throw new AppError('account_not_found', `No account ${id} in household ${householdId}`);
  }
  return row;
}

/** Inserts an account. The unique index on household and label stops an exact duplicate label. */
export function insertAccount(
  db: DbExecutor,
  householdId: string,
  input: { personId: string; bank: BankId; type: AccountType; label: string },
): AccountRow {
  const id = randomUUID();
  db.insert(accounts)
    .values({
      id,
      householdId,
      personId: input.personId,
      bank: input.bank,
      type: input.type,
      label: input.label,
    })
    .run();

  return requireAccount(db, householdId, id);
}

/** Writes a new label. Bank and type never change. The unique index stops an exact duplicate label. */
export function updateAccountLabel(db: DbExecutor, householdId: string, id: string, label: string): void {
  db.update(accounts).set({ label }).where(and(eq(accounts.householdId, householdId), eq(accounts.id, id))).run();
}
