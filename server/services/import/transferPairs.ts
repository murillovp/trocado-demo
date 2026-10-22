import { daysBetween } from '../../../shared/dates';

export type PairCandidate = { id: string; accountId: string; date: string; amountCents: number };
export type TransferPair = { firstId: string; secondId: string };

const MAX_DAYS_APART = 3;

/**
 * Finds money that left one household account and arrived in another (ADR-0003).
 * `fresh` are the lines being imported. `existing` are earlier lines still
 * waiting for a partner; two of those are never paired with each other here.
 * Every possible pair is ranked by days apart, then by its ids, and taken
 * greedily, so the result does not depend on the order lines arrive in.
 */
export function matchTransferPairs(fresh: PairCandidate[], existing: PairCandidate[]): TransferPair[] {
  const options: { first: PairCandidate; second: PairCandidate; days: number; order: string }[] = [];
  const pool = [...fresh, ...existing];

  for (const first of fresh) {
    for (const second of pool) {
      if (first.id === second.id || first.accountId === second.accountId) continue;
      if (first.amountCents === 0 || first.amountCents !== -second.amountCents) continue;
      const days = daysBetween(first.date, second.date);
      if (days > MAX_DAYS_APART) continue;
      const [low, high] = first.id < second.id ? [first.id, second.id] : [second.id, first.id];
      options.push({ first, second, days, order: `${low}|${high}` });
    }
  }

  options.sort((a, b) => a.days - b.days || (a.order < b.order ? -1 : a.order > b.order ? 1 : 0));

  const taken = new Set<string>();
  const pairs: TransferPair[] = [];
  for (const option of options) {
    if (taken.has(option.first.id) || taken.has(option.second.id)) continue;
    taken.add(option.first.id);
    taken.add(option.second.id);
    pairs.push({ firstId: option.first.id, secondId: option.second.id });
  }
  return pairs;
}
