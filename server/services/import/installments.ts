import { addMonths } from '../../../shared/dates';

export type PlanSummary = {
  id: string;
  description: string;
  totalInstallments: number;
  installmentAmountCents: number;
  takenNumbers: number[];
};

export type SliceInput = {
  lineId: string;
  number: number;
  total: number;
  description: string;
  amountCents: number;
  date: string;
};

export type NewPlan = {
  id: string;
  description: string;
  totalInstallments: number;
  installmentAmountCents: number;
  firstDate: string;
};

/**
 * Puts each "Parcela N/M" slice in a plan. A slice joins a plan with the same
 * description, slice count and slice amount that does not hold its number yet.
 * Two identical purchases on one bill become two plans: the second "2/5" finds
 * the first plan already holds a 2. Plans are tried in id order, so the result
 * is stable. A new plan's first date is this slice's date moved back
 * `number - 1` months.
 */
export function assignInstallments(
  existing: PlanSummary[],
  slices: SliceInput[],
  newId: () => string,
): { planIdByLine: Map<string, string>; created: NewPlan[] } {
  const plans = existing.map((plan) => ({ ...plan, takenNumbers: [...plan.takenNumbers] }));
  const created: NewPlan[] = [];
  const planIdByLine = new Map<string, string>();

  for (const slice of slices) {
    const amount = Math.abs(slice.amountCents);
    const match = plans
      .filter(
        (plan) =>
          plan.description === slice.description &&
          plan.totalInstallments === slice.total &&
          plan.installmentAmountCents === amount &&
          !plan.takenNumbers.includes(slice.number),
      )
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0];

    if (match) {
      match.takenNumbers.push(slice.number);
      planIdByLine.set(slice.lineId, match.id);
      continue;
    }

    const plan: NewPlan = {
      id: newId(),
      description: slice.description,
      totalInstallments: slice.total,
      installmentAmountCents: amount,
      firstDate: addMonths(slice.date, -(slice.number - 1)),
    };
    created.push(plan);
    plans.push({ ...plan, takenNumbers: [slice.number] });
    planIdByLine.set(slice.lineId, plan.id);
  }

  return { planIdByLine, created };
}
