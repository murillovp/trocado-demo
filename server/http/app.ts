import express from 'express';
import { AppError } from '../../shared/errors';
import { classifierFromSettings, screenshotReaderFromSettings } from '../ai/fromSettings';
import type { Db } from '../db/client';
import { withClassifier, withScreenshotReader, type ClassifierFactory, type ScreenshotReaderFactory } from './ai';
import { serveClient } from './clientFiles';
import { errorHandler } from './errors';
import { withHousehold } from './household';
import { accountsRouter } from './routes/accounts';
import { analysisRouter } from './routes/analysis';
import { categoriesRouter } from './routes/categories';
import { householdRouter } from './routes/household';
import { importsRouter } from './routes/imports';
import { installmentsRouter } from './routes/installments';
import { integrityRouter } from './routes/integrity';
import { monthsRouter } from './routes/months';
import { peopleRouter } from './routes/people';
import { reportsRouter } from './routes/reports';
import { settingsRouter } from './routes/settings';
import { tagsRouter } from './routes/tags';
import { transactionsRouter } from './routes/transactions';
import { vendorsRouter } from './routes/vendors';

export function createApp(options: {
  db: Db;
  householdId: string;
  classifierFor?: ClassifierFactory;
  screenshotReaderFor?: ScreenshotReaderFactory;
  clientDir?: string;
}) {
  const app = express();

  app.use(express.json({ limit: '25mb' }));
  app.use(withHousehold(options.db, options.householdId));
  app.use(withClassifier(options.classifierFor ?? classifierFromSettings));
  app.use(withScreenshotReader(options.screenshotReaderFor ?? screenshotReaderFromSettings));

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.use('/api/accounts', accountsRouter);
  app.use('/api/analysis', analysisRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/household', householdRouter);
  app.use('/api/imports', importsRouter);
  app.use('/api/installments', installmentsRouter);
  app.use('/api/integrity', integrityRouter);
  app.use('/api/months', monthsRouter);
  app.use('/api/people', peopleRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/tags', tagsRouter);
  app.use('/api/transactions', transactionsRouter);
  app.use('/api/vendors', vendorsRouter);

  // An API address no route took: answer JSON, never the page.
  app.use('/api', (request, _response, next) => {
    next(new AppError('not_found', `No route for ${request.method} ${request.originalUrl}`));
  });

  if (options.clientDir) serveClient(app, options.clientDir);

  app.use(errorHandler);

  return app;
}
