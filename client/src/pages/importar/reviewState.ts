import type { AiFailure } from '@/api/types';
import { aiFailureOf } from '@/lib/aiErrors';

/** What the upload hands the review screen through the navigation: why the AI gave no suggestions, if it did not. */
export type ReviewNavigationState = { aiFailure: AiFailure };

/** The AI failure carried in a review's navigation state, or null when there is none or it cannot be read. */
export function aiFailureFromState(state: unknown): AiFailure | null {
  if (typeof state !== 'object' || state === null) return null;
  return aiFailureOf((state as Partial<ReviewNavigationState>).aiFailure);
}
