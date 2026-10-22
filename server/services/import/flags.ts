import type { ReviewFlag } from '../../../shared/contract/imports';
import { LOW_CONFIDENCE } from '../../ai/types';
import type { ImportLine } from '../../db/transactions';

export type { ReviewFlag };

/** Why a line needs a look. An empty list means it can be confirmed as it is. */
export function reviewFlags(line: ImportLine): ReviewFlag[] {
  const flags: ReviewFlag[] = [];
  if (line.kind === null) flags.push('kind_unset');
  if ((line.kind === 'expense' || line.kind === 'income') && line.categoryId === null) {
    flags.push('no_category');
  }
  if (
    line.vendorSource === 'ai' &&
    !line.vendorConfirmed &&
    (line.vendorAiConfidence ?? 0) < LOW_CONFIDENCE
  ) {
    flags.push('low_confidence');
  }
  return flags;
}

export function countNeedingReview(lines: ImportLine[]): number {
  return lines.filter((line) => reviewFlags(line).length > 0).length;
}
