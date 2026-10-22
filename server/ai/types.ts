export type VendorSuggestion = { nickname: string; category: string; confidence: number };

/** A vendor the user already confirmed, shown to the model as an example. */
export type VendorExample = { rawName: string; nickname: string; category: string };

/** Which way the money moved: out of the account (spending) or into it (income). */
export type VendorDirection = 'spending' | 'income';

/** A raw vendor name and which way its money moved. */
export type VendorQuestion = { name: string; direction: VendorDirection };

export type ClassifyVendorsInput = {
  /** Raw vendor names only, each once. Never amounts, dates, or people's names. */
  names: VendorQuestion[];
  examples: VendorExample[];
  /** PT-BR category names. A spending name must get a spending category, an income name an income one. */
  categories: { spending: string[]; income: string[] };
  /** The current names of the household's catch-all categories (the keyed "other" ones), or null when it has none. */
  catchAlls: { spending: string | null; income: string | null };
};

export interface VendorClassifier {
  /** Suggestions keyed by raw name. A name missing from the map got no usable answer. */
  classifyVendors(input: ClassifyVendorsInput): Promise<Map<string, VendorSuggestion>>;
}

/** Suggestions below this are flagged on the review screen. */
export const LOW_CONFIDENCE = 0.7;
