import { z } from 'zod';
import { isRealDate } from '../../shared/dates';
import { AppError } from '../../shared/errors';
import { chatCompletion, readAnswerContent } from './chatCompletion';
import type { AiFailure } from './providerErrors';
import { cacheScreenshotRows, getCachedScreenshotRows } from './screenshotCache';
import type { ScreenshotReader, ScreenshotRow } from './screenshots';

const UNREADABLE_FAILURE: AiFailure = { reason: 'unreadable', status: null, providerMessage: null };

/** A screenshot is a bigger request than seller names: one read may take this long. */
const TIMEOUT_MS = 60_000;

const SCREENSHOT_PROMPT = [
  'This is a screenshot of the "Extrato" screen of the Swile app (Brazil).',
  'List every transaction row, top to bottom. Ignore the header, the balance and day headings such as "Hoje", "Ontem" or "Sex. 18/09/2026".',
  'For each row give: description exactly as shown; date as YYYY-MM-DD from the row\'s own "DD/MM/YYYY • HH:MM" line; time as HH:MM; amount in centavos as an integer, negative when the row shows "-" and positive when it shows "+".',
  'If any of date, time or amount is cut off or not fully visible, set that field to null. Never guess.',
  'Answer only with JSON shaped {"rows":[{"description":"...","date":"2026-09-18","time":"18:56","amountCents":-1290}]}.',
].join(' ');

const rowSchema = z.object({
  description: z.string().trim().min(1),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  amountCents: z.number().int().nullable(),
});

const answerSchema = z.object({ rows: z.array(rowSchema) });

export type OpenRouterScreenshotOptions = {
  baseUrl: string;
  apiKey: string;
  model: string;
  fetchImpl?: typeof fetch;
  /** Waits before the retry. Tests pass a no-op. */
  sleep?: (ms: number) => Promise<void>;
};

/**
 * Calls an OpenAI-compatible chat endpoint (OpenRouter by default) with a
 * Swile statement screenshot and reads back the transaction rows. A screenshot
 * already read by the same model in the last hour is not sent again. Never
 * logs the model's answer or the image.
 */
export function createOpenRouterScreenshotReader(options: OpenRouterScreenshotOptions): ScreenshotReader {
  const endpoint = `${options.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  return {
    async readSwileScreenshot(image) {
      const cached = getCachedScreenshotRows(image.bytes, options.model);
      if (cached) return cached;

      const dataUrl = `data:${image.mimeType};base64,${Buffer.from(image.bytes).toString('base64')}`;

      const body = await chatCompletion({
        endpoint,
        apiKey: options.apiKey,
        timeoutMs: TIMEOUT_MS,
        fetchImpl: options.fetchImpl,
        sleep: options.sleep,
        body: {
          model: options.model,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: SCREENSHOT_PROMPT },
                { type: 'image_url', image_url: { url: dataUrl } },
              ],
            },
          ],
        },
      });

      const rows = readAnswer(body);
      if (isCompleteRead(rows)) cacheScreenshotRows(image.bytes, options.model, rows);
      return rows;
    },
  };
}

/**
 * True when every row has all its fields and a date on the calendar. A read
 * with no rows or a gap is reused for an hour only if it is whole, so asking
 * again gets the model another chance to read it properly.
 */
function isCompleteRead(rows: ScreenshotRow[]): boolean {
  return (
    rows.length > 0 &&
    rows.every(
      (row) =>
        row.date !== null &&
        isRealDate(row.date) &&
        row.time !== null &&
        row.amountCents !== null,
    )
  );
}

/** Reads the rows out of the answer. Throws ai_unreadable without echoing the answer. */
function readAnswer(body: unknown): ScreenshotRow[] {
  const answer = answerSchema.safeParse(readAnswerContent(body));
  if (!answer.success) {
    throw new AppError('ai_unreadable', 'AI answer does not match the expected rows shape', UNREADABLE_FAILURE);
  }

  return answer.data.rows;
}
