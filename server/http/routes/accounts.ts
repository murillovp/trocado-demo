import { Router } from 'express';
import type { AccountAnswer, AccountsAnswer } from '../../../shared/contract/answers';
import { accountRenameSchema, newAccountSchema } from '../../../shared/contract/requests';
import { AppError } from '../../../shared/errors';
import { toAccount } from '../../services/answers';
import { createAccount, listAccounts, renameAccount } from '../../services/accounts/accounts';
import { requireId } from '../params';

export const accountsRouter = Router();

accountsRouter.get('/', (request, response) => {
  response.json({ accounts: listAccounts(request.db, request.householdId).map(toAccount) } satisfies AccountsAnswer);
});

accountsRouter.post('/', (request, response) => {
  const parsed = newAccountSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError('invalid_request', 'Account payload failed validation', parsed.error.issues);
  }

  const account = createAccount(request.db, request.householdId, parsed.data);
  response.status(201).json({ account: toAccount(account) } satisfies AccountAnswer);
});

accountsRouter.patch('/:id', (request, response) => {
  const parsed = accountRenameSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError('invalid_request', 'Account payload failed validation', parsed.error.issues);
  }
  const account = renameAccount(request.db, request.householdId, requireId(request.params.id), parsed.data.label);
  response.json({ account: toAccount(account) } satisfies AccountAnswer);
});
