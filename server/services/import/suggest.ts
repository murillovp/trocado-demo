import { AppError } from '../../../shared/errors';
import type { AiFailure } from '../../ai/providerErrors';
import { isAiFailure } from '../../ai/providerErrors';
import type { VendorClassifier, VendorQuestion, VendorSuggestion } from '../../ai/types';
import { listCategories } from '../../db/categories';
import type { Db } from '../../db/client';
import { vendorExamples } from '../../db/vendors';
import { nameOfKey } from './categoryKeys';

/**
 * One question per name. A name whose lines move money both ways is left out:
 * one answer cannot fit both.
 */
export function questionsFor(
  lines: { vendorName: string; kind: 'expense' | 'income' }[],
): VendorQuestion[] {
  const directionByName = new Map<string, 'spending' | 'income' | 'mixed'>();
  for (const line of lines) {
    if (line.vendorName === '') continue;
    const direction = line.kind === 'income' ? 'income' : 'spending';
    const existing = directionByName.get(line.vendorName);
    if (existing === undefined) {
      directionByName.set(line.vendorName, direction);
    } else if (existing !== direction) {
      directionByName.set(line.vendorName, 'mixed');
    }
  }

  const questions: VendorQuestion[] = [];
  for (const [name, direction] of directionByName) {
    if (direction === 'mixed') continue;
    questions.push({ name, direction });
  }
  return questions;
}

/** One request carries at most this many names, so a long import cannot overflow or stall one answer. */
const MAX_NAMES_PER_REQUEST = 40;

/**
 * Asks the AI about names no rule knows, 40 names per request. A batch that
 * fails is reported with `failed: true` and its failure, and the batches that
 * worked still count: the import completes and the lines left without a
 * suggestion wait for a category. An unreadable answer lets the next batches
 * run. Any other failure (network, timeout, key, credit, status) stops the
 * rest, because they would fail the same way and each costs a time limit. Whatever the classifier answers, a suggestion whose
 * category is not in the list for that name's direction is dropped here,
 * regardless of whether the classifier already checked. `questions` is
 * already free of person-to-person Pix names; batching only splits it.
 */
export async function suggestVendors(
  db: Db,
  householdId: string,
  classifier: VendorClassifier | null,
  questions: VendorQuestion[],
): Promise<{ suggestions: Map<string, VendorSuggestion>; failed: boolean; failure: AiFailure | null }> {
  if (!classifier || questions.length === 0) return { suggestions: new Map(), failed: false, failure: null };

  const categories = listCategories(db, householdId);
  const spending = categories.filter((category) => category.appliesTo === 'expense').map((category) => category.name);
  const income = categories.filter((category) => category.appliesTo === 'income').map((category) => category.name);
  const catchAlls = {
    spending: nameOfKey(categories, 'other_expense'),
    income: nameOfKey(categories, 'other_income'),
  };
  const examples = vendorExamples(db, householdId);

  const suggestions = new Map<string, VendorSuggestion>();
  let firstFailure: AiFailure | null = null;
  for (let start = 0; start < questions.length; start += MAX_NAMES_PER_REQUEST) {
    const batch = questions.slice(start, start + MAX_NAMES_PER_REQUEST);
    try {
      const answers = await classifier.classifyVendors({ names: batch, examples, categories: { spending, income }, catchAlls });
      for (const [name, suggestion] of keepMatchingDirection(batch, answers, spending, income)) {
        suggestions.set(name, suggestion);
      }
    } catch (error) {
      const code = error instanceof AppError ? error.code : 'unknown_error';
      const failure: AiFailure =
        error instanceof AppError && isAiFailure(error.details)
          ? error.details
          : { reason: 'provider', status: null, providerMessage: null };
      console.warn('AI failure', { code, reason: failure.reason, status: failure.status });
      firstFailure ??= failure;
      if (code !== 'ai_unreadable') break;
    }
  }

  return { suggestions, failed: firstFailure !== null, failure: firstFailure };
}

/** Drops any answer whose category is not in the list for that name's direction. */
function keepMatchingDirection(
  questions: VendorQuestion[],
  answers: Map<string, VendorSuggestion>,
  spending: string[],
  income: string[],
): Map<string, VendorSuggestion> {
  const directionByName = new Map(questions.map((question) => [question.name, question.direction]));
  const spendingSet = new Set(spending);
  const incomeSet = new Set(income);

  const result = new Map<string, VendorSuggestion>();
  for (const [name, suggestion] of answers) {
    const direction = directionByName.get(name);
    if (!direction) continue;
    const allowed = direction === 'income' ? incomeSet : spendingSet;
    if (!allowed.has(suggestion.category)) continue;
    result.set(name, suggestion);
  }
  return result;
}
