import type { AiFailure, AiFailureReason } from '../../shared/contract/imports';

export type { AiFailure, AiFailureReason };

const MAX_MESSAGE_LENGTH = 200;

const REASONS = new Set<AiFailureReason>(['busy', 'model', 'key', 'credit', 'network', 'timeout', 'unreadable', 'provider']);

/** True when `details` already has the reason/status/providerMessage shape. */
export function isAiFailure(details: unknown): details is AiFailure {
  if (typeof details !== 'object' || details === null) return false;
  const { reason, status, providerMessage } = details as Record<string, unknown>;
  return (
    typeof reason === 'string' &&
    REASONS.has(reason as AiFailureReason) &&
    (status === null || typeof status === 'number') &&
    (providerMessage === null || typeof providerMessage === 'string')
  );
}

/** The reason for a status and provider text. First match wins. */
export function reasonFor(status: number, providerText: string): AiFailureReason {
  if (status === 429 || status === 503 || status === 529 || /rate.?limit|overloaded|capacity|temporarily/i.test(providerText)) {
    return 'busy';
  }
  // 403 is not a key problem: OpenRouter also uses it for moderation-flagged input.
  if (status === 401) return 'key';
  if (status === 402 || /credit|insufficient.?(funds|balance)/i.test(providerText)) return 'credit';
  // The text rule only applies on a 400 or 404: on a 500/502 the text is the
  // upstream provider's own wording, not OpenRouter classifying the model.
  if (status === 404 || (status === 400 && /model|not.?found|image|vision|modalit|not.?support/i.test(providerText))) {
    return 'model';
  }
  return 'provider';
}

/** Reads an OpenRouter error response. Never throws. */
export async function failureFromResponse(response: Response): Promise<AiFailure> {
  const status = response.status;
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return failureFromErrorBody(body, status) ?? { reason: reasonFor(status, ''), status, providerMessage: null };
}

/**
 * Reads an already-parsed body shaped `{ error: {...} }`, the same shape
 * OpenRouter uses on a non-OK response and, sometimes, inside a 200. Returns
 * null when the body has no `error` field, so a caller can fall back to its
 * normal answer handling.
 *
 * The real transport `status` always wins when there is one. `error.code`
 * (a number) is only a fallback for when `status` is null — the 200-wrapped
 * case, where the transport status is meaningless and the body is the only
 * place a status-like code can come from.
 */
export function failureFromErrorBody(body: unknown, status: number | null): AiFailure | null {
  if (body === null || typeof body !== 'object') return null;
  const error = (body as { error?: unknown }).error;
  if (error === null || typeof error !== 'object') return null;

  const { code, message, metadata } = error as { code?: unknown; message?: unknown; metadata?: { raw?: unknown } };
  const providerMessage = joinMessage(message, metadata?.raw);
  const numericCode = typeof code === 'number' ? code : null;
  const effectiveStatus = status ?? numericCode;

  return {
    reason: reasonFor(effectiveStatus ?? 0, providerMessage ?? ''),
    status: effectiveStatus,
    providerMessage,
  };
}

function joinMessage(message: unknown, raw: unknown): string | null {
  const parts = [message, raw].filter((part): part is string => typeof part === 'string' && part.length > 0);
  if (parts.length === 0) return null;
  return parts.join(' — ').slice(0, MAX_MESSAGE_LENGTH);
}
