import { createOpenRouterClassifier } from './openRouter';
import { createOpenRouterScreenshotReader } from './openRouterScreenshots';
import type { ScreenshotReader } from './screenshots';
import type { VendorClassifier } from './types';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * Builds the classifier from the household's settings. Without a key or a
 * model there is no AI: imports still work, and lines wait for a category.
 */
export function classifierFromSettings(settings: Record<string, string>): VendorClassifier | null {
  const apiKey = settings.ai_api_key;
  const model = settings.ai_model;
  if (!apiKey || !model) return null;

  return createOpenRouterClassifier({
    baseUrl: settings.ai_base_url || DEFAULT_BASE_URL,
    apiKey,
    model,
  });
}

/**
 * Builds the Swile screenshot reader from the household's settings. Needs
 * its own model (ai_vision_model): the classifier's model rarely reads images.
 */
export function screenshotReaderFromSettings(settings: Record<string, string>): ScreenshotReader | null {
  const apiKey = settings.ai_api_key;
  const model = settings.ai_vision_model;
  if (!apiKey || !model) return null;

  return createOpenRouterScreenshotReader({
    baseUrl: settings.ai_base_url || DEFAULT_BASE_URL,
    apiKey,
    model,
  });
}
