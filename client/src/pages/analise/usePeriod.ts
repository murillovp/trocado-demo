import { useSearchParams } from 'react-router';
import { lastTwelveMonths } from '../../../../shared/dates';
import { monthLabel } from '@/lib/format';

/** The three views of Análise, named as the address writes them. `mes` is the default and is left out of the address. */
export type Period = 'ano' | 'mes' | 'semana';

/** The address parameter that holds the period. */
export const PERIOD_PARAM = 'periodo';

/** The switch's options, in the order it shows them. */
export const PERIOD_OPTIONS: readonly { value: Period; label: string }[] = [
  { value: 'ano', label: 'Ano' },
  { value: 'mes', label: 'Mês' },
  { value: 'semana', label: 'Semana' },
];

/** Reads the address value. A missing or unknown value is Mês, so every older link still opens the month view. */
export function parsePeriod(value: string | null): Period {
  return value === 'ano' || value === 'semana' ? value : 'mes';
}

/**
 * The heading of the twelve-month views: the first month of the window, then the selected month
 * with its first letter lower-cased, as in "Outubro 2025 a setembro 2026".
 */
export function periodRangeLabel(month: string): string {
  const [first] = lastTwelveMonths(month);
  const last = monthLabel(month);
  return `${monthLabel(first ?? month)} a ${last.charAt(0).toLowerCase()}${last.slice(1)}`;
}

/**
 * The period of Análise, kept in the address as `periodo=ano` or `periodo=semana`; Mês leaves it out.
 * A change adds a history entry, so Back undoes it. The month, the person and the filters stay untouched.
 */
export function usePeriod() {
  const [params, setParams] = useSearchParams();
  const period = parsePeriod(params.get(PERIOD_PARAM));

  function setPeriod(next: Period) {
    setParams((current) => {
      const updated = new URLSearchParams(current);
      if (next === 'mes') updated.delete(PERIOD_PARAM);
      else updated.set(PERIOD_PARAM, next);
      return updated;
    });
  }

  return { period, setPeriod };
}
