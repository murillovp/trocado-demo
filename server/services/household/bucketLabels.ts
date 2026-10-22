import { AppError } from '../../../shared/errors';
import { GROUP_NAME_MAX_LENGTH } from '../../../shared/limits';
import { normalizeName } from '../../../shared/text';
import type { BucketLabels, CategoryBucket } from '../../../shared/types';
import type { DbExecutor } from '../../db/client';
import { getBucketLabels as queryBucketLabels, saveBucketLabels } from '../../db/households';

const BUCKETS: CategoryBucket[] = ['needs', 'wants', 'savings'];

/** The 50/30/20 group names, shared by everyone in the household. */
export function getBucketLabels(db: DbExecutor, householdId: string): BucketLabels {
  return queryBucketLabels(db, householdId);
}

/** Renames the groups given. Each name is 1 to 30 characters, and the three must differ. */
export function updateBucketLabels(db: DbExecutor, householdId: string, patch: Partial<BucketLabels>): BucketLabels {
  const next = { ...queryBucketLabels(db, householdId) };
  for (const bucket of BUCKETS) {
    const value = patch[bucket];
    if (value === undefined) continue;
    const trimmed = value.trim();
    if (trimmed === '' || trimmed.length > GROUP_NAME_MAX_LENGTH) {
      throw new AppError('invalid_request', `A group name needs 1 to ${GROUP_NAME_MAX_LENGTH} characters`);
    }
    next[bucket] = trimmed;
  }
  const normalized = BUCKETS.map((bucket) => normalizeName(next[bucket]));
  if (new Set(normalized).size !== BUCKETS.length) {
    throw new AppError('bucket_label_taken', 'Two budget groups cannot share a name');
  }
  saveBucketLabels(db, householdId, next);
  return next;
}
