import { and, asc, eq } from 'drizzle-orm';
import { AppError } from '../../shared/errors';
import type { DbExecutor } from './client';
import { people } from './schema';

export type PersonRow = typeof people.$inferSelect;

/** The columns a person update may write. The rules that decide which values are allowed live in the people service. */
export type PersonChanges = Partial<
  Pick<PersonRow, 'name' | 'targetNeedsPct' | 'targetWantsPct' | 'targetSavingsPct' | 'referenceIncomeCents'>
>;

export function listPeople(db: DbExecutor, householdId: string): PersonRow[] {
  return db
    .select()
    .from(people)
    .where(eq(people.householdId, householdId))
    .orderBy(asc(people.name))
    .all();
}

/** The person, or undefined when the household has none with this id. */
export function findPerson(db: DbExecutor, householdId: string, id: string): PersonRow | undefined {
  return db
    .select()
    .from(people)
    .where(and(eq(people.householdId, householdId), eq(people.id, id)))
    .get();
}

export function requirePerson(db: DbExecutor, householdId: string, id: string): PersonRow {
  const row = findPerson(db, householdId, id);
  if (!row) {
    throw new AppError('person_not_found', `No person ${id} in household ${householdId}`);
  }
  return row;
}

/** Writes the given columns of one person. The unique index on household and name stops an exact duplicate name. */
export function updatePersonRow(db: DbExecutor, householdId: string, id: string, changes: PersonChanges): void {
  db.update(people)
    .set(changes)
    .where(and(eq(people.householdId, householdId), eq(people.id, id)))
    .run();
}
