import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { openDatabase, type Db } from '../../server/db/client';
import { seedHousehold } from '../../server/db/seed';
import {
  accounts,
  categories,
  importRows,
  imports,
  installmentPlans,
  people,
  tags,
  transactionTags,
  transactions,
  vendors,
} from '../../server/db/schema';
import { normalizeName } from '../../shared/text';
import type { AccountKey } from './catalog';
import { buildDrafts, demoMonths, INSTALLMENT_PLANS, isoDate, TAG_NAMES, type Draft } from './drafts';

const ACCOUNT_LABELS: Record<AccountKey, string> = {
  brunoConta: 'Nubank conta',
  brunoCartao: 'Nubank cartão',
  marinaConta: 'Itaú conta',
};

const IMPORT_FORMATS = {
  brunoConta: 'nubank_checking_csv',
  brunoCartao: 'nubank_card_csv',
  marinaConta: 'itau_checking_pdf',
} as const;

/** Net monthly pay used as each person's reference income on Orçamento. */
const REFERENCE_INCOME_CENTS = { Bruno: 1000000, Marina: 840000 } as const;

export type DemoDatabase = { db: Db; householdId: string };

/** Creates the demo database at `path`: the starting household plus a year of made-up lines. */
export function buildDemoDb(path: string): DemoDatabase {
  const db = openDatabase(path);
  const { householdId, peopleByName, accountsByLabel } = seedHousehold(db);
  for (const [name, cents] of Object.entries(REFERENCE_INCOME_CENTS)) {
    db.update(people).set({ referenceIncomeCents: cents }).where(eq(people.id, peopleByName[name]!)).run();
  }

  const accountIds = Object.fromEntries(
    Object.entries(ACCOUNT_LABELS).map(([key, label]) => [key, accountsByLabel[label]!]),
  ) as Record<AccountKey, string>;
  const categoryIds = new Map(db.select().from(categories).all().map((row) => [row.name, row.id]));
  const drafts = buildDrafts();

  db.transaction((tx) => {
    const executor = tx as unknown as Db;
    const importIds = insertImports(executor, householdId, accountIds, drafts);
    const vendorIds = insertVendors(executor, householdId, categoryIds, drafts);
    const planIds = insertPlans(executor, householdId, accountIds.brunoCartao, vendorIds, categoryIds);
    const tagIds = insertTags(executor, householdId);
    insertLines(executor, { householdId, accountIds, categoryIds, importIds, vendorIds, planIds, tagIds, drafts });
  });
  return { db, householdId };
}

function monthKey(account: AccountKey, date: string): string {
  return `${account}|${date.slice(0, 7)}`;
}

function insertImports(db: Db, householdId: string, accountIds: Record<AccountKey, string>, drafts: Draft[]) {
  const ids = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const draft of drafts) counts.set(monthKey(draft.account, draft.date), (counts.get(monthKey(draft.account, draft.date)) ?? 0) + 1);
  for (const month of demoMonths()) {
    for (const account of Object.keys(accountIds) as AccountKey[]) {
      const key = monthKey(account, isoDate(month, 1));
      const id = randomUUID();
      ids.set(key, id);
      const ym = key.split('|')[1]!;
      db.insert(imports)
        .values({
          id,
          householdId,
          accountId: accountIds[account],
          fileName: `${ACCOUNT_LABELS[account].toLowerCase().replace(/\s+/g, '-')}-${ym}${account === 'marinaConta' ? '.pdf' : '.csv'}`,
          fileBytes: Buffer.alloc(0),
          format: IMPORT_FORMATS[account],
          status: 'confirmed',
          importedAt: `${isoDate(month, month.lastDay)} 21:30:00`,
          periodStart: isoDate(month, 1),
          periodEnd: isoDate(month, month.lastDay),
          lineCount: counts.get(key) ?? 0,
        })
        .run();
    }
  }
  return ids;
}

