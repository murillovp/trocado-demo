import { z } from 'zod';
import { AppError } from '../../shared/errors';
import { chatCompletion, readAnswerContent } from './chatCompletion';
import type { AiFailure } from './providerErrors';
import type { ClassifyVendorsInput, VendorClassifier, VendorSuggestion } from './types';

const UNREADABLE_FAILURE: AiFailure = { reason: 'unreadable', status: null, providerMessage: null };

/** The instructions. The catch-all sentence names the household's keyed categories as they are called now, and is left out when it has none. */
function systemPrompt(catchAlls: ClassifyVendorsInput['catchAlls']): string {
  const named = [
    catchAlls.spending === null ? null : `${JSON.stringify(catchAlls.spending)} for spending`,
    catchAlls.income === null ? null : `${JSON.stringify(catchAlls.income)} for income`,
  ].filter((part) => part !== null);
  return [
    'You name and categorise merchants from Brazilian bank statements.',
    'Names in spendingNames are money leaving the account: give each one a category copied exactly from spendingCategories.',
    'Names in incomeNames are money arriving: give each one a category copied exactly from incomeCategories.',
    'Never use a category from the other list.',
    ...(named.length === 0
      ? []
      : [`If no category clearly fits, use the list's catch-all (${named.join(', ')}), with a confidence below 0.5.`]),
    'For each raw merchant name, also give a short readable nickname (the brand as people say it, such as "iFood") and a confidence from 0 to 1.',
    'Use the examples to match how this household names things.',
    'Answer only with JSON shaped {"vendors":[{"name":"<raw name as given>","nickname":"...","category":"...","confidence":0.9}]}.',
  ].join(' ');
}

const vendorSchema = z.object({
  name: z.string(),
  nickname: z.string().trim().min(1),
  category: z.string(),
  confidence: z.number().min(0).max(1),
});

const answerSchema = z.object({ vendors: z.array(z.unknown()) });

/** Seller names are short: a stalled call is cut off after this long. */
const TIMEOUT_MS = 30_000;

export type OpenRouterOptions = {
  baseUrl: string;
  apiKey: string;
  model: string;
  fetchImpl?: typeof fetch;
  /** Waits before the retry. Tests pass a no-op. */
  sleep?: (ms: number) => Promise<void>;
};

/**
 * Calls an OpenAI-compatible chat endpoint (OpenRouter by default). The prompt
 * and the HTTP call live here and nowhere else. Only vendor names leave the
 * machine.
 */
export function createOpenRouterClassifier(options: OpenRouterOptions): VendorClassifier {
  const endpoint = `${options.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  return {
    async classifyVendors(input) {
      if (input.names.length === 0) return new Map();

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
            { role: 'system', content: systemPrompt(input.catchAlls) },
            {
              role: 'user',
              content: JSON.stringify({
                spendingCategories: input.categories.spending,
                incomeCategories: input.categories.income,
                examples: input.examples,
                spendingNames: input.names.filter((question) => question.direction === 'spending').map((q) => q.name),
                incomeNames: input.names.filter((question) => question.direction === 'income').map((q) => q.name),
              }),
            },
          ],
        },
      });

      return readAnswer(body, input);
    },
  };
}

/**
 * Keeps each well-formed suggestion for a name that was asked, with a listed
 * category. One bad item does not cost the good ones. Throws ai_unreadable
 * when not one item is usable, so an empty answer is never mistaken for "the
 * AI had nothing to say".
 */
function readAnswer(body: unknown, input: ClassifyVendorsInput): Map<string, VendorSuggestion> {
  const answer = answerSchema.safeParse(readAnswerContent(body));
  if (!answer.success) throw new AppError('ai_unreadable', 'AI answer does not match the expected vendors shape', UNREADABLE_FAILURE);

  const directionByName = new Map(input.names.map((question) => [question.name, question.direction]));
  const spendingCategories = new Set(input.categories.spending);
  const incomeCategories = new Set(input.categories.income);
  const result = new Map<string, VendorSuggestion>();
  let usableItems = 0;
  for (const item of answer.data.vendors) {
    const vendor = vendorSchema.safeParse(item);
    if (!vendor.success) continue;
    const direction = directionByName.get(vendor.data.name);
    if (!direction) continue;
    usableItems += 1;
    const allowed = direction === 'income' ? incomeCategories : spendingCategories;
    if (!allowed.has(vendor.data.category)) continue;
    result.set(vendor.data.name, {
      nickname: vendor.data.nickname,
      category: vendor.data.category,
      confidence: vendor.data.confidence,
    });
  }

  if (usableItems === 0) throw new AppError('ai_unreadable', 'AI answer has no usable vendor', UNREADABLE_FAILURE);
  return result;
}
