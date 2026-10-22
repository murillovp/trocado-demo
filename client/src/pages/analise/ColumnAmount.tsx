import { formatWholeReais } from '@/lib/format';

type Props = {
  cents: number;
  /** Drops the "R$ " prefix below `sm`, for columns too narrow on a phone to hold it. */
  shortOnPhone?: boolean;
};

const CURRENCY_PREFIX = 'R$ ';

/**
 * The average above a Semana column, in whole reais, as small muted text on one line. A column that
 * rounds to R$ 0 shows nothing. The columns' own description already tells a screen reader the amount,
 * so this text is hidden from it.
 */
export function ColumnAmount({ cents, shortOnPhone = false }: Props) {
  const text = formatWholeReais(cents);
  if (cents <= 0 || text === `${CURRENCY_PREFIX}0`) return null;
  const digits = text.slice(CURRENCY_PREFIX.length);
  return (
    <span aria-hidden="true" data-column-amount className="whitespace-nowrap text-micro text-muted-foreground">
      {shortOnPhone ? <span className="hidden sm:inline">{CURRENCY_PREFIX}</span> : CURRENCY_PREFIX}
      {digits}
    </span>
  );
}
