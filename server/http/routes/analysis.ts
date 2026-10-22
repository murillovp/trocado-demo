import { Router } from 'express';
import { analysisMonthQuerySchema, analysisTagsQuerySchema } from '../../../shared/contract/requests';
import type {
  AnalysisMonthAnswer,
  AnalysisTagsAnswer,
  AnalysisWeekAnswer,
  AnalysisYearAnswer,
} from '../../../shared/contract/reports';
import { getAnalysisMonth, getAnalysisTags, getAnalysisWeek, getAnalysisYear } from '../../services/reports/reports';
import { parseQuery } from '../params';

export const analysisRouter = Router();

analysisRouter.get('/month', (request, response) => {
  const query = parseQuery(analysisMonthQuerySchema, request.query);
  response.json(getAnalysisMonth(request.db, request.householdId, query) satisfies AnalysisMonthAnswer);
});

analysisRouter.get('/year', (request, response) => {
  const query = parseQuery(analysisMonthQuerySchema, request.query);
  response.json(getAnalysisYear(request.db, request.householdId, query) satisfies AnalysisYearAnswer);
});

analysisRouter.get('/week', (request, response) => {
  const query = parseQuery(analysisMonthQuerySchema, request.query);
  response.json(getAnalysisWeek(request.db, request.householdId, query) satisfies AnalysisWeekAnswer);
});

analysisRouter.get('/tags', (request, response) => {
  const query = parseQuery(analysisTagsQuerySchema, request.query);
  response.json(getAnalysisTags(request.db, request.householdId, query) satisfies AnalysisTagsAnswer);
});
