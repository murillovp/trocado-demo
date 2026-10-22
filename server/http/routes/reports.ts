import { Router } from 'express';
import type { HistoryAnswer } from '../../../shared/contract/answers';
import { budgetQuerySchema, monthQuerySchema } from '../../../shared/contract/requests';
import type { BudgetView, MonthReport } from '../../../shared/contract/reports';
import { getBudget, getHistory, getMonthReport } from '../../services/reports/reports';
import { parseQuery } from '../params';

export const reportsRouter = Router();

reportsRouter.get('/month', (request, response) => {
  const query = parseQuery(monthQuerySchema, request.query);
  response.json(getMonthReport(request.db, request.householdId, query.month, query.personId) satisfies MonthReport);
});

reportsRouter.get('/history', (request, response) => {
  const query = parseQuery(monthQuerySchema, request.query);
  response.json({
    months: getHistory(request.db, request.householdId, query.month, query.personId),
  } satisfies HistoryAnswer);
});

reportsRouter.get('/budget', (request, response) => {
  const query = parseQuery(budgetQuerySchema, request.query);
  response.json(getBudget(request.db, request.householdId, query.month, query.personId) satisfies BudgetView);
});
