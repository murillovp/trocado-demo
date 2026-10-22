import { and, eq, isNotNull, notExists } from 'drizzle-orm';
import type { DbExecutor } from './client';
import { outsideReview } from './lineFilters';
import { accounts, imports, installmentPlans, transactions } from './schema';

/** Every plan on one account, with the slice numbers already imported into it. */
export function listPlanSummaries(
  db: DbExecutor,
  accountId: string,
): {
  id: string;
  description: string;
  totalInstallments: number;
  installmentAmountCents: number;
  takenNumbers: number[];
}[] {
  const plans = db.select().from(installmentPlans).where(eq(installmentPlans.accountId, accountId)).all();
  const slices = db
    .select({ planId: transactions.installmentPlanId, number: transactions.installmentNumber })
    .from(transactions)
    .where(and(eq(transactions.accountId, accountId), isNotNull(transactions.installmentPlanId)))
    .all();

  return plans.map((plan) => ({
    id: plan.id,
    description: plan.description,
    totalInstallments: plan.totalInstallments,
    installmentAmountCents: plan.installmentAmountCents,
    takenNumbers: slices
      .filter((slice) => slice.planId === plan.id && slice.number !== null)
      .map((slice) => slice.number as number),
  }));
}

export function insertPlans(
  db: DbExecutor,
  householdId: string,
  accountId: string,
  plans: {
    id: string;
    description: string;
    totalInstallments: number;
    installmentAmountCents: number;
    firstDate: string;
  }[],
): void {
  for (const plan of plans) {
    db.insert(installmentPlans).values({ ...plan, householdId, accountId }).run();
  }
}

/** A plan with its account, its person, and the slice numbers imported so far. */
export type PlanProgressRow = {
  id: string;
  description: string;
  accountId: string;
  accountLabel: string;
  personId: string;
  totalInstallments: number;
  installmentAmountCents: number;
  firstDate: string;
  /** Slice numbers of lines entered by hand or in confirmed imports. */
  paidNumbers: number[];
};

/** Every plan in the household with the slices that count, for the Parcelas screen. */
export function listPlanProgress(db: DbExecutor, householdId: string): PlanProgressRow[] {
  const plans = db
    .select({
      id: installmentPlans.id,
      description: installmentPlans.description,
      accountId: installmentPlans.accountId,
      accountLabel: accounts.label,
      personId: accounts.personId,
      totalInstallments: installmentPlans.totalInstallments,
      installmentAmountCents: installmentPlans.installmentAmountCents,
      firstDate: installmentPlans.firstDate,
    })
    .from(installmentPlans)
    .innerJoin(accounts, eq(installmentPlans.accountId, accounts.id))
    .where(eq(installmentPlans.householdId, householdId))
    .all();

  const slices = db
    .select({ planId: transactions.installmentPlanId, number: transactions.installmentNumber })
    .from(transactions)
    .leftJoin(imports, eq(transactions.importId, imports.id))
    .where(
      and(
        eq(transactions.householdId, householdId),
        isNotNull(transactions.installmentPlanId),
        isNotNull(transactions.installmentNumber),
        outsideReview(),
      ),
    )
    .all();

  return plans.map((plan) => ({
    ...plan,
    paidNumbers: slices
      .filter((slice) => slice.planId === plan.id)
      .map((slice) => slice.number as number)
      .sort((a, b) => a - b),
  }));
}

/** Removes plans whose every slice is gone, such as after a cancelled import. */
export function deleteEmptyPlans(db: DbExecutor, householdId: string): number {
  const result = db
    .delete(installmentPlans)
    .where(
      and(
        eq(installmentPlans.householdId, householdId),
        notExists(
          db
            .select({ id: transactions.id })
            .from(transactions)
            .where(eq(transactions.installmentPlanId, installmentPlans.id)),
        ),
      ),
    )
    .run();
  return result.changes;
}
