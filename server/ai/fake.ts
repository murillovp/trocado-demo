import { AppError } from '../../shared/errors';
import type { AiFailure } from './providerErrors';
import type { ScreenshotReader, ScreenshotRow } from './screenshots';
import type { ClassifyVendorsInput, VendorClassifier, VendorSuggestion } from './types';

/** Answers from a fixed table and records every call. No network. */
export function createFakeClassifier(
  answers: Record<string, VendorSuggestion>,
): VendorClassifier & { calls: ClassifyVendorsInput[] } {
  const calls: ClassifyVendorsInput[] = [];
  return {
    calls,
    async classifyVendors(input) {
      calls.push(input);
      const result = new Map<string, VendorSuggestion>();
      for (const question of input.names) {
        const suggestion = answers[question.name];
        if (suggestion) result.set(question.name, suggestion);
      }
      return result;
    },
  };
}

/**
 * Always fails, as an unreachable provider would. Pass `failure` to simulate
 * a specific reason (e.g. a 429); omit it to simulate an error with no
 * AiFailure details, exercising the fallback reason.
 */
export function createFailingClassifier(failure?: AiFailure): VendorClassifier {
  return {
    async classifyVendors() {
      throw new AppError('ai_unreachable', 'Fake provider is down', failure);
    },
  };
}

/** Returns a fixed set of rows for every screenshot and records every call. No network. */
export function createFakeScreenshotReader(
  rows: ScreenshotRow[],
): ScreenshotReader & { calls: { bytes: Uint8Array; mimeType: string }[] } {
  const calls: { bytes: Uint8Array; mimeType: string }[] = [];
  return {
    calls,
    async readSwileScreenshot(image) {
      calls.push(image);
      return rows;
    },
  };
}

/** Always fails, as an unreadable answer would. */
export function createFailingScreenshotReader(): ScreenshotReader {
  return {
    async readSwileScreenshot() {
      throw new AppError('ai_unreadable', 'Fake reader cannot read this screenshot');
    },
  };
}
