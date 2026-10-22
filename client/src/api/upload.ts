import { DEMO_READ_ONLY_MESSAGE } from '../demo/snapshots';
import { ApiError } from './client';
import type { ImportStepEvent } from './types';

/** What the import is doing, from the browser's side (upload, waiting) and the server's (the rest). */
export type UploadStep = { step: 'upload'; percent: number } | { step: 'waiting' } | ImportStepEvent;

const INTERRUPTED_MESSAGE =
  'A importação parou no meio. Confira se o Trocado ainda está rodando e tente de novo. Nada foi salvo pela metade.';

/** How long the import may go without a sign of life (an upload step or a server line) before the browser gives up. */
export const IMPORT_IDLE_LIMIT_MS = 3 * 60 * 1000;
export const IMPORT_TIMEOUT_MESSAGE = 'A importação demorou demais. Nada foi salvo. Tente de novo.';
export const IMPORT_CANCELLED_MESSAGE = 'Importação cancelada. O que já chegou ao Trocado aparece em Importações.';

/** The demo sends nothing: an upload is refused at once, with the demo's message. */
export function postWithProgress<T>(
  _path: string,
  _body: unknown,
  _onStep: (step: UploadStep) => void,
  _options: { signal?: AbortSignal } = {},
): Promise<T> {
  return Promise.reject(new ApiError('invalid_request', DEMO_READ_ONLY_MESSAGE, 403));
}
