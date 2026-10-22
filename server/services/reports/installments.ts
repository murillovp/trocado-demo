import type { CommittedMonth, OpenInstallments, OpenPlan, OwedByPerson } from '../../../shared/contract/reports';
import { addMonths, addMonthsToMonth, monthOf } from '../../../shared/dates';
import type { PlanProgressRow } from '../../db/installmentPlans';

export type { CommittedMonth, OpenInstallments, OpenPlan, OwedByPerson };

/** How many coming months the forecast lists. */
export const FORECAST_MONTHS = 12;

/** The months a plan still has to pay: the last `remainingCount` months ending at `endMonth`. */
function planMonths(plan: Pick<OpenPlan, 'endMonth' | 'remainingCount'>): string[] {
  return Array.from({ length: plan.remainingCount }, (_, index) =>
    addMonthsToMonth(plan.endMonth, index - plan.remainingCount + 1),
  );
}

/** How much the plans already take from each coming month, soonest first, at most `FORECAST_MONTHS` months. */
export function committedByMonth(plans: readonly OpenPlan[]): CommittedMonth[] {
  const totals = new Map<string, number>();
  for (const plan of plans) {
    for (const month of planMonths(plan)) {
      totals.set(month, (totals.get(month) ?? 0) + plan.installmentAmountCents);
    }
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, FORECAST_MONTHS)
    .map(([month, cents]) => ({ month, cents }));
}

/**
 * The Parcelas screen: plans with slices still to come, the soonest to end
 * first, the total still owed across all of them, and what each coming month
 * owes (for everyone, and for each person alone).
 */
export function openInstallments(progress: readonly PlanProgressRow[]): OpenInstallments {
  const plans = progress
    .flatMap((plan): OpenPlan[] => {
      if (plan.paidNumbers.length === 0) return [];
      const paidCount = Math.max(...plan.paidNumbers);
      if (paidCount >= plan.totalInstallments) return [];
      const remainingCount = plan.totalInstallments - paidCount;

      return [
        {
          id: plan.id,
          description: plan.description,
          accountId: plan.accountId,
          accountLabel: plan.accountLabel,
          personId: plan.personId,
          installmentAmountCents: plan.installmentAmountCents,
          totalInstallments: plan.totalInstallments,
          paidCount,
          remainingCount,
          owedCents: remainingCount * plan.installmentAmountCents,
          endMonth: monthOf(addMonths(plan.firstDate, plan.totalInstallments - 1)),
        },
      ];
    })
    .sort(
      (a, b) =>
        a.endMonth.localeCompare(b.endMonth) ||
        a.description.localeCompare(b.description) ||
        a.id.localeCompare(b.id),
    );

  const owedByPerson = new Map<string, number>();
  for (const plan of plans) {
    owedByPerson.set(plan.personId, (owedByPerson.get(plan.personId) ?? 0) + plan.owedCents);
  }

  return {
    plans,
    totalOwedCents: plans.reduce((sum, plan) => sum + plan.owedCents, 0),
    owedByPerson: [...owedByPerson].map(([personId, owedCents]) => ({ personId, owedCents })),
    forecast: committedByMonth(plans),
    forecastByPerson: [...owedByPerson.keys()].map((personId) => ({
      personId,
      months: committedByMonth(plans.filter((plan) => plan.personId === personId)),
    })),
  };
}
