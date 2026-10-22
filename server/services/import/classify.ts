import type { CategoryKey } from '../../../shared/categoryKeys';
import { kindFitsAmount } from '../../../shared/kindRule';
import { isHouseholdPerson } from '../../../shared/pix';
import { isCardBillPayment } from '../../../shared/transfers';
import type { AccountType, CategoryAppliesTo, TransactionKind } from '../../../shared/types';
import { findAmountRule, findNameRule, type VendorRule } from './vendorMatch';

/** The parts of a parsed line the rules look at. */
export type ClassifyLine = {
  id: string;
  amountCents: number;
  vendorName: string;
  pixCounterparty: string | null;
  /** A Pix to or from a company (a CNPJ in the text). Only these Pix lines ask the AI (ADR-0011). */
  pixCompany: boolean;
  transferCandidate: boolean;
  isRefund: boolean;
  categoryKey: CategoryKey | null;
  /** A Swile "ESTORNO": refunds an earlier purchase whose seller this line does not name. */
  refundOfEarlier: boolean;
};

export type ClassifyContext = {
  /** Lines the pair matcher already paired. */
  pairedIds: Set<string>;
  rules: VendorRule[];
  /** Household people other than the account's owner. A Pix with one of their first names, and no rule with a type, waits for review. */
  otherPeopleNames: string[];
  /** The household's active category for each key. A renamed category still sits here; an archived or deleted one does not. */
  categoryIdsByKey: Map<CategoryKey, string>;
  /** Every category's direction, including archived ones a vendor rule may still point at. */
  categoryAppliesTo: Map<string, CategoryAppliesTo>;
  /** The account the line belongs to. A card's bill payment ("Pagamento recebido") never counts, see below. */
  accountType: AccountType;
};

export type DecisionRule =
  | 'pair'
  | 'refund'
  | 'card_payment'
  | 'amount_rule'
  | 'household_pix'
  | 'name_rule'
  | 'hint'
  | 'pix'
  | 'unmatched_transfer'
  | 'ask_ai';

export type Decision = {
  kind: TransactionKind | null;
  vendorId: string | null;
  categoryId: string | null;
  askAi: boolean;
  rule: DecisionRule;
};

/** Money leaving is an expense and money arriving is income, except a refund, which is money back on an expense. */
export function kindFromSign(line: { amountCents: number; isRefund: boolean }): TransactionKind {
  return line.amountCents < 0 || line.isRefund ? 'expense' : 'income';
}

/**
 * Decides what one line is. The order is the plan's decision 5: transfer pair,
 * a Swile "ESTORNO" refund, a card's bill payment, vendor rule with an amount,
 * vendor rule by name, Pix with a household person's first name (left for
 * review), category hint, unmatched Pix (kind from the sign; the AI only for a
 * company), other unmatched transfer-like line, and finally the AI. A person's
 * Pix name never reaches the AI.
 */
export function classifyLine(line: ClassifyLine, context: ClassifyContext): Decision {
  const nameRule = findNameRule(context.rules, line.vendorName);

  if (context.pairedIds.has(line.id)) {
    return { kind: 'transfer', vendorId: nameRule?.id ?? null, categoryId: null, askAi: false, rule: 'pair' };
  }

  if (line.refundOfEarlier) {
    // A Swile "ESTORNO" names no seller; which purchase it refunds is found
    // separately (findRefundedPurchase). It never reaches a vendor rule or
    // the AI (decision 11).
    return { kind: 'expense', vendorId: null, categoryId: null, askAi: false, rule: 'refund' };
  }

  if (isCardBillPayment({ accountType: context.accountType, transferCandidate: line.transferCandidate, amountCents: line.amountCents })) {
    // Money arriving on a card is always the bill payment ("Pagamento recebido"
    // is the only card line the parser marks a transfer candidate). It stays a
    // transfer even with no partner, so no vendor rule can turn it into income
    // (ADR-0008).
    return { kind: 'transfer', vendorId: nameRule?.id ?? null, categoryId: null, askAi: false, rule: 'card_payment' };
  }

  const amountRule = findAmountRule(context.rules, line.vendorName, line.amountCents);
  if (amountRule) return fromRule(amountRule, line, 'amount_rule', context);

  // A name rule with a type runs before the household check, so the user's
  // answer for a name is remembered (architecture decision 4). A rule with no
  // type is an old nickname-only rule: it must not turn a household Pix into a
  // Gasto, so the household check still asks, and keeps the rule's seller.
  if (nameRule && nameRule.defaultKind !== null) return fromRule(nameRule, line, 'name_rule', context);

  if (line.pixCounterparty && isHouseholdPerson(line.pixCounterparty, context.otherPeopleNames)) {
    // A first name alone is not proof the money stayed in the household
    // (AB-02): the review asks, and the answer becomes a name rule.
    return { kind: null, vendorId: nameRule?.id ?? null, categoryId: null, askAi: false, rule: 'household_pix' };
  }

  if (nameRule) return fromRule(nameRule, line, 'name_rule', context);

  if (line.categoryKey) {
    return {
      kind: kindFromSign(line),
      vendorId: null,
      categoryId: context.categoryIdsByKey.get(line.categoryKey) ?? null,
      askAi: false,
      rule: 'hint',
    };
  }

  if (line.pixCounterparty) {
    // An unmatched Pix is almost always spending or income (ADR-0011). Only a
    // company's name goes to the AI; a person's name stays on the machine.
    return { kind: kindFromSign(line), vendorId: null, categoryId: null, askAi: line.pixCompany, rule: 'pix' };
  }

  if (line.transferCandidate) {
    // No mirror and no rule, and not a Pix (a bill payment from checking):
    // where the money went is unknown. Leaving money is never assumed a
    // transfer (ADR-0003); the review screen asks.
    return {
      kind: line.amountCents < 0 ? null : 'income',
      vendorId: null,
      categoryId: null,
      askAi: false,
      rule: 'unmatched_transfer',
    };
  }

  return { kind: kindFromSign(line), vendorId: null, categoryId: null, askAi: true, rule: 'ask_ai' };
}

function fromRule(rule: VendorRule, line: ClassifyLine, name: DecisionRule, context: ClassifyContext): Decision {
  const kind = rule.defaultKind ?? kindFromSign(line);
  // Every line here is imported, so a rule that says Entrada never gives it to
  // money that left: the line keeps the seller and waits for review (ADR-0013).
  if (!kindFitsAmount(kind, line.amountCents, true)) {
    return { kind: null, vendorId: rule.id, categoryId: null, askAi: false, rule: name };
  }
  return {
    kind,
    vendorId: rule.id,
    categoryId: categoryFor(kind, rule.defaultCategoryId, context.categoryAppliesTo),
    askAi: false,
    rule: name,
  };
}

/**
 * A vendor rule's category is kept only when its direction fits the decided
 * kind: expense and savings need an expense category, income needs an income
 * one. A transfer never gets a category, and a mismatch waits for review
 * instead of showing the wrong kind of category on the line.
 */
function categoryFor(
  kind: TransactionKind,
  categoryId: string | null,
  categoryAppliesTo: Map<string, CategoryAppliesTo>,
): string | null {
  if (categoryId === null || kind === 'transfer') return null;
  const needs: CategoryAppliesTo = kind === 'income' ? 'income' : 'expense';
  return categoryAppliesTo.get(categoryId) === needs ? categoryId : null;
}
