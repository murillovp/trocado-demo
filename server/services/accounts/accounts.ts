import { AppError } from '../../../shared/errors';
import { NAME_MAX_LENGTH } from '../../../shared/limits';
import { normalizeName } from '../../../shared/text';
import type { AccountType, BankId } from '../../../shared/types';
import {
  insertAccount,
  listAccounts as queryAccounts,
  requireAccount,
  updateAccountLabel,
  type AccountRow,
} from '../../db/accounts';
import type { DbExecutor } from '../../db/client';
import { isUniqueViolation } from '../../db/constraints';
import { findPerson } from '../../db/people';

export function listAccounts(db: DbExecutor, householdId: string): AccountRow[] {
  return queryAccounts(db, householdId);
}

/** Creates an account for a person. Rejects an unknown person and a label already used in the household. */
export function createAccount(
  db: DbExecutor,
  householdId: string,
  input: { personId: string; bank: BankId; type: AccountType; label: string },
): AccountRow {
  if (!findPerson(db, householdId, input.personId)) {
    throw new AppError('person_not_found', `No person ${input.personId} in household ${householdId}`);
  }
  if (labelIsTaken(db, householdId, input.label, undefined)) {
    throw new AppError('account_label_taken', `Account label already taken: ${input.label}`);
  }

  try {
    return insertAccount(db, householdId, input);
  } catch (error) {
    // An exact clash that got past the check above is stopped by the index.
    if (isUniqueViolation(error)) throw new AppError('account_label_taken', `Account label already taken: ${input.label}`);
    throw error;
  }
}

/** Renames an account. Bank and type never change. Rejects a label another account in the household has. */
export function renameAccount(db: DbExecutor, householdId: string, id: string, label: string): AccountRow {
  requireAccount(db, householdId, id);
  const trimmed = label.trim();
  if (trimmed === '' || trimmed.length > NAME_MAX_LENGTH) {
    throw new AppError('invalid_request', `A label needs 1 to ${NAME_MAX_LENGTH} characters`);
  }
  if (labelIsTaken(db, householdId, trimmed, id)) {
    throw new AppError('account_label_taken', `Account label already taken: ${trimmed}`);
  }

  try {
    updateAccountLabel(db, householdId, id, trimmed);
  } catch (error) {
    if (isUniqueViolation(error)) throw new AppError('account_label_taken', `Account label already taken: ${trimmed}`);
    throw error;
  }
  return requireAccount(db, householdId, id);
}

/** True when another account in the household has this label, ignoring case and accents. */
function labelIsTaken(db: DbExecutor, householdId: string, label: string, ownId: string | undefined): boolean {
  const wanted = normalizeName(label);
  return queryAccounts(db, householdId).some((account) => account.id !== ownId && normalizeName(account.label) === wanted);
}
