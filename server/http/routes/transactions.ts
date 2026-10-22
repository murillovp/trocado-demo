import { Router } from 'express';
import type { BatchChangeAnswer, TagLinesAnswer, TransactionAnswer, TransactionsAnswer } from '../../../shared/contract/answers';
import { batchChangeSchema, ledgerLineChangesSchema, ledgerQuerySchema, manualLineSchema, tagLinesSchema } from '../../../shared/contract/requests';
import type { EditLineResult } from '../../../shared/contract/lines';
import { AppError } from '../../../shared/errors';
import { changeLinesInBatch } from '../../services/lines/batchLines';
import { addManualLine, deleteManualLine, editLineWithSpread, listLedger } from '../../services/lines/ledger';
import { summarizeLines } from '../../services/lines/summary';
import { bulkTagLines } from '../../services/tags/tagLines';
import { parseQuery, requireId } from '../params';

export const transactionsRouter = Router();

transactionsRouter.get('/', (request, response) => {
  const query = parseQuery(ledgerQuerySchema, request.query);
  const transactions = listLedger(request.db, request.householdId, query);
  response.json({ transactions, summary: summarizeLines(transactions) } satisfies TransactionsAnswer);
});

transactionsRouter.post('/', (request, response) => {
  const parsed = manualLineSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError('invalid_request', 'Transaction payload failed validation', parsed.error.issues);
  }
  const transaction = addManualLine(request.db, request.householdId, parsed.data);
  response.status(201).json({ transaction } satisfies TransactionAnswer);
});

transactionsRouter.post('/tags', (request, response) => {
  const parsed = tagLinesSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError('invalid_request', 'Tagging payload failed validation', parsed.error.issues);
  }
  response.json(bulkTagLines(request.db, request.householdId, parsed.data) satisfies TagLinesAnswer);
});

transactionsRouter.post('/batch', (request, response) => {
  const parsed = batchChangeSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError('invalid_request', 'Batch payload failed validation', parsed.error.issues);
  }
  response.json(changeLinesInBatch(request.db, request.householdId, parsed.data) satisfies BatchChangeAnswer);
});

transactionsRouter.patch('/:id', (request, response) => {
  const parsed = ledgerLineChangesSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new AppError('invalid_request', 'Transaction payload failed validation', parsed.error.issues);
  }
  response.json(
    editLineWithSpread(request.db, request.householdId, requireId(request.params.id), parsed.data) satisfies EditLineResult,
  );
});

transactionsRouter.delete('/:id', (request, response) => {
  deleteManualLine(request.db, request.householdId, requireId(request.params.id));
  response.status(204).end();
});
