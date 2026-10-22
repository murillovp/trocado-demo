import { Router } from 'express';
import type { SettingsAnswer } from '../../../shared/contract/answers';
import { settingsUpdateSchema } from '../../../shared/contract/requests';
import { AppError } from '../../../shared/errors';
import { listSettings, saveSettings } from '../../services/settings/settings';

export const settingsRouter = Router();

settingsRouter.get('/', (request, response) => {
  response.json({ settings: listSettings(request.db, request.householdId) } satisfies SettingsAnswer);
});

settingsRouter.put('/', (request, response) => {
  const parsed = settingsUpdateSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError('invalid_request', 'Settings payload failed validation', parsed.error.issues);
  }

  response.json({ settings: saveSettings(request.db, request.householdId, parsed.data) } satisfies SettingsAnswer);
});
