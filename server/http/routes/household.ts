import { Router } from 'express';
import type { HouseholdAnswer } from '../../../shared/contract/answers';
import { householdPatchSchema } from '../../../shared/contract/requests';
import { AppError } from '../../../shared/errors';
import { getBucketLabels, updateBucketLabels } from '../../services/household/bucketLabels';

export const householdRouter = Router();

householdRouter.get('/', (request, response) => {
  response.json({ household: { bucketLabels: getBucketLabels(request.db, request.householdId) } } satisfies HouseholdAnswer);
});

householdRouter.patch('/', (request, response) => {
  const parsed = householdPatchSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError('invalid_request', 'Household payload failed validation', parsed.error.issues);
  }
  const bucketLabels = updateBucketLabels(request.db, request.householdId, parsed.data.bucketLabels);
  response.json({ household: { bucketLabels } } satisfies HouseholdAnswer);
});
