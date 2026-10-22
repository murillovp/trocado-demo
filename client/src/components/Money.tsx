import type { TransactionKind } from '@/api/types';
import { formatReais } from '@/lib/format';
import { moneyTone, TONE_CLASS, type MoneyTone } from '@/lib/moneyTone';
import { cn } from '@/lib/utils';

const SIZE_CLASS = {
  figure: 'text-figure font-semibold tracking-tight',
  row: 'font-medium',
} as const;

type Props = {
  cents: number;
  /** The line's kind. It picks the colour first, then the sign (see `moneyTone`). */
  kind?: TransactionKind | null;
  /** Overrides the kind, for a total such as Saldo do mês or a gap to target. */
  tone?: MoneyTone;
  /** `figure` is the large number of a card; `row` takes the text size around it. */
  size?: keyof typeof SIZE_CLASS;
  align?: 'start' | 'end';
  className?: string;
};

/**
 * An amount of money, printed one way everywhere: "R$ 1.234,56", with its sign.
 * The sign, "R$" and figure stay on one line, however narrow the place it sits in.
 * The colour comes from what the amount is (income green, savings blue, outside
 * the totals muted, spending plain), never from the sign alone where the kind is
 * known. Pass `tone` for a total that has no kind of its own. `className` sets the
 * base look (such as a text colour for plain amounts); a tone's colour wins over it.
 */
export function Money({ cents, kind, tone, size = 'row', align = 'end', className }: Props) {
  return (
    <span className={cn('whitespace-nowrap', SIZE_CLASS[size], align === 'end' && 'text-right', className, TONE_CLASS[tone ?? moneyTone(kind, cents)])}>
      {formatReais(cents)}
    </span>
  );
}
