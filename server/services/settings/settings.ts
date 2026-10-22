import { AppError } from '../../../shared/errors';
import type { Db } from '../../db/client';
import { getSettings, setSettings } from '../../db/settings';

/** Settings that hold a secret. The browser learns only that one is stored, through `<key>_set`. */
const SECRET_KEYS = new Set(['ai_api_key']);

/** Keys ending in this are computed here to say a secret is stored. The browser never sends them. */
const RESERVED_SUFFIX = '_set';

/** Every setting as stored, secrets included. For server code that needs the real values. */
export { getSettings };

/** The settings the browser may see: each secret becomes `<key>_set: 'true'` and its value stays here. */
export function listSettings(db: Db, householdId: string): Record<string, string> {
  return withoutSecrets(getSettings(db, householdId));
}

/**
 * Stores the given settings and answers the browser's view of all of them.
 * A key ending in `_set` is refused, so a client cannot write a fake
 * `ai_api_key_set: "false"` that would later be read back as real status.
 * Nothing is stored when any key is refused.
 */
export function saveSettings(db: Db, householdId: string, values: Record<string, string>): Record<string, string> {
  if (Object.keys(values).some((key) => key.endsWith(RESERVED_SUFFIX))) {
    throw new AppError('invalid_request', `Setting keys cannot end in ${RESERVED_SUFFIX}`);
  }
  return withoutSecrets(setSettings(db, householdId, values));
}

function withoutSecrets(values: Record<string, string>): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (SECRET_KEYS.has(key)) {
      safe[`${key}${RESERVED_SUFFIX}`] = 'true';
      continue;
    }
    safe[key] = value;
  }
  return safe;
}
