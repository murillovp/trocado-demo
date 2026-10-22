import type { VendorSuggestion } from '../../ai/types';
import type { ParsedLine } from '../../parsers/types';
import type { NewImportRow } from '../../db/importRows';
import type { NewTransaction } from '../../db/transactions';
import { alignToCategory } from '../lines/kindRule';
import type { AiAnswers } from './askAi';
import { assignInstallments } from './installments';
import type { ImportPlan } from './plan';
import type { Prepared, StagedLine } from './prepare';
import type { ReadImport } from './reader';
import { matchRefunds, type Purchase } from './refunds';
import type { ImportSnapshot } from './snapshot';

/**
 * Step 3 of an import: from the prepared lines, the AI's answers and the
 * snapshot, decide every row the import stores. It matches Swile refunds to
 * their purchases here, so the write step has nothing left to look up.
 * Pure: the only outside input is the id generator.
 */

export type DecideInput = {
  householdId: string;
  read: ReadImport;
  prepared: Prepared;
  suggestions: AiAnswers['suggestions'];
  snapshot: ImportSnapshot;
  newId: () => string;
};

/** A line's seller and category once the AI's answer is applied. */
type Chosen = { vendorId: string | null; categoryId: string | null };

type AiVendor = { id: string; categoryId: string | null };

export function decideImport(input: DecideInput): ImportPlan {
  const { householdId, read, prepared, snapshot, newId } = input;
  const { account, parsed } = read;

  const installments = planInstallments(prepared.staged, snapshot, newId);
  const importId = newId();
  const aiVendors = planAiVendors(input.suggestions, snapshot.categoryIdsByName, newId);
  const chosen = chooseVendorsAndCategories(prepared, aiVendors.byName);
  const refunds = matchStagedRefunds(prepared, chosen, snapshot.refundCandidates);

  return {
    householdId,
    accountId: account.id,
    importRow: {
      id: importId,
      householdId,
      accountId: account.id,
      fileName: read.fileName,
      fileBytes: read.fileBytes,
      format: read.format,
      status: 'pending',
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      lineCount: prepared.staged.length,
    },
    images: read.images.map((image) => ({
      id: newId(),
      householdId,
      importId,
      position: image.position,
      fileName: image.fileName,
      mimeType: image.mimeType,
      bytes: image.bytes,
    })),
    vendors: aiVendors.rows,
    installmentPlans: installments.created,
    transactions: buildTransactions({ ...input, importId, chosen, refunds, planIdByLine: installments.planIdByLine }),
    pairs: prepared.pairs,
    importRows: buildImportRows(input, importId),
    counts: {
      lineCount: prepared.staged.length,
      droppedCount: prepared.droppedCount,
      ignoredCount: parsed.skipped.length,
      pairedCount: prepared.pairs.length,
    },
  };
}

function planInstallments(staged: readonly StagedLine[], snapshot: ImportSnapshot, newId: () => string) {
  return assignInstallments(
    snapshot.plans,
    staged.flatMap((line) =>
      line.installment
        ? [
            {
              lineId: line.id,
              number: line.installment.number,
              total: line.installment.total,
              description: line.installment.description,
              amountCents: line.amountCents,
              date: line.date,
            },
          ]
        : [],
    ),
    newId,
  );
}

/** One unconfirmed seller per name the AI answered, with the category it named if that category exists. */
function planAiVendors(
  suggestions: ReadonlyMap<string, VendorSuggestion>,
  categoryIdsByName: ReadonlyMap<string, string>,
  newId: () => string,
): { rows: ImportPlan['vendors']; byName: Map<string, AiVendor> } {
  const rows: ImportPlan['vendors'] = [];
  const byName = new Map<string, AiVendor>();
  for (const [name, suggestion] of suggestions) {
    const id = newId();
    const categoryId = categoryIdsByName.get(suggestion.category) ?? null;
    rows.push({
      id,
      matchName: name,
      nickname: suggestion.nickname,
      defaultCategoryId: categoryId,
      confirmed: false,
      source: 'ai',
      aiConfidence: suggestion.confidence,
    });
    byName.set(name, { id, categoryId });
  }
  return { rows, byName };
}

/** Each line's seller and category before a refund might still copy them from the purchase it returns money for. */
function chooseVendorsAndCategories(prepared: Prepared, aiVendors: ReadonlyMap<string, AiVendor>): Map<string, Chosen> {
  const chosen = new Map<string, Chosen>();
  for (const line of prepared.staged) {
    const decision = prepared.decisions.get(line.id)!;
    const ai = decision.askAi ? aiVendors.get(line.vendorName) : undefined;
    chosen.set(line.id, {
      vendorId: ai?.id ?? decision.vendorId,
      categoryId: ai?.categoryId ?? decision.categoryId,
    });
  }
  return chosen;
}

