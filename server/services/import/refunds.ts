import { addDays } from '../../../shared/dates';

/** How many days before a refund its purchase can fall. */
const REFUND_WINDOW_DAYS = 7;

/** A purchase that a "ESTORNO" refund line might return money for. */
export type Purchase = {
  id: string;
  date: string;
  time: string | null;
  amountCents: number;
  vendorId: string | null;
  vendorName: string;
  categoryId: string | null;
};

/**
 * The latest purchase of the same amount (as money leaving) on or before the
 * refund, at most 7 days earlier. On the same date, a purchase with a known
 * time must be at or before the refund's time; one with no time counts as
 * earlier than any known time on that date. "Latest" ranks by date first,
 * then by that same rule for time, so a same-day purchase with a known time
 * outranks one with none. Returns null when no purchase matches.
 */
export function findRefundedPurchase(
  refund: { date: string; time: string | null; amountCents: number },
  purchases: Purchase[],
): Purchase | null {
  const earliestDate = addDays(refund.date, -REFUND_WINDOW_DAYS);

  let latest: Purchase | null = null;
  for (const purchase of purchases) {
    if (purchase.amountCents !== refund.amountCents) continue;
    if (purchase.date < earliestDate || purchase.date > refund.date) continue;
    if (purchase.date === refund.date && !isAtOrBefore(purchase.time, refund.time)) continue;

    if (!latest || isLater(purchase, latest)) latest = purchase;
  }
  return latest;
}

/** A known time is at or before another known time; no time counts as earlier than any known time. */
function isAtOrBefore(time: string | null, refundTime: string | null): boolean {
  if (time === null) return true;
  if (refundTime === null) return false;
  return time <= refundTime;
}

/** Greatest date wins; on a tied date, a known time outranks no time, then the later known time wins. */
function isLater(a: Purchase, b: Purchase): boolean {
  if (a.date !== b.date) return a.date > b.date;
  return (a.time ?? '') > (b.time ?? '');
}

/** The part of a refund line that finding its purchase needs. */
export type RefundLine = { id: string; date: string; time: string | null; amountCents: number };

/**
 * Finds the purchase each refund returns money for. A refund looks at the
 * purchases of its own file first, then at the account's earlier lines; the
 * first of equal candidates wins, so a purchase in the file beats an equally
 * recent earlier one. Two refunds of the same amount can match the same
 * purchase: a purchase is never used up. A refund with no purchase maps to null.
 */
export function matchRefunds(
  refunds: readonly RefundLine[],
  purchasesInFile: readonly Purchase[],
  earlierPurchases: readonly Purchase[],
): Map<string, Purchase | null> {
  const candidates = [...purchasesInFile, ...earlierPurchases];
  return new Map(
    refunds.map((refund): [string, Purchase | null] => [
      refund.id,
      findRefundedPurchase({ date: refund.date, time: refund.time, amountCents: -refund.amountCents }, candidates),
    ]),
  );
}

/** A group of earlier purchases worth reading from the database: one amount, one span of dates. */
export type RefundWindow = { amountCents: number; start: string; end: string };

/**
 * What to read from the database before the import starts, so matching the
 * refunds needs no database later. One window per purchase amount: from
 * 7 days before the earliest refund of that amount to the date of the latest.
 * That covers the 7 days before each refund, which is all
 * `findRefundedPurchase` accepts, and it also covers days it will reject
 * (the gaps between refunds), which it filters out again.
 */
export function refundWindows(lines: readonly { amountCents: number; date: string; refundOfEarlier: boolean }[]): RefundWindow[] {
  const byAmount = new Map<number, RefundWindow>();
  for (const line of lines) {
    if (!line.refundOfEarlier) continue;
    const amountCents = -line.amountCents;
    const start = addDays(line.date, -REFUND_WINDOW_DAYS);
    const known = byAmount.get(amountCents);
    byAmount.set(amountCents, {
      amountCents,
      start: known && known.start < start ? known.start : start,
      end: known && known.end > line.date ? known.end : line.date,
    });
  }
  return [...byAmount.values()];
}
