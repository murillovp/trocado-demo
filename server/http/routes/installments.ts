import { Router } from 'express';
import type { InstallmentsAnswer } from '../../../shared/contract/answers';
import { getInstallments } from '../../services/reports/reports';

export const installmentsRouter = Router();

installmentsRouter.get('/', (request, response) => {
  response.json(getInstallments(request.db, request.householdId) satisfies InstallmentsAnswer);
});
