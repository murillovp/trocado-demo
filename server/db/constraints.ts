/**
 * True when SQLite refused a write because a unique index already holds the
 * value. Services use it to turn an exact clash that slipped past their own
 * check into the error code the screen already knows.
 */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && (error as { code?: unknown }).code === 'SQLITE_CONSTRAINT_UNIQUE';
}
