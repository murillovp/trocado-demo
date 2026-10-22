import { z } from 'zod';
import { AppError } from '../../shared/errors';
import { failureFromErrorBody, failureFromResponse } from './providerErrors';
import type { AiFailure } from './providerErrors';

/** How long both AI clients wait before one retry. */
const RETRY_DELAY_MS = 2000;

export type ChatCompletionOptions = {
  endpoint: string;
  apiKey: string;
  /** The request body, sent as JSON. */
  body: unknown;
  /** How long one attempt may take, answer body included. */
  timeoutMs: number;
  fetchImpl?: typeof fetch;
  /** Waits before the retry. Tests pass a no-op. */
  sleep?: (ms: number) => Promise<void>;
};

const UNREADABLE_FAILURE: AiFailure = { reason: 'unreadable', status: null, providerMessage: null };

/**
 * Posts one chat request and returns the parsed JSON body. Throws the same
 * AppErrors both AI clients always threw: ai_unreachable with a failure
 * reason, or ai_unreadable when the body is not JSON. A network failure, a
 * timeout, a 429 or a 5xx answer is tried once more after 2 seconds.
 */
export async function chatCompletion(options: ChatCompletionOptions): Promise<unknown> {
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  try {
    return await attempt(options);
  } catch (error) {
    if (!isWorthRetrying(error)) throw error;
    await sleep(RETRY_DELAY_MS);
    return attempt(options);
  }
}

function isWorthRetrying(error: unknown): boolean {
  if (!(error instanceof AppError) || error.code !== 'ai_unreachable') return false;
  const { reason, status } = error.details as AiFailure;
  return reason === 'network' || reason === 'timeout' || status === 429 || (status !== null && status >= 500);
}

/** One request. The timer also covers reading the body, so a stalled stream cannot hang. */
async function attempt(options: ChatCompletionOptions): Promise<unknown> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(
        new AppError('ai_unreachable', 'AI provider did not answer in time', {
          reason: 'timeout',
          status: null,
          providerMessage: null,
        } satisfies AiFailure),
      );
      controller.abort();
    }, options.timeoutMs);
  });

  try {
    return await Promise.race([exchange(options, controller.signal), timedOut]);
  } finally {
    clearTimeout(timer);
  }
}

async function exchange(options: ChatCompletionOptions, signal: AbortSignal): Promise<unknown> {
  const fetchImpl = options.fetchImpl ?? fetch;

  let response: Response;
  try {
    response = await fetchImpl(options.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify(options.body),
      signal,
    });
  } catch {
    throw new AppError('ai_unreachable', 'Could not reach AI provider', {
      reason: 'network',
      status: null,
      providerMessage: null,
    } satisfies AiFailure);
  }

  if (!response.ok) {
    throw new AppError('ai_unreachable', `AI provider answered ${response.status}`, await failureFromResponse(response));
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new AppError('ai_unreadable', 'AI answer is not a readable JSON body', UNREADABLE_FAILURE);
  }

  const bodyFailure = failureFromErrorBody(body, null);
  if (bodyFailure) {
    throw new AppError('ai_unreachable', 'AI provider answered with an error body', bodyFailure);
  }
  return body;
}

const envelopeSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
});

/** Removes a ```json … ``` fence some models put around the JSON. */
export function stripCodeFence(text: string): string {
  const fenced = /^\s*```[a-zA-Z]*\s*\n?([\s\S]*?)\n?\s*```\s*$/.exec(text);
  return (fenced ? fenced[1]! : text).trim();
}

/**
 * The JSON the model wrote inside the answer envelope. Throws ai_unreadable,
 * without echoing the answer, when the envelope or the JSON is not usable.
 */
export function readAnswerContent(body: unknown): unknown {
  const envelope = envelopeSchema.safeParse(body);
  if (!envelope.success) throw new AppError('ai_unreadable', 'AI answer has an unexpected shape', UNREADABLE_FAILURE);

  try {
    return JSON.parse(stripCodeFence(envelope.data.choices[0]!.message.content));
  } catch {
    throw new AppError('ai_unreadable', 'AI answer is not valid JSON', UNREADABLE_FAILURE);
  }
}