/**
 * A Swile "ESTORNO" names no seller of its own: it takes the seller and
 * category of the latest purchase of the same amount in the 7 days before it,
 * on this account, from this import or an earlier one (decision 11). With no
 * such purchase it stays unmatched.
 */
function matchStagedRefunds(
  prepared: Prepared,
  chosen: ReadonlyMap<string, Chosen>,
  earlierPurchases: readonly Purchase[],
): Map<string, Purchase | null> {
  const refunds = prepared.staged.filter((line) => prepared.decisions.get(line.id)!.rule === 'refund');
  if (refunds.length === 0) return new Map();

  const purchasesInFile = prepared.staged
    .filter((line) => {
      // Only an actual purchase can be refunded: a real expense, not another
      // refund (which the classifier also decides as an expense, but names
      // no seller of its own).
      const decision = prepared.decisions.get(line.id)!;
      return decision.kind === 'expense' && decision.rule !== 'refund';
    })
    .map((line): Purchase => ({
      id: line.id,
      date: line.date,
      time: line.time,
      amountCents: line.amountCents,
      vendorId: chosen.get(line.id)!.vendorId,
      vendorName: line.vendorName,
      categoryId: chosen.get(line.id)!.categoryId,
    }));
  return matchRefunds(refunds, purchasesInFile, earlierPurchases);
}

function buildTransactions(
  input: DecideInput & {
    importId: string;
    chosen: ReadonlyMap<string, Chosen>;
    refunds: ReadonlyMap<string, Purchase | null>;
    planIdByLine: ReadonlyMap<string, string>;
  },
): NewTransaction[] {
  const { householdId, read, prepared, snapshot, importId, chosen, refunds, planIdByLine } = input;
  return prepared.staged.map((line) => {
    const decision = prepared.decisions.get(line.id)!;
    const own = chosen.get(line.id)!;
    const matched = refunds.get(line.id);
    // The category's group has the last word on savings (ADR-0012).
    const aligned = alignToCategory(decision.kind, matched ? matched.categoryId : own.categoryId, snapshot.categoryFacts);
    return {
      id: line.id,
      householdId,
      accountId: read.account.id,
      importId,
      date: line.date,
      amountCents: line.amountCents,
      rawDescription: line.rawDescription,
      vendorName: matched ? matched.vendorName : line.vendorName,
      bankReference: line.bankReference,
      dedupeKey: line.dedupeKey,
      transferCandidate: line.transferCandidate,
      kind: aligned.kind,
      vendorId: matched ? matched.vendorId : own.vendorId,
      categoryId: aligned.categoryId,
      installmentPlanId: planIdByLine.get(line.id) ?? null,
      installmentNumber: line.installment?.number ?? null,
    };
  });
}

/** One row per line the file showed: stored, already held, repeated within the upload, or passed over. */
function buildImportRows(input: DecideInput, importId: string): NewImportRow[] {
  const { householdId, read, prepared, newId } = input;
  const base = { householdId, importId };

  // A repeat's earlier occurrence is either a line staged in this same
  // import, or (when the account already held that key) the transaction
  // `dropKnownLines` found for it.
  const transactionIdByKey = new Map<string, string>();
  for (const line of prepared.staged) transactionIdByKey.set(line.dedupeKey, line.id);
  for (const line of prepared.duplicates) transactionIdByKey.set(line.dedupeKey, line.existingTransactionId);

  const lineRow = (line: ParsedLine, status: 'imported' | 'duplicate', transactionId: string | null): NewImportRow => ({
    ...base,
    id: newId(),
    sourceLine: line.sourceLine,
    date: line.date,
    amountCents: line.amountCents,
    text: line.rawDescription,
    status,
    transactionId,
    imageIndex: line.imageIndex,
  });

  return [
    ...prepared.staged.map((line) => lineRow(line, 'imported', line.id)),
    ...prepared.duplicates.map((line) => lineRow(line, 'duplicate', line.existingTransactionId)),
    ...read.repeats.map((line) => lineRow(line, 'duplicate', transactionIdByKey.get(line.repeatOfKey) ?? null)),
    ...read.parsed.skipped.map((row): NewImportRow => ({
      ...base,
      id: newId(),
      sourceLine: row.sourceLine,
      date: row.date,
      amountCents: null,
      text: row.text,
      status: 'ignored',
      reason: row.reason,
      imageIndex: row.imageIndex,
    })),
  ];
}
