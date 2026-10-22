/**
 * The one list of error codes. The server throws and sends the first group.
 * The browser also makes up the second group when no answer arrives or an
 * import is stopped. A misspelt code fails the type check.
 */
export const SERVER_ERROR_CODES = [
  'account_label_taken',
  'account_not_found',
  'ai_not_configured',
  'ai_unreachable',
  'ai_unreadable',
  'amount_unreadable',
  'batch_refused',
  'bucket_label_taken',
  'budget_target_out_of_range',
  'category_name_taken',
  'category_not_found',
  'category_order_invalid',
  'category_wrong_kind',
  'date_invalid',
  'date_unreadable',
  'file_repeats_line',
  'file_unreadable',
  'format_account_mismatch',
  'format_unknown',
  'household_not_found',
  'import_already_confirmed',
  'import_has_dependents',
  'import_image_not_found',
  'import_not_found',
  'internal',
  'invalid_request',
  'kind_wrong_direction',
  'month_invalid',
  'not_found',
  'payload_too_large',
  'person_name_taken',
  'person_not_found',
  'reference_income_invalid',
  'tag_name_taken',
  'tag_not_found',
  'transaction_not_found',
  'transaction_not_manual',
  'transaction_pending_review',
  'vendor_not_found',
  'vendor_rule_taken',
] as const;

/** Codes only the browser creates. Their PT-BR messages live in `client/src/api/`. */
export const CLIENT_ERROR_CODES = [
  'import_cancelled',
  'import_interrupted',
  'import_timeout',
  'network',
  'server_outdated',
] as const;

export type ServerErrorCode = (typeof SERVER_ERROR_CODES)[number];
export type ClientErrorCode = (typeof CLIENT_ERROR_CODES)[number];
export type ErrorCode = ServerErrorCode | ClientErrorCode;

const ALL_CODES: ReadonlySet<string> = new Set<string>([...SERVER_ERROR_CODES, ...CLIENT_ERROR_CODES]);

/** True when `value` is one of the listed codes. */
export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && ALL_CODES.has(value);
}
