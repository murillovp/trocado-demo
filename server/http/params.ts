import type { z } from 'zod';
import { AppError } from '../../shared/errors';

/**
 * `noUncheckedIndexedAccess` types a route parameter as possibly missing, and a
 * missing id means the request was malformed. This turns that into one error.
 */
export function requireId(value: string | undefined): string {
  if (!value) {
    throw new AppError('invalid_request', 'Missing id in the URL');
  }
  return value;
}

/** Reads a query string with a Zod schema. A query that fails the schema is a malformed request. */
export function parseQuery<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, query: unknown): T {
  const parsed = schema.safeParse(query);
  if (!parsed.success) {
    throw new AppError('invalid_request', 'Query failed validation', parsed.error.issues);
  }
  return parsed.data;
}