function insertVendors(db: Db, householdId: string, categoryIds: Map<string, string>, drafts: Draft[]) {
  const ids = new Map<string, string>();
  for (const draft of drafts) {
    const matchName = normalizeName(draft.vendorName);
    if (ids.has(matchName)) continue;
    const id = randomUUID();
    ids.set(matchName, id);
    db.insert(vendors)
      .values({
        id,
        householdId,
        matchName,
        nickname: draft.nickname,
        defaultCategoryId: draft.category ? categoryIds.get(draft.category)! : null,
        defaultKind: draft.kind,
        confirmed: !draft.aiGuess,
        source: draft.aiGuess ? 'ai' : 'user',
        aiConfidence: draft.aiGuess ? 0.74 : null,
      })
      .run();
  }
  return ids;
}

function insertPlans(db: Db, householdId: string, accountId: string, vendorIds: Map<string, string>, categoryIds: Map<string, string>) {
  void categoryIds;
  const ids = new Map<string, string>();
  const months = demoMonths();
  for (const plan of INSTALLMENT_PLANS) {
    const id = randomUUID();
    ids.set(plan.key, id);
    db.insert(installmentPlans)
      .values({
        id,
        householdId,
        accountId,
        vendorId: vendorIds.get(normalizeName(plan.vendorName)) ?? null,
        description: plan.nickname,
        totalInstallments: plan.total,
        installmentAmountCents: plan.cents,
        firstDate: isoDate(months[plan.firstMonthIndex]!, plan.day),
      })
      .run();
  }
  return ids;
}

function insertTags(db: Db, householdId: string) {
  const ids = new Map<string, string>();
  for (const name of TAG_NAMES) {
    const id = randomUUID();
    ids.set(name, id);
    db.insert(tags).values({ id, householdId, name }).run();
  }
  return ids;
}

type LineInput = {
  householdId: string;
  accountIds: Record<AccountKey, string>;
  categoryIds: Map<string, string>;
  importIds: Map<string, string>;
  vendorIds: Map<string, string>;
  planIds: Map<string, string>;
  tagIds: Map<string, string>;
  drafts: Draft[];
};

function insertLines(db: Db, input: LineInput): void {
  const pairIds = new Map<string, string>();
  const rowsPerImport = new Map<string, number>();
  input.drafts.forEach((draft, position) => {
    const id = `demo-line-${String(position + 1).padStart(5, '0')}`;
    const pairId = draft.pairKey ? (pairIds.get(draft.pairKey) ?? randomUUID()) : null;
    if (draft.pairKey && pairId) pairIds.set(draft.pairKey, pairId);
    const importId = input.importIds.get(monthKey(draft.account, draft.date))!;
    const sourceLine = (rowsPerImport.get(importId) ?? 0) + 1;
    rowsPerImport.set(importId, sourceLine);
    db.insert(transactions)
      .values({
        id,
        householdId: input.householdId,
        accountId: input.accountIds[draft.account],
        importId,
        date: draft.date,
        amountCents: draft.cents,
        rawDescription: draft.installment
          ? `${draft.vendorName} ${String(draft.installment.number).padStart(2, '0')}/${String(draft.installment.total).padStart(2, '0')}`
          : draft.vendorName,
        vendorId: input.vendorIds.get(normalizeName(draft.vendorName))!,
        vendorName: draft.vendorName,
        categoryId: draft.category ? input.categoryIds.get(draft.category)! : null,
        kind: draft.kind,
        savingsLabel: draft.savingsLabel ?? null,
        installmentPlanId: draft.installment ? input.planIds.get(draft.installment.plan)! : null,
        installmentNumber: draft.installment?.number ?? null,
        transferPairId: pairId,
        dedupeKey: id,
      })
      .run();
    db.insert(importRows)
      .values({
        id: `demo-row-${String(position + 1).padStart(5, '0')}`,
        householdId: input.householdId,
        importId,
        sourceLine,
        date: draft.date,
        amountCents: draft.cents,
        text: draft.vendorName,
        status: 'imported',
        transactionId: id,
      })
      .run();
    for (const tag of draft.tags ?? []) {
      db.insert(transactionTags).values({ transactionId: id, tagId: input.tagIds.get(tag)! }).run();
    }
  });
}
