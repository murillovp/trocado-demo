import { Router } from 'express';
import type { IntegrityAnswer } from '../../../shared/contract/answers';
import { runIntegrityChecks } from '../../services/integrity';

export const integrityRouter = Router();

integrityRouter.get('/', (request, response) => {
  response.json({ problems: runIntegrityChecks(request.db, request.householdId) } satisfies IntegrityAnswer);
});
