import type { ServerErrorCode } from './errorCodes';

/**
 * An error with a machine-readable code. Services and parsers throw these.
 * The HTTP layer turns the code into a PT-BR message for the user, which is
 * why the message here stays in English.
 */
export class AppError extends Error {
  readonly code: ServerErrorCode;
  readonly details?: unknown;

  constructor(code: ServerErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}
