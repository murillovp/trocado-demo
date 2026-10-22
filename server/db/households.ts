import { eq } from 'drizzle-orm';
import { AppError } from '../../shared/errors';
import type { BucketLabels } from '../../shared/types';
import type { DbExecutor } from './client';
import { households } from './schema';

/** The 50/30/20 group names, shared by everyone in the household. */
export function getBucketLabels(db: DbExecutor, householdId: string): BucketLabels {
  const row = db.select().from(households).where(eq(households.id, householdId)).get();
  if (!row) throw new AppError('household_not_found', `No household ${householdId}`);
  return { needs: row.needsLabel, wants: row.wantsLabel, savings: row.savingsLabel };
}

/** Stores all three group names. The rules about what a name may be live in the household service. */
export function saveBucketLabels(db: DbExecutor, householdId: string, labels: BucketLabels): void {
  db.update(households)
    .set({ needsLabel: labels.needs, wantsLabel: labels.wants, savingsLabel: labels.savings })
    .where(eq(households.id, householdId))
    .run();
}
