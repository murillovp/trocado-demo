import { isErrorCode, type ErrorCode } from '../../../shared/errorCodes';
import { DEMO_READ_ONLY_MESSAGE, readDemo } from '../demo/snapshots';

/** An API failure. `message` is the server's PT-BR text, ready to show. */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  /** Extra machine-readable data about the failure, such as which file caused it. */
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const NETWORK_MESSAGE = 'Não foi possível falar com o servidor. Confira se o Trocado está rodando.';
const SERVER_OUTDATED_MESSAGE =
  'O servidor não conhece esse pedido. Ele pode estar desatualizado: pare o Trocado e rode npm start de novo.';
const PAYLOAD_TOO_LARGE_MESSAGE = 'O envio passou do limite. Envie menos de cada vez.';

/** The failure for a server that is older than this page: it lacks an address or a field the page needs. */
export function serverOutdatedError(status: number): ApiError {
  return new ApiError('server_outdated', SERVER_OUTDATED_MESSAGE, status);
}

/** A code from the server as a listed code. One this version does not know is filed under `internal`. */
export function knownErrorCode(code: string): ErrorCode {
  return isErrorCode(code) ? code : 'internal';
}

/** Turns a failed answer (its status and parsed body, if any) into the ApiError the app shows. */
export function toApiError(status: number, payload: unknown): ApiError {
  const error = (payload as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
  // The server's own "no such address" answer, or an HTML 404: either way it does not know this request yet.
  if (status === 404 && (error?.code === 'not_found' || !(error?.code && error?.message))) {
    return serverOutdatedError(status);
  }
  if (error?.code && error?.message) {
    return new ApiError(knownErrorCode(error.code), error.message, status, error.details);
  }
  if (status === 413) {
    return new ApiError('payload_too_large', PAYLOAD_TOO_LARGE_MESSAGE, status);
  }
  return new ApiError(
    'internal',
    `O servidor respondeu com um erro inesperado (código ${status}). Tente de novo; se continuar, reinicie o Trocado.`,
    status,
  );
}

/** The demo reads saved answers and refuses every change. */
async function request<T>(method: string, path: string, _body?: unknown, signal?: AbortSignal): Promise<T> {
  if (method !== 'GET') throw new ApiError('invalid_request', DEMO_READ_ONLY_MESSAGE, 403);
  return readDemo<T>(path, signal);
}

export const api = {
  /** `signal` is TanStack's, so a query that a newer one replaced cancels its request. */
  get: <T>(path: string, signal?: AbortSignal) => request<T>('GET', path, undefined, signal),
  post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
};

/** Adds the parameters that have a value to `path` as a query string. */
export function withQuery(path: string, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, value);
  }
  const text = search.toString();
  return text ? `${path}?${text}` : path;
}
