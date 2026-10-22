import { normalizeName } from '../../../shared/text';
import type { TransactionKind } from '../../../shared/types';

/** The fields of a vendor row that decide how a line is classified. */
export type VendorRule = {
  id: string;
  matchName: string;
  matchAmountCents: number | null;
  defaultCategoryId: string | null;
  defaultKind: TransactionKind | null;
};

/** A rule for this name and this exact signed amount ("Pix from Marina, R$ 500,00"). */
export function findAmountRule(
  rules: VendorRule[],
  vendorName: string,
  amountCents: number,
): VendorRule | null {
  const name = normalizeName(vendorName);
  if (!name) return null;
  return (
    rules.find(
      (rule) => rule.matchAmountCents === amountCents && normalizeName(rule.matchName) === name,
    ) ?? null
  );
}

/** A rule for this name at any amount. */
export function findNameRule(rules: VendorRule[], vendorName: string): VendorRule | null {
  const name = normalizeName(vendorName);
  if (!name) return null;
  return (
    rules.find((rule) => rule.matchAmountCents === null && normalizeName(rule.matchName) === name) ??
    null
  );
}
