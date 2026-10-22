import type { Request, Response } from 'express';
import type { ImportSummaryAnswer } from '../../shared/contract/answers';
import type { ImportSummary } from '../services/import/importFile';
import type { OnStep } from '../services/import/progress';
import { errorResponse } from './errors';

const NDJSON = 'application/x-ndjson';

/**
 * Runs one import and answers it. A browser that asks for `application/x-ndjson`
 * gets each step as it starts, one JSON object per line, then a last line
 * saying `done` or `error`. Anyone else gets the plain JSON answer as before.
 */
export async function answerImport(
  request: Request,
  response: Response,
  run: (onStep: OnStep) => Promise<ImportSummary>,
): Promise<void> {
  if (!(request.get('accept') ?? '').includes(NDJSON)) {
    const summary = await run(() => {});
    response.status(201).json({ import: summary } satisfies ImportSummaryAnswer);
    return;
  }

  response.status(200);
  response.setHeader('Content-Type', `${NDJSON}; charset=utf-8`);
  response.setHeader('Cache-Control', 'no-cache');
  response.flushHeaders();
  const send = (line: object) => response.write(`${JSON.stringify(line)}\n`);

  try {
    const summary = await run((event) => send({ type: 'step', ...event }));
    send({ type: 'done', import: summary });
  } catch (error) {
    const { status, body } = errorResponse(error);
    send({ type: 'error', status, ...body });
  }
  response.end();
}
