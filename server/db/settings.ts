import { eq } from 'drizzle-orm';
import type { Db } from './client';
import { settings } from './schema';

/** Household-wide key/value settings. Per-person values live on the people table. */
export function getSettings(db: Db, householdId: string): Record<string, string> {
  const rows = db.select().from(settings).where(eq(settings.householdId, householdId)).all();

  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export function setSettings(
  db: Db,
  householdId: string,
  values: Record<string, string>,
): Record<string, string> {
  for (const [key, value] of Object.entries(values)) {
    db.insert(settings)
      .values({ householdId, key, value })
      .onConflictDoUpdate({ target: [settings.householdId, settings.key], set: { value } })
      .run();
  }

  return getSettings(db, householdId);
}
