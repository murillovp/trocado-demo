/** What the Transações endpoints answer. */
import type { TransactionKind } from '../types';
import type { Tag, VendorSource } from './entities';

export type TransferPartner = {
  id: string;
  date: string;
  amountCents: number;
  accountId: string;
  accountLabel: string;
  /** True while the partner still sits in an import the user has not confirmed. */
  inReview: boolean;
};

/** One line as the Transações screen shows it. */
export type LedgerLine = {
  id: string;
  date: string;
  /** The amount that counts: the user's when he changed it, else the bank's. */
  amountCents: number;
  /** The bank's amount when the user changed the line's amount; null otherwise. */
  bankAmountCents: number | null;
  rawDescription: string;
  vendorName: string;
  /** The seller rule the line follows; null on a line with no seller. */
  vendorId: string | null;
  /** Who wrote the seller rule: the AI (shown with the "IA" mark until the user checks it) or the user. */
  vendorSource: VendorSource | null;
  /**
   * How many of the seller's other lines outside review have this line's
   * category (none matches none). 0 on a line with no seller or one a
   * correction cannot move, such as a transfer.
   */
  sameVendorCategoryCount: number;
  nickname: string | null;
  kind: TransactionKind | null;
  categoryId: string | null;
  categoryName: string | null;
  savingsLabel: string | null;
  note: string | null;
  accountId: string;
  accountLabel: string;
  personId: string;
  personName: string;
  transferPairId: string | null;
  /** Added by hand on Transações rather than read from a bank file. */
  isManual: boolean;
  installment: { number: number; total: number } | null;
  /** The other half of a matched transfer, and the account the money moved to or from. */
  transferPartner: TransferPartner | null;
  /** The tags on the line, sorted by name. Tags never change a total. */
  tags: Tag[];
};

/** A saved line and how many other lines of its seller the same save moved. */
export type EditLineResult = { transaction: LedgerLine; vendorLinesMoved: number };

/**
 * The totals of the lines a Transações query lists, all of them and not one
 * page. Signed like the month report: spending and savings are positive when
 * money left.
 */
export type LedgerSummary = {
  spendingCents: number;
  incomeCents: number;
  savingsCents: number;
  /** Lines of kind transfer. They stay listed but count in no total ("fora dos totais"). */
  transferCount: number;
  /** Spending plus savings, the figure the budget shows for a pile. */
  pileTotalCents: number;
};
