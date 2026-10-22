import type { PersonPatch } from '../../../shared/contract/requests';
import { AppError } from '../../../shared/errors';
import { MAX_TARGET_PCT, PERSON_NAME_MAX_LENGTH } from '../../../shared/limits';
import { normalizeName } from '../../../shared/text';
import type { DbExecutor } from '../../db/client';
import { isUniqueViolation } from '../../db/constraints';
import { definedEntries } from '../../db/patch';
import {
  listPeople as queryPeople,
  requirePerson,
  updatePersonRow,
  type PersonChanges,
  type PersonRow,
} from '../../db/people';

export type { PersonPatch };

const TARGET_KEYS = ['targetNeedsPct', 'targetWantsPct', 'targetSavingsPct'] as const;

export function listPeople(db: DbExecutor, householdId: string): PersonRow[] {
  return queryPeople(db, householdId);
}

/**
 * Writes a person's name and/or budget targets. A name is trimmed, 1 to 40
 * characters, and unique in the household ignoring case and accents. The
 * colour slot never changes.
 *
 * The three percentages do not have to add up to 100: the spec lets the user
 * set whatever they want, and the screen shows it as given. Each one is still
 * a whole number from 0 to 100.
 */
export function updatePerson(db: DbExecutor, householdId: string, id: string, patch: PersonPatch): PersonRow {
  requirePerson(db, householdId, id);

  const changes: PersonChanges = definedEntries({ ...patch, name: patch.name === undefined ? undefined : checkedName(db, householdId, id, patch.name) });
  checkTargets(patch);
  checkReferenceIncome(patch.referenceIncomeCents);

  if (Object.keys(changes).length === 0) return requirePerson(db, householdId, id);

  try {
    updatePersonRow(db, householdId, id, changes);
  } catch (error) {
    // An exact clash that got past the check above is stopped by the index.
    if (isUniqueViolation(error)) throw new AppError('person_name_taken', `Another person is already called ${changes.name}`);
    throw error;
  }
  return requirePerson(db, householdId, id);
}

/** The trimmed name, or the error that says why it cannot be used. */
function checkedName(db: DbExecutor, householdId: string, id: string, rawName: string): string {
  const name = rawName.trim();
  if (name === '' || name.length > PERSON_NAME_MAX_LENGTH) {
    throw new AppError('invalid_request', `A name needs 1 to ${PERSON_NAME_MAX_LENGTH} characters`);
  }
  const taken = queryPeople(db, householdId).some(
    (person) => person.id !== id && normalizeName(person.name) === normalizeName(name),
  );
  if (taken) throw new AppError('person_name_taken', `Another person is already called ${name}`);
  return name;
}

function checkTargets(patch: PersonPatch): void {
  for (const key of TARGET_KEYS) {
    const value = patch[key];
    if (value === undefined) continue;
    if (!Number.isInteger(value) || value < 0 || value > MAX_TARGET_PCT) {
      throw new AppError('budget_target_out_of_range', `${key} must be a whole number 0 to ${MAX_TARGET_PCT}`);
    }
  }
}

function checkReferenceIncome(value: number | null | undefined): void {
  if (value === undefined || value === null) return;
  if (!Number.isInteger(value) || value <= 0) {
    throw new AppError('reference_income_invalid', 'referenceIncomeCents must be above zero');
  }
}
