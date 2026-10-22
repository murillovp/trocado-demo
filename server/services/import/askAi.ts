import type { AiFailure } from '../../ai/providerErrors';
import type { VendorQuestion, VendorSuggestion } from '../../ai/types';
import { suggestVendors } from './suggest';
import type { ImportDeps } from './types';

/** What the AI said about the sellers it was asked about, and whether it failed. */
export type AiAnswers = {
  suggestions: Map<string, VendorSuggestion>;
  failed: boolean;
  failure: AiFailure | null;
};

/**
 * Step 2 of an import, and the only one that waits on the network: puts the
 * questions prepare could not answer to the AI. With no classifier, or no
 * question, it answers nothing and reports no failure.
 */
export async function askAi(deps: ImportDeps, householdId: string, questions: VendorQuestion[]): Promise<AiAnswers> {
  if (deps.classifier && questions.length > 0) deps.onStep?.({ step: 'asking_ai', count: questions.length });
  const { suggestions, failed, failure } = await suggestVendors(deps.db, householdId, deps.classifier, questions);
  return { suggestions, failed, failure };
}
