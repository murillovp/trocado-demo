/**
 * The categories the code relies on, by a key that never changes. A category's
 * display name can be renamed; its key stays. Parsers, classification, the AI
 * prompt and the seed all read this one list (ADR-0016).
 */
export const CATEGORY_KEYS = ['salary', 'bonus', 'taxes_fees', 'other_expense', 'other_income'] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];
