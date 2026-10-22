import { Router } from 'express';
import type { LatestMonthAnswer } from '../../../shared/contract/answers';
import { latestLedgerMonth } from '../../services/lines/ledger';

export const monthsRouter = Router();

/** The latest month (YYYY-MM) with a line outside review, or null when the household has none. */
monthsRouter.get('/latest', (request, response) => {
  response.json({ month: latestLedgerMonth(request.db, request.householdId) } satisfies LatestMonthAnswer);
});
