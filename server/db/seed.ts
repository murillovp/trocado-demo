import { randomUUID } from 'node:crypto';
import type { CategoryKey } from '../../shared/categoryKeys';
import type { CategoryAppliesTo, CategoryBucket } from '../../shared/types';
import type { Db } from './client';
import { accounts, categories, households, people } from './schema';

type CategorySeed = {
  name: string;
  /** Set on the categories the code looks up (parsers, classification, the AI prompt). */
  systemKey?: CategoryKey;
  appliesTo: CategoryAppliesTo;
  bucket: CategoryBucket | null;
};

/**
 * The starting category list. Every name is PT-BR because these reach the screen.
 * Every expense category carries a bucket so the Orçamento screen has something
 * to add up on day one. Income categories carry none: the 50/30/20 split is
 * about where money goes, not where it came from.
 */
export const DEFAULT_CATEGORIES: readonly CategorySeed[] = [
  { name: 'Mercado', appliesTo: 'expense', bucket: 'needs' },
  { name: 'Moradia', appliesTo: 'expense', bucket: 'needs' },
  { name: 'Contas de casa', appliesTo: 'expense', bucket: 'needs' },
  { name: 'Internet e telefone', appliesTo: 'expense', bucket: 'needs' },
  { name: 'Transporte', appliesTo: 'expense', bucket: 'needs' },
  { name: 'Saúde e farmácia', appliesTo: 'expense', bucket: 'needs' },
  { name: 'Educação', appliesTo: 'expense', bucket: 'needs' },
  { name: 'Pets', appliesTo: 'expense', bucket: 'needs' },
  { name: 'Seguros', appliesTo: 'expense', bucket: 'needs' },
  { name: 'Impostos e taxas', systemKey: 'taxes_fees', appliesTo: 'expense', bucket: 'needs' },
  { name: 'Delivery', appliesTo: 'expense', bucket: 'wants' },
  { name: 'Restaurantes', appliesTo: 'expense', bucket: 'wants' },
  { name: 'Bares e cafés', appliesTo: 'expense', bucket: 'wants' },
  { name: 'Compras', appliesTo: 'expense', bucket: 'wants' },
  { name: 'Assinaturas', appliesTo: 'expense', bucket: 'wants' },
  { name: 'Lazer e cultura', appliesTo: 'expense', bucket: 'wants' },
  { name: 'Viagens', appliesTo: 'expense', bucket: 'wants' },
  { name: 'Beleza e cuidados pessoais', appliesTo: 'expense', bucket: 'wants' },
  { name: 'Presentes', appliesTo: 'expense', bucket: 'wants' },
  { name: 'Outros', systemKey: 'other_expense', appliesTo: 'expense', bucket: 'needs' },
  { name: 'Poupança e investimentos', appliesTo: 'expense', bucket: 'savings' },
  { name: 'Empréstimo pago', appliesTo: 'expense', bucket: 'savings' },
  { name: 'Salário', systemKey: 'salary', appliesTo: 'income', bucket: null },
  { name: 'Bônus', systemKey: 'bonus', appliesTo: 'income', bucket: null },
  { name: 'Rendimentos', appliesTo: 'income', bucket: null },
  { name: 'Reembolso', appliesTo: 'income', bucket: null },
  { name: 'Empréstimo recebido', appliesTo: 'income', bucket: null },
  { name: 'Outras entradas', systemKey: 'other_income', appliesTo: 'income', bucket: null },
];

const ACCOUNT_SEEDS = [
  { owner: 'Bruno', bank: 'nubank', type: 'checking', label: 'Nubank conta' },
  { owner: 'Bruno', bank: 'nubank', type: 'card', label: 'Nubank cartão' },
  { owner: 'Marina', bank: 'itau', type: 'checking', label: 'Itaú conta' },
] as const;

export type SeedResult = {
  householdId: string;
  peopleByName: Record<string, string>;
  accountsByLabel: Record<string, string>;
};

/**
 * Creates the household, its two people, their accounts, and the default
 * categories. Safe to run on every boot: if a household already exists, it
 * reads the ids back instead of creating a second one.
 */
export function seedHousehold(db: Db): SeedResult {
  const existing = db.select().from(households).all();
  if (existing.length > 0) {
    return readExisting(db, existing[0]!.id);
  }

  const householdId = randomUUID();
  db.insert(households).values({ id: householdId, name: 'Casa' }).run();

  const peopleByName: Record<string, string> = {};
  ['Bruno', 'Marina'].forEach((name, colorSlot) => {
    const id = randomUUID();
    db.insert(people).values({ id, householdId, name, colorSlot }).run();
    peopleByName[name] = id;
  });

  const accountsByLabel: Record<string, string> = {};
  for (const seed of ACCOUNT_SEEDS) {
    const id = randomUUID();
    db.insert(accounts)
      .values({
        id,
        householdId,
        personId: peopleByName[seed.owner]!,
        bank: seed.bank,
        type: seed.type,
        label: seed.label,
      })
      .run();
    accountsByLabel[seed.label] = id;
  }

  DEFAULT_CATEGORIES.forEach((category, index) => {
    db.insert(categories)
      .values({
        id: randomUUID(),
        householdId,
        name: category.name,
        systemKey: category.systemKey ?? null,
        appliesTo: category.appliesTo,
        bucket: category.bucket,
        sortOrder: index,
      })
      .run();
  });

  return { householdId, peopleByName, accountsByLabel };
}

function readExisting(db: Db, householdId: string): SeedResult {
  const peopleByName: Record<string, string> = {};
  for (const row of db.select().from(people).all()) {
    peopleByName[row.name] = row.id;
  }

  const accountsByLabel: Record<string, string> = {};
  for (const row of db.select().from(accounts).all()) {
    accountsByLabel[row.label] = row.id;
  }

  return { householdId, peopleByName, accountsByLabel };
}
